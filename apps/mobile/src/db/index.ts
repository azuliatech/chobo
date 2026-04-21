import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kasham.db');

export async function initDatabase() {
    await db.execAsync(`PRAGMA journal_mode = WAL`);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    )
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY NOT NULL,
      total REAL NOT NULL,
      payment_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0,
      customer_id TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    )
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY NOT NULL,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
    )
  `);
}

// ---- Products ----

export async function getProducts(): Promise<any[]> {
    return await db.getAllAsync('SELECT * FROM products ORDER BY name ASC');
}

export async function createProduct(id: string, name: string, price: number, stock: number): Promise<void> {
    const now = Date.now();
    await db.runAsync(
        'INSERT INTO products (id, name, price, stock, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        id, name, price, stock, now, now
    );
}

export async function updateProduct(id: string, name: string, price: number, stock: number): Promise<void> {
    await db.runAsync(
        'UPDATE products SET name = ?, price = ?, stock = ?, updated_at = ? WHERE id = ?',
        name, price, stock, Date.now(), id
    );
}

export async function deleteProduct(id: string): Promise<void> {
    await db.runAsync('DELETE FROM products WHERE id = ?', id);
}

export async function decrementStock(productId: string, qty: number): Promise<void> {
    await db.runAsync(
        'UPDATE products SET stock = MAX(0, stock - ?), updated_at = ? WHERE id = ?',
        qty, Date.now(), productId
    );
}

// ---- Sales ----

export async function createSale(id: string, total: number, paymentType: string): Promise<void> {
    const now = Date.now();
    await db.runAsync(
        'INSERT INTO sales (id, total, payment_type, timestamp, synced, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        id, total, paymentType, now, now, now
    );
}

export async function createSaleItem(id: string, saleId: string, productId: string, quantity: number, price: number): Promise<void> {
    await db.runAsync(
        'INSERT INTO sale_items (id, sale_id, product_id, quantity, price, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        id, saleId, productId, quantity, price, Date.now()
    );
}

export async function getDailySales(): Promise<any[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return await db.getAllAsync(
        'SELECT * FROM sales WHERE timestamp >= ?',
        todayStart.getTime()
    );
}

export async function getUnsyncedSales(): Promise<{ sales: any[], saleItems: any[] }> {
    const sales = await db.getAllAsync('SELECT * FROM sales WHERE synced = 0');
    if (sales.length === 0) return { sales: [], saleItems: [] };

    const placeholders = sales.map(() => '?').join(',');
    const saleIds = sales.map((s: any) => s.id);
    
    let saleItems: any[] = [];
    if (saleIds.length > 0) {
        saleItems = await db.getAllAsync(`SELECT * FROM sale_items WHERE sale_id IN (${placeholders})`, saleIds);
    }

    return { sales, saleItems };
}

export async function markSalesAsSynced(saleIds: string[]): Promise<void> {
    if (saleIds.length === 0) return;
    const placeholders = saleIds.map(() => '?').join(',');
    await db.runAsync(`UPDATE sales SET synced = 1 WHERE id IN (${placeholders})`, saleIds);
}

export { db };
