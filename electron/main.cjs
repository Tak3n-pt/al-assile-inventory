const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

// Database setup
let db = null;
let stockDb = null;
let expensesDb = null;
let suppliersDb = null;
let productsDb = null;
let clientsDb = null;
let employersDb = null;
let reportsDb = null;
let settingsDb = null;
let usersDb = null;

function initializeDatabase() {
  const Database = require('better-sqlite3');
  const dbPath = isDev
    ? path.join(__dirname, '../inventory.db')
    : path.join(app.getPath('userData'), 'inventory.db');

  db = new Database(dbPath);

  // Initialize tables
  const { initDatabase } = require('../src/database/init.cjs');
  initDatabase(db);

  // Initialize query modules
  const { stockQueries } = require('../src/database/stock.cjs');
  const { expensesQueries } = require('../src/database/expenses.cjs');
  const { suppliersQueries } = require('../src/database/suppliers.cjs');
  const { productsQueries } = require('../src/database/products.cjs');
  const { clientsQueries } = require('../src/database/clients.cjs');
  const { employersQueries } = require('../src/database/employers.cjs');
  const { reportsQueries } = require('../src/database/reports.cjs');
  const { settingsQueries } = require('../src/database/settings.cjs');
  const { usersQueries } = require('../src/database/users.cjs');
  stockDb = stockQueries(db);
  expensesDb = expensesQueries(db);
  suppliersDb = suppliersQueries(db);
  productsDb = productsQueries(db);
  clientsDb = clientsQueries(db);
  employersDb = employersQueries(db);
  reportsDb = reportsQueries(db);
  settingsDb = settingsQueries(db);
  usersDb = usersQueries(db);

  console.log('Database initialized at:', dbPath);
}

function getImageStoragePath() {
  const basePath = isDev
    ? path.resolve(__dirname, '..')
    : app.getPath('userData');
  const imgDir = path.resolve(basePath, 'product-images');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  return imgDir;
}

let mainWindow = null;

// Domains that are mirrored to the cloud; a change here triggers a debounced
// push so mobile clients see edits within seconds rather than waiting up to
// 5 min for the next interval. 'employers', 'expenses', 'documents' are
// desktop-only and don't trigger sync.
const SYNC_RELEVANT_DOMAINS = new Set([
  'sales', 'clients', 'products', 'suppliers', 'stock', 'settings', 'users'
]);

let pushDebounceTimer = null;
function schedulePush() {
  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  // 1500ms collapses bursts (POS adding 5 items) into a single push without
  // making the user wait noticeably for their write to appear on mobile.
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    autoSyncPush().catch(err => console.warn('[auto-sync] debounced push failed:', err.message));
  }, 1500);
}

// Broadcast a data-changed event to the renderer so open pages can auto-refresh.
// Called after any mutating handler or sync import. Domains: 'sales' | 'clients' | 'products' | 'stock' | 'suppliers' | 'employers' | 'expenses' | 'documents' | 'settings' | 'users' | 'sync'
function emitDataChanged(...domains) {
  // Trigger immediate push (debounced) for any sync-relevant domain. The
  // 'sync' domain itself is excluded — pull/push completion fires it and we
  // don't want a feedback loop.
  if (domains.some(d => SYNC_RELEVANT_DOMAINS.has(d))) {
    schedulePush();
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;
  for (const d of domains) {
    mainWindow.webContents.send('data-changed', d);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Listen for errors in the renderer process
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('Console:', level, message);
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer crashed!');
  });

  // Fix: Restore keyboard focus after native dialogs (confirm/alert/print)
  // Frameless windows lose webContents focus when native dialogs close
  mainWindow.on('focus', () => {
    mainWindow.webContents.focus();
  });

  // Prevent new windows from opening when React Router navigates or links clicked.
  // By default, Electron opens a new BrowserWindow for window.open() calls.
  // We intercept and deny, letting React Router handle navigation in place.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // For external URLs (http/https to other domains), open in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const { shell } = require('electron');
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent in-app navigation that would replace the whole webContents
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevUrl = isDev && url.startsWith(`http://localhost`);
    const isFileUrl = url.startsWith('file://');
    if (!isDevUrl && !isFileUrl) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    const port = process.env.VITE_PORT || 5566;
    mainWindow.loadURL(`http://localhost:${port}`);
    // DevTools disabled by default. Press F12 or Ctrl+Shift+I to open manually.
  } else {
    // In production, use app.getAppPath() to get the correct path inside asar
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, 'dist', 'index.html');
    console.log('App path:', appPath);
    console.log('Loading from:', indexPath);
    console.log('File exists:', require('fs').existsSync(indexPath));

    // Use loadURL with file:// protocol instead of loadFile for better ES module support
    const url = require('url');
    const fileUrl = url.pathToFileURL(indexPath).href;
    console.log('Loading URL:', fileUrl);

    mainWindow.loadURL(fileUrl).catch(err => {
      console.error('Failed to load URL:', err);
    });
  }
}

// ============================================
// WINDOW CONTROLS
// ============================================
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// ============================================
// STOCK CATEGORIES
// ============================================
ipcMain.handle('stock:getCategories', () => {
  try {
    return { success: true, data: stockDb.getAllCategories() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:addCategory', (_, name, description) => {
  try {
    const result = stockDb.addCategory(name, description);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// STOCK ITEMS
// ============================================
ipcMain.handle('stock:getAll', () => {
  try {
    return { success: true, data: stockDb.getAllStock() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:getById', (_, id) => {
  try {
    return { success: true, data: stockDb.getStockById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:getLowStock', () => {
  try {
    return { success: true, data: stockDb.getLowStockItems() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:search', (_, query) => {
  try {
    return { success: true, data: stockDb.searchStock(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:getByCategory', (_, categoryId) => {
  try {
    return { success: true, data: stockDb.getStockByCategory(categoryId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:add', (_, data) => {
  try {
    const result = stockDb.addStock(data);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:update', (_, id, data) => {
  try {
    const result = stockDb.updateStock(id, data);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:delete', (_, id) => {
  try {
    const result = stockDb.deleteStock(id);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// STOCK QUANTITY OPERATIONS
// ============================================
ipcMain.handle('stock:addQuantity', (_, id, quantity, unitCost, notes) => {
  try {
    const result = stockDb.addStockQuantity(id, quantity, unitCost, notes);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:removeQuantity', (_, id, quantity, notes, refType, refId) => {
  try {
    const result = stockDb.removeStockQuantity(id, quantity, notes, refType, refId);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:adjustQuantity', (_, id, newQuantity, notes) => {
  try {
    const result = stockDb.adjustStockQuantity(id, newQuantity, notes);
    emitDataChanged('stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// STOCK TRANSACTIONS
// ============================================
ipcMain.handle('stock:getTransactions', (_, stockId) => {
  try {
    return { success: true, data: stockDb.getStockTransactions(stockId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:getAllTransactions', (_, limit) => {
  try {
    return { success: true, data: stockDb.getAllTransactions(limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// STOCK STATISTICS
// ============================================
ipcMain.handle('stock:getStats', () => {
  try {
    return { success: true, data: stockDb.getStockStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// EXPENSE CATEGORIES
// ============================================
ipcMain.handle('expenses:getCategories', () => {
  try {
    return { success: true, data: expensesDb.getAllCategories() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:addCategory', (_, name, description) => {
  try {
    const result = expensesDb.addCategory(name, description);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:updateCategory', (_, id, name, description) => {
  try {
    const result = expensesDb.updateCategory(id, name, description);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:deleteCategory', (_, id) => {
  try {
    const result = expensesDb.deleteCategory(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// EXPENSES
// ============================================
ipcMain.handle('expenses:getAll', () => {
  try {
    return { success: true, data: expensesDb.getAllExpenses() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getById', (_, id) => {
  try {
    return { success: true, data: expensesDb.getExpenseById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getByCategory', (_, categoryId) => {
  try {
    return { success: true, data: expensesDb.getExpensesByCategory(categoryId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getByDateRange', (_, startDate, endDate) => {
  try {
    return { success: true, data: expensesDb.getExpensesByDateRange(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getByMonth', (_, year, month) => {
  try {
    return { success: true, data: expensesDb.getExpensesByMonth(year, month) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:search', (_, query) => {
  try {
    return { success: true, data: expensesDb.searchExpenses(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:add', (_, data) => {
  try {
    const result = expensesDb.addExpense(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:update', (_, id, data) => {
  try {
    const result = expensesDb.updateExpense(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:delete', (_, id) => {
  try {
    const result = expensesDb.deleteExpense(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// EXPENSE STATISTICS
// ============================================
ipcMain.handle('expenses:getStats', () => {
  try {
    return { success: true, data: expensesDb.getExpenseStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getMonthlySummary', (_, year) => {
  try {
    return { success: true, data: expensesDb.getMonthlySummary(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getCategorySummary', (_, year, month) => {
  try {
    return { success: true, data: expensesDb.getCategorySummary(year, month) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:getRecurring', () => {
  try {
    return { success: true, data: expensesDb.getRecurringExpenses() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SUPPLIERS
// ============================================
ipcMain.handle('suppliers:getAll', () => {
  try {
    return { success: true, data: suppliersDb.getAllSuppliers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:getById', (_, id) => {
  try {
    return { success: true, data: suppliersDb.getSupplierById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:search', (_, query) => {
  try {
    return { success: true, data: suppliersDb.searchSuppliers(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:add', (_, data) => {
  try {
    const result = suppliersDb.addSupplier(data);
    emitDataChanged('suppliers');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:update', (_, id, data) => {
  try {
    const result = suppliersDb.updateSupplier(id, data);
    emitDataChanged('suppliers');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:updateBalance', (_, id, amount) => {
  try {
    const result = suppliersDb.updateSupplierBalance(id, amount);
    emitDataChanged('suppliers');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:delete', (_, id) => {
  try {
    const result = suppliersDb.deleteSupplier(id);
    emitDataChanged('suppliers');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:getStats', () => {
  try {
    return { success: true, data: suppliersDb.getSupplierStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Supplier payment ledger — same contract as client_payments handlers.
ipcMain.handle('suppliers:recordPayment', (_, data) => {
  try {
    const out = suppliersDb.recordSupplierPayment(data);
    emitDataChanged('suppliers', 'purchases');
    return { success: true, data: out };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:recordVersement', (_, supplierId, amount, opts) => {
  try {
    const out = suppliersDb.recordSupplierVersement(supplierId, amount, opts);
    emitDataChanged('suppliers', 'purchases');
    return { success: true, data: out };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:getPayments', (_, supplierId) => {
  try {
    return { success: true, data: suppliersDb.getSupplierPayments(supplierId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:deletePayment', (_, id, userId) => {
  try {
    const gate = requireAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };
    const out = suppliersDb.deleteSupplierPayment(id);
    emitDataChanged('suppliers', 'purchases');
    return { success: true, data: out };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:updatePayment', (_, id, data, userId) => {
  try {
    const gate = requireAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };
    const out = suppliersDb.updateSupplierPayment(id, data);
    emitDataChanged('suppliers', 'purchases');
    return { success: true, data: out };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:audit', () => {
  try {
    const audited = suppliersDb.auditSuppliers();
    const drifts = audited.filter(a => a.has_drift);
    return { success: true, data: { all: audited, drifts, total_drift_count: drifts.length } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:repairBalance', (_, id, userId) => {
  try {
    const user = usersDb.getUserById(userId);
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Only admins can repair balances' };
    }
    const out = suppliersDb.repairSupplierBalance(id, userId);
    emitDataChanged('suppliers');
    return { success: true, data: out };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PURCHASES
// ============================================
ipcMain.handle('purchases:getAll', () => {
  try {
    return { success: true, data: suppliersDb.getAllPurchases() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:getById', (_, id) => {
  try {
    return { success: true, data: suppliersDb.getPurchaseById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:getBySupplier', (_, supplierId) => {
  try {
    return { success: true, data: suppliersDb.getPurchasesBySupplier(supplierId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:getByStatus', (_, status) => {
  try {
    return { success: true, data: suppliersDb.getPurchasesByStatus(status) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:getUnpaid', () => {
  try {
    return { success: true, data: suppliersDb.getUnpaidPurchases() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:add', (_, data) => {
  try {
    const result = suppliersDb.addPurchase(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:update', (_, id, data) => {
  try {
    const result = suppliersDb.updatePurchase(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:addPayment', (_, id, amount) => {
  try {
    const result = suppliersDb.updatePurchasePayment(id, amount);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:delete', (_, id) => {
  try {
    const result = suppliersDb.deletePurchase(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PURCHASE ITEMS
// ============================================
ipcMain.handle('purchases:getItems', (_, purchaseId) => {
  try {
    return { success: true, data: suppliersDb.getPurchaseItems(purchaseId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:addItem', (_, data) => {
  try {
    const result = suppliersDb.addPurchaseItem(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:updateItem', (_, id, data) => {
  try {
    const result = suppliersDb.updatePurchaseItem(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:deleteItem', (_, id) => {
  try {
    const result = suppliersDb.deletePurchaseItem(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PRODUCTS
// ============================================
ipcMain.handle('products:getAll', () => {
  try {
    return { success: true, data: productsDb.getAllProducts() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:getById', (_, id) => {
  try {
    return { success: true, data: productsDb.getProductById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:search', (_, query) => {
  try {
    return { success: true, data: productsDb.searchProducts(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:add', (_, data) => {
  try {
    const result = productsDb.addProduct(data);
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:update', (_, id, data) => {
  try {
    const result = productsDb.updateProduct(id, data);
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:delete', (_, id) => {
  try {
    const product = productsDb.getProductById(id);
    const result = productsDb.deleteProduct(id);
    if (product && product.image_path) {
      const imgDir = getImageStoragePath();
      const filePath = path.join(imgDir, product.image_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore cleanup errors */ }
      }
    }
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:getStats', () => {
  try {
    return { success: true, data: productsDb.getProductStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PRODUCT RECIPES
// ============================================
ipcMain.handle('products:getRecipe', (_, productId) => {
  try {
    return { success: true, data: productsDb.getProductRecipe(productId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:setRecipe', (_, productId, items) => {
  try {
    const result = productsDb.setProductRecipe(productId, items);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:addRecipeItem', (_, data) => {
  try {
    const result = productsDb.addRecipeItem(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:deleteRecipeItem', (_, id) => {
  try {
    const result = productsDb.deleteRecipeItem(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:calculateCost', (_, productId, quantity) => {
  try {
    const cost = productsDb.calculateProductCost(productId, quantity);
    return { success: true, data: cost };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:checkStock', (_, productId, quantity) => {
  try {
    const result = productsDb.checkStockAvailability(productId, quantity);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Smart barcode lookup: exact first, then zero-normalized (handles EAN-13 padding
// mismatches between scanners and manually entered barcodes). Returns undefined if
// neither hits. Filters is_active so deactivated products can never be scanned.
ipcMain.handle('products:getByBarcode', (_, barcode) => {
  try {
    const clean = String(barcode || '').trim();
    if (!clean) return { success: true, data: null };
    let product = productsDb.getProductByBarcode(clean);
    if (!product) product = productsDb.getProductByBarcodeNormalized(clean);
    return { success: true, data: product || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:getFavorites', () => {
  try {
    return { success: true, data: productsDb.getFavoriteProducts() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:toggleFavorite', (_, id) => {
  try {
    const result = productsDb.toggleFavorite(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:updateBarcode', (_, id, barcode) => {
  try {
    const result = productsDb.updateBarcode(id, barcode);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:adjustQuantity', (_, id, newQuantity, notes) => {
  try {
    const result = productsDb.adjustProductQuantity(id, newQuantity, notes);
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:setInitialQuantity', (_, id, quantity, notes) => {
  try {
    const result = productsDb.setInitialQuantity(id, quantity, notes);
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:addResaleStock', (_, id, quantity, unitCost, notes) => {
  try {
    const result = productsDb.addResaleStock(id, quantity, unitCost, notes);
    emitDataChanged('products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PRODUCT IMAGES
// ============================================
ipcMain.handle('products:selectImage', async (_, productId) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, data: null };
    }
    const sourcePath = result.filePaths[0];
    const stats = fs.statSync(sourcePath);
    if (stats.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image file too large. Maximum size is 5MB.' };
    }
    const ext = path.extname(sourcePath).toLowerCase();
    const fileName = `product_${productId || Date.now()}_${Date.now()}${ext}`;
    const imgDir = getImageStoragePath();
    const destPath = path.join(imgDir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return { success: true, data: { fileName, fullPath: destPath } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Path-traversal-safe: require resolved path to start with imgDir + separator (defeats symlink + prefix tricks on Windows)
function isPathWithin(parent, candidate) {
  const p = path.normalize(parent) + path.sep;
  const c = path.normalize(candidate);
  return c.startsWith(p);
}

ipcMain.handle('products:deleteImage', (_, fileName) => {
  try {
    if (!fileName) return { success: true };
    const imgDir = getImageStoragePath();
    const filePath = path.resolve(imgDir, fileName);
    if (!isPathWithin(imgDir, filePath)) {
      return { success: false, error: 'Invalid file path' };
    }
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Async read to avoid blocking the main-process event loop
ipcMain.handle('products:getImagePath', async (_, fileName) => {
  try {
    if (!fileName) return { success: true, data: null };
    const imgDir = getImageStoragePath();
    const fullPath = path.resolve(imgDir, fileName);
    if (!isPathWithin(imgDir, fullPath)) {
      return { success: false, error: 'Invalid file path' };
    }
    if (!fs.existsSync(fullPath)) {
      return { success: true, data: null };
    }
    const ext = path.extname(fullPath).toLowerCase().replace('.', '');
    const mimeType = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
    const buf = await fs.promises.readFile(fullPath);
    const dataUrl = `data:${mimeType};base64,${buf.toString('base64')}`;
    return { success: true, data: dataUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PRODUCTION BATCHES
// ============================================
ipcMain.handle('batches:getAll', () => {
  try {
    return { success: true, data: productsDb.getAllBatches() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:getById', (_, id) => {
  try {
    return { success: true, data: productsDb.getBatchById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:getByProduct', (_, productId) => {
  try {
    return { success: true, data: productsDb.getBatchesByProduct(productId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:create', (_, data) => {
  try {
    const result = productsDb.createBatch(data);
    emitDataChanged('products', 'stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:update', (_, id, data) => {
  try {
    const result = productsDb.updateBatch(id, data);
    emitDataChanged('products', 'stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:delete', (_, id) => {
  try {
    const result = productsDb.deleteBatch(id);
    emitDataChanged('products', 'stock');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// CLIENTS
// ============================================
ipcMain.handle('clientCategories:getAll', () => {
  try {
    return { success: true, data: clientsDb.getClientCategories() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clientCategories:add', (_, name) => {
  try {
    const result = clientsDb.addClientCategory(name);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:getAll', () => {
  try {
    return { success: true, data: clientsDb.getAllClients() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:getById', (_, id) => {
  try {
    return { success: true, data: clientsDb.getClientById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:search', (_, query) => {
  try {
    return { success: true, data: clientsDb.searchClients(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:getWithDebt', () => {
  try {
    return { success: true, data: clientsDb.getClientsWithDebt() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:add', (_, data) => {
  try {
    const result = clientsDb.addClient(data);
    emitDataChanged('clients');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:update', (_, id, data) => {
  try {
    const result = clientsDb.updateClient(id, data);
    emitDataChanged('clients');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// REMOVED: clients:updateBalance — it bypassed the ledger. Callers must use
// clients:recordPayment (versement) or clients:adjustBalance (admin) instead.

// Record a reminder contact (WhatsApp/call/in-person). Stamps the time and
// optionally a short free-form note so the shopkeeper can tell at a glance
// whether they already nudged this client today.
ipcMain.handle('clients:recordContact', (_, id, note) => {
  try {
    clientsDb.recordContact(id, note);
    emitDataChanged('clients');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Balance audit: compare each client's stored balance to the value computed
// from their transaction history (payments - unpaid sale remainders). Returns
// the drift list so the UI can flag discrepancies.
ipcMain.handle('clients:audit', () => {
  try {
    const rows = db.prepare(`
      SELECT
        c.id, c.name, c.phone, c.balance AS stored_balance,
        COALESCE((SELECT SUM(amount) FROM client_payments WHERE client_id = c.id), 0) AS sum_payments,
        COALESCE((SELECT SUM(total - paid_amount) FROM sales
                   WHERE client_id = c.id AND status NOT IN ('paid','cancelled')), 0) AS sum_outstanding
      FROM clients c
      ORDER BY c.name ASC
    `).all();
    const audited = rows.map(r => {
      const expected = Math.round((r.sum_payments - r.sum_outstanding) * 100) / 100;
      const stored   = Math.round(r.stored_balance * 100) / 100;
      const drift    = Math.round((stored - expected) * 100) / 100;
      return {
        id: r.id, name: r.name, phone: r.phone,
        stored_balance: stored, expected_balance: expected, drift,
        has_drift: Math.abs(drift) > 0.005,
      };
    });
    const drifts = audited.filter(a => a.has_drift);
    return { success: true, data: { all: audited, drifts, total_drift_count: drifts.length } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Admin-only balance repair with audit trail. Writes a zero-amount
// balance_correction row to client_payments so the fix is traceable in the
// ledger, then sets clients.balance to the computed value.
ipcMain.handle('clients:repairBalance', (_, id, userId) => {
  try {
    const user = usersDb.getUserById(userId);
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Only admins can repair balances' };
    }
    const client = db.prepare('SELECT id, balance FROM clients WHERE id = ?').get(id);
    if (!client) return { success: false, error: 'Client not found' };

    const sumPayments = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM client_payments WHERE client_id = ?'
    ).get(id).s;
    const sumOutstanding = db.prepare(
      `SELECT COALESCE(SUM(total - paid_amount), 0) AS s FROM sales
        WHERE client_id = ? AND status NOT IN ('paid','cancelled')`
    ).get(id).s;
    const expected = Math.round((sumPayments - sumOutstanding) * 100) / 100;
    const oldBalance = Math.round(client.balance * 100) / 100;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO client_payments
          (client_id, sale_id, amount, date, method, notes, batch_id, created_by)
        VALUES (?, NULL, 0, ?, 'balance_correction', ?, ?, ?)
      `).run(
        id,
        new Date().toISOString().slice(0, 10),
        `Balance corrected from ${oldBalance.toFixed(2)} to ${expected.toFixed(2)}`,
        `repair-${id}-${Date.now()}`,
        userId || null
      );
      db.prepare('UPDATE clients SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(expected, id);
    })();

    emitDataChanged('clients');
    return { success: true, data: { id, old_balance: oldBalance, balance: expected } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:delete', (_, id) => {
  try {
    const result = clientsDb.deleteClient(id);
    emitDataChanged('clients', 'sales', 'products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:getStats', () => {
  try {
    return { success: true, data: clientsDb.getClientStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// CLIENT PAYMENTS (ledger: versement global + edit + delete + admin adjustment)
// ============================================

// Resolve which user is making the call from the passed-in userId.
// Admin role is required for direct balance adjustments.
function requireAdmin(userId) {
  if (!userId) return { ok: false, error: 'User ID required' };
  const user = db.prepare('SELECT role FROM users WHERE id = ? AND is_active = 1').get(userId);
  if (!user) return { ok: false, error: 'User not found or inactive' };
  if (user.role !== 'admin') return { ok: false, error: 'Only admins can adjust balances' };
  return { ok: true };
}

// Versement global. FIFO allocation across unpaid sales; excess goes to credit.
ipcMain.handle('clients:recordPayment', (_, clientId, amount, opts = {}) => {
  try {
    const result = clientsDb.recordClientPayment(clientId, amount, opts);
    emitDataChanged('clients', 'sales');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:getPayments', (_, clientId) => {
  try {
    return { success: true, data: clientsDb.getClientPayments(clientId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Edit/delete guard: adjustment rows are admin-made; letting a non-admin mutate
// them would erase the audit trail that the admin gate was supposed to protect.
// Everyone can edit/delete their own cash/bank/return/credit_carry rows.
function canMutatePayment(paymentId, userId) {
  const p = db.prepare('SELECT method FROM client_payments WHERE id = ?').get(paymentId);
  if (!p) return { ok: true }; // repo will throw "not found"
  if (p.method === 'adjustment') {
    const gate = requireAdmin(userId);
    if (!gate.ok) return { ok: false, error: 'Only admins can edit or delete balance adjustments' };
  }
  return { ok: true };
}

ipcMain.handle('clients:updatePayment', (_, id, data, userId) => {
  try {
    const gate = canMutatePayment(id, userId);
    if (!gate.ok) return { success: false, error: gate.error };
    const result = clientsDb.updateClientPayment(id, data);
    emitDataChanged('clients', 'sales');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:deletePayment', (_, id, userId) => {
  try {
    const gate = canMutatePayment(id, userId);
    if (!gate.ok) return { success: false, error: gate.error };
    const result = clientsDb.deleteClientPayment(id);
    emitDataChanged('clients', 'sales');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:adjustBalance', (_, clientId, delta, reason, userId) => {
  try {
    const gate = requireAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };
    const result = clientsDb.adjustClientBalance(clientId, delta, reason, { created_by: userId });
    emitDataChanged('clients');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SALES
// ============================================
ipcMain.handle('sales:getAll', () => {
  try {
    return { success: true, data: clientsDb.getAllSales() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getById', (_, id) => {
  try {
    return { success: true, data: clientsDb.getSaleById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getByClient', (_, clientId) => {
  try {
    return { success: true, data: clientsDb.getSalesByClient(clientId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getByStatus', (_, status) => {
  try {
    return { success: true, data: clientsDb.getSalesByStatus(status) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getByDateRange', (_, startDate, endDate) => {
  try {
    return { success: true, data: clientsDb.getSalesByDateRange(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getUnpaid', () => {
  try {
    return { success: true, data: clientsDb.getUnpaidSales() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Atomic cart checkout: header + items + stock + balance in one transaction.
// (Previously there was also a legacy sales:add handler that took headers only and
//  relied on the renderer to follow up with sales:addItem calls — removed after the
//  atomic checkout refactor so the non-atomic path cannot be resurrected by a
//  compromised renderer.)
ipcMain.handle('sales:createComplete', (_, saleData) => {
  try {
    const result = clientsDb.addSale(saleData);
    emitDataChanged('sales', 'clients', 'products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:update', (_, id, data) => {
  try {
    const result = clientsDb.updateSale(id, data);
    emitDataChanged('sales', 'clients');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Pass opts so the ledger row gets created_by / date / method stamped.
// Without this, mobile-style 24h correction-window checks (created_by === userId)
// fail for desktop-recorded payments because the row has no author.
ipcMain.handle('sales:addPayment', (_, id, amount, opts = {}) => {
  try {
    const result = clientsDb.addPayment(id, amount, opts);
    emitDataChanged('sales', 'clients');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:delete', (_, id) => {
  try {
    const result = clientsDb.deleteSale(id);
    emitDataChanged('sales', 'clients', 'products');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SALE ITEMS
// ============================================
ipcMain.handle('sales:getItems', (_, saleId) => {
  try {
    return { success: true, data: clientsDb.getSaleItems(saleId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:addItem', (_, data) => {
  try {
    const result = clientsDb.addSaleItem(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:updateItem', (_, id, data) => {
  try {
    const result = clientsDb.updateSaleItem(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:deleteItem', (_, id) => {
  try {
    const result = clientsDb.deleteSaleItem(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SALES STATISTICS
// ============================================
ipcMain.handle('sales:getSummary', (_, year, month) => {
  try {
    return { success: true, data: clientsDb.getSalesSummary(year, month) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getTopProducts', (_, limit) => {
  try {
    return { success: true, data: clientsDb.getTopProducts(limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:getMonthlySales', (_, year) => {
  try {
    return { success: true, data: clientsDb.getMonthlySales(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// EMPLOYERS
// ============================================
ipcMain.handle('employers:getAll', () => {
  try {
    return { success: true, data: employersDb.getAllEmployers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:getById', (_, id) => {
  try {
    return { success: true, data: employersDb.getEmployerById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:getActive', () => {
  try {
    return { success: true, data: employersDb.getActiveEmployers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:search', (_, query) => {
  try {
    return { success: true, data: employersDb.searchEmployers(query) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:add', (_, data) => {
  try {
    const result = employersDb.addEmployer(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:update', (_, id, data) => {
  try {
    const result = employersDb.updateEmployer(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:delete', (_, id) => {
  try {
    const result = employersDb.deleteEmployer(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('employers:getStats', () => {
  try {
    return { success: true, data: employersDb.getEmployerStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// PAYROLL
// ============================================
ipcMain.handle('payroll:getAll', () => {
  try {
    return { success: true, data: employersDb.getAllPayroll() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:getById', (_, id) => {
  try {
    return { success: true, data: employersDb.getPayrollById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:getByEmployer', (_, employerId) => {
  try {
    return { success: true, data: employersDb.getPayrollByEmployer(employerId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:getByMonth', (_, year, month) => {
  try {
    return { success: true, data: employersDb.getPayrollByMonth(year, month) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:getPending', () => {
  try {
    return { success: true, data: employersDb.getPendingPayroll() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:add', (_, data) => {
  try {
    const result = employersDb.addPayroll(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:update', (_, id, data) => {
  try {
    const result = employersDb.updatePayroll(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:markPaid', (_, id, paymentDate) => {
  try {
    const result = employersDb.markPayrollPaid(id, paymentDate);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:delete', (_, id) => {
  try {
    const result = employersDb.deletePayroll(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:generate', (_, year, month) => {
  try {
    const result = employersDb.generateMonthlyPayroll(year, month);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('payroll:getSummary', (_, year) => {
  try {
    return { success: true, data: employersDb.getPayrollSummary(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// REPORTS
// ============================================
ipcMain.handle('reports:getProfitLoss', (_, startDate, endDate) => {
  try {
    return { success: true, data: reportsDb.getProfitLoss(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getMonthlyProfitLoss', (_, year) => {
  try {
    return { success: true, data: reportsDb.getMonthlyProfitLoss(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getLowStockItems', () => {
  try {
    return { success: true, data: reportsDb.getLowStockItems() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getOutOfStockItems', () => {
  try {
    return { success: true, data: reportsDb.getOutOfStockItems() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getStockValuation', () => {
  try {
    return { success: true, data: reportsDb.getStockValuation() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getStockByCategory', () => {
  try {
    return { success: true, data: reportsDb.getStockByCategory() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getProductionHistory', (_, limit) => {
  try {
    return { success: true, data: reportsDb.getProductionHistory(limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getProductionByProduct', () => {
  try {
    return { success: true, data: reportsDb.getProductionByProduct() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getProductionByMonth', (_, year) => {
  try {
    return { success: true, data: reportsDb.getProductionByMonth(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getSalesByClient', (_, startDate, endDate) => {
  try {
    return { success: true, data: reportsDb.getSalesByClient(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getTopProducts', (_, startDate, endDate, limit) => {
  try {
    return { success: true, data: reportsDb.getTopProducts(startDate, endDate, limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getSalesByStatus', () => {
  try {
    return { success: true, data: reportsDb.getSalesByStatus() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getMonthlySales', (_, year) => {
  try {
    return { success: true, data: reportsDb.getMonthlySales(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getExpensesByCategory', (_, startDate, endDate) => {
  try {
    return { success: true, data: reportsDb.getExpensesByCategory(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getMonthlyExpenses', (_, year) => {
  try {
    return { success: true, data: reportsDb.getMonthlyExpenses(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getTopExpenses', (_, startDate, endDate, limit) => {
  try {
    return { success: true, data: reportsDb.getTopExpenses(startDate, endDate, limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getPurchasesBySupplier', (_, startDate, endDate) => {
  try {
    return { success: true, data: reportsDb.getPurchasesBySupplier(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getMonthlyPurchases', (_, year) => {
  try {
    return { success: true, data: reportsDb.getMonthlyPurchases(year) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:getDashboardStats', () => {
  try {
    return { success: true, data: reportsDb.getDashboardStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SETTINGS
// ============================================
ipcMain.handle('settings:getAll', () => {
  try {
    return { success: true, data: settingsDb.getAllSettings() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:get', (_, key) => {
  try {
    return { success: true, data: settingsDb.getSetting(key) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:set', (_, key, value) => {
  try {
    const result = settingsDb.setSetting(key, value);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:setMultiple', (_, settings) => {
  try {
    const result = settingsDb.setMultipleSettings(settings);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// DOCUMENTS
// ============================================
ipcMain.handle('documents:getAll', (_, limit) => {
  try {
    return { success: true, data: settingsDb.getAllDocuments(limit) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getByType', (_, type) => {
  try {
    return { success: true, data: settingsDb.getDocumentsByType(type) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getById', (_, id) => {
  try {
    return { success: true, data: settingsDb.getDocumentById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getBySale', (_, saleId) => {
  try {
    return { success: true, data: settingsDb.getDocumentsBySale(saleId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getByClient', (_, clientId) => {
  try {
    return { success: true, data: settingsDb.getDocumentsByClient(clientId) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getByDateRange', (_, startDate, endDate) => {
  try {
    return { success: true, data: settingsDb.getDocumentsByDateRange(startDate, endDate) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:create', (_, data) => {
  try {
    const result = settingsDb.createDocument(data);
    emitDataChanged('documents', 'settings');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:delete', (_, id) => {
  try {
    const result = settingsDb.deleteDocument(id);
    emitDataChanged('documents');
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:getStats', () => {
  try {
    return { success: true, data: settingsDb.getDocumentStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// NOTE: Document numbers are allocated atomically at creation time.
// This preview endpoint is kept for UI hints only — never persist the value.
// Two flows displaying a preview may show the same number; the real allocation
// happens inside documents:create under a transaction.
ipcMain.handle('documents:getNextNumber', (_, type) => {
  try {
    return { success: true, data: settingsDb.getNextDocumentNumber(type), preview: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// AUTHENTICATION
// ============================================
ipcMain.handle('auth:login', (_, username, password) => {
  try {
    return usersDb.login(username, password);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Re-validate a stored user session against the DB. The renderer calls this on
// every app launch; if the user was deleted/deactivated or their role changed
// from under localStorage, we return the authoritative record (never password_hash).
ipcMain.handle('auth:verifySession', (_, userId) => {
  try {
    if (!userId) return { success: false, error: 'No user id' };
    const row = db.prepare(
      'SELECT id, username, name, role, is_active FROM users WHERE id = ?'
    ).get(userId);
    if (!row) return { success: false, error: 'User no longer exists' };
    if (!row.is_active) return { success: false, error: 'User is inactive' };
    return { success: true, user: row };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:verifyPassword', (_, userId, password) => {
  try {
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    const bcrypt = require('bcryptjs');
    const isValid = bcrypt.compareSync(password, user.password_hash);
    return { success: isValid, error: isValid ? null : 'Invalid password' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// USERS MANAGEMENT
// ============================================
ipcMain.handle('users:getAll', () => {
  try {
    return { success: true, data: usersDb.getAllUsers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:getById', (_, id) => {
  try {
    return { success: true, data: usersDb.getUserById(id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:add', (_, data) => {
  try {
    // Check if username exists
    if (usersDb.usernameExists(data.username)) {
      return { success: false, error: 'Username already exists' };
    }
    const result = usersDb.addUser(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:update', (_, id, data) => {
  try {
    // Check if username exists for other users
    if (usersDb.usernameExists(data.username, id)) {
      return { success: false, error: 'Username already exists' };
    }
    const result = usersDb.updateUser(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:updatePassword', (_, id, newPassword) => {
  try {
    const result = usersDb.updatePassword(id, newPassword);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:delete', (_, id) => {
  try {
    const result = usersDb.deleteUser(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:getStats', () => {
  try {
    return { success: true, data: usersDb.getUserStats() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// CLOUD SYNC
// ============================================

// Auto-sync: periodic push (every 5min) and pull (every 2min)
// Separate flags so a slow push can't block a pull and vice versa.
let autoSyncPushing = false;
let autoSyncPulling = false;

// Hard timeout for sync HTTP calls. Without this, a dead cloud server could
// keep a fetch hanging for Node's default (~300s) and the in-flight flag would
// stay true the whole time, silently skipping every scheduled cycle.
const SYNC_HTTP_TIMEOUT_MS = 30_000;
function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), SYNC_HTTP_TIMEOUT_MS);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(to));
}

// Read product images asynchronously to avoid blocking the main process event loop
async function buildSyncPayload() {
  const products = productsDb.getAllProducts();
  const productsWithImages = [];
  for (const p of products) {
    let image_data = null;
    if (p.image_path) {
      try {
        const imgDir = getImageStoragePath();
        const fullPath = path.resolve(imgDir, p.image_path);
        if (isPathWithin(imgDir, fullPath) && fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
          const buf = await fs.promises.readFile(fullPath);
          image_data = `data:${mime};base64,${buf.toString('base64')}`;
        }
      } catch (e) {
        console.warn('[sync] Failed to read image for product', p.id, e.message);
      }
    }
    productsWithImages.push({ ...p, image_data });
  }

  const clients = clientsDb.getAllClients();
  // Mirror the clients shape: full row list including remote_id so the mobile
  // side can match existing mobile-origin rows by remote_id on reinsert.
  const suppliers = db.prepare(`
    SELECT id, name, phone, address, email, notes, balance, remote_id,
           created_at, updated_at
    FROM suppliers
  `).all();
  // Supplier payments ledger — mobile re-creates the full ledger on each push
  // so per-supplier balance stays derivable. purchase_id is preserved only as
  // metadata; mobile has no purchases table so this is informational.
  const supplierPayments = db.prepare(`
    SELECT id, supplier_id, purchase_id, amount, date, method, notes,
           batch_id, created_by, remote_id, created_at
    FROM supplier_payments
  `).all();
  // Desktop-origin sales. Only push sales that were CREATED on desktop
  // (remote_id IS NULL) — a mobile-origin sale gets a numeric remote_id when
  // desktop imports it, and pushing those back would duplicate them on mobile.
  // No date cutoff: edits to older sales must still reach mobile, and a few
  // thousand sale rows is negligible JSON payload for SQLite.
  const salesRows = db.prepare(`
    SELECT id, client_id, date, subtotal, discount, total, paid_amount,
           status, notes, created_at
    FROM sales
    WHERE remote_id IS NULL
    ORDER BY date DESC, id DESC
  `).all();
  const saleIds = salesRows.map(s => s.id);
  let saleItemsRows = [];
  let clientPaymentsRows = [];
  if (saleIds.length > 0) {
    const ph = saleIds.map(() => '?').join(',');
    saleItemsRows = db.prepare(`
      SELECT id, sale_id, product_id, quantity, unit_price, total, created_at
      FROM sale_items
      WHERE sale_id IN (${ph})
    `).all(...saleIds);
    // Only push payments that are desktop-origin (remote_id IS NULL) and that
    // attach either to one of the pushed sales or to no sale at all (on-account).
    // Exclude any payment with a remote_id — those came from mobile originally.
    clientPaymentsRows = db.prepare(`
      SELECT id, client_id, sale_id, amount, date, method, notes, batch_id,
             created_by, created_at
      FROM client_payments
      WHERE remote_id IS NULL
        AND (sale_id IS NULL OR sale_id IN (${ph}))
    `).all(...saleIds);
  } else {
    clientPaymentsRows = db.prepare(`
      SELECT id, client_id, sale_id, amount, date, method, notes, batch_id,
             created_by, created_at
      FROM client_payments
      WHERE remote_id IS NULL AND sale_id IS NULL
    `).all();
  }

  // password_hash is a bcrypt hash (one-way); mobile needs it to authenticate users.
  // Channel is authenticated via X-Sync-Key.
  const users = db.prepare('SELECT id, username, password_hash, name, role, is_active, last_login, created_at FROM users').all();
  const settingsObj = settingsDb.getAllSettings();
  const settings = Object.entries(settingsObj).map(([key, value]) => ({ key, value }));

  return {
    products: productsWithImages,
    clients,
    suppliers,
    supplier_payments: supplierPayments,
    sales:      salesRows,
    sale_items: saleItemsRows,
    client_payments: clientPaymentsRows,
    users,
    settings
  };
}

// Record the outcome of every sync attempt — success OR failure — so the UI
// can render a fresh status banner. Without this, silent network failures
// look identical to "app working fine" and the user discovers them weeks later.
function recordSyncOutcome(kind, ok, errorMessage) {
  try {
    const now = new Date().toISOString();
    settingsDb.setSetting('last_sync_attempt_at', now);
    settingsDb.setSetting('last_sync_attempt_kind', kind); // 'push' | 'pull'
    settingsDb.setSetting('last_sync_attempt_ok', ok ? '1' : '0');
    settingsDb.setSetting('last_sync_error', ok ? '' : (errorMessage || 'Unknown error'));
  } catch (e) {
    // Never let status bookkeeping crash a sync cycle
    console.warn('[sync] could not record outcome:', e.message);
  }
}

async function autoSyncPush() {
  if (autoSyncPushing) return;
  // In dev mode, auto-sync is disabled so editing the app on a dev machine
  // can never overwrite a client's cloud data. Use the Settings → Push button
  // for deliberate, manual sync tests, or set ALLOW_DEV_SYNC=1 to re-enable.
  if (isDev && process.env.ALLOW_DEV_SYNC !== '1') return;
  try {
    const serverUrl = settingsDb.getSetting('cloud_server_url');
    const syncKey = settingsDb.getSetting('cloud_sync_key');
    if (!serverUrl || !syncKey) {
      recordSyncOutcome('push', false, 'Not configured: cloud_server_url or cloud_sync_key missing');
      return;
    }

    autoSyncPushing = true;
    console.log('[auto-sync] Pushing to cloud...');

    const payload = await buildSyncPayload();

    const response = await fetchWithTimeout(`${serverUrl}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      settingsDb.setSetting('last_sync_push', new Date().toISOString());
      recordSyncOutcome('push', true);
      console.log('[auto-sync] Push complete:', result.counts);
    } else {
      recordSyncOutcome('push', false, result.error || `HTTP ${response.status}`);
      console.log('[auto-sync] Push failed:', result.error);
    }
  } catch (err) {
    recordSyncOutcome('push', false, err.message);
    console.log('[auto-sync] Error:', err.message);
  } finally {
    autoSyncPushing = false;
  }
}

// Stale remote_id collision detector. When the mobile DB is reset (e.g.
// ephemeral storage wipe, manual reset), incoming ids restart from 1 and
// collide with remote_ids we imported from a prior mobile instance. Those
// old rows are valid history we want to keep, but the UNIQUE constraint
// blocks the new import. This helper ONLY detects — it never mutates.
// The caller is expected to call archiveStaleRow() inside the same
// transaction as the subsequent INSERT, so the archive + INSERT pair is
// atomic (a crash between them would otherwise orphan a stale row).
//   - 'same'  → existing row matches, caller should skip (idempotent replay)
//   - 'stale' → existing row mismatches; caller should archive + insert
//   - 'none'  → no existing row, caller should insert
const SYNC_STALE_TABLES = new Set(['clients', 'suppliers', 'sales', 'client_payments', 'supplier_payments']);
function detectStaleRemoteId(table, remoteId, compareFields) {
  if (!SYNC_STALE_TABLES.has(table)) throw new Error(`detectStaleRemoteId: unsupported table ${table}`);
  const existing = db.prepare(`SELECT * FROM ${table} WHERE remote_id = ?`).get(remoteId);
  if (!existing) return { state: 'none' };
  // Skip fields whose incoming value is undefined — the payload didn't tell
  // us, so we can't use it to disambiguate. Treating undefined as a mismatch
  // would archive rows on every replay when the mobile side happens not to
  // include the field.
  const compare = Object.entries(compareFields).filter(([, v]) => v !== undefined);
  const same = compare.every(([key, value]) => {
    const ev = existing[key];
    if (value == null && ev == null) return true;
    if (value == null || ev == null) return false;
    if (typeof value === 'number' && typeof ev === 'number') {
      return Math.round(ev * 100) === Math.round(value * 100);
    }
    return String(ev) === String(value);
  });
  return same ? { state: 'same', existing } : { state: 'stale', existing };
}
// Called inside the caller's transaction, paired with detectStaleRemoteId.
// Renames the colliding row's remote_id so the new INSERT can claim it.
function archiveStaleRow(table, existingId, oldRemoteId) {
  if (!SYNC_STALE_TABLES.has(table)) throw new Error(`archiveStaleRow: unsupported table ${table}`);
  const archived = `${oldRemoteId}-stale-${Date.now()}`;
  db.prepare(`UPDATE ${table} SET remote_id = ? WHERE id = ?`).run(archived, existingId);
  console.warn(`[auto-sync] stale ${table} remote_id=${oldRemoteId} archived as ${archived} (existing id=${existingId})`);
}

// Import a single remote sale through the repository layer with idempotency and ID validation.
// Returns { ok, skipped, error }
function importRemoteSale(sale) {
  try {
    // Skip sales with no remote identifier — we can't dedupe them safely
    const remoteId = sale.id != null ? String(sale.id) : (sale.uuid || sale.external_id || null);
    if (!remoteId) {
      return { ok: false, skipped: true, error: 'no remote id on payload' };
    }

    // ---- DELETE action: look up the local sale by remote_id and reverse it.
    // Mirrors the mobile-side reversal: restores stock, unwinds balance,
    // drops items + sale. If the sale was never imported locally we skip
    // silently — nothing to do.
    if (sale.__action === 'delete') {
      const local = db.prepare('SELECT * FROM sales WHERE remote_id = ?').get(remoteId);
      if (!local) return { ok: true, skipped: true };

      const reverse = db.transaction(() => {
        const items = db.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?').all(local.id);
        const restore = db.prepare(
          `UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        );
        for (const it of items) restore.run(it.quantity, it.product_id);

        if (local.client_id) {
          if (local.total > local.paid_amount) {
            db.prepare(`UPDATE clients SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(local.total - local.paid_amount, local.client_id);
          } else if (local.paid_amount > local.total) {
            db.prepare(`UPDATE clients SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
              .run(local.paid_amount - local.total, local.client_id);
          }
        }

        // Any client_payments tied to this sale: drop them (their own delete
        // tombstones will also arrive via the payment stream; the check in
        // that branch handles already-gone rows).
        db.prepare('DELETE FROM client_payments WHERE sale_id = ?').run(local.id);
        db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(local.id);
        db.prepare('DELETE FROM sales WHERE id = ?').run(local.id);
      });
      reverse();
      return { ok: true, skipped: false };
    }

    // Translate mobile client_id → local desktop client id. Mobile-created
    // clients now carry remote_id; desktop-origin clients share the id. If
    // the client still can't be found, the new client row hasn't arrived in
    // this pull batch yet — skip with "not ready" so the next pull retries.
    let localClientId = null;
    if (sale.client_id != null) {
      localClientId = resolveMobileClientId(sale.client_id);
      if (localClientId == null) {
        return { ok: false, skipped: false, error: `client ${sale.client_id} not found locally` };
      }
    }

    // Validate all product_ids before we touch anything
    const items = Array.isArray(sale.items) ? sale.items : [];
    for (const it of items) {
      const p = db.prepare('SELECT 1 FROM products WHERE id = ?').get(it.product_id);
      if (!p) {
        return { ok: false, skipped: false, error: `product ${it.product_id} not found locally` };
      }
    }

    const isReturn = sale.status === 'return' || (Number(sale.total) || 0) < 0;
    const notes = sale.notes
      ? '[Mobile] ' + sale.notes
      : (isReturn ? '[Mobile Return]' : '[Mobile Sale]');

    // Stale remote_id guard. Match on client + date + total only — NOT
    // paid_amount, because that mutates over time as post-creation payments
    // arrive: mobile keeps sale.paid_amount at the at-creation value while
    // desktop's importRemotePayment bumps the local copy. Including it in
    // the fingerprint would cause every post-payment pull to false-positive
    // as a remote_id collision, archive the existing sale, and re-insert.
    // client+date+total is a strong-enough fingerprint after a mobile reset.
    const stale = detectStaleRemoteId('sales', remoteId, {
      client_id:   localClientId,
      date:        sale.date,
      total:       Number(sale.total) || 0,
    });
    if (stale.state === 'same') return { ok: true, skipped: true, localId: stale.existing.id };

    const doImport = db.transaction(() => {
      if (stale.state === 'stale') archiveStaleRow('sales', stale.existing.id, remoteId);
      return clientsDb.addSale({
        client_id: localClientId,
        date: sale.date,
        subtotal: sale.subtotal || sale.total,
        discount: sale.discount || 0,
        total: sale.total,
        paid_amount: sale.paid_amount,
        status: sale.status || (isReturn ? 'return' : 'pending'),
        notes,
        items,
        remote_id: remoteId,
      });
    });
    const result = doImport();

    return { ok: true, skipped: !!result.skipped, localId: result.lastInsertRowid };
  } catch (err) {
    return { ok: false, skipped: false, error: err.message };
  }
}

// Auto-pull mobile sales. Guarded so a slow network can't produce overlapping pulls
// that would try to double-apply the same sales (UNIQUE remote_id saves us on the
// DB side, but reaching that point twice generates noisy logs).
// Idempotent import of a mobile-originated payment row. Uses the "mob-{mobile_id}"
// composite key as remote_id so replays are silent no-ops. Walks the client
// balance + the referenced sale's paid_amount/status in one transaction.
// Resolve a mobile sale_id to the desktop's local sale id. Mobile sale IDs are
// a separate namespace; they land in desktop.sales with remote_id = String(mobileId).
// Returns null if the sale hasn't been pulled yet (unusual — mobile pull returns
// sales before their payments in the same response, so this shouldn't trigger).
function resolveMobileSaleId(mobileSaleId) {
  if (mobileSaleId == null) return null;
  const row = db.prepare('SELECT id FROM sales WHERE remote_id = ?').get(String(mobileSaleId));
  return row ? row.id : null;
}

// Translate a mobile client_id to its local desktop client id via remote_id.
// Returns the input id unchanged if no remote_id match exists (desktop-origin
// clients have their own id and no remote_id row — the direct id works).
function resolveMobileClientId(mobileClientId) {
  if (mobileClientId == null) return null;
  const byRemote = db.prepare('SELECT id FROM clients WHERE remote_id = ?').get(String(mobileClientId));
  if (byRemote) return byRemote.id;
  // Fall back to direct match — this is a desktop-origin client, the id is
  // the same everywhere.
  const direct = db.prepare('SELECT id FROM clients WHERE id = ?').get(mobileClientId);
  return direct ? direct.id : null;
}

// Import a mobile-originated client. Idempotent via remote_id.
//   action='create' — insert a new row (skipped if already present)
//   action='update' — sync the latest field values, including balance (used
//     by the mobile "Audit → Fix" flow to propagate a repaired balance back
//     to desktop). Falls back to create if the client doesn't exist locally.
function importRemoteClient(client) {
  try {
    if (!client || client.id == null) {
      return { ok: false, skipped: true, error: 'no id on client payload' };
    }
    const remoteId = String(client.id);
    const action = client.__action || 'create';
    const existing = db.prepare('SELECT id FROM clients WHERE remote_id = ?').get(remoteId);

    // ---- DELETE: mobile says this client should be removed. Mirror the
    // mobile-side guard: refuse to drop a client that has desktop sales,
    // because nulling sale.client_id would corrupt revenue attribution.
    // For a clean profile (no sales), cascade-delete client_payments via
    // FK and drop the row.
    //
    // The pull marks the sync_log entry as synced regardless of outcome
    // (delivery-once semantics, see sync.js:686-689). So if we returned an
    // error here, the delete would be silently lost forever and the desktop
    // would keep a zombie client mobile already removed. Better to skip with
    // a warning: the client stays on desktop (correct for audit since we
    // have sales referencing it), and the desktop's NEXT push will re-create
    // the client on mobile from the desktop snapshot. Net effect: mobile's
    // "delete" becomes a no-op the user can see (client comes back on next
    // sync), which surfaces the conflict instead of hiding it.
    if (action === 'delete') {
      if (!existing) return { ok: true, skipped: true };
      const saleCount = db.prepare('SELECT COUNT(*) AS c FROM sales WHERE client_id = ?').get(existing.id).c;
      if (saleCount > 0) {
        console.warn(`[sync:pull] Client ${existing.id} has ${saleCount} desktop sales — keeping client (mobile delete ignored).`);
        return { ok: true, skipped: true };
      }
      db.prepare('DELETE FROM clients WHERE id = ?').run(existing.id);
      return { ok: true };
    }

    // ---- UPDATE: sync field values, but RECOMPUTE balance locally from
    // desktop's own ledger. Reason: if the client has desktop-origin sales
    // or payments that mobile doesn't know about, blindly accepting
    // mobile's computed balance would overwrite the accurate local value.
    // Mobile's 'update' action is treated as "re-derive this client's
    // balance from whatever history each side has".
    if (action === 'update' && existing) {
      // Profile fields — take mobile's snapshot as latest.
      db.prepare(`
        UPDATE clients SET
          name              = COALESCE(?, name),
          phone             = COALESCE(?, phone),
          address           = COALESCE(?, address),
          email             = COALESCE(?, email),
          notes             = COALESCE(?, notes),
          credit_blocked    = COALESCE(?, credit_blocked),
          last_contact_note = COALESCE(?, last_contact_note),
          last_contact_at   = COALESCE(?, last_contact_at),
          updated_at        = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        client.name              || null,
        client.phone             || null,
        client.address           || null,
        client.email             || null,
        client.notes             || null,
        client.credit_blocked == null ? null : (client.credit_blocked ? 1 : 0),
        client.last_contact_note || null,
        client.last_contact_at   || null,
        existing.id
      );
      // Balance — recompute from this side's own transaction history.
      // This handles the case where desktop has sales/payments mobile
      // doesn't know about without getting corrupted by mobile's snapshot.
      const sumP = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) AS s FROM client_payments WHERE client_id = ?'
      ).get(existing.id).s;
      const sumO = db.prepare(
        `SELECT COALESCE(SUM(total - paid_amount), 0) AS s FROM sales
          WHERE client_id = ? AND status NOT IN ('paid','cancelled')`
      ).get(existing.id).s;
      const localExpected = Math.round((sumP - sumO) * 100) / 100;
      db.prepare('UPDATE clients SET balance = ? WHERE id = ?')
        .run(localExpected, existing.id);
      return { ok: true, skipped: false, localId: existing.id };
    }

    // ---- CREATE: skip if same row; archive if stale collision.
    // Mobile resets cause old remote_ids ('10', '11', …) to collide with new
    // ones. Compare by name + phone so two different clients with the same
    // name (common) aren't falsely deduped together. Archive + insert run
    // atomically in one transaction so a crash between them can't leave a
    // renamed stale row with no replacement.
    const stale = detectStaleRemoteId('clients', remoteId, {
      name:  client.name,
      phone: client.phone || null,
    });
    if (stale.state === 'same') return { ok: true, skipped: true, localId: stale.existing.id };

    // CRITICAL: insert balance=0 (not client.balance from the snapshot).
    // The snapshot balance already reflects all payments/sales that are
    // ALSO in this same pull. If we took the snapshot value here, the
    // subsequent importRemotePayment/importRemoteSale calls would apply
    // the same delta a second time → balance would be doubled.
    //
    // The correct model: balance is a DERIVED state. Clients always land
    // at zero and are built up from their transaction history. Since
    // mobile POST /api/clients hardcodes balance=0, there's no "opening
    // balance" to preserve — every non-zero balance comes from a payment
    // or sale that's also in the sync queue.
    const tx = db.transaction(() => {
      if (stale.state === 'stale') archiveStaleRow('clients', stale.existing.id, remoteId);
      return db.prepare(`
        INSERT INTO clients
          (name, phone, address, email, notes, balance,
           credit_blocked, last_contact_note, last_contact_at, remote_id)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `).run(
        client.name,
        client.phone             || null,
        client.address           || null,
        client.email             || null,
        client.notes             || null,
        client.credit_blocked ? 1 : 0,
        client.last_contact_note || null,
        client.last_contact_at   || null,
        remoteId
      );
    });
    const result = tx();
    return { ok: true, skipped: false, localId: result.lastInsertRowid };
  } catch (err) {
    return { ok: false, skipped: false, error: err.message };
  }
}

function importRemotePayment(payment) {
  try {
    const action = payment.__action || 'create';

    // ---- DELETE action: find local row by remote_id and reverse it
    if (action === 'delete') {
      const mobileId = payment.id;
      if (!mobileId) return { ok: false, error: 'delete missing id' };
      const remoteId = `mob-${mobileId}`;
      const existing = db.prepare('SELECT * FROM client_payments WHERE remote_id = ?').get(remoteId);
      if (!existing) return { ok: true, skipped: true }; // already gone or never arrived

      const tx = db.transaction(() => {
        if (existing.sale_id) {
          const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(existing.sale_id);
          if (sale) {
            const newPaid = Math.round((sale.paid_amount - existing.amount) * 100) / 100;
            const newStatus = newPaid >= sale.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(Math.max(0, newPaid), newStatus, sale.id);
          }
        }
        db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(existing.amount, existing.client_id);
        db.prepare('DELETE FROM client_payments WHERE id = ?').run(existing.id);
      });
      tx();
      return { ok: true };
    }

    // ---- UPDATE action: adjust the existing row by the delta
    if (action === 'update') {
      const mobileId = payment.id;
      if (!mobileId) return { ok: false, error: 'update missing id' };
      const remoteId = `mob-${mobileId}`;
      const existing = db.prepare('SELECT * FROM client_payments WHERE remote_id = ?').get(remoteId);
      // If the original create was never pulled (e.g. last_sync_pull was reset
      // or the create batch failed), don't silently drop the edit — fall
      // through to the CREATE branch below so the payment still lands.
      if (!existing) {
        console.warn(`[auto-sync] payment update for ${remoteId} has no local row; treating as create`);
        // Intentional fall-through: skip the rest of UPDATE and reach CREATE.
      } else {

      const newAmount = payment.amount;
      const delta = Math.round((newAmount - existing.amount) * 100) / 100;

      const tx = db.transaction(() => {
        if (existing.sale_id) {
          const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(existing.sale_id);
          if (sale) {
            const newPaid = Math.round((sale.paid_amount + delta) * 100) / 100;
            const newStatus = newPaid >= sale.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(Math.max(0, newPaid), newStatus, sale.id);
          }
        }
        db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(delta, existing.client_id);
        db.prepare(`
          UPDATE client_payments SET amount = ?, date = ?, notes = ? WHERE id = ?
        `).run(newAmount, payment.date || existing.date, payment.notes !== undefined ? payment.notes : existing.notes, existing.id);
      });
      tx();
      return { ok: true };
      } // close else (existing found)
      // else: no existing row, fall through to CREATE below
    }

    // ---- CREATE action (default)
    const mobileId = payment.id;
    if (!mobileId) return { ok: false, error: 'no mobile payment id' };
    const remoteId = `mob-${mobileId}`;

    if (!payment.client_id) return { ok: false, error: 'payment missing client_id' };
    // Translate mobile client_id → local desktop client id. For desktop-origin
    // clients, resolveMobileClientId returns the same id. For mobile-origin
    // clients, it looks up by remote_id. Without this, the payment would bind
    // to a completely unrelated desktop client.
    const localClientId = resolveMobileClientId(payment.client_id);
    if (!localClientId) {
      return { ok: false, error: `client ${payment.client_id} not found locally` };
    }

    // Translate mobile sale_id → local desktop sale.id via remote_id lookup.
    // Mobile sale IDs are a different namespace; looking up by raw id would
    // point at a completely unrelated desktop sale and silently corrupt it.
    const localSaleId = payment.sale_id != null ? resolveMobileSaleId(payment.sale_id) : null;

    // Stale-collision check: after a mobile reset, 'mob-1', 'mob-2'… can
    // collide with real historical payments we already imported from the
    // prior mobile instance. Compare by client + amount + date + method —
    // match means idempotent replay; mismatch means archive the old row.
    const stale = detectStaleRemoteId('client_payments', remoteId, {
      client_id: localClientId,
      amount:    Number(payment.amount) || 0,
      date:      payment.date,
      method:    payment.method || 'cash',
    });
    if (stale.state === 'same') return { ok: true, skipped: true, localId: stale.existing.id };

    const tx = db.transaction(() => {
      if (stale.state === 'stale') archiveStaleRow('client_payments', stale.existing.id, remoteId);
      const res = db.prepare(`
        INSERT INTO client_payments
          (client_id, sale_id, amount, date, method, notes, batch_id, created_by, remote_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        localClientId,
        localSaleId,  // null if we couldn't resolve, so the row is kept but detached
        payment.amount,
        payment.date,
        payment.method || 'cash',
        payment.notes || null,
        payment.batch_id || null,
        payment.created_by || null,
        remoteId
      );

      if (localSaleId) {
        const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(localSaleId);
        if (sale) {
          const newPaid = Math.round((sale.paid_amount + payment.amount) * 100) / 100;
          const newStatus = newPaid >= sale.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
          db.prepare('UPDATE sales SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, sale.id);
        }
      }

      db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(payment.amount, localClientId);

      return res.lastInsertRowid;
    });

    tx();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Translate a mobile supplier_id to its local desktop supplier id via remote_id.
// Mirrors resolveMobileClientId: returns the local id if we've already imported
// the row (remote_id match), falls back to a direct id lookup for desktop-origin
// suppliers (which share the id across sides), and returns null if nothing
// matches — caller should skip the dependent operation with "not ready".
function resolveMobileSupplierId(mobileSupplierId) {
  if (mobileSupplierId == null) return null;
  const byRemote = db.prepare('SELECT id FROM suppliers WHERE remote_id = ?').get(String(mobileSupplierId));
  if (byRemote) return byRemote.id;
  const direct = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(mobileSupplierId);
  return direct ? direct.id : null;
}

// Import a mobile-originated supplier. Idempotent via remote_id.
//   action='create' — insert a new row (skipped if already present)
//   action='update' — sync profile fields; balance is RECOMPUTED from local
//     supplier_payments + purchases so desktop-only history isn't overwritten.
//   action='delete' — drop the local mirror if present (hard delete to match
//     schema's ON DELETE CASCADE on supplier_payments; purchases reset via
//     ON DELETE SET NULL on purchases.supplier_id in case the column exists).
function importRemoteSupplier(supplier) {
  try {
    if (!supplier || supplier.id == null) {
      return { ok: false, skipped: true, error: 'no id on supplier payload' };
    }
    const remoteId = String(supplier.id);
    const action = supplier.__action || 'create';
    const existing = db.prepare('SELECT id FROM suppliers WHERE remote_id = ?').get(remoteId);

    // ---- DELETE action: remove the local mirror. supplier_payments cascade.
    // NOTE edge case: if there are supplier-side purchases linked locally,
    // we preserve them (schema uses suppliers(id) as FK target; deletion
    // policy differs from client/sales flow). Skip silently if already gone.
    if (action === 'delete') {
      if (!existing) return { ok: true, skipped: true };
      const tx = db.transaction(() => {
        db.prepare('DELETE FROM supplier_payments WHERE supplier_id = ?').run(existing.id);
        db.prepare('DELETE FROM suppliers WHERE id = ?').run(existing.id);
      });
      tx();
      return { ok: true, skipped: false };
    }

    // ---- UPDATE: sync profile fields, recompute balance from local ledger.
    // Reason (identical to importRemoteClient): if desktop has purchases or
    // payments mobile doesn't know about, taking mobile's snapshot balance
    // would overwrite the accurate local value.
    if (action === 'update' && existing) {
      db.prepare(`
        UPDATE suppliers SET
          name       = COALESCE(?, name),
          phone      = COALESCE(?, phone),
          address    = COALESCE(?, address),
          email      = COALESCE(?, email),
          notes      = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        supplier.name    || null,
        supplier.phone   || null,
        supplier.address || null,
        supplier.email   || null,
        supplier.notes   || null,
        existing.id
      );
      // Recompute from this side's ledger. Supplier balance formula:
      //   balance = SUM(supplier_payments.amount) - SUM(unpaid purchase remainders)
      const sumP = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) AS s FROM supplier_payments WHERE supplier_id = ?'
      ).get(existing.id).s;
      const sumO = db.prepare(
        `SELECT COALESCE(SUM(total - paid_amount), 0) AS s FROM purchases
          WHERE supplier_id = ? AND status NOT IN ('paid','cancelled')`
      ).get(existing.id).s;
      const localExpected = Math.round((sumP - sumO) * 100) / 100;
      db.prepare('UPDATE suppliers SET balance = ? WHERE id = ?')
        .run(localExpected, existing.id);
      return { ok: true, skipped: false, localId: existing.id };
    }

    // ---- CREATE: skip if same row; archive if stale collision. Compare by
    // name + phone (two distinct suppliers can share a name); archive + insert
    // run in one transaction so a crash between them can't orphan the archive.
    const stale = detectStaleRemoteId('suppliers', remoteId, {
      name:  supplier.name,
      phone: supplier.phone || null,
    });
    if (stale.state === 'same') return { ok: true, skipped: true, localId: stale.existing.id };

    // CRITICAL: insert balance=0 (not supplier.balance from the snapshot).
    // Same double-counting bug that importRemoteClient fixed: supplier_payments
    // from the same pull batch re-apply their delta via importRemoteSupplierPayment,
    // so taking the snapshot balance here would double-count every payment.
    // Balance is DERIVED state — let the payment import flow rebuild it.
    const tx = db.transaction(() => {
      if (stale.state === 'stale') archiveStaleRow('suppliers', stale.existing.id, remoteId);
      return db.prepare(`
        INSERT INTO suppliers
          (name, phone, address, email, notes, balance, remote_id)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(
        supplier.name,
        supplier.phone   || null,
        supplier.address || null,
        supplier.email   || null,
        supplier.notes   || null,
        remoteId
      );
    });
    const result = tx();
    return { ok: true, skipped: false, localId: result.lastInsertRowid };
  } catch (err) {
    return { ok: false, skipped: false, error: err.message };
  }
}

// Import a mobile-originated supplier payment. Idempotent via remote_id
// ("sup-mob-{mobile_id}" composite key so it never collides with desktop-local
// remote_ids from other origins). Handles create/update/delete actions.
function importRemoteSupplierPayment(payment) {
  try {
    const action = payment.__action || 'create';

    // ---- DELETE
    if (action === 'delete') {
      const mobileId = payment.id;
      if (!mobileId) return { ok: false, error: 'delete missing id' };
      const remoteId = `sup-mob-${mobileId}`;
      const existing = db.prepare('SELECT * FROM supplier_payments WHERE remote_id = ?').get(remoteId);
      if (!existing) return { ok: true, skipped: true };

      const tx = db.transaction(() => {
        if (existing.purchase_id) {
          const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(existing.purchase_id);
          if (purchase) {
            const newPaid = Math.max(0, Math.round((purchase.paid_amount - existing.amount) * 100) / 100);
            const newStatus = newPaid >= purchase.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?')
              .run(newPaid, newStatus, purchase.id);
          }
        }
        db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?')
          .run(existing.amount, existing.supplier_id);
        db.prepare('DELETE FROM supplier_payments WHERE id = ?').run(existing.id);
      });
      tx();
      return { ok: true };
    }

    // ---- UPDATE: adjust by delta
    if (action === 'update') {
      const mobileId = payment.id;
      if (!mobileId) return { ok: false, error: 'update missing id' };
      const remoteId = `sup-mob-${mobileId}`;
      const existing = db.prepare('SELECT * FROM supplier_payments WHERE remote_id = ?').get(remoteId);
      if (!existing) return { ok: false, error: 'update target not found' };

      const newAmount = payment.amount;
      const delta = Math.round((newAmount - existing.amount) * 100) / 100;

      const tx = db.transaction(() => {
        if (existing.purchase_id) {
          const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(existing.purchase_id);
          if (purchase) {
            const newPaid = Math.max(0, Math.round((purchase.paid_amount + delta) * 100) / 100);
            const newStatus = newPaid >= purchase.total ? 'paid' : newPaid > 0 ? 'partial' : 'pending';
            db.prepare('UPDATE purchases SET paid_amount = ?, status = ? WHERE id = ?')
              .run(newPaid, newStatus, purchase.id);
          }
        }
        db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?')
          .run(delta, existing.supplier_id);
        db.prepare(`
          UPDATE supplier_payments SET amount = ?, date = ?, notes = ? WHERE id = ?
        `).run(
          newAmount,
          payment.date || existing.date,
          payment.notes !== undefined ? payment.notes : existing.notes,
          existing.id
        );
      });
      tx();
      return { ok: true };
    }

    // ---- CREATE
    const mobileId = payment.id;
    if (!mobileId) return { ok: false, error: 'no mobile supplier_payment id' };
    const remoteId = `sup-mob-${mobileId}`;

    if (!payment.supplier_id) return { ok: false, error: 'supplier_payment missing supplier_id' };
    const localSupplierId = resolveMobileSupplierId(payment.supplier_id);
    if (!localSupplierId) {
      return { ok: false, error: `supplier ${payment.supplier_id} not found locally` };
    }

    // Stale-collision check: mirror the client_payments logic, with method
    // added as an extra discriminator so two legit same-day same-amount
    // payments (one cash, one wire) don't false-positive as identical.
    const stale = detectStaleRemoteId('supplier_payments', remoteId, {
      supplier_id: localSupplierId,
      amount:      Number(payment.amount) || 0,
      date:        payment.date,
      method:      payment.method || 'cash',
    });
    if (stale.state === 'same') return { ok: true, skipped: true, localId: stale.existing.id };

    // Mobile doesn't have purchases (they're desktop-only), so purchase_id
    // should be null for mobile-originated payments. If somehow it's set, we
    // ignore it — mobile has no way to reference a desktop purchase reliably.
    const tx = db.transaction(() => {
      if (stale.state === 'stale') archiveStaleRow('supplier_payments', stale.existing.id, remoteId);
      const res = db.prepare(`
        INSERT INTO supplier_payments
          (supplier_id, purchase_id, amount, date, method, notes, batch_id, created_by, remote_id)
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        localSupplierId,
        payment.amount,
        payment.date,
        payment.method || 'cash',
        payment.notes || null,
        payment.batch_id || null,
        payment.created_by || null,
        remoteId
      );
      db.prepare('UPDATE suppliers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(payment.amount, localSupplierId);
      return res.lastInsertRowid;
    });

    tx();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function autoSyncPull() {
  if (autoSyncPulling) return;
  // Dev mode: block auto-pull for symmetry with push (see autoSyncPush).
  if (isDev && process.env.ALLOW_DEV_SYNC !== '1') return;
  try {
    const serverUrl = settingsDb.getSetting('cloud_server_url');
    const syncKey = settingsDb.getSetting('cloud_sync_key');
    if (!serverUrl || !syncKey) {
      recordSyncOutcome('pull', false, 'Not configured: cloud_server_url or cloud_sync_key missing');
      return;
    }

    autoSyncPulling = true;
    const lastPull = settingsDb.getSetting('last_sync_pull') || '1970-01-01T00:00:00.000Z';
    const response = await fetchWithTimeout(`${serverUrl}/api/sync/pull?since=${encodeURIComponent(lastPull)}`, {
      headers: { 'X-Sync-Key': syncKey }
    });
    const data = await response.json();
    if (!data.success) {
      recordSyncOutcome('pull', false, data.error || `HTTP ${response.status}`);
      return;
    }

    const sales = data.sales || [];
    const payments = data.payments || [];
    const clients = data.clients || [];
    const suppliers = data.suppliers || [];
    const supplierPayments = data.supplier_payments || [];
    if (sales.length === 0 && payments.length === 0 && clients.length === 0
        && suppliers.length === 0 && supplierPayments.length === 0) return;

    // Import clients FIRST — sales and payments reference client_id and the
    // resolver needs the remote_id mapping in place before they land.
    let impCli = 0, skpCli = 0, fldCli = 0;
    for (const cli of clients) {
      const r = importRemoteClient(cli);
      if (r.ok && !r.skipped) impCli++;
      else if (r.skipped) skpCli++;
      else { fldCli++; console.warn('[auto-sync] Skipping client:', r.error, cli && cli.id); }
    }

    // Import suppliers BEFORE supplier_payments so the resolver has the
    // remote_id → local id mapping before any dependent payments arrive.
    let impSup = 0, skpSup = 0, fldSup = 0;
    for (const sup of suppliers) {
      const r = importRemoteSupplier(sup);
      if (r.ok && !r.skipped) impSup++;
      else if (r.skipped) skpSup++;
      else { fldSup++; console.warn('[auto-sync] Skipping supplier:', r.error, sup && sup.id); }
    }

    let impSale = 0, skpSale = 0, fldSale = 0;
    for (const sale of sales) {
      const r = importRemoteSale(sale);
      if (r.ok && !r.skipped) impSale++;
      else if (r.skipped) skpSale++;
      else { fldSale++; console.warn('[auto-sync] Skipping sale:', r.error, sale && sale.id); }
    }

    let impPay = 0, skpPay = 0, fldPay = 0;
    for (const pay of payments) {
      const r = importRemotePayment(pay);
      if (r.ok && !r.skipped) impPay++;
      else if (r.skipped) skpPay++;
      else { fldPay++; console.warn('[auto-sync] Skipping payment:', r.error, pay && pay.id); }
    }

    let impSP = 0, skpSP = 0, fldSP = 0;
    for (const sp of supplierPayments) {
      const r = importRemoteSupplierPayment(sp);
      if (r.ok && !r.skipped) impSP++;
      else if (r.skipped) skpSP++;
      else { fldSP++; console.warn('[auto-sync] Skipping supplier_payment:', r.error, sp && sp.id); }
    }

    settingsDb.setSetting('last_sync_pull', new Date().toISOString());
    recordSyncOutcome('pull', true);
    console.log(`[auto-sync] Pull: clients ${impCli}/${skpCli}/${fldCli}, suppliers ${impSup}/${skpSup}/${fldSup}, sales ${impSale}/${skpSale}/${fldSale}, payments ${impPay}/${skpPay}/${fldPay}, supplier_payments ${impSP}/${skpSP}/${fldSP} (imported/skipped/failed)`);
    if (impCli > 0 || impSale > 0 || impPay > 0 || impSup > 0 || impSP > 0) {
      emitDataChanged('sales', 'clients', 'products', 'suppliers');
    }
  } catch (err) {
    recordSyncOutcome('pull', false, err.message);
    console.error('[auto-sync] Pull error:', err.message);
  } finally {
    autoSyncPulling = false;
  }
}

// Start auto-sync after DB is ready.
// Longer intervals reduce main-process load during active POS use.
setTimeout(() => {
  // Push every 5 minutes (products don't change often)
  setInterval(() => autoSyncPush(), 5 * 60 * 1000);
  // Pull every 2 minutes (catch mobile sales quickly)
  setInterval(() => autoSyncPull(), 2 * 60 * 1000);
  // Initial sync on startup
  autoSyncPush();
  autoSyncPull();
  console.log('[auto-sync] Started: push every 5min, pull every 2min');
}, 10000);

ipcMain.handle('sync:push', async (_, serverUrl, syncKey) => {
  try {
    const payload = await buildSyncPayload();

    const response = await fetchWithTimeout(`${serverUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
      settingsDb.setSetting('last_sync_push', new Date().toISOString());
      recordSyncOutcome('push', true);
    } else {
      recordSyncOutcome('push', false, result.error || `HTTP ${response.status}`);
    }
    return result;
  } catch (error) {
    recordSyncOutcome('push', false, error.message);
    return { success: false, error: error.message };
  }
});

// Manual push triggered from the UI — reads credentials from DB so the
// renderer never needs to handle the sync key.
ipcMain.handle('sync:pushNow', async () => {
  await autoSyncPush();
  // Return fresh status so the UI can update in one round-trip.
  try {
    const get = (k) => settingsDb.getSetting(k) || null;
    return {
      success: true,
      data: {
        last_sync_push: get('last_sync_push'),
        last_sync_attempt_at: get('last_sync_attempt_at'),
        last_sync_attempt_ok: get('last_sync_attempt_ok') === '1',
        last_sync_error: get('last_sync_error') || '',
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Aggregated sync status — read by the SyncStatusIndicator UI to decide what
// color/text to show. Always returns a successful payload; missing settings
// surface as nulls/empty strings rather than errors so the UI never crashes.
ipcMain.handle('sync:getStatus', () => {
  try {
    const get = (k) => settingsDb.getSetting(k) || null;
    return {
      success: true,
      data: {
        configured: !!(get('cloud_server_url') && get('cloud_sync_key')),
        cloud_server_url: get('cloud_server_url'),
        last_sync_push: get('last_sync_push'),
        last_sync_pull: get('last_sync_pull'),
        last_sync_attempt_at: get('last_sync_attempt_at'),
        last_sync_attempt_kind: get('last_sync_attempt_kind'),
        // last_sync_attempt_ok stored as '1'/'0' strings; coerce to bool for the UI
        last_sync_attempt_ok: get('last_sync_attempt_ok') === '1',
        last_sync_error: get('last_sync_error') || '',
        // Surface dev-mode + override state so the UI can explain "why is push idle?"
        dev_mode: isDev,
        dev_sync_allowed: process.env.ALLOW_DEV_SYNC === '1',
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('sync:pull', async (_, serverUrl, syncKey) => {
  try {
    const lastPull = settingsDb.getSetting('last_sync_pull') || '1970-01-01T00:00:00.000Z';
    const response = await fetchWithTimeout(`${serverUrl}/api/sync/pull?since=${encodeURIComponent(lastPull)}`, {
      headers: { 'X-Sync-Key': syncKey }
    });

    const data = await response.json();
    if (!data.success) return data;

    // Clients / suppliers before sales & payments so the resolvers see them.
    let impCli = 0, skpCli = 0, fldCli = 0;
    for (const cli of data.clients || []) {
      const r = importRemoteClient(cli);
      if (r.ok && !r.skipped) impCli++;
      else if (r.skipped) skpCli++;
      else { fldCli++; console.warn('[sync:pull] Skipping client:', r.error, cli && cli.id); }
    }
    let impSup = 0, skpSup = 0, fldSup = 0;
    for (const sup of data.suppliers || []) {
      const r = importRemoteSupplier(sup);
      if (r.ok && !r.skipped) impSup++;
      else if (r.skipped) skpSup++;
      else { fldSup++; console.warn('[sync:pull] Skipping supplier:', r.error, sup && sup.id); }
    }
    let impSale = 0, skpSale = 0, fldSale = 0;
    for (const sale of data.sales || []) {
      const r = importRemoteSale(sale);
      if (r.ok && !r.skipped) impSale++;
      else if (r.skipped) skpSale++;
      else { fldSale++; console.warn('[sync:pull] Skipping sale:', r.error, sale && sale.id); }
    }
    let impPay = 0, skpPay = 0, fldPay = 0;
    for (const pay of data.payments || []) {
      const r = importRemotePayment(pay);
      if (r.ok && !r.skipped) impPay++;
      else if (r.skipped) skpPay++;
      else { fldPay++; console.warn('[sync:pull] Skipping payment:', r.error, pay && pay.id); }
    }
    let impSP = 0, skpSP = 0, fldSP = 0;
    for (const sp of data.supplier_payments || []) {
      const r = importRemoteSupplierPayment(sp);
      if (r.ok && !r.skipped) impSP++;
      else if (r.skipped) skpSP++;
      else { fldSP++; console.warn('[sync:pull] Skipping supplier_payment:', r.error, sp && sp.id); }
    }

    settingsDb.setSetting('last_sync_pull', new Date().toISOString());
    if (impSale > 0 || impPay > 0 || impCli > 0 || impSup > 0 || impSP > 0) {
      emitDataChanged('sales', 'clients', 'products', 'suppliers');
    }
    return {
      success: true,
      imported: impSale + impPay + impCli + impSup + impSP,
      clients:           { imported: impCli,  skipped: skpCli,  failed: fldCli },
      suppliers:         { imported: impSup,  skipped: skpSup,  failed: fldSup },
      sales:             { imported: impSale, skipped: skpSale, failed: fldSale },
      payments:          { imported: impPay,  skipped: skpPay,  failed: fldPay },
      supplier_payments: { imported: impSP,   skipped: skpSP,   failed: fldSP  },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// SYSTEM RESET
// ============================================
ipcMain.handle('system:reset', (_, { userId, password }) => {
  try {
    // Verify admin password
    const user = db.prepare('SELECT password_hash, role FROM users WHERE id = ?').get(userId);
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Only admin can reset the system' };
    }

    const bcrypt = require('bcryptjs');
    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // Tables to clear (in order due to foreign key constraints)
    const tablesToClear = [
      'stock_transactions',
      'sale_items',
      'sales',
      'purchase_items',
      'purchases',
      'payroll',
      'production_batches',
      'product_recipes',
      'documents',
      'expenses',
      'products',
      'stock',
      'clients',
      'client_categories',
      'suppliers',
      'employers'
    ];

    // All deletes + counter resets run atomically; if any step fails, the DB is untouched
    const doReset = db.transaction(() => {
      for (const table of tablesToClear) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
      for (const table of tablesToClear) {
        db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
      }
      db.prepare(`
        UPDATE settings SET value = '1'
        WHERE key IN (
          'next_invoice_number', 'next_delivery_number', 'next_proforma_number',
          'next_purchase_order_number', 'next_exit_voucher_number',
          'next_credit_note_number', 'next_quote_number', 'next_reception_voucher_number'
        )
      `).run();
      db.prepare(`DELETE FROM settings WHERE key IN ('last_sync_push', 'last_sync_pull')`).run();
    });
    doReset();

    emitDataChanged('sales', 'clients', 'products', 'stock', 'suppliers', 'employers', 'expenses', 'documents', 'settings');
    return { success: true, message: 'System reset successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// APP LIFECYCLE
// ============================================
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) {
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
