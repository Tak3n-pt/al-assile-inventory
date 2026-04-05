import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MoreVertical,
  X
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StockModal from '../components/StockModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import CustomSelect from '../components/CustomSelect';

const Stock = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [stats, setStats] = useState({ total_items: 0, low_stock_count: 0, total_value: 0 });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Quantity adjustment modal
  const [adjustModal, setAdjustModal] = useState({ open: false, item: null, type: 'add' });
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, catRes, statsRes, suppliersRes] = await Promise.all([
        window.api?.stock?.getAll(),
        window.api?.stockCategories?.getAll(),
        window.api?.stock?.getStats(),
        window.api?.suppliers?.getAll()
      ]);

      if (stockRes?.success) setStockItems(stockRes.data);
      if (catRes?.success) setCategories(catRes.data);
      if (statsRes?.success) setStats(statsRes.data);
      if (suppliersRes?.success) setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter items
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || item.category_id === parseInt(selectedCategory);
    const matchesLowStock = !showLowStock || item.is_low_stock;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Handle save (add/edit)
  const handleSave = async (data) => {
    try {
      console.log('Saving stock data:', data);
      let result;
      if (editingItem) {
        result = await window.api?.stock?.update(editingItem.id, data);
      } else {
        result = await window.api?.stock?.add(data);
      }
      console.log('Save result:', result);

      if (result?.success) {
        await loadData();
        setIsModalOpen(false);
        setEditingItem(null);
      } else {
        console.error('Save failed:', result?.error);
        showNotification(result?.error || 'Failed to save', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Error saving: ' + error.message, 'error');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      const result = await window.api?.stock?.delete(id);
      if (result?.success) {
        loadData();
        setDeleteConfirm(null);
      } else {
        showNotification(result?.error || 'Failed to delete', 'error');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message || 'Error deleting stock item');
    }
  };

  // Handle quantity adjustment
  const handleAdjustQuantity = async () => {
    if (!adjustQuantity || isNaN(parseFloat(adjustQuantity))) return;

    try {
      let result;
      const qty = parseFloat(adjustQuantity);

      if (adjustModal.type === 'add') {
        result = await window.api?.stockQuantity?.add(adjustModal.item.id, qty, null, adjustNotes);
      } else if (adjustModal.type === 'remove') {
        result = await window.api?.stockQuantity?.remove(adjustModal.item.id, qty, adjustNotes);
      } else {
        result = await window.api?.stockQuantity?.adjust(adjustModal.item.id, qty, adjustNotes);
      }

      if (result?.success) {
        loadData();
        setAdjustModal({ open: false, item: null, type: 'add' });
        setAdjustQuantity('');
        setAdjustNotes('');
      } else {
        throw new Error(result?.error || 'Failed to adjust quantity');
      }
    } catch (error) {
      console.error('Adjust error:', error);
      alert(error.message || 'Error adjusting quantity');
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' DZD';
  };

  return (
    <div>
      <PageHeader
        title={t('stock')}
        subtitle={t('trackRawMaterials')}
        icon={Package}
        gradient="from-emerald-500 to-teal-500"
        actions={isAdmin ?
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-emerald-500 to-teal-500
                     text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-emerald-500/25
                     transition-all duration-300"
          >
            <Plus size={18} />
            {t('addStock')}
          </button>
          : null
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">{t('totalItems')}</p>
              <p className="text-2xl font-bold text-white">{stats.total_items}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">{t('lowStockAlerts')}</p>
              <p className="text-2xl font-bold text-amber-400">{stats.low_stock_count}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </motion.div>

        {isAdmin && (
          <motion.div
            className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">{t('totalValue')}</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.total_value || 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={t('searchStock')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500/50
                     transition-colors duration-200"
          />
        </div>

        <CustomSelect
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val)}
          options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
          placeholder={t('allCategories')}
        />

        <button
          onClick={() => setShowLowStock(!showLowStock)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
            showLowStock
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
              : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
          }`}
        >
          <AlertTriangle size={18} />
          {t('lowStock')}
        </button>

        <button
          onClick={loadData}
          className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                   text-dark-400 hover:text-white hover:border-dark-600 transition-all"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stock Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-dark-500 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                      bg-dark-800/30 border border-dark-700/30 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-300 mb-2">
            {searchQuery || selectedCategory || showLowStock ? t('noMatchingItems') : t('noStockItems')}
          </h3>
          <p className="text-dark-500 text-sm mb-6">
            {searchQuery || selectedCategory || showLowStock
              ? t('tryAdjustingFilters')
              : t('addFirstStock')}
          </p>
          {isAdmin && !searchQuery && !selectedCategory && !showLowStock && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-dark-700 text-white font-medium text-sm
                       hover:bg-dark-600 transition-colors duration-200"
            >
              <Plus size={18} />
              {t('addStockItem')}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-dark-700/50">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('item')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('category')}</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('quantity')}</th>
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('unitCost')}</th>}
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('value')}</th>}
                <th className="px-6 py-4 text-center text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('status')}</th>
                {isAdmin && <th className="px-6 py-4 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider">{t('actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {filteredItems.map((item, index) => (
                <motion.tr
                  key={item.id}
                  className="bg-dark-900/50 hover:bg-dark-800/50 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        {item.supplier_name && (
                          <p className="text-xs text-dark-500">{t('from')}: {item.supplier_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-lg bg-dark-700/50 text-dark-300 text-sm">
                      {item.category_name || t('uncategorized')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-semibold text-white">{item.quantity}</span>
                      <span className="text-dark-400 text-sm">{item.unit}</span>
                      {isAdmin && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => setAdjustModal({ open: true, item, type: 'add' })}
                            className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title={t('addStock')}
                          >
                            <TrendingUp size={16} />
                          </button>
                          <button
                            onClick={() => setAdjustModal({ open: true, item, type: 'remove' })}
                            className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                            title={t('removeStock')}
                          >
                            <TrendingDown size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right text-dark-300">
                      {formatCurrency(item.cost_per_unit)}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {formatCurrency(item.quantity * item.cost_per_unit)}
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    {item.is_low_stock ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-sm">
                        <AlertTriangle size={14} />
                        {t('low')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
                        {t('ok')}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Modal */}
      <StockModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editItem={editingItem}
        categories={categories}
        suppliers={suppliers}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 p-6 bg-dark-900 rounded-2xl border border-dark-700 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('deleteItem')}</h3>
                  <p className="text-dark-400 text-sm">{t('cannotBeUndone')}</p>
                </div>
              </div>
              <p className="text-dark-300 mb-6">
                {t('areYouSureDelete')} <span className="font-semibold text-white">{deleteConfirm.name}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quantity Adjustment Modal */}
      <AnimatePresence>
        {adjustModal.open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAdjustModal({ open: false, item: null, type: 'add' })} />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 p-6 bg-dark-900 rounded-2xl border border-dark-700 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    adjustModal.type === 'add' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    {adjustModal.type === 'add' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {adjustModal.type === 'add' ? t('addStock') : t('removeStock')}
                    </h3>
                    <p className="text-dark-400 text-sm">{adjustModal.item?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAdjustModal({ open: false, item: null, type: 'add' })}
                  className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('current')}: {adjustModal.item?.quantity} {adjustModal.item?.unit}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder={`${t('quantityTo')} ${adjustModal.type === 'add' ? t('add').toLowerCase() : t('remove').toLowerCase()}`}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">{t('notes')}</label>
                  <input
                    type="text"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder={t('reasonForAdjustment')}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setAdjustModal({ open: false, item: null, type: 'add' })}
                  className="px-4 py-2 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAdjustQuantity}
                  className={`px-4 py-2 rounded-xl text-white transition-colors ${
                    adjustModal.type === 'add'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {adjustModal.type === 'add' ? t('add') : t('remove')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stock;
