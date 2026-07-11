/* Shared UI/render logic for Family Finance.
   Talks to data exclusively through window.DataStore (see storage-api.js).
   Entry points (online/offline) must set window.DataStore before calling bootApp(). */

let cats=[],txs=[];
let hP={type:'monthly',mo:0,cs:'',ce:''};
let tP={type:'monthly',mo:0,cs:'',ce:''};
let tFilter='all',tView='list',expandedDays={};

const rp=n=>'Rp '+Number(n).toLocaleString('id-ID');
const fd=s=>new Date(s+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const fdS=s=>new Date(s+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
const fmtD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const td=()=>fmtD(new Date());
const addD=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return fmtD(d);};
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}
function sync(s){const d=document.getElementById('syncDot');if(d)d.className='sync-dot'+(s==='syncing'?' syncing':s==='error'?' error':'');}

async function bootApp(){
  sync('syncing');
  try{
    const data=await window.DataStore.loadData();
    cats=data.categories||[];txs=data.transactions||[];
    sync('ok');
  }catch(e){sync('error');toast('⚠️ Gagal memuat: '+e.message);}
  const now=new Date();
  const dEl=document.getElementById('headerDate');
  if(dEl)dEl.textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const txDEl=document.getElementById('txDate');if(txDEl)txDEl.value=now.toISOString().slice(0,10);
  document.getElementById('loadingScreen').style.display='none';
  document.getElementById('authScreen').style.display='none';
  const licenseScreen=document.getElementById('licenseScreen');if(licenseScreen)licenseScreen.style.display='none';
  document.getElementById('mainApp').style.display='block';
  ra();
}

function pRange(p){
  const now=new Date();
  if(p.type==='monthly'){const s=new Date(now.getFullYear(),now.getMonth()+p.mo,1),e=new Date(now.getFullYear(),now.getMonth()+p.mo+1,0);return{start:fmtD(s),end:fmtD(e)};}
  if(p.type==='week7'){const t=td();return{start:addD(t,-6),end:t};}
  return{start:p.cs||td(),end:p.ce||td()};
}
function pLabel(p){
  if(p.type==='monthly'){const now=new Date();const d=new Date(now.getFullYear(),now.getMonth()+p.mo,1);return d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});}
  const r=pRange(p);return fd(r.start)+' – '+fd(r.end);
}
const inP=(tx,p)=>{const r=pRange(p);return tx.date>=r.start&&tx.date<=r.end;};

function renderPP(id,p,ns){
  const el=document.getElementById(id);if(!el)return;
  const t=td(),w7=addD(t,-6);
  const now=new Date(),mDate=new Date(now.getFullYear(),now.getMonth()+p.mo,1);
  const mLbl=mDate.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  el.innerHTML=`<div class="period-picker"><div class="period-lbl">📅 Lihat Periode</div>
  <div class="period-type-row">
    <button class="period-type-btn ${p.type==='monthly'?'active':''}" onclick="${ns}T('monthly')">Bulanan</button>
    <button class="period-type-btn ${p.type==='week7'?'active':''}" onclick="${ns}T('week7')">7 Hari</button>
    <button class="period-type-btn ${p.type==='custom'?'active':''}" onclick="${ns}T('custom')">Pilih Tanggal</button>
  </div>
  ${p.type==='monthly'?`<div class="month-nav"><button class="mnav-btn" onclick="${ns}M(-1)">‹</button><div class="month-cur">${mLbl}</div><button class="mnav-btn" onclick="${ns}M(1)" ${p.mo>=0?'disabled':''}>›</button></div>`:''}
  ${p.type==='week7'?`<div class="week-info">📆 ${fd(w7)} — ${fd(t)}</div>`:''}
  ${p.type==='custom'?`<div class="custom-row"><input type="date" id="${id}_s" value="${p.cs||t}" max="${t}"><span class="custom-sep">s/d</span><input type="date" id="${id}_e" value="${p.ce||t}" max="${t}"><button class="apply-btn" onclick="${ns}A()">Tampilkan</button></div>`:''}
  <div class="period-summary">Menampilkan: ${pLabel(p)}</div></div>`;
}
function hT(v){hP.type=v;ra();}function hM(d){if(hP.mo+d<=0){hP.mo+=d;ra();}}
function hA(){const s=document.getElementById('homePP_s')?.value,e=document.getElementById('homePP_e')?.value;if(!s||!e){toast('⚠️ Pilih tanggal dulu');return;}if(s>e){toast('⚠️ Tanggal awal harus lebih awal');return;}hP.cs=s;hP.ce=e;ra();}
function tT(v){tP.type=v;ra();}function tM(d){if(tP.mo+d<=0){tP.mo+=d;ra();}}
function tA(){const s=document.getElementById('tablePP_s')?.value,e=document.getElementById('tablePP_e')?.value;if(!s||!e){toast('⚠️ Pilih tanggal dulu');return;}if(s>e){toast('⚠️ Tanggal awal harus lebih awal');return;}tP.cs=s;tP.ce=e;ra();}

function goTo(pg){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+pg).classList.add('active');
  const nb=document.getElementById('nav-'+pg);if(nb)nb.classList.add('active');
  ra();
}
function setView(v){
  tView=v;
  document.getElementById('vbList').className='view-btn'+(v==='list'?' active':'');
  document.getElementById('vbDaily').className='view-btn'+(v==='daily'?' active':'');
  document.getElementById('sortRowEl').style.display=v==='daily'?'none':'flex';
  renderTableContent();
}

function txHtml(tx,hideDate=false){
  const c=cats.find(c=>c.id==tx.category_id);
  return `<div class="tx-item">
    <div class="tx-icon">${c?(c.emoji||'📁'):'❓'}</div>
    <div class="tx-info">
      <div class="tx-cat">${c?c.name:'Terhapus'}</div>
      <div class="tx-note">${tx.note||'—'}</div>
      ${!hideDate?`<div class="tx-date">${fd(tx.date)}</div>`:''}
    </div>
    <div class="tx-r">
      <div class="tx-amt">-${rp(tx.amount)}</div>
      <div style="display:flex;gap:4px">
        <button class="tx-edit" onclick="openEditTx('${tx.id}')">✏️</button>
        <button class="tx-del" onclick="delTx('${tx.id}')">🗑</button>
      </div>
    </div>
  </div>`;
}

async function addTx(){
  const date=document.getElementById('txDate').value;
  const catId=document.getElementById('txCat').value;
  const amount=parseFloat(document.getElementById('txAmt').value);
  const note=document.getElementById('txNote').value.trim();
  if(!date||!catId||!amount||amount<=0){toast('⚠️ Isi tanggal, kategori, dan jumlah dulu!');return;}
  sync('syncing');
  try{
    const created=await window.DataStore.addTransaction({category_id:catId,amount,date,note});
    txs.unshift(created);
    document.getElementById('txAmt').value='';document.getElementById('txNote').value='';
    toast('✅ Berhasil dicatat!');sync('ok');ra();
  }catch(e){sync('error');toast('❌ Gagal: '+e.message);}
}

async function delTx(id){
  if(!confirm('Hapus transaksi ini?'))return;
  sync('syncing');
  try{
    await window.DataStore.deleteTransaction(id);
    txs=txs.filter(t=>t.id!=id);sync('ok');ra();toast('🗑 Dihapus');
  }catch(e){sync('error');toast('❌ Gagal');}
}

function renderSummary(list){
  const el=document.getElementById('txSummary');if(!el)return;
  const total=list.reduce((s,t)=>s+t.amount,0);
  const days=[...new Set(list.map(t=>t.date))].length;
  const big=list.length?Math.max(...list.map(t=>t.amount)):0;
  el.innerHTML=`<div class="sum-chip"><div class="sum-chip-label">Total</div><div class="sum-chip-val red">${rp(total)}</div></div>
    <div class="sum-chip"><div class="sum-chip-label">Transaksi</div><div class="sum-chip-val">${list.length}x</div></div>
    <div class="sum-chip"><div class="sum-chip-label">Rata-rata/hari</div><div class="sum-chip-val">${rp(days?Math.round(total/days):0)}</div></div>
    <div class="sum-chip"><div class="sum-chip-label">Terbesar</div><div class="sum-chip-val red">${big?rp(big):'—'}</div></div>`;
}
function renderFilters(){
  const el=document.getElementById('filterRow');if(!el)return;
  el.innerHTML=`<div class="chip ${tFilter==='all'?'active':''}" onclick="setF('all')">Semua</div>`+
    cats.map(c=>`<div class="chip ${tFilter==c.id?'active':''}" onclick="setF('${c.id}')">${c.emoji||'📁'} ${c.name}</div>`).join('');
}
function setF(id){tFilter=id;renderFilters();renderTableContent();}
function getFiltered(){let l=txs.filter(tx=>inP(tx,tP));if(tFilter!=='all')l=l.filter(tx=>tx.category_id==tFilter);return l;}
function renderTableContent(){
  const el=document.getElementById('tableContent');if(!el)return;
  const list=getFiltered();renderSummary(list);
  if(!list.length){el.innerHTML=`<div class="empty"><div class="empty-icon">🔍</div><div class="empty-text">Tidak ada transaksi di periode ini.</div></div>`;return;}
  tView==='daily'?renderDailyView(el,list):renderListView(el,list);
}
function renderListView(el,list){
  const sort=document.getElementById('sortSel')?.value||'date-desc';
  const s=[...list].sort((a,b)=>sort==='date-desc'?b.date.localeCompare(a.date)||b.id-a.id:sort==='date-asc'?a.date.localeCompare(b.date)||a.id-b.id:sort==='amount-desc'?b.amount-a.amount:a.amount-b.amount);
  el.innerHTML=s.map(tx=>txHtml(tx)).join('');
}
function renderDailyView(el,list){
  const g={};list.forEach(tx=>{if(!g[tx.date])g[tx.date]=[];g[tx.date].push(tx);});
  const dates=Object.keys(g).sort((a,b)=>b.localeCompare(a));
  const t=td(),y=addD(t,-1);
  dates.forEach(d=>{if(expandedDays[d]===undefined)expandedDays[d]=true;});
  el.innerHTML=dates.map(date=>{
    const dayTxs=g[date].sort((a,b)=>b.amount-a.amount);
    const tot=dayTxs.reduce((s,t)=>s+t.amount,0);
    const exp=expandedDays[date];
    const lbl=date===t?'📍 Hari ini':date===y?'🕐 Kemarin':fdS(date);
    return `<div class="day-group">
      <div class="day-hdr" onclick="toggleDay('${date}')">
        <span class="day-lbl">${lbl}</span>
        <span style="display:flex;align-items:center"><span class="day-tot">-${rp(tot)}</span><span class="day-chevron">${exp?'▲':'▼'}</span></span>
      </div>
      <div class="day-txs ${exp?'':'collapsed'}" id="day_${date}">${dayTxs.map(tx=>txHtml(tx,true)).join('')}</div>
    </div>`;
  }).join('');
}
function toggleDay(date){
  expandedDays[date]=!expandedDays[date];
  const el=document.getElementById('day_'+date),hdr=el?.previousElementSibling;
  if(!el||!hdr)return;
  el.classList.toggle('collapsed',!expandedDays[date]);
  hdr.querySelector('.day-chevron').textContent=expandedDays[date]?'▲':'▼';
}

function renderHome(){
  const el=document.getElementById('catProg');if(!el)return;
  const spend={};txs.filter(tx=>inP(tx,hP)).forEach(tx=>{spend[tx.category_id]=(spend[tx.category_id]||0)+tx.amount;});
  const cnt=txs.filter(tx=>inP(tx,hP)).length;
  let tot=0,bud=0;
  if(!cats.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">📂</div><div class="empty-text">Belum ada kategori.<br>Buat dulu di menu Kategori.</div></div>`;
    ['totalSpend','totalBudget','statSisa','statTx'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=id==='totalSpend'?rp(0):id==='totalBudget'?'—':'';});
    return;
  }
  el.innerHTML=cats.map(c=>{
    const sp=spend[c.id]||0,bg=c.budget||0;tot+=sp;bud+=bg;
    const pct=bg?Math.min((sp/bg)*100,100):0,over=bg&&sp>bg,warn=bg&&pct>=80&&!over;
    const sisa=bg-sp;
    const sisaColor=over?'var(--danger)':pct>=90?'var(--danger)':pct>=75?'var(--warning)':'var(--primary)';
    const sisaLabel=over?`⚠ Lewat ${rp(-sisa)}`:`Sisa ${rp(sisa)}`;
    return `<div class="cat-item">
      <div class="cat-hdr">
        <div class="cat-name"><span class="cat-emoji">${c.emoji||'📁'}</span>${c.name}${over?'<span class="badge-over">Lewat!</span>':''}</div>
        <div class="cat-right"><div class="cat-spent" style="color:${over?'var(--danger)':warn?'var(--warning)':'var(--text)'}">${rp(sp)}</div>${bg?`<div class="cat-budg">dari ${rp(bg)}</div>`:''}</div>
      </div>
      ${bg?`<div class="prog-bar"><div class="prog-fill ${over?'danger':warn?'warning':''}" style="width:${pct}%"></div></div>`:''}
      ${bg?`<div style="font-size:11px;font-weight:700;color:${sisaColor};margin-top:5px;">${sisaLabel}</div>`:''}
    </div>`;
  }).join('');
  document.getElementById('totalSpend').textContent=rp(tot);
  document.getElementById('totalBudget').textContent=bud?rp(bud):'—';
  document.getElementById('statTx').textContent=cnt+' transaksi';
  const sisaEl=document.getElementById('statSisa'),cardEl=document.getElementById('spendCard');
  if(bud){const sisa=bud-tot;sisaEl.textContent=sisa<0?'⚠ Lebih '+rp(-sisa):'Sisa '+rp(sisa);sisaEl.className='stat-sub'+(sisa<0?' over':'');cardEl.className='stat-card'+(sisa<0?' over':'');}
  else{sisaEl.textContent='';cardEl.className='stat-card';}
  const rTx=document.getElementById('recentTx');
  const recent=txs.filter(tx=>inP(tx,hP)).slice(0,5);
  rTx.innerHTML=recent.length?recent.map(tx=>txHtml(tx)).join(''):`<div class="empty"><div class="empty-icon">💸</div><div class="empty-text">Belum ada transaksi di periode ini.</div></div>`;
}

function renderCatOpts(){
  const s=document.getElementById('txCat');if(!s)return;const v=s.value;
  s.innerHTML='<option value="">-- Pilih Kategori --</option>'+cats.map(c=>`<option value="${c.id}">${c.emoji||'📁'} ${c.name}</option>`).join('');
  s.value=v;
}
function renderCatList(){
  const el=document.getElementById('catList');if(!el)return;
  el.innerHTML=cats.length?cats.map(c=>`<div class="cmi">
    <div class="cmi-emoji">${c.emoji||'📁'}</div>
    <div class="cmi-info"><div class="cmi-name">${c.name}</div><div class="cmi-bud">${c.budget?'Budget: '+rp(c.budget)+'/bln':'Tanpa batas budget'}</div></div>
    <div class="cmi-actions">
      <button class="cmi-edit" onclick="openEditCat('${c.id}')">✏️</button>
      <button class="cmi-del" onclick="delCat('${c.id}')">✕</button>
    </div>
  </div>`).join(''):`<div class="empty"><div class="empty-icon">📂</div><div class="empty-text">Belum ada kategori.</div></div>`;
}

function openEditCat(id){
  const c=cats.find(c=>c.id==id);if(!c)return;
  document.getElementById('editCatId').value=c.id;
  document.getElementById('editCatEmoji').value=c.emoji||'📁';
  document.getElementById('editCatName').value=c.name;
  document.getElementById('editCatBudget').value=c.budget||'';
  document.getElementById('modalCat').classList.add('open');
}
async function saveEditCat(){
  const id=document.getElementById('editCatId').value;
  const emoji=document.getElementById('editCatEmoji').value.trim()||'📁';
  const name=document.getElementById('editCatName').value.trim();
  const budget=parseFloat(document.getElementById('editCatBudget').value)||0;
  if(!name){toast('⚠️ Isi nama kategori!');return;}
  sync('syncing');
  try{
    await window.DataStore.updateCategory(id,{emoji,name,budget});
    const idx=cats.findIndex(c=>c.id==id);
    if(idx>-1)cats[idx]={...cats[idx],emoji,name,budget};
    closeModal('modalCat');
    toast('✅ Kategori diperbarui!');sync('ok');ra();
  }catch(e){sync('error');toast('❌ Gagal: '+e.message);}
}

function openEditTx(id){
  const tx=txs.find(t=>t.id==id);if(!tx)return;
  document.getElementById('editTxId').value=tx.id;
  document.getElementById('editTxDate').value=tx.date;
  document.getElementById('editTxAmt').value=tx.amount;
  document.getElementById('editTxNote').value=tx.note||'';
  const sel=document.getElementById('editTxCat');
  sel.innerHTML=cats.map(c=>`<option value="${c.id}">${c.emoji||'📁'} ${c.name}</option>`).join('');
  sel.value=tx.category_id;
  document.getElementById('modalTx').classList.add('open');
}
async function saveEditTx(){
  const id=document.getElementById('editTxId').value;
  const date=document.getElementById('editTxDate').value;
  const category_id=document.getElementById('editTxCat').value;
  const amount=parseFloat(document.getElementById('editTxAmt').value);
  const note=document.getElementById('editTxNote').value.trim();
  if(!date||!category_id||!amount||amount<=0){toast('⚠️ Isi semua field!');return;}
  sync('syncing');
  try{
    await window.DataStore.updateTransaction(id,{date,category_id,amount,note});
    const idx=txs.findIndex(t=>t.id==id);
    if(idx>-1)txs[idx]={...txs[idx],date,category_id,amount,note};
    closeModal('modalTx');
    toast('✅ Transaksi diperbarui!');sync('ok');ra();
  }catch(e){sync('error');toast('❌ Gagal: '+e.message);}
}

function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{
  ['modalCat','modalTx'].forEach(id=>{
    const overlay=document.getElementById(id);
    if(overlay&&e.target===overlay)overlay.classList.remove('open');
  });
});
async function addCat(){
  const emoji=document.getElementById('cEmoji').value.trim()||'📁';
  const name=document.getElementById('cName').value.trim();
  const budget=parseFloat(document.getElementById('cBudget').value)||0;
  if(!name){toast('⚠️ Isi nama kategori dulu!');return;}
  if(cats.find(c=>c.name.toLowerCase()===name.toLowerCase())){toast('⚠️ Kategori sudah ada!');return;}
  sync('syncing');
  try{
    const created=await window.DataStore.addCategory({emoji,name,budget});
    cats.push(created);
    document.getElementById('cEmoji').value='';document.getElementById('cName').value='';document.getElementById('cBudget').value='';
    toast('✅ Kategori ditambahkan!');sync('ok');ra();
  }catch(e){sync('error');toast('❌ Gagal: '+e.message);}
}
async function delCat(id){
  if(txs.some(t=>t.category_id==id)){toast('⚠️ Masih ada transaksi di kategori ini!');return;}
  if(!confirm('Hapus kategori ini?'))return;
  sync('syncing');
  try{
    await window.DataStore.deleteCategory(id);
    cats=cats.filter(c=>c.id!=id);sync('ok');ra();toast('🗑 Kategori dihapus');
  }catch(e){sync('error');toast('❌ Gagal');}
}

function exportData(){
  if(!cats.length && !txs.length){toast('⚠️ Tidak ada data untuk diexport!');return;}
  const payload = {
    exported_at: new Date().toISOString(),
    categories: cats.map(c=>({id:c.id,name:c.name,emoji:c.emoji,budget:c.budget})),
    transactions: txs.map(t=>({id:t.id,date:t.date,amount:t.amount,note:t.note,category_id:t.category_id}))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'family-finance-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Data berhasil diexport!');
}

function ra(){
  renderPP('homePP',hP,'h');renderPP('tablePP',tP,'t');
  renderHome();renderCatOpts();renderCatList();renderFilters();renderTableContent();
  document.getElementById('sortRowEl').style.display=tView==='daily'?'none':'flex';
}
