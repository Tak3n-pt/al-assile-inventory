// Database initialization - Creates all tables for the Inventory System
// Currency: DZD (Algerian Dinar)

const initDatabase = (db) => {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Helper to check if column exists
  const columnExists = (table, column) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    return columns.some(c => c.name === column);
  };

  // ============================================
  // STOCK CATEGORIES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default categories
  const defaultCategories = [
    { name: 'Dates', description: 'All types of dates' },
    { name: 'Sugar & Sweeteners', description: 'Sugar, honey, syrup' },
    { name: 'Chocolate', description: 'Chocolate, cocoa' },
    { name: 'Nuts & Fillings', description: 'Almonds, pistachios, walnuts' },
    { name: 'Packaging', description: 'Bottles, boxes, labels' },
    { name: 'Other Ingredients', description: 'Misc ingredients' }
  ];

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO stock_categories (name, description) VALUES (?, ?)
  `);

  for (const cat of defaultCategories) {
    insertCategory.run(cat.name, cat.description);
  }

  // ============================================
  // SUPPLIERS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      email TEXT,
      notes TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // STOCK (Raw Materials)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      quantity REAL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'kg',
      cost_per_unit REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 0,
      supplier_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES stock_categories(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // ============================================
  // STOCK TRANSACTIONS (History)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment')),
      quantity REAL NOT NULL,
      unit_cost REAL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stock_id) REFERENCES stock(id)
    )
  `);

  // ============================================
  // EXPENSE CATEGORIES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default expense categories
  const defaultExpenseCategories = [
    { name: 'Water', description: 'Water bills' },
    { name: 'Electricity', description: 'Electric bills' },
    { name: 'Gas', description: 'Gas bills' },
    { name: 'Transport', description: 'Delivery and transport costs' },
    { name: 'Rent', description: 'Rent and lease payments' },
    { name: 'Salaries', description: 'Employee salaries' },
    { name: 'Maintenance', description: 'Equipment and facility maintenance' },
    { name: 'Other', description: 'Miscellaneous expenses' }
  ];

  const insertExpenseCategory = db.prepare(`
    INSERT OR IGNORE INTO expense_categories (name, description) VALUES (?, ?)
  `);

  for (const cat of defaultExpenseCategories) {
    insertExpenseCategory.run(cat.name, cat.description);
  }

  // ============================================
  // EXPENSES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      date DATE NOT NULL,
      is_recurring INTEGER DEFAULT 0,
      recurring_period TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES expense_categories(id)
    )
  `);

  // ============================================
  // PRODUCTS (Final Products)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      selling_price REAL DEFAULT 0,
      manual_cost REAL,
      unit TEXT DEFAULT 'pcs',
      barcode TEXT,
      is_favorite INTEGER DEFAULT 0,
      image_path TEXT,
      is_active INTEGER DEFAULT 1,
      quantity REAL DEFAULT 0,
      min_stock_alert REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add unit column if it doesn't exist (for existing databases)
  if (!columnExists('products', 'unit')) {
    db.exec(`ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pcs'`);
  }

  // Migration: Add barcode column if it doesn't exist
  if (!columnExists('products', 'barcode')) {
    db.exec(`ALTER TABLE products ADD COLUMN barcode TEXT`);
  }

  // Migration: Add is_favorite column if it doesn't exist
  if (!columnExists('products', 'is_favorite')) {
    db.exec(`ALTER TABLE products ADD COLUMN is_favorite INTEGER DEFAULT 0`);
  }

  // Migration: Add quantity column if it doesn't exist
  if (!columnExists('products', 'quantity')) {
    db.exec(`ALTER TABLE products ADD COLUMN quantity REAL DEFAULT 0`);
    // Calculate initial quantity from production - sales
    db.exec(`
      UPDATE products SET quantity = (
        COALESCE((SELECT SUM(quantity_produced) FROM production_batches WHERE product_id = products.id), 0) -
        COALESCE((SELECT SUM(quantity) FROM sale_items WHERE product_id = products.id), 0)
      )
    `);
  }

  // Migration: Add min_stock_alert column if it doesn't exist
  if (!columnExists('products', 'min_stock_alert')) {
    db.exec(`ALTER TABLE products ADD COLUMN min_stock_alert REAL DEFAULT 0`);
  }

  // Migration: Add is_resale column for products bought and sold directly (no production)
  if (!columnExists('products', 'is_resale')) {
    db.exec(`ALTER TABLE products ADD COLUMN is_resale INTEGER DEFAULT 0`);
  }

  // Migration: Add purchase_price column for resale products
  if (!columnExists('products', 'purchase_price')) {
    db.exec(`ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0`);
  }

  // ============================================
  // PRODUCT RECIPES (Ingredients per product)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      stock_item_id INTEGER NOT NULL,
      quantity_needed REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (stock_item_id) REFERENCES stock(id)
    )
  `);

  // Migration: Rename stock_id to stock_item_id if old column exists
  if (columnExists('product_recipes', 'stock_id') && !columnExists('product_recipes', 'stock_item_id')) {
    db.exec(`ALTER TABLE product_recipes RENAME COLUMN stock_id TO stock_item_id`);
  }

  // Migration: Rename quantity_used to quantity_needed if old column exists
  if (columnExists('product_recipes', 'quantity_used') && !columnExists('product_recipes', 'quantity_needed')) {
    db.exec(`ALTER TABLE product_recipes RENAME COLUMN quantity_used TO quantity_needed`);
  }

  // Migration: Add unit column to product_recipes for unit conversion support
  if (!columnExists('product_recipes', 'unit')) {
    db.exec(`ALTER TABLE product_recipes ADD COLUMN unit TEXT`);
  }

  // ============================================
  // PRODUCTION BATCHES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity_produced REAL NOT NULL,
      ingredient_cost REAL DEFAULT 0,
      expense_allocation REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      date DATE NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // ============================================
  // CLIENTS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      email TEXT,
      notes TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // SALES
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      date DATE NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // ============================================
  // SALE ITEMS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // ============================================
  // PURCHASES (from suppliers)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      date DATE NOT NULL,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  // ============================================
  // PURCHASE ITEMS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      stock_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (stock_id) REFERENCES stock(id)
    )
  `);

  // ============================================
  // EMPLOYERS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS employers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      phone TEXT,
      address TEXT,
      salary REAL DEFAULT 0,
      hire_date DATE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // PAYROLL
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employer_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER DEFAULT 0,
      payment_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employer_id) REFERENCES employers(id)
    )
  `);

  // ============================================
  // SETTINGS
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ============================================
  // DOCUMENTS (Generated invoices, delivery notes, etc.)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('invoice', 'delivery', 'proforma')),
      number TEXT NOT NULL,
      sale_id INTEGER,
      client_id INTEGER,
      date DATE NOT NULL,
      data TEXT,
      total REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // Migration: Remove CHECK constraint from documents table to allow new document types
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='documents'").get();
    if (tableInfo && tableInfo.sql && tableInfo.sql.includes("CHECK(type IN")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS documents_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          number TEXT NOT NULL,
          sale_id INTEGER,
          client_id INTEGER,
          date DATE NOT NULL,
          data TEXT,
          total REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id),
          FOREIGN KEY (client_id) REFERENCES clients(id)
        );
        INSERT INTO documents_new SELECT * FROM documents;
        DROP TABLE documents;
        ALTER TABLE documents_new RENAME TO documents;
      `);
      console.log('Migration: documents table CHECK constraint removed');
    }
  } catch (e) {
    console.log('Documents migration check:', e.message);
  }

  // Migration: Add 'return' status to sales table CHECK constraint (for mobile returns sync)
  try {
    const salesInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'").get();
    if (salesInfo && salesInfo.sql && salesInfo.sql.includes("CHECK") && !salesInfo.sql.includes("'return'")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER,
          date DATE NOT NULL,
          total REAL DEFAULT 0,
          paid_amount REAL DEFAULT 0,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'paid', 'cancelled', 'return')),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id)
        );
        INSERT INTO sales_new SELECT * FROM sales;
        DROP TABLE sales;
        ALTER TABLE sales_new RENAME TO sales;
      `);
      console.log('Migration: added return status to sales table');
    }
  } catch (e) {
    console.log('Sales status migration check:', e.message);
  }

  // ============================================
  // USERS (Authentication)
  // ============================================
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'sales')),
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default admin user (password: admin123)
  const bcrypt = require('bcryptjs');
  const adminExists = db.prepare(`SELECT id, password_hash FROM users WHERE username = 'admin'`).get();
  if (!adminExists) {
    const defaultAdminHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, name, role)
      VALUES ('admin', ?, 'Administrator', 'admin')
    `).run(defaultAdminHash);
  } else {
    // Migration: Fix invalid password hash (placeholder hash that doesn't work)
    // Check if the hash is invalid (placeholder or too short)
    if (adminExists.password_hash && (
      adminExists.password_hash.includes('XXXX') ||
      adminExists.password_hash.length < 60
    )) {
      const validHash = bcrypt.hashSync('admin123', 10);
      db.prepare(`UPDATE users SET password_hash = ? WHERE username = 'admin'`).run(validHash);
      console.log('Admin password hash has been fixed.');
    }
  }

  // Insert default settings
  const defaultSettings = [
    { key: 'currency', value: 'DZD' },
    { key: 'currency_symbol', value: 'د.ج' },
    { key: 'business_name', value: 'شركة التمور الجزائرية' },
    { key: 'business_name_fr', value: 'Société des Dattes Algériennes' },
    { key: 'business_address', value: '' },
    { key: 'business_phone', value: '' },
    { key: 'business_email', value: '' },
    { key: 'business_nif', value: '' },
    { key: 'business_rc', value: '' },
    { key: 'business_ai', value: '' },
    { key: 'business_nis', value: '' },
    { key: 'business_rib', value: '' },
    { key: 'tva_rate', value: '19' },
    { key: 'low_stock_threshold', value: '10' },
    { key: 'invoice_prefix', value: 'FAC' },
    { key: 'delivery_prefix', value: 'BL' },
    { key: 'proforma_prefix', value: 'PRO' },
    { key: 'next_invoice_number', value: '1' },
    { key: 'next_delivery_number', value: '1' },
    { key: 'next_proforma_number', value: '1' },
    { key: 'purchase_order_prefix', value: 'BC' },
    { key: 'exit_voucher_prefix', value: 'BS' },
    { key: 'credit_note_prefix', value: 'AV' },
    { key: 'quote_prefix', value: 'DEV' },
    { key: 'reception_voucher_prefix', value: 'BR' },
    { key: 'next_purchase_order_number', value: '1' },
    { key: 'next_exit_voucher_number', value: '1' },
    { key: 'next_credit_note_number', value: '1' },
    { key: 'next_quote_number', value: '1' },
    { key: 'next_reception_voucher_number', value: '1' }
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }

  console.log('Database initialized successfully!');
};

module.exports = { initDatabase };
