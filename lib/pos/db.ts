// ============================================================
// POS IndexedDB — Offline-first local storage using idb
// ============================================================
import { openDB, type IDBPDatabase } from 'idb'

export interface POSSale {
  id:          string
  items:       POSItem[]
  subtotal:    number
  discount:    number
  total:       number
  paymentType: 'cash' | 'cib' | 'edahabia'
  cashGiven?:  number
  storeId:     string
  cashierId?:  string
  createdAt:   string
  synced:      boolean
  syncedAt?:   string
  receiptNum:  string
}

export interface POSItem {
  productId:   string
  productName: string
  variantKey:  string
  price:       number
  quantity:    number
  total:       number
  imageUrl?:   string
}

const DB_NAME    = 'dakkani-pos'
const DB_VERSION = 1

let db: IDBPDatabase | null = null

export async function getPOSDB(): Promise<IDBPDatabase> {
  if (db) return db
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('sales')) {
        const store = database.createObjectStore('sales', { keyPath: 'id' })
        store.createIndex('synced',    'synced')
        store.createIndex('storeId',   'storeId')
        store.createIndex('createdAt', 'createdAt')
      }
      if (!database.objectStoreNames.contains('products')) {
        database.createObjectStore('products', { keyPath: 'id' })
      }
    },
  })
  return db
}

export async function saveSaleLocally(sale: POSSale): Promise<void> {
  const database = await getPOSDB()
  await database.put('sales', sale)
}

export async function getUnsyncedSales(storeId: string): Promise<POSSale[]> {
  const database = await getPOSDB()
  const all = await database.getAll('sales')
  return all.filter((s: POSSale) => s.storeId === storeId && !s.synced)
}

export async function markSaleSynced(saleId: string): Promise<void> {
  const database = await getPOSDB()
  const sale = await database.get('sales', saleId) as POSSale
  if (sale) await database.put('sales', { ...sale, synced: true, syncedAt: new Date().toISOString() })
}

export async function getAllSales(storeId: string): Promise<POSSale[]> {
  const database = await getPOSDB()
  const all = await database.getAll('sales')
  return (all as POSSale[])
    .filter(s => s.storeId === storeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function cacheProducts(products: any[]): Promise<void> {
  const database = await getPOSDB()
  const tx = database.transaction('products', 'readwrite')
  for (const p of products) await tx.store.put(p)
  await tx.done
}

export async function getCachedProducts(): Promise<any[]> {
  const database = await getPOSDB()
  return database.getAll('products')
}

export function generateReceiptNum(): string {
  const ts   = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `POS-${ts}-${rand}`
}
