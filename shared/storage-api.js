/*
Storage adapter contract. Each entry point (online/offline) must set
`window.DataStore` to an object implementing this shape before calling
bootApp() from app-core.js.

online/storage-supabase.js  -> backed by Supabase (multi-device sync)
offline/storage-local.js    -> backed by IndexedDB (single device, no network)

Category = { id, emoji, name, budget }
Transaction = { id, category_id, amount, date, note }

window.DataStore = {
  async loadData()                         -> { categories: Category[], transactions: Transaction[] }
  async addCategory({emoji,name,budget})   -> Category (with id assigned)
  async updateCategory(id, {emoji,name,budget}) -> void
  async deleteCategory(id)                 -> void
  async addTransaction({category_id,amount,date,note}) -> Transaction (with id assigned)
  async updateTransaction(id, {category_id,amount,date,note}) -> void
  async deleteTransaction(id)              -> void
}
*/
