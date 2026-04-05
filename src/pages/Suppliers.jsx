import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, Search, Edit2, Trash2, Phone, Mail,
  MapPin, TrendingUp, ShoppingCart, AlertTriangle, CreditCard
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SupplierModal from '../components/SupplierModal';
import { useLanguage } from '../contexts/LanguageContext';

const Suppliers = () => {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    total_suppliers: 0,
    total_purchases: 0,
    total_amount: 0,
    total_debt: 0,
    month_purchases: 0,
    month_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDebtOnly, setShowDebtOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, statsRes] = await Promise.all([
        window.api.suppliers.getAll(),
        window.api.suppliers.getStats()
      ]);

      if (suppliersRes.success) setSuppliers(suppliersRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSaveSupplier = async (data) => {
    try {
      if (editingSupplier) {
        const result = await window.api.suppliers.update(editingSupplier.id, data);
        if (result.success) {
          await loadData();
          setIsModalOpen(false);
          setEditingSupplier(null);
        } else {
          throw new Error(result.error || 'Failed to update supplier');
        }
      } else {
        const result = await window.api.suppliers.add(data);
        if (result.success) {
          await loadData();
          setIsModalOpen(false);
        } else {
          throw new Error(result.error || 'Failed to add supplier');
        }
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert(error.message || 'Error saving supplier');
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      const result = await window.api.suppliers.delete(id);
      if (result.success) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        throw new Error(result.error || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert(error.message || 'Error deleting supplier');
    }
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DZD';
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = searchQuery === '' ||
      supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDebt = !showDebtOnly || supplier.balance > 0;

    return matchesSearch && matchesDebt;
  });

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
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('suppliers')}
        subtitle={t('manageSuppliers')}
        icon={Truck}
        gradient="from-orange-500 to-amber-500"
        actions={
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-orange-500 to-amber-500
                     text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-orange-500/25
                     transition-all duration-300"
          >
            <Plus size={18} />
            {t('addSupplier')}
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('totalSuppliers')}
          value={stats.total_suppliers}
          icon={Truck}
          gradient="from-orange-500 to-amber-500"
        />
        <StatCard
          title={t('totalPurchases')}
          value={stats.total_purchases}
          subValue={formatCurrency(stats.total_amount)}
          icon={ShoppingCart}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          title={t('thisMonth')}
          value={stats.month_purchases}
          subValue={formatCurrency(stats.month_amount)}
          icon={TrendingUp}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          title={t('outstandingDebt')}
          value={formatCurrency(stats.total_debt)}
          icon={CreditCard}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={t('searchSuppliers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-orange-500/50
                     transition-colors duration-200"
          />
        </div>
        <button
          onClick={() => setShowDebtOnly(!showDebtOnly)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl
                   border transition-all duration-200 ${
            showDebtOnly
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
          }`}
        >
          <CreditCard size={18} />
          {t('withDebt')}
        </button>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier, index) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-dark-800/30 rounded-2xl border border-dark-700/30 p-6 hover:border-dark-600/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold truncate">{supplier.name}</h3>
                    <p className="text-dark-500 text-sm">
                      {supplier.purchase_count || 0} {t('purchases')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditClick(supplier)}
                    className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(supplier)}
                    className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-dark-500" />
                    <span className="text-dark-300">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-dark-500" />
                    <span className="text-dark-300">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-dark-500" />
                    <span className="text-dark-300 truncate">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-700/30">
                <div>
                  <p className="text-dark-500 text-xs">{t('totalPurchases')}</p>
                  <p className="text-white font-medium">{formatCurrency(supplier.total_purchases || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-dark-500 text-xs">{t('balance')}</p>
                  <p className={`font-medium ${
                    supplier.balance > 0 ? 'text-red-400' : supplier.balance < 0 ? 'text-emerald-400' : 'text-dark-400'
                  }`}>
                    {supplier.balance > 0 ? '+' : ''}{formatCurrency(supplier.balance || 0)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                      bg-dark-800/30 border border-dark-700/30 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-300 mb-2">
            {searchQuery || showDebtOnly ? t('noSuppliersMatch') : t('noSuppliersYet')}
          </h3>
          <p className="text-dark-500 text-sm mb-6">
            {searchQuery || showDebtOnly
              ? t('tryAdjustingFilters')
              : t('addSuppliersToManage')}
          </p>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-dark-700 text-white font-medium text-sm
                     hover:bg-dark-600 transition-colors duration-200"
          >
            <Plus size={18} />
            {t('addFirstSupplier')}
          </button>
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveSupplier}
        editItem={editingSupplier}
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
                  <h3 className="text-lg font-semibold text-white">{t('deleteSupplier')}</h3>
                  <p className="text-dark-400 text-sm">{t('willDeletePurchases')}</p>
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
                  onClick={() => handleDeleteSupplier(deleteConfirm.id)}
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

export default Suppliers;
