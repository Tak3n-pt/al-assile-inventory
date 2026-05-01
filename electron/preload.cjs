const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded!');

contextBridge.exposeInMainWorld('api', {
  // ============================================
  // WINDOW CONTROLS
  // ============================================
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // ============================================
  // STOCK CATEGORIES
  // ============================================
  stockCategories: {
    getAll: () => ipcRenderer.invoke('stock:getCategories'),
    add: (name, description) => ipcRenderer.invoke('stock:addCategory', name, description),
  },

  // ============================================
  // STOCK ITEMS
  // ============================================
  stock: {
    getAll: () => ipcRenderer.invoke('stock:getAll'),
    getById: (id) => ipcRenderer.invoke('stock:getById', id),
    getLowStock: () => ipcRenderer.invoke('stock:getLowStock'),
    search: (query) => ipcRenderer.invoke('stock:search', query),
    getByCategory: (categoryId) => ipcRenderer.invoke('stock:getByCategory', categoryId),
    add: (data) => ipcRenderer.invoke('stock:add', data),
    update: (id, data) => ipcRenderer.invoke('stock:update', id, data),
    delete: (id) => ipcRenderer.invoke('stock:delete', id),
    getStats: () => ipcRenderer.invoke('stock:getStats'),
  },

  // ============================================
  // STOCK QUANTITY OPERATIONS
  // ============================================
  stockQuantity: {
    add: (id, quantity, unitCost, notes) =>
      ipcRenderer.invoke('stock:addQuantity', id, quantity, unitCost, notes),
    remove: (id, quantity, notes, refType, refId) =>
      ipcRenderer.invoke('stock:removeQuantity', id, quantity, notes, refType, refId),
    adjust: (id, newQuantity, notes) =>
      ipcRenderer.invoke('stock:adjustQuantity', id, newQuantity, notes),
  },

  // ============================================
  // STOCK TRANSACTIONS
  // ============================================
  stockTransactions: {
    getByStock: (stockId) => ipcRenderer.invoke('stock:getTransactions', stockId),
    getAll: (limit) => ipcRenderer.invoke('stock:getAllTransactions', limit),
  },

  // ============================================
  // EXPENSE CATEGORIES
  // ============================================
  expenseCategories: {
    getAll: () => ipcRenderer.invoke('expenses:getCategories'),
    add: (name, description) => ipcRenderer.invoke('expenses:addCategory', name, description),
    update: (id, name, description) => ipcRenderer.invoke('expenses:updateCategory', id, name, description),
    delete: (id) => ipcRenderer.invoke('expenses:deleteCategory', id),
  },

  // ============================================
  // EXPENSES
  // ============================================
  expenses: {
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    getById: (id) => ipcRenderer.invoke('expenses:getById', id),
    getByCategory: (categoryId) => ipcRenderer.invoke('expenses:getByCategory', categoryId),
    getByDateRange: (startDate, endDate) => ipcRenderer.invoke('expenses:getByDateRange', startDate, endDate),
    getByMonth: (year, month) => ipcRenderer.invoke('expenses:getByMonth', year, month),
    search: (query) => ipcRenderer.invoke('expenses:search', query),
    add: (data) => ipcRenderer.invoke('expenses:add', data),
    update: (id, data) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
    getStats: () => ipcRenderer.invoke('expenses:getStats'),
    getMonthlySummary: (year) => ipcRenderer.invoke('expenses:getMonthlySummary', year),
    getCategorySummary: (year, month) => ipcRenderer.invoke('expenses:getCategorySummary', year, month),
    getRecurring: () => ipcRenderer.invoke('expenses:getRecurring'),
  },

  // ============================================
  // SUPPLIERS
  // ============================================
  suppliers: {
    getAll: () => ipcRenderer.invoke('suppliers:getAll'),
    getById: (id) => ipcRenderer.invoke('suppliers:getById', id),
    search: (query) => ipcRenderer.invoke('suppliers:search', query),
    add: (data) => ipcRenderer.invoke('suppliers:add', data),
    update: (id, data) => ipcRenderer.invoke('suppliers:update', id, data),
    updateBalance: (id, amount) => ipcRenderer.invoke('suppliers:updateBalance', id, amount),
    delete: (id) => ipcRenderer.invoke('suppliers:delete', id),
    getStats: () => ipcRenderer.invoke('suppliers:getStats'),
  },

  // ============================================
  // PURCHASES
  // ============================================
  purchases: {
    getAll: () => ipcRenderer.invoke('purchases:getAll'),
    getById: (id) => ipcRenderer.invoke('purchases:getById', id),
    getBySupplier: (supplierId) => ipcRenderer.invoke('purchases:getBySupplier', supplierId),
    getByStatus: (status) => ipcRenderer.invoke('purchases:getByStatus', status),
    getUnpaid: () => ipcRenderer.invoke('purchases:getUnpaid'),
    add: (data) => ipcRenderer.invoke('purchases:add', data),
    update: (id, data) => ipcRenderer.invoke('purchases:update', id, data),
    addPayment: (id, amount) => ipcRenderer.invoke('purchases:addPayment', id, amount),
    delete: (id) => ipcRenderer.invoke('purchases:delete', id),
    getItems: (purchaseId) => ipcRenderer.invoke('purchases:getItems', purchaseId),
    addItem: (data) => ipcRenderer.invoke('purchases:addItem', data),
    updateItem: (id, data) => ipcRenderer.invoke('purchases:updateItem', id, data),
    deleteItem: (id) => ipcRenderer.invoke('purchases:deleteItem', id),
  },

  // ============================================
  // PRODUCTS
  // ============================================
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    search: (query) => ipcRenderer.invoke('products:search', query),
    getByBarcode: (barcode) => ipcRenderer.invoke('products:getByBarcode', barcode),
    getFavorites: () => ipcRenderer.invoke('products:getFavorites'),
    toggleFavorite: (id) => ipcRenderer.invoke('products:toggleFavorite', id),
    updateBarcode: (id, barcode) => ipcRenderer.invoke('products:updateBarcode', id, barcode),
    add: (data) => ipcRenderer.invoke('products:add', data),
    update: (id, data) => ipcRenderer.invoke('products:update', id, data),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    getStats: () => ipcRenderer.invoke('products:getStats'),
    getRecipe: (productId) => ipcRenderer.invoke('products:getRecipe', productId),
    setRecipe: (productId, items) => ipcRenderer.invoke('products:setRecipe', productId, items),
    addRecipeItem: (data) => ipcRenderer.invoke('products:addRecipeItem', data),
    deleteRecipeItem: (id) => ipcRenderer.invoke('products:deleteRecipeItem', id),
    calculateCost: (productId, quantity) => ipcRenderer.invoke('products:calculateCost', productId, quantity),
    checkStock: (productId, quantity) => ipcRenderer.invoke('products:checkStock', productId, quantity),
    adjustQuantity: (id, newQuantity, notes) => ipcRenderer.invoke('products:adjustQuantity', id, newQuantity, notes),
    setInitialQuantity: (id, quantity, notes) => ipcRenderer.invoke('products:setInitialQuantity', id, quantity, notes),
    addResaleStock: (id, quantity, unitCost, notes) => ipcRenderer.invoke('products:addResaleStock', id, quantity, unitCost, notes),
    selectImage: (productId) => ipcRenderer.invoke('products:selectImage', productId),
    deleteImage: (fileName) => ipcRenderer.invoke('products:deleteImage', fileName),
    getImagePath: (fileName) => ipcRenderer.invoke('products:getImagePath', fileName),
  },

  // ============================================
  // PRODUCTION BATCHES
  // ============================================
  batches: {
    getAll: () => ipcRenderer.invoke('batches:getAll'),
    getById: (id) => ipcRenderer.invoke('batches:getById', id),
    getByProduct: (productId) => ipcRenderer.invoke('batches:getByProduct', productId),
    create: (data) => ipcRenderer.invoke('batches:create', data),
    update: (id, data) => ipcRenderer.invoke('batches:update', id, data),
    delete: (id) => ipcRenderer.invoke('batches:delete', id),
  },

  // ============================================
  // CLIENTS
  // ============================================
  clientCategories: {
    getAll: () => ipcRenderer.invoke('clientCategories:getAll'),
    add: (name) => ipcRenderer.invoke('clientCategories:add', name),
  },

  clients: {
    getAll: () => ipcRenderer.invoke('clients:getAll'),
    getById: (id) => ipcRenderer.invoke('clients:getById', id),
    search: (query) => ipcRenderer.invoke('clients:search', query),
    getWithDebt: () => ipcRenderer.invoke('clients:getWithDebt'),
    add: (data) => ipcRenderer.invoke('clients:add', data),
    update: (id, data) => ipcRenderer.invoke('clients:update', id, data),
    updateBalance: (id, amount) => ipcRenderer.invoke('clients:updateBalance', id, amount),
    delete: (id) => ipcRenderer.invoke('clients:delete', id),
    getStats: () => ipcRenderer.invoke('clients:getStats'),
  },

  // ============================================
  // SALES
  // ============================================
  sales: {
    getAll: () => ipcRenderer.invoke('sales:getAll'),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    getByClient: (clientId) => ipcRenderer.invoke('sales:getByClient', clientId),
    getByStatus: (status) => ipcRenderer.invoke('sales:getByStatus', status),
    getByDateRange: (startDate, endDate) => ipcRenderer.invoke('sales:getByDateRange', startDate, endDate),
    getUnpaid: () => ipcRenderer.invoke('sales:getUnpaid'),
    add: (data) => ipcRenderer.invoke('sales:add', data),
    update: (id, data) => ipcRenderer.invoke('sales:update', id, data),
    addPayment: (id, amount) => ipcRenderer.invoke('sales:addPayment', id, amount),
    delete: (id) => ipcRenderer.invoke('sales:delete', id),
    getItems: (saleId) => ipcRenderer.invoke('sales:getItems', saleId),
    addItem: (data) => ipcRenderer.invoke('sales:addItem', data),
    updateItem: (id, data) => ipcRenderer.invoke('sales:updateItem', id, data),
    deleteItem: (id) => ipcRenderer.invoke('sales:deleteItem', id),
    getSummary: (year, month) => ipcRenderer.invoke('sales:getSummary', year, month),
    getTopProducts: (limit) => ipcRenderer.invoke('sales:getTopProducts', limit),
    getMonthlySales: (year) => ipcRenderer.invoke('sales:getMonthlySales', year),
  },

  // ============================================
  // EMPLOYERS
  // ============================================
  employers: {
    getAll: () => ipcRenderer.invoke('employers:getAll'),
    getById: (id) => ipcRenderer.invoke('employers:getById', id),
    getActive: () => ipcRenderer.invoke('employers:getActive'),
    search: (query) => ipcRenderer.invoke('employers:search', query),
    add: (data) => ipcRenderer.invoke('employers:add', data),
    update: (id, data) => ipcRenderer.invoke('employers:update', id, data),
    delete: (id) => ipcRenderer.invoke('employers:delete', id),
    getStats: () => ipcRenderer.invoke('employers:getStats'),
  },

  // ============================================
  // PAYROLL
  // ============================================
  payroll: {
    getAll: () => ipcRenderer.invoke('payroll:getAll'),
    getById: (id) => ipcRenderer.invoke('payroll:getById', id),
    getByEmployer: (employerId) => ipcRenderer.invoke('payroll:getByEmployer', employerId),
    getByMonth: (year, month) => ipcRenderer.invoke('payroll:getByMonth', year, month),
    getPending: () => ipcRenderer.invoke('payroll:getPending'),
    add: (data) => ipcRenderer.invoke('payroll:add', data),
    update: (id, data) => ipcRenderer.invoke('payroll:update', id, data),
    markPaid: (id, paymentDate) => ipcRenderer.invoke('payroll:markPaid', id, paymentDate),
    delete: (id) => ipcRenderer.invoke('payroll:delete', id),
    generate: (year, month) => ipcRenderer.invoke('payroll:generate', year, month),
    getSummary: (year) => ipcRenderer.invoke('payroll:getSummary', year),
  },

  // ============================================
  // REPORTS
  // ============================================
  reports: {
    // Profit & Loss
    getProfitLoss: (startDate, endDate) => ipcRenderer.invoke('reports:getProfitLoss', startDate, endDate),
    getMonthlyProfitLoss: (year) => ipcRenderer.invoke('reports:getMonthlyProfitLoss', year),

    // Stock Alerts
    getLowStockItems: () => ipcRenderer.invoke('reports:getLowStockItems'),
    getOutOfStockItems: () => ipcRenderer.invoke('reports:getOutOfStockItems'),
    getStockValuation: () => ipcRenderer.invoke('reports:getStockValuation'),
    getStockByCategory: () => ipcRenderer.invoke('reports:getStockByCategory'),

    // Production
    getProductionHistory: (limit) => ipcRenderer.invoke('reports:getProductionHistory', limit),
    getProductionByProduct: () => ipcRenderer.invoke('reports:getProductionByProduct'),
    getProductionByMonth: (year) => ipcRenderer.invoke('reports:getProductionByMonth', year),

    // Sales
    getSalesByClient: (startDate, endDate) => ipcRenderer.invoke('reports:getSalesByClient', startDate, endDate),
    getTopProducts: (startDate, endDate, limit) => ipcRenderer.invoke('reports:getTopProducts', startDate, endDate, limit),
    getSalesByStatus: () => ipcRenderer.invoke('reports:getSalesByStatus'),
    getMonthlySales: (year) => ipcRenderer.invoke('reports:getMonthlySales', year),

    // Expenses
    getExpensesByCategory: (startDate, endDate) => ipcRenderer.invoke('reports:getExpensesByCategory', startDate, endDate),
    getMonthlyExpenses: (year) => ipcRenderer.invoke('reports:getMonthlyExpenses', year),
    getTopExpenses: (startDate, endDate, limit) => ipcRenderer.invoke('reports:getTopExpenses', startDate, endDate, limit),

    // Suppliers
    getPurchasesBySupplier: (startDate, endDate) => ipcRenderer.invoke('reports:getPurchasesBySupplier', startDate, endDate),
    getMonthlyPurchases: (year) => ipcRenderer.invoke('reports:getMonthlyPurchases', year),

    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('reports:getDashboardStats'),
  },

  // ============================================
  // SETTINGS
  // ============================================
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    setMultiple: (settings) => ipcRenderer.invoke('settings:setMultiple', settings),
  },

  // ============================================
  // DOCUMENTS
  // ============================================
  documents: {
    getAll: (limit) => ipcRenderer.invoke('documents:getAll', limit),
    getByType: (type) => ipcRenderer.invoke('documents:getByType', type),
    getById: (id) => ipcRenderer.invoke('documents:getById', id),
    getBySale: (saleId) => ipcRenderer.invoke('documents:getBySale', saleId),
    getByClient: (clientId) => ipcRenderer.invoke('documents:getByClient', clientId),
    getByDateRange: (startDate, endDate) => ipcRenderer.invoke('documents:getByDateRange', startDate, endDate),
    create: (data) => ipcRenderer.invoke('documents:create', data),
    delete: (id) => ipcRenderer.invoke('documents:delete', id),
    getStats: () => ipcRenderer.invoke('documents:getStats'),
    getNextNumber: (type) => ipcRenderer.invoke('documents:getNextNumber', type),
  },

  // ============================================
  // AUTHENTICATION
  // ============================================
  auth: {
    login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
    verifyPassword: (userId, password) => ipcRenderer.invoke('auth:verifyPassword', userId, password),
  },

  // ============================================
  // USERS MANAGEMENT
  // ============================================
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id) => ipcRenderer.invoke('users:getById', id),
    add: (data) => ipcRenderer.invoke('users:add', data),
    update: (id, data) => ipcRenderer.invoke('users:update', id, data),
    updatePassword: (id, newPassword) => ipcRenderer.invoke('users:updatePassword', id, newPassword),
    delete: (id) => ipcRenderer.invoke('users:delete', id),
    getStats: () => ipcRenderer.invoke('users:getStats'),
  },

  // ============================================
  // CLOUD SYNC
  // ============================================
  sync: {
    push: (serverUrl, syncKey) => ipcRenderer.invoke('sync:push', serverUrl, syncKey),
    pull: (serverUrl, syncKey) => ipcRenderer.invoke('sync:pull', serverUrl, syncKey),
  },

  // ============================================
  // SYSTEM
  // ============================================
  system: {
    reset: (data) => ipcRenderer.invoke('system:reset', data),
  },
});
