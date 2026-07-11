/* Storage adapter backed by IndexedDB — fully local, no network needed after
   the app is loaded once. Single-device only (no sync). */
const DB_NAME='sff-offline-db';
const DB_VERSION=1;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('categories'))db.createObjectStore('categories',{keyPath:'id',autoIncrement:true});
      if(!db.objectStoreNames.contains('transactions'))db.createObjectStore('transactions',{keyPath:'id',autoIncrement:true});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function store(db,name,mode){return db.transaction(name,mode).objectStore(name);}
function toPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}

window.DataStore = {
  async loadData(){
    const db=await openDB();
    const categories=await toPromise(store(db,'categories','readonly').getAll());
    const transactions=await toPromise(store(db,'transactions','readonly').getAll());
    transactions.sort((a,b)=>b.date.localeCompare(a.date));
    return {categories,transactions};
  },
  async addCategory({emoji,name,budget}){
    const db=await openDB();
    const id=await toPromise(store(db,'categories','readwrite').add({emoji,name,budget}));
    return {id,emoji,name,budget};
  },
  async updateCategory(id,{emoji,name,budget}){
    const db=await openDB();
    await toPromise(store(db,'categories','readwrite').put({id,emoji,name,budget}));
  },
  async deleteCategory(id){
    const db=await openDB();
    await toPromise(store(db,'categories','readwrite').delete(id));
  },
  async addTransaction({category_id,amount,date,note}){
    const db=await openDB();
    category_id=Number(category_id); // categories use numeric autoIncrement ids; <select> values arrive as strings
    const id=await toPromise(store(db,'transactions','readwrite').add({category_id,amount,date,note}));
    return {id,category_id,amount,date,note};
  },
  async updateTransaction(id,{category_id,amount,date,note}){
    const db=await openDB();
    category_id=Number(category_id);
    await toPromise(store(db,'transactions','readwrite').put({id,category_id,amount,date,note}));
  },
  async deleteTransaction(id){
    const db=await openDB();
    await toPromise(store(db,'transactions','readwrite').delete(id));
  }
};
