const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const SERVER_BASE_URL = 'https://al-assile-mobile.onrender.com';
const SYNC_KEY = 'alassile2024sync';
const API_TIMEOUT_MS = 15000;

const isDev = !app.isPackaged;

let mainWindow = null;
let _authToken = null;
let _authUser = null;

const pendingImages = new Map();

async function apiFetch(apiPath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${SERVER_BASE_URL}${apiPath}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Server request timed out after 15 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function desktopIpc(channel, args = []) {
  try {
    const result = await apiFetch('/api/desktop/ipc', {
      method: 'POST',
      body: JSON.stringify({ channel, args }),
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
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
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('Failed to load:', code, description, url);
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log('Console:', level, message);
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevUrl = isDev && url.startsWith('http://localhost');
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
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadURL(pathToFileURL(indexPath).href).catch(err => {
      console.error('Failed to load app:', err);
    });
  }
}

function emitDataChangedFor(channel) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!/:(add|update|delete|create|remove|adjust|set|mark|generate|toggle|record|repair)/i.test(channel)) return;

  const namespace = channel.split(':')[0];
  const domainsByNamespace = {
    stock: ['stock'],
    expenses: ['expenses'],
    suppliers: ['suppliers', 'purchases'],
    purchases: ['suppliers', 'purchases', 'products', 'stock'],
    products: ['products'],
    batches: ['products', 'stock'],
    clientCategories: ['clients'],
    clients: ['clients', 'sales'],
    sales: ['sales', 'clients', 'products'],
    employers: ['employers'],
    payroll: ['employers', 'expenses'],
    settings: ['settings'],
    documents: ['documents'],
    users: ['users'],
    system: ['sales', 'clients', 'products', 'stock', 'suppliers', 'employers', 'expenses', 'documents', 'settings'],
  };

  for (const domain of domainsByNamespace[namespace] || [namespace]) {
    mainWindow.webContents.send('data-changed', domain);
  }
}

function withPendingImage(data) {
  if (!data || !data.image_path || !pendingImages.has(data.image_path)) {
    return data;
  }
  return { ...data, image_data: pendingImages.get(data.image_path) };
}

function registerRemoteHandler(channel, mapArgs = (...args) => args) {
  ipcMain.handle(channel, async (_event, ...rawArgs) => {
    const args = mapArgs(...rawArgs);
    const result = await desktopIpc(channel, args);
    if (result && result.success) emitDataChangedFor(channel);
    return result;
  });
}

// Window controls
ipcMain.handle('window:minimize', async () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', async () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', async () => {
  mainWindow?.close();
});

// Authentication
ipcMain.handle('auth:login', async (_event, username, password) => {
  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    _authToken = result.token;
    _authUser = result.user;
    return { success: true, user: result.user };
  } catch (error) {
    _authToken = null;
    _authUser = null;
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:verifySession', async (_event, userId) => {
  if (!_authToken) {
    return { success: false, error: 'Session expired. Please login again.' };
  }
  try {
    const result = await apiFetch('/api/auth/verify');
    if (userId && result.user?.id !== userId) {
      return { success: false, error: 'Session user mismatch' };
    }
    _authUser = result.user;
    return { success: true, user: result.user };
  } catch (error) {
    _authToken = null;
    _authUser = null;
    return { success: false, error: error.message };
  }
});

registerRemoteHandler('auth:verifyPassword');

// Product image bridge
ipcMain.handle('products:selectImage', async (_event, productId) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Product Image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).slice(1).toLowerCase() || 'png';
    const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/png';
    const imageData = `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
    const fileName = `remote_${productId || Date.now()}_${Date.now()}.${ext}`;
    pendingImages.set(fileName, imageData);

    return { success: true, data: { fileName } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:getImagePath', async (_event, fileName) => {
  try {
    if (!fileName) return { success: true, data: null };
    if (pendingImages.has(fileName)) {
      return { success: true, data: pendingImages.get(fileName) };
    }
    const result = await apiFetch(`/api/desktop/product-image/${encodeURIComponent(fileName)}`);
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('products:deleteImage', async (_event, fileName) => {
  if (pendingImages.delete(fileName)) {
    return { success: true };
  }
  const result = await desktopIpc('products:deleteImage', [fileName]);
  if (result && result.success) emitDataChangedFor('products:update');
  return result;
});

ipcMain.handle('products:add', async (_event, data) => {
  const result = await desktopIpc('products:add', [withPendingImage(data)]);
  if (result?.success) emitDataChangedFor('products:add');
  return result;
});

ipcMain.handle('products:update', async (_event, id, data) => {
  const result = await desktopIpc('products:update', [id, withPendingImage(data)]);
  if (result?.success) emitDataChangedFor('products:update');
  return result;
});

// Settings: cloud connection values are desktop-local constants in remote mode.
ipcMain.handle('settings:get', async (_event, key) => {
  if (key === 'cloud_server_url') return { success: true, data: SERVER_BASE_URL };
  if (key === 'cloud_sync_key') return { success: true, data: SYNC_KEY };
  if (key === 'last_sync_push' || key === 'last_sync_pull') return { success: true, data: null };
  return desktopIpc('settings:get', [key]);
});

ipcMain.handle('settings:set', async (_event, key, value) => {
  if (key === 'cloud_server_url') return { success: true, data: { key, value: SERVER_BASE_URL } };
  if (key === 'cloud_sync_key') return { success: true, data: { key, value: SYNC_KEY } };
  const result = await desktopIpc('settings:set', [key, value]);
  if (result?.success) emitDataChangedFor('settings:set');
  return result;
});

// Sync controls remain for the existing Settings UI, but no sync is needed.
ipcMain.handle('sync:push', async () => {
  try {
    await apiFetch('/api/health');
    mainWindow?.webContents.send('sync:status', { ok: true, type: 'push' });
    return { success: true, imported: 0, message: 'Remote API mode: no sync required' };
  } catch (error) {
    mainWindow?.webContents.send('sync:status', { ok: false, type: 'push', message: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sync:pull', async () => {
  try {
    await apiFetch('/api/health');
    mainWindow?.webContents.send('sync:status', { ok: true, type: 'pull' });
    return { success: true, imported: 0, message: 'Remote API mode: no sync required' };
  } catch (error) {
    mainWindow?.webContents.send('sync:status', { ok: false, type: 'pull', message: error.message });
    return { success: false, error: error.message };
  }
});

const remoteChannels = [
  'stock:getCategories',
  'stock:addCategory',
  'stock:getAll',
  'stock:getById',
  'stock:getLowStock',
  'stock:search',
  'stock:getByCategory',
  'stock:add',
  'stock:update',
  'stock:delete',
  'stock:addQuantity',
  'stock:removeQuantity',
  'stock:adjustQuantity',
  'stock:getTransactions',
  'stock:getAllTransactions',
  'stock:getStats',

  'expenses:getCategories',
  'expenses:addCategory',
  'expenses:updateCategory',
  'expenses:deleteCategory',
  'expenses:getAll',
  'expenses:getById',
  'expenses:getByCategory',
  'expenses:getByDateRange',
  'expenses:getByMonth',
  'expenses:search',
  'expenses:add',
  'expenses:update',
  'expenses:delete',
  'expenses:getStats',
  'expenses:getMonthlySummary',
  'expenses:getCategorySummary',
  'expenses:getRecurring',

  'suppliers:getAll',
  'suppliers:getById',
  'suppliers:search',
  'suppliers:add',
  'suppliers:update',
  'suppliers:updateBalance',
  'suppliers:delete',
  'suppliers:getStats',
  'suppliers:recordPayment',
  'suppliers:recordVersement',
  'suppliers:getPayments',
  'suppliers:deletePayment',
  'suppliers:updatePayment',
  'suppliers:audit',
  'suppliers:repairBalance',

  'purchases:getAll',
  'purchases:getById',
  'purchases:getBySupplier',
  'purchases:getByStatus',
  'purchases:getUnpaid',
  'purchases:add',
  'purchases:update',
  'purchases:addPayment',
  'purchases:delete',
  'purchases:getItems',
  'purchases:addItem',
  'purchases:updateItem',
  'purchases:deleteItem',

  'products:getAll',
  'products:getById',
  'products:search',
  'products:delete',
  'products:getStats',
  'products:getRecipe',
  'products:setRecipe',
  'products:addRecipeItem',
  'products:deleteRecipeItem',
  'products:calculateCost',
  'products:checkStock',
  'products:getByBarcode',
  'products:getFavorites',
  'products:toggleFavorite',
  'products:updateBarcode',
  'products:adjustQuantity',
  'products:setInitialQuantity',
  'products:addResaleStock',

  'batches:getAll',
  'batches:getById',
  'batches:getByProduct',
  'batches:create',
  'batches:update',
  'batches:delete',

  'clientCategories:getAll',
  'clientCategories:add',
  'clients:getAll',
  'clients:getById',
  'clients:search',
  'clients:getWithDebt',
  'clients:getInactive',
  'clients:add',
  'clients:update',
  'clients:recordContact',
  'clients:audit',
  'clients:repairBalance',
  'clients:delete',
  'clients:getStats',
  'clients:recordPayment',
  'clients:getPayments',
  'clients:updatePayment',
  'clients:deletePayment',
  'clients:adjustBalance',

  'sales:getAll',
  'sales:getById',
  'sales:getByClient',
  'sales:getByStatus',
  'sales:getByDateRange',
  'sales:getUnpaid',
  'sales:createComplete',
  'sales:update',
  'sales:addPayment',
  'sales:delete',
  'sales:getItems',
  'sales:addItem',
  'sales:updateItem',
  'sales:deleteItem',
  'sales:getSummary',
  'sales:getTopProducts',
  'sales:getMonthlySales',

  'employers:getAll',
  'employers:getById',
  'employers:getActive',
  'employers:search',
  'employers:add',
  'employers:update',
  'employers:delete',
  'employers:getStats',

  'payroll:getAll',
  'payroll:getById',
  'payroll:getByEmployer',
  'payroll:getByMonth',
  'payroll:getPending',
  'payroll:add',
  'payroll:update',
  'payroll:markPaid',
  'payroll:delete',
  'payroll:generate',
  'payroll:getSummary',

  'reports:getProfitLoss',
  'reports:getMonthlyProfitLoss',
  'reports:getLowStockItems',
  'reports:getOutOfStockItems',
  'reports:getStockValuation',
  'reports:getStockByCategory',
  'reports:getProductionHistory',
  'reports:getProductionByProduct',
  'reports:getProductionByMonth',
  'reports:getSalesByClient',
  'reports:getTopProducts',
  'reports:getSalesByStatus',
  'reports:getMonthlySales',
  'reports:getExpensesByCategory',
  'reports:getMonthlyExpenses',
  'reports:getTopExpenses',
  'reports:getPurchasesBySupplier',
  'reports:getMonthlyPurchases',
  'reports:getDashboardStats',

  'settings:getAll',
  'settings:setMultiple',

  'documents:getAll',
  'documents:getByType',
  'documents:getById',
  'documents:getBySale',
  'documents:getByClient',
  'documents:getByDateRange',
  'documents:create',
  'documents:delete',
  'documents:getStats',
  'documents:getNextNumber',

  'db:backup',
  'users:getAll',
  'users:getById',
  'users:add',
  'users:update',
  'users:updatePassword',
  'users:delete',
  'users:getStats',
  'system:reset',
];

for (const channel of remoteChannels) {
  registerRemoteHandler(channel);
}

async function checkServerConnection() {
  try {
    await apiFetch('/api/health');
    return true;
  } catch (error) {
    dialog.showMessageBox({
      type: 'error',
      title: 'Cannot connect to server',
      message: 'Cannot connect to server',
      detail: `${SERVER_BASE_URL} is unreachable. The desktop app now requires an internet connection.\n\n${error.message}`,
    });
    return false;
  }
}

app.whenReady().then(async () => {
  await checkServerConnection();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
