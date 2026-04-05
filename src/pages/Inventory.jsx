import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warehouse, Plus, Search, Edit2, Trash2, Play, Package,
  TrendingUp, Factory, AlertTriangle, DollarSign, Clock, ShoppingCart
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ProductModal from '../components/ProductModal';
import ProductImage from '../components/ProductImage';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const Inventory = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [products, setProducts] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    total_products: 0,
    total_batches: 0,
    total_produced: 0,
    total_cost: 0,
    month_batches: 0,
    month_produced: 0,
    month_cost: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // products | batches
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [productionModal, setProductionModal] = useState(null);
  const [productionData, setProductionData] = useState({
    quantity: '',
    expense_allocation: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Resale stock modal
  const [resaleStockModal, setResaleStockModal] = useState(null);
  const [resaleStockData, setResaleStockData] = useState({
    quantity: '',
    unit_cost: '',
    notes: ''
  });
  const [savingResaleStock, setSavingResaleStock] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, stockRes, batchesRes, statsRes] = await Promise.all([
        window.api.products.getAll(),
        window.api.stock.getAll(),
        window.api.batches.getAll(),
        window.api.products.getStats()
      ]);

      if (productsRes.success) setProducts(productsRes.data);
      if (stockRes.success) setStockItems(stockRes.data);
      if (batchesRes.success) setBatches(batchesRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSaveProduct = async ({ product, recipe }) => {
    try {
      console.log('Saving product:', product, 'Recipe:', recipe);
      if (editingProduct) {
        // Clean up old image if it changed
        const oldImage = editingProduct.image_path;
        if (oldImage && oldImage !== product.image_path) {
          await window.api.products.deleteImage(oldImage);
        }
        const result = await window.api.products.update(editingProduct.id, product);
        console.log('Update result:', result);
        if (result.success) {
          await window.api.products.setRecipe(editingProduct.id, recipe);
          await loadData();
          setIsModalOpen(false);
          setEditingProduct(null);
        } else {
          showNotification('Failed to update: ' + (result.error || 'Unknown error'), 'error');
        }
      } else {
        const result = await window.api.products.add(product);
        console.log('Add result:', result);
        if (result.success) {
          if (recipe.length > 0) {
            await window.api.products.setRecipe(result.data.lastInsertRowid, recipe);
          }
          await loadData();
          setIsModalOpen(false);
        } else {
          showNotification('Failed to add: ' + (result.error || 'Unknown error'), 'error');
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const result = await window.api.products.delete(id);
      if (result.success) {
        await loadData();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleStartProduction = async () => {
    if (!productionModal || !productionData.quantity) return;

    try {
      const result = await window.api.batches.create({
        product_id: productionModal.id,
        quantity_produced: parseFloat(productionData.quantity),
        expense_allocation: parseFloat(productionData.expense_allocation) || 0,
        date: productionData.date,
        notes: productionData.notes
      });

      if (result.success) {
        await loadData();
        setProductionModal(null);
        setProductionData({
          quantity: '',
          expense_allocation: '',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Error starting production:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  };

  // Add stock for resale products
  const handleAddResaleStock = async () => {
    if (!resaleStockModal || !resaleStockData.quantity) return;

    try {
      setSavingResaleStock(true);
      const result = await window.api.products.addResaleStock(
        resaleStockModal.id,
        parseFloat(resaleStockData.quantity),
        parseFloat(resaleStockData.unit_cost) || 0,
        resaleStockData.notes || t('resaleStockPurchase') || 'Resale stock purchase'
      );

      if (result.success) {
        await loadData();
        setResaleStockModal(null);
        setResaleStockData({
          quantity: '',
          unit_cost: '',
          notes: ''
        });
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      console.error('Error adding resale stock:', error);
      showNotification('Error: ' + error.message, 'error');
    } finally {
      setSavingResaleStock(false);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DZD';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredProducts = products.filter(product =>
    searchQuery === '' ||
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBatches = batches.filter(batch =>
    searchQuery === '' ||
    batch.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, subValue, icon: Icon, gradient }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-dark-800/50 border border-dark-700/50 p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-dark-500 text-sm mt-1">{subValue}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('inventoryProduction')}
        subtitle={t('createProductsAndManage')}
        icon={Warehouse}
        gradient="from-violet-500 to-purple-500"
        actions={isAdmin ?
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-violet-500 to-purple-500
                     text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-violet-500/25
                     transition-all duration-300"
          >
            <Plus size={18} />
            {t('createProduct')}
          </button>
          : null
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('totalProducts')}
          value={stats.total_products}
          icon={Package}
          gradient="from-violet-500 to-purple-500"
        />
        <StatCard
          title={t('productionBatches')}
          value={stats.total_batches}
          subValue={`${stats.total_produced} ${t('unitsProduced')}`}
          icon={Factory}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title={t('thisMonth')}
          value={stats.month_batches}
          subValue={`${stats.month_produced} ${t('unit')}`}
          icon={TrendingUp}
          gradient="from-emerald-500 to-teal-500"
        />
        {isAdmin && (
          <StatCard
            title={t('productionCost')}
            value={formatCurrency(stats.month_cost)}
            subValue={t('thisMonth')}
            icon={DollarSign}
            gradient="from-amber-500 to-orange-500"
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-violet-500/20 text-violet-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          {t('products')} ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'batches'
              ? 'bg-violet-500/20 text-violet-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          {t('productionHistory')} ({batches.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={activeTab === 'products' ? t('searchProducts') : t('searchProductionBatches')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-violet-500/50
                     transition-colors duration-200"
          />
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-dark-800/30 rounded-2xl border border-dark-700/30 p-6 hover:border-dark-600/50 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {product.image_path ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <ProductImage product={product} fill className="rounded-xl" />
                        </div>
                      ) : (
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          product.is_resale
                            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                            : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20'
                        }`}>
                          <Package size={28} className={product.is_resale ? 'text-emerald-400' : 'text-violet-400'} />
                        </div>
                      )}
                      <div>
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        <p className="text-dark-500 text-sm">
                          {product.is_resale
                            ? (t('resaleProduct') || 'Resale')
                            : `${product.ingredient_count || 0} ${t('ingredients')}`}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        {product.is_resale ? (
                          <button
                            onClick={() => {
                              setResaleStockModal(product);
                              setResaleStockData({
                                quantity: '',
                                unit_cost: product.purchase_price || '',
                                notes: ''
                              });
                            }}
                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title={t('addStock') || 'Add Stock'}
                          >
                            <Plus size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setProductionModal(product)}
                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title={t('startProduction')}
                          >
                            <Play size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-dark-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-dark-700/30">
                    <div>
                      <p className="text-dark-500 text-xs">{t('sellingPrice')}</p>
                      <p className="text-white font-medium">{formatCurrency(product.selling_price || 0)}</p>
                    </div>
                    {product.is_resale ? (
                      <>
                        {isAdmin && (
                          <div className="text-center">
                            <p className="text-dark-500 text-xs">{t('purchasePrice') || 'Purchase'}</p>
                            <p className="text-amber-400 font-medium">{formatCurrency(product.purchase_price || 0)}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-dark-500 text-xs">{t('inStock') || 'In Stock'}</p>
                          <p className="text-emerald-400 font-medium">{product.quantity || 0} {product.unit}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-right">
                        <p className="text-dark-500 text-xs">{t('totalProduced')}</p>
                        <p className="text-violet-400 font-medium">{product.total_produced || 0} {product.unit}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                          bg-dark-800/30 border border-dark-700/30 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-dark-500" />
              </div>
              <h3 className="text-lg font-semibold text-dark-300 mb-2">
                {searchQuery ? t('noProductsMatch') : t('noProductsYet')}
              </h3>
              <p className="text-dark-500 text-sm mb-6">
                {searchQuery ? t('tryDifferentSearch') : t('createFirstProduct')}
              </p>
              {isAdmin && (
                <button
                  onClick={handleAddClick}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-dark-700 text-white font-medium text-sm
                           hover:bg-dark-600 transition-colors duration-200"
                >
                  <Plus size={18} />
                  {t('createProduct')}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Production History Tab */}
      {activeTab === 'batches' && (
        <>
          {filteredBatches.length > 0 ? (
            <div className="bg-dark-800/30 rounded-2xl border border-dark-700/30 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700/50">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('date')}</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('products')}</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('quantity')}</th>
                    {isAdmin && <th className="text-right py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('cost')}</th>}
                    <th className="text-left py-4 px-6 text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch, index) => (
                    <motion.tr
                      key={batch.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-dark-500" />
                          <span className="text-white text-sm">{formatDate(batch.date)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white font-medium">{batch.product_name}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-violet-400 font-medium">
                          {batch.quantity_produced} {batch.product_unit}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-right">
                          <span className="text-white">{formatCurrency(batch.total_cost || 0)}</span>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <span className="text-dark-400 text-sm">{batch.notes || '-'}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                          bg-dark-800/30 border border-dark-700/30 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
                <Factory className="w-8 h-8 text-dark-500" />
              </div>
              <h3 className="text-lg font-semibold text-dark-300 mb-2">
                {searchQuery ? t('noBatchesMatch') : t('noBatchesYet')}
              </h3>
              <p className="text-dark-500 text-sm">
                {searchQuery ? t('tryDifferentSearch') : t('startProducingToSee')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        editItem={editingProduct}
        stockItems={stockItems}
      />

      {/* Production Modal */}
      <AnimatePresence>
        {productionModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setProductionModal(null)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 p-6 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Factory className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('startProduction')}</h3>
                  <p className="text-dark-400 text-sm">{productionModal.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('quantityToProduce')} *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={productionData.quantity}
                    onChange={(e) => setProductionData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder={`${t('numberOfUnits')} ${productionModal.unit}`}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('expenseAllocation')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={productionData.expense_allocation}
                    onChange={(e) => setProductionData(prev => ({ ...prev, expense_allocation: e.target.value }))}
                    placeholder={t('expenseAllocationHint')}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('productionDate')}
                  </label>
                  <input
                    type="date"
                    value={productionData.date}
                    onChange={(e) => setProductionData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('notes')}
                  </label>
                  <textarea
                    value={productionData.notes}
                    onChange={(e) => setProductionData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('productionNotes')}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setProductionModal(null)}
                  className="px-4 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleStartProduction}
                  disabled={!productionData.quantity}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={16} />
                  {t('startProduction')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resale Stock Modal */}
      <AnimatePresence>
        {resaleStockModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setResaleStockModal(null)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 p-6 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('addStock') || 'Add Stock'}</h3>
                  <p className="text-dark-400 text-sm">{resaleStockModal.name}</p>
                </div>
              </div>

              {/* Current Stock Info */}
              <div className="mb-4 p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-dark-400 text-sm">{t('currentStock') || 'Current Stock'}:</span>
                  <span className="text-emerald-400 font-semibold">
                    {resaleStockModal.quantity || 0} {resaleStockModal.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('quantityToAdd') || 'Quantity to Add'} *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={resaleStockData.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setResaleStockData(prev => ({ ...prev, quantity: value }));
                        }
                      }}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400">
                      {resaleStockModal.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('unitCostDZD') || 'Unit Cost (DZD)'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={resaleStockData.unit_cost}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setResaleStockData(prev => ({ ...prev, unit_cost: value }));
                      }
                    }}
                    placeholder={resaleStockModal.purchase_price ? String(resaleStockModal.purchase_price) : '0.00'}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('notes')}
                  </label>
                  <textarea
                    value={resaleStockData.notes}
                    onChange={(e) => setResaleStockData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('purchaseNotes') || 'Purchase notes...'}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                {/* Total Cost Preview */}
                {resaleStockData.quantity && resaleStockData.unit_cost && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-dark-400 text-sm">{t('totalCost') || 'Total Cost'}:</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(parseFloat(resaleStockData.quantity) * parseFloat(resaleStockData.unit_cost))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setResaleStockModal(null)}
                  className="px-4 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddResaleStock}
                  disabled={!resaleStockData.quantity || savingResaleStock}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingResaleStock ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {t('addStock') || 'Add Stock'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 p-6 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('deleteProduct')}</h3>
                  <p className="text-dark-400 text-sm">{t('deleteProductWarning')}</p>
                </div>
              </div>
              <p className="text-dark-300 mb-6">
                {t('areYouSureDelete')}{' '}
                <span className="text-white font-medium">{deleteConfirm.name}</span>?
                {t('cannotBeUndone')}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleDeleteProduct(deleteConfirm.id)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
