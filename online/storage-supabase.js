/* Storage adapter backed by Supabase (multi-device sync). Requires global `sb` client
   to be initialized before this file runs (see online/index.html). */
window.Storage = {
  async loadData(){
    const {data:c,error:ce} = await sb.from('categories').select('*').order('created_at');
    if(ce) throw ce;
    const {data:t,error:te} = await sb.from('transactions').select('*').order('date',{ascending:false});
    if(te) throw te;
    return {categories:c||[], transactions:t||[]};
  },
  async addCategory({emoji,name,budget}){
    const {data:{user}} = await sb.auth.getUser();
    const {data,error} = await sb.from('categories').insert({emoji,name,budget,user_id:user.id}).select();
    if(error) throw error;
    return data[0];
  },
  async updateCategory(id,{emoji,name,budget}){
    const {error} = await sb.from('categories').update({emoji,name,budget}).eq('id',id);
    if(error) throw error;
  },
  async deleteCategory(id){
    const {error} = await sb.from('categories').delete().eq('id',id);
    if(error) throw error;
  },
  async addTransaction({category_id,amount,date,note}){
    const {data:{user}} = await sb.auth.getUser();
    const {data,error} = await sb.from('transactions').insert({category_id,amount,date,note,user_id:user.id}).select();
    if(error) throw error;
    return data[0];
  },
  async updateTransaction(id,{category_id,amount,date,note}){
    const {error} = await sb.from('transactions').update({date,category_id,amount,note}).eq('id',id);
    if(error) throw error;
  },
  async deleteTransaction(id){
    const {error} = await sb.from('transactions').delete().eq('id',id);
    if(error) throw error;
  }
};
