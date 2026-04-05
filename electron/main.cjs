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

  // Fix: Restore keyboard focus after clicking the drag region (title bar)
  // In frameless Electron windows, clicking -webkit-app-region: drag steals
  // keyboard focus from webContents. This periodically checks and restores it.
  // Also handles focus loss from native dialogs (confirm/alert) that the
  // window 'focus' event doesn't catch (internal focus loss).
  let focusInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
      mainWindow.webContents.focus();
    }
  }, 1000);

  mainWindow.on('closed', () => {
    clearInterval(focusInterval);
    mainWindow = null;
  });

  if (isDev) {
    const port = process.env.VITE_PORT || 5566;
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:update', (_, id, data) => {
  try {
    const result = stockDb.updateStock(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:delete', (_, id) => {
  try {
    const result = stockDb.deleteStock(id);
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:removeQuantity', (_, id, quantity, notes, refType, refId) => {
  try {
    const result = stockDb.removeStockQuantity(id, quantity, notes, refType, refId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:adjustQuantity', (_, id, newQuantity, notes) => {
  try {
    const result = stockDb.adjustStockQuantity(id, newQuantity, notes);
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:update', (_, id, data) => {
  try {
    const result = suppliersDb.updateSupplier(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:updateBalance', (_, id, amount) => {
  try {
    const result = suppliersDb.updateSupplierBalance(id, amount);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:delete', (_, id) => {
  try {
    const result = suppliersDb.deleteSupplier(id);
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:update', (_, id, data) => {
  try {
    const result = productsDb.updateProduct(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:delete', (_, id) => {
  try {
    const product = productsDb.getProductById(id);
    const result = productsDb.deleteProduct(id);
    // Clean up image file if it exists
    if (product && product.image_path) {
      const imgDir = getImageStoragePath();
      const filePath = path.join(imgDir, product.image_path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore cleanup errors */ }
      }
    }
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

ipcMain.handle('products:getByBarcode', (_, barcode) => {
  try {
    const product = productsDb.getProductByBarcode(barcode);
    return { success: true, data: product };
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:setInitialQuantity', (_, id, quantity, notes) => {
  try {
    const result = productsDb.setInitialQuantity(id, quantity, notes);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:addResaleStock', (_, id, quantity, unitCost, notes) => {
  try {
    const result = productsDb.addResaleStock(id, quantity, unitCost, notes);
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

ipcMain.handle('products:deleteImage', (_, fileName) => {
  try {
    if (!fileName) return { success: true };
    const imgDir = getImageStoragePath();
    const filePath = path.resolve(imgDir, fileName);
    if (!filePath.startsWith(imgDir)) {
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

ipcMain.handle('products:getImagePath', (_, fileName) => {
  try {
    if (!fileName) return { success: true, data: null };
    const imgDir = getImageStoragePath();
    const fullPath = path.resolve(imgDir, fileName);
    if (!fullPath.startsWith(imgDir)) {
      return { success: false, error: 'Invalid file path' };
    }
    if (fs.existsSync(fullPath)) {
      // Return as data URL so it works in both dev (http://localhost) and production (file://)
      const ext = path.extname(fullPath).toLowerCase().replace('.', '');
      const mimeType = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
      const imageData = fs.readFileSync(fullPath);
      const dataUrl = `data:${mimeType};base64,${imageData.toString('base64')}`;
      return { success: true, data: dataUrl };
    }
    return { success: true, data: null };
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:update', (_, id, data) => {
  try {
    const result = productsDb.updateBatch(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('batches:delete', (_, id) => {
  try {
    const result = productsDb.deleteBatch(id);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================
// CLIENTS
// ============================================
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:update', (_, id, data) => {
  try {
    const result = clientsDb.updateClient(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:updateBalance', (_, id, amount) => {
  try {
    const result = clientsDb.updateClientBalance(id, amount);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clients:delete', (_, id) => {
  try {
    const result = clientsDb.deleteClient(id);
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

ipcMain.handle('sales:add', (_, data) => {
  try {
    const result = clientsDb.addSale(data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:update', (_, id, data) => {
  try {
    const result = clientsDb.updateSale(id, data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:addPayment', (_, id, amount) => {
  try {
    const result = clientsDb.addPayment(id, amount);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:delete', (_, id) => {
  try {
    const result = clientsDb.deleteSale(id);
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:delete', (_, id) => {
  try {
    const result = settingsDb.deleteDocument(id);
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

ipcMain.handle('documents:getNextNumber', (_, type) => {
  try {
    return { success: true, data: settingsDb.getNextDocumentNumber(type) };
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

// Auto-sync: periodic push (every 30s) and pull (every 2min)
let autoSyncRunning = false;

async function autoSyncPush() {
  if (autoSyncRunning) return;
  try {
    const serverUrl = settingsDb.getSetting('cloud_server_url');
    const syncKey = settingsDb.getSetting('cloud_sync_key');
    if (!serverUrl || !syncKey) return; // Not configured

    autoSyncRunning = true;
    console.log('[auto-sync] Pushing to cloud...');

    const products = productsDb.getAllProducts();
    const productsWithImages = products.map(p => {
      let image_data = null;
      if (p.image_path) {
        const imgDir = getImageStoragePath();
        const fullPath = path.resolve(imgDir, p.image_path);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
          image_data = `data:${mime};base64,${fs.readFileSync(fullPath).toString('base64')}`;
        }
      }
      return { ...p, image_data };
    });

    const clients = clientsDb.getAllClients();
    const users = db.prepare('SELECT * FROM users').all();
    const settingsObj = settingsDb.getAllSettings();
    const settings = Object.entries(settingsObj).map(([key, value]) => ({ key, value }));

    const response = await fetch(`${serverUrl}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Key': syncKey },
      body: JSON.stringify({ products: productsWithImages, clients, users, settings })
    });

    const result = await response.json();
    if (result.success) {
      settingsDb.setSetting('last_sync_push', new Date().toISOString());
      console.log('[auto-sync] Push complete:', result.counts);
    } else {
      console.log('[auto-sync] Push failed:', result.error);
    }
  } catch (err) {
    console.log('[auto-sync] Error:', err.message);
  } finally {
    autoSyncRunning = false;
  }
}

// Auto-pull mobile sales
async function autoSyncPull() {
  try {
    const serverUrl = settingsDb.getSetting('cloud_server_url');
    const syncKey = settingsDb.getSetting('cloud_sync_key');
    if (!serverUrl || !syncKey) return;

    const lastPull = settingsDb.getSetting('last_sync_pull') || '1970-01-01T00:00:00.000Z';
    const response = await fetch(`${serverUrl}/api/sync/pull?since=${encodeURIComponent(lastPull)}`, {
      headers: { 'X-Sync-Key': syncKey }
    });
    const data = await response.json();
    if (!data.success || !data.sales || data.sales.length === 0) return;

    const importSales = db.transaction(() => {
      for (const sale of data.sales) {
        const isReturn = sale.status === 'return' || sale.total < 0;
        const result = db.prepare(
          'INSERT INTO sales (client_id, date, total, paid_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(sale.client_id, sale.date, sale.total, sale.paid_amount, sale.status || 'pending',
          sale.notes ? '[Mobile] ' + sale.notes : (isReturn ? '[Mobile Return]' : '[Mobile Sale]'));
        const newSaleId = result.lastInsertRowid;
        if (sale.items) {
          for (const item of sale.items) {
            db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)')
              .run(newSaleId, item.product_id, item.quantity, item.unit_price, item.total || item.quantity * item.unit_price);
            if (isReturn) {
              db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
            } else {
              db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
            }
          }
        }
        if (isReturn && sale.client_id) {
          db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(Math.abs(sale.total), sale.client_id);
        } else if (!isReturn && sale.client_id && sale.total > sale.paid_amount) {
          db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(sale.total - sale.paid_amount, sale.client_id);
        }
      }
    });
    importSales();
    settingsDb.setSetting('last_sync_pull', new Date().toISOString());
    console.log('[auto-sync] Pulled', data.sales.length, 'mobile sales');
  } catch (err) {
    // Silent fail for auto-pull
  }
}

// Start auto-sync after DB is ready
setTimeout(() => {
  // Push every 30 seconds
  setInterval(() => autoSyncPush(), 30000);
  // Pull every 2 minutes
  setInterval(() => autoSyncPull(), 120000);
  // Initial sync on startup
  autoSyncPush();
  autoSyncPull();
  console.log('[auto-sync] Started: push every 30s, pull every 2min');
}, 10000);

ipcMain.handle('sync:push', async (_, serverUrl, syncKey) => {
  try {
    // Get all products with image data (async to avoid blocking UI)
    const products = productsDb.getAllProducts();
    const productsWithImages = [];
    for (const p of products) {
      let image_data = null;
      if (p.image_path) {
        const imgDir = getImageStoragePath();
        const fullPath = path.resolve(imgDir, p.image_path);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
          const buf = await fs.promises.readFile(fullPath);
          image_data = `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
      productsWithImages.push({ ...p, image_data });
    }

    const clients = clientsDb.getAllClients();
    const users = db.prepare('SELECT * FROM users').all();
    const settingsObj = settingsDb.getAllSettings();
    // Convert settings object to array format for cloud sync
    const settings = Object.entries(settingsObj).map(([key, value]) => ({ key, value }));

    const response = await fetch(`${serverUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey
      },
      body: JSON.stringify({ products: productsWithImages, clients, users, settings })
    });

    const result = await response.json();
    if (result.success) {
      settingsDb.setSetting('last_sync_push', new Date().toISOString());
    }
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync:pull', async (_, serverUrl, syncKey) => {
  try {
    const lastPull = settingsDb.getSetting('last_sync_pull') || '1970-01-01T00:00:00.000Z';
    const response = await fetch(`${serverUrl}/api/sync/pull?since=${encodeURIComponent(lastPull)}`, {
      headers: { 'X-Sync-Key': syncKey }
    });

    const data = await response.json();
    if (!data.success) return data;

    let imported = 0;
    if (data.sales && data.sales.length > 0) {
      const importSales = db.transaction(() => {
        for (const sale of data.sales) {
          const isReturn = sale.status === 'return' || sale.total < 0;
          const result = db.prepare(
            'INSERT INTO sales (client_id, date, total, paid_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(
            sale.client_id, sale.date, sale.total, sale.paid_amount, sale.status || 'pending',
            sale.notes ? '[Mobile] ' + sale.notes : (isReturn ? '[Mobile Return]' : '[Mobile Sale]')
          );
          const newSaleId = result.lastInsertRowid;

          if (sale.items) {
            for (const item of sale.items) {
              db.prepare(
                'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)'
              ).run(newSaleId, item.product_id, item.quantity, item.unit_price, item.total || item.quantity * item.unit_price);

              if (isReturn) {
                // Return: restore stock
                db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?')
                  .run(item.quantity, item.product_id);
              } else {
                // Normal sale: deduct stock
                db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?')
                  .run(item.quantity, item.product_id);
              }
            }
          }

          if (isReturn && sale.client_id) {
            // Return: reduce client debt (add back the return amount)
            const returnAmount = Math.abs(sale.total);
            db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?')
              .run(returnAmount, sale.client_id);
          } else if (!isReturn && sale.client_id && sale.total > sale.paid_amount) {
            // Normal sale: increase client debt
            const debt = sale.total - sale.paid_amount;
            db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?')
              .run(debt, sale.client_id);
          }
          imported++;
        }
      });
      importSales();
    }

    settingsDb.setSetting('last_sync_pull', new Date().toISOString());
    return { success: true, imported };
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
      'suppliers',
      'employers'
    ];

    // Clear all data tables
    for (const table of tablesToClear) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    // Reset auto-increment counters
    for (const table of tablesToClear) {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table);
    }

    // Reset document numbers in settings
    db.prepare(`UPDATE settings SET value = '1' WHERE key IN ('next_invoice_number', 'next_delivery_number', 'next_proforma_number')`).run();

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
