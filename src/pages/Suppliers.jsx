import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, Search, Edit2, Trash2, Phone, Mail,
  MapPin, TrendingUp, ShoppingCart, AlertTriangle, CreditCard,
  Wallet, History, X, Eye, FileText
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SupplierModal from '../components/SupplierModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Suppliers = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  // Supplier detail panel
  const [detailSupplier, setDetailSupplier] = useState(null);
  const [detailPurchases, setDetailPurchases] = useState([]);
  const [detailPayments, setDetailPayments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('purchases'); // 'purchases' | 'payments'

  // Record-payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentPurchaseId, setPaymentPurchaseId] = useState(''); // '' = none (FIFO versement)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Audit modal
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditBusy, setAuditBusy] = useState(false);

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

  // ---------- Supplier detail ----------
  const openDetail = async (supplier) => {
    setDetailSupplier(supplier);
    setDetailTab('purchases');
    setDetailLoading(true);
    try {
      const [purchasesRes, paymentsRes, freshRes] = await Promise.all([
        window.api.purchases.getBySupplier(supplier.id),
        window.api.suppliers.getPayments(supplier.id),
        window.api.suppliers.getById(supplier.id),
      ]);
      setDetailPurchases(purchasesRes?.success ? (purchasesRes.data || []) : []);
      setDetailPayments(paymentsRes?.success ? (paymentsRes.data || []) : []);
      if (freshRes?.success && freshRes.data) setDetailSupplier(freshRes.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detailSupplier) return;
    const [purchasesRes, paymentsRes, freshRes] = await Promise.all([
      window.api.purchases.getBySupplier(detailSupplier.id),
      window.api.suppliers.getPayments(detailSupplier.id),
      window.api.suppliers.getById(detailSupplier.id),
    ]);
    setDetailPurchases(purchasesRes?.success ? (purchasesRes.data || []) : []);
    setDetailPayments(paymentsRes?.success ? (paymentsRes.data || []) : []);
    if (freshRes?.success && freshRes.data) setDetailSupplier(freshRes.data);
  };

  const unpaidPurchases = detailPurchases.filter(p => {
    const remaining = Number(p.total || 0) - Number(p.paid_amount || 0);
    return (p.status !== 'paid') && remaining > 0.01;
  });

  // ---------- Record payment ----------
  const openPaymentModal = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setPaymentPurchaseId('');
    setShowPaymentModal(true);
  };

  // Open the record-payment modal directly from a supplier row.
  // Loads the supplier's detail context (unpaid purchases) so Mode A
  // (apply-to-specific-purchase) has its dropdown populated.
  const openPaymentFromRow = async (supplier) => {
    await openDetail(supplier);
    openPaymentModal();
  };

  const submitPayment = async () => {
    if (!detailSupplier) return;
    const amt = parseFloat(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setPaymentSubmitting(true);
    try {
      let result;
      if (paymentPurchaseId) {
        // Specific purchase → direct recordPayment, marks purchase paid on settle
        result = await window.api.suppliers.recordPayment({
          supplier_id: detailSupplier.id,
          purchase_id: parseInt(paymentPurchaseId, 10),
          amount: amt,
          date: paymentDate,
          method: paymentMethod,
          notes: paymentNotes || null,
          created_by: user?.id || null,
        });
      } else {
        // No purchase selected → FIFO versement across unpaid purchases,
        // excess stacks as prepayment credit with the supplier.
        result = await window.api.suppliers.recordVersement(
          detailSupplier.id,
          amt,
          {
            date: paymentDate,
            method: paymentMethod,
            notes: paymentNotes || null,
            created_by: user?.id || null,
          }
        );
      }
      if (!result || result.success === false) {
        throw new Error(result?.error || 'Failed to record payment');
      }
      setShowPaymentModal(false);
      await refreshDetail();
      loadData();
    } catch (error) {
      console.error('Record supplier payment error:', error);
      alert(error.message || 'Error recording payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeletePayment = async (entry) => {
    if (!isAdmin) return;
    if (!window.confirm(t('confirmFixBalance') || 'Delete payment?')) return;
    try {
      const result = await window.api.suppliers.deletePayment(entry.id, user?.id);
      if (!result?.success) throw new Error(result?.error || 'Failed to delete payment');
      await refreshDetail();
      loadData();
    } catch (error) {
      alert(error.message || 'Error deleting payment');
    }
  };

  // ---------- Audit ----------
  const runAudit = async () => {
    setAuditBusy(true);
    try {
      const r = await window.api.suppliers.audit();
      if (r.success) {
        setAuditData(r.data);
        setAuditOpen(true);
      } else {
        alert(r.error || t('repairFailed'));
      }
    } finally {
      setAuditBusy(false);
    }
  };

  const repairOne = async (supplierId) => {
    const r = await window.api.suppliers.repairBalance(supplierId, user?.id);
    if (r.success) {
      // Refresh audit data & list
      const r2 = await window.api.suppliers.audit();
      if (r2.success) setAuditData(r2.data);
      loadData();
      if (detailSupplier && detailSupplier.id === supplierId) {
        refreshDetail();
      }
    }
    return r;
  };

  // ---------- Helpers ----------
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0) + ' DZD';
  };

  const paymentMethodLabel = (method) => {
    if (method === 'opening_balance') return t('openingBalance');
    if (method === 'balance_correction') return t('balanceCorrection');
    if (method === 'prepayment') return t('prepaymentCredit');
    if (method === 'cash') return t('cash') || 'Cash';
    if (method === 'bank') return t('bank') || 'Bank';
    if (method === 'credit') return t('credit') || 'Credit';
    return method;
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = searchQuery === '' ||
      supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDebt = !showDebtOnly || supplier.balance < 0;

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
          <div className="flex items-center gap-2">
            <button
              onClick={runAudit}
              disabled={auditBusy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-amber-500/10 border border-amber-500/25
                       text-amber-300 font-medium text-sm
                       hover:bg-amber-500/20 transition-all duration-300 disabled:opacity-60"
              title={t('supplierAudit')}
            >
              <AlertTriangle size={16} />
              {t('supplierAudit')}
            </button>
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
          </div>
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
                    onClick={() => openPaymentFromRow(supplier)}
                    className="p-2 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title={t('recordSupplierPayment')}
                  >
                    <Wallet size={16} />
                  </button>
                  <button
                    onClick={() => openDetail(supplier)}
                    className="p-2 rounded-lg text-dark-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title={t('viewDetails') || 'Details'}
                  >
                    <Eye size={16} />
                  </button>
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
                    supplier.balance < 0 ? 'text-red-400' : supplier.balance > 0 ? 'text-emerald-400' : 'text-dark-400'
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

      {/* ==================== SUPPLIER DETAIL MODAL ==================== */}
      <AnimatePresence>
        {detailSupplier && (
          <motion.div className="fixed inset-0 z-40 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                 onClick={() => { setDetailSupplier(null); setDetailPurchases([]); setDetailPayments([]); }} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-3xl mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{detailSupplier.name}</h2>
                    <p className="text-xs text-dark-400">
                      {t('balance')}:{' '}
                      <span className={`font-semibold ${
                        (detailSupplier.balance || 0) < 0 ? 'text-red-400'
                          : (detailSupplier.balance || 0) > 0 ? 'text-emerald-400'
                            : 'text-dark-400'
                      }`}>
                        {(detailSupplier.balance || 0) > 0 ? '+' : ''}{formatCurrency(detailSupplier.balance || 0)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openPaymentModal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                  >
                    <Wallet size={16} />
                    {t('recordSupplierPayment')}
                  </button>
                  <button onClick={() => { setDetailSupplier(null); setDetailPurchases([]); setDetailPayments([]); }}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-6 pt-3 border-b border-dark-700/50">
                <button
                  onClick={() => setDetailTab('purchases')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    detailTab === 'purchases'
                      ? 'bg-orange-500/10 text-orange-300 border-b-2 border-orange-500'
                      : 'text-dark-400 hover:text-white'
                  }`}
                >
                  <ShoppingCart size={14} className="inline mr-1" />
                  {t('purchases')} ({detailPurchases.length})
                </button>
                <button
                  onClick={() => setDetailTab('payments')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    detailTab === 'payments'
                      ? 'bg-orange-500/10 text-orange-300 border-b-2 border-orange-500'
                      : 'text-dark-400 hover:text-white'
                  }`}
                >
                  <History size={14} className="inline mr-1" />
                  {t('supplierPayments')} ({detailPayments.length})
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {detailLoading ? (
                  <div className="text-center text-dark-400 py-12">{t('loading') || 'Loading...'}</div>
                ) : detailTab === 'purchases' ? (
                  detailPurchases.length === 0 ? (
                    <div className="text-center text-dark-400 py-12">
                      <ShoppingCart size={48} className="mx-auto mb-4 text-dark-600" />
                      <p>{t('noPurchasesYet') || 'No purchases yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailPurchases.map(p => {
                        const total = Number(p.total || 0);
                        const paid = Number(p.paid_amount || 0);
                        const remaining = total - paid;
                        const isPaid = p.status === 'paid' || remaining <= 0.01;
                        return (
                          <div key={p.id}
                               className={`p-4 rounded-xl border flex items-center gap-4 ${
                                 isPaid
                                   ? 'bg-emerald-500/5 border-emerald-500/20'
                                   : 'bg-dark-800/50 border-dark-700/50'
                               }`}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                 style={{ background: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                              <FileText size={18} className={isPaid ? 'text-emerald-400' : 'text-amber-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium text-sm">#{p.id}</span>
                                {p.invoice_number && (
                                  <span className="text-xs text-dark-400">· {p.invoice_number}</span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isPaid ? 'bg-emerald-500/10 text-emerald-300'
                                    : 'bg-amber-500/10 text-amber-300'
                                }`}>
                                  {isPaid ? (t('paid') || 'Paid') : (t('unpaid') || 'Unpaid')}
                                </span>
                              </div>
                              <p className="text-xs text-dark-400">
                                {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white">{formatCurrency(total)}</p>
                              {!isPaid && (
                                <p className="text-xs text-amber-400">
                                  {t('remaining') || 'Remaining'}: {formatCurrency(remaining)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  detailPayments.length === 0 ? (
                    <div className="text-center text-dark-400 py-12">
                      <History size={48} className="mx-auto mb-4 text-dark-600" />
                      <p>{t('noPaymentsYet') || 'No payments yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailPayments.map(entry => {
                        const method = entry.method;
                        const isOpening = method === 'opening_balance';
                        const isCorrection = method === 'balance_correction';
                        const isPrepayment = method === 'prepayment';
                        const amt = Number(entry.amount || 0);
                        return (
                          <div key={entry.id}
                               className={`p-4 rounded-xl border flex items-center gap-4 ${
                                 isCorrection
                                   ? 'bg-amber-500/5 border-amber-500/20'
                                   : isOpening
                                     ? 'bg-blue-500/5 border-blue-500/20'
                                     : isPrepayment
                                       ? 'bg-purple-500/5 border-purple-500/20'
                                       : 'bg-dark-800/50 border-dark-700/50'
                               }`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium text-sm">
                                  {paymentMethodLabel(method)}
                                </span>
                                {entry.purchase_id && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300">
                                    {t('purchases')} #{entry.purchase_id}
                                  </span>
                                )}
                                {isCorrection && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                    {t('adminOnly')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-dark-400">
                                {entry.date ? new Date(entry.date).toLocaleDateString() : '—'}
                                {entry.created_by_name && ` · ${entry.created_by_name}`}
                              </p>
                              {entry.notes && (
                                <p className="text-xs text-dark-500 mt-1 italic truncate">{entry.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-lg ${
                                amt < 0 ? 'text-red-400' : 'text-emerald-400'
                              }`}>
                                {amt >= 0 ? '+' : ''}{amt.toLocaleString()} DZD
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeletePayment(entry)}
                              disabled={!isAdmin}
                              title={isAdmin ? t('delete') : t('adminOnly')}
                              className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== RECORD-PAYMENT MODAL ==================== */}
      <AnimatePresence>
        {showPaymentModal && detailSupplier && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                 onClick={() => !paymentSubmitting && setShowPaymentModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{t('recordSupplierPayment')}</h2>
                    <p className="text-xs text-dark-400">{detailSupplier.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowPaymentModal(false)}
                        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('amount') || 'Amount'} (DZD) *
                  </label>
                  <input
                    type="number" inputMode="decimal" autoFocus min="0" step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white text-xl font-semibold text-right focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Method */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('method') || 'Method'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'bank', 'credit'].map(m => (
                      <button key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === m
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                            : 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600'
                        }`}>
                        {t(m) || m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('date') || 'Date'}
                  </label>
                  <input type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Apply to purchase (optional) */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('applyToPurchase')}
                  </label>
                  {unpaidPurchases.length === 0 ? (
                    <p className="text-xs text-dark-500 italic">{t('noUnpaidPurchases')}</p>
                  ) : (
                    <select
                      value={paymentPurchaseId}
                      onChange={(e) => setPaymentPurchaseId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">— {t('openingBalanceNone')} —</option>
                      {unpaidPurchases.map(p => {
                        const remaining = Number(p.total || 0) - Number(p.paid_amount || 0);
                        return (
                          <option key={p.id} value={p.id}>
                            #{p.id}{p.invoice_number ? ` · ${p.invoice_number}` : ''} — {formatCurrency(remaining)}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('notes')} ({t('optional') || 'optional'})
                  </label>
                  <textarea rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setShowPaymentModal(false)}
                          className="px-5 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800">
                    {t('cancel')}
                  </button>
                  <button onClick={submitPayment}
                          disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <Wallet size={18} />
                    {paymentSubmitting ? '...' : (t('recordSupplierPayment'))}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== AUDIT MODAL ==================== */}
      <AnimatePresence>
        {auditOpen && auditData && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setAuditOpen(false); }}
          >
            <div className="w-full max-w-2xl mt-12 rounded-2xl overflow-hidden"
                 style={{ background: '#0d1120', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t('supplierAudit')}</h2>
                    <p className="text-xs text-amber-300/70">
                      {auditData.total_drift_count === 0
                        ? t('allBalancesMatch')
                        : `${auditData.total_drift_count} ${t('driftsFound')}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setAuditOpen(false)}
                        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800">
                  <span className="text-xl">×</span>
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {(auditData.drifts || []).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-emerald-200 font-medium">{t('allBalancesMatch')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditData.drifts.map(d => (
                      <div key={d.id}
                           className="flex items-center justify-between p-3 rounded-xl"
                           style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{d.name}</p>
                          <p className="text-xs text-dark-400 mt-0.5">
                            <span className="text-red-400">{t('storedBalance')}: {formatCurrency(d.stored_balance)}</span>
                            <span className="mx-2 text-dark-500">→</span>
                            <span className="text-emerald-400">{t('expectedBalance')}: {formatCurrency(d.expected_balance)}</span>
                          </p>
                        </div>
                        {isAdmin ? (
                          <button
                            onClick={async () => {
                              if (!window.confirm(`${t('confirmFixBalance')}\n${formatCurrency(d.stored_balance)} → ${formatCurrency(d.expected_balance)}`)) return;
                              const r = await repairOne(d.id);
                              if (!r.success) alert(r.error || t('repairFailed'));
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/25 transition-colors"
                          >
                            {t('fixBalance')}
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-dark-800/50 text-dark-500 text-xs">{t('adminOnly')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Suppliers;
