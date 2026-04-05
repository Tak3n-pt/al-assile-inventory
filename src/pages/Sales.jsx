import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Receipt,
  Star,
  StarOff,
  X,
  Check,
  AlertCircle,
  Package,
  Grid3X3,
  List,
  Keyboard,
  FileText,
  Printer,
  RefreshCw,
  Calculator,
  History,
  Calendar,
  ChevronDown,
  Eye,
  DollarSign
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ProductImage from '../components/ProductImage';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import DocumentGeneratorModal from '../components/documents/DocumentGeneratorModal';
import PostSaleDocumentChooser from '../components/documents/PostSaleDocumentChooser';

// Currency formatter for Algerian Dinar
const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' DZD';
};

// ============================================
// CART ITEM COMPONENT
// ============================================
const CartItem = ({ item, onUpdateQuantity, onRemove, t }) => {
  const isAtMax = item.maxQuantity && item.quantity >= item.maxQuantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-xl border border-dark-700/50
                 hover:border-dark-600/50 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{item.name}</p>
        <p className="text-sm text-dark-400">
          {formatCurrency(item.unit_price)} × {item.quantity}
          {item.maxQuantity && (
            <span className={`ml-1 ${isAtMax ? 'text-amber-400' : ''}`}>
              / {item.maxQuantity}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-700
                     text-dark-300 hover:text-white hover:bg-dark-600 transition-all"
        >
          <Minus size={16} />
        </button>

        <span className={`w-10 text-center font-semibold ${isAtMax ? 'text-amber-400' : 'text-white'}`}>
          {item.quantity}
        </span>

        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={isAtMax}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
                     ${isAtMax
                       ? 'bg-dark-800 text-dark-600 cursor-not-allowed'
                       : 'bg-dark-700 text-dark-300 hover:text-white hover:bg-dark-600'
                     }`}
        >
          <Plus size={16} />
        </button>

        <button
          onClick={() => onRemove(item.id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20
                     text-red-400 hover:bg-red-500/30 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="w-24 text-right">
        <p className="font-bold text-emerald-400">{formatCurrency(item.total)}</p>
      </div>
    </motion.div>
  );
};

// ============================================
// PRODUCT CARD COMPONENT
// ============================================
const ProductCard = ({ product, onAdd, onToggleFavorite, isInCart, t }) => {
  const isOutOfStock = (product.quantity || 0) <= 0;
  const isLowStock = (product.quantity || 0) <= (product.min_stock_alert || 0) && (product.min_stock_alert || 0) > 0;

  return (
    <motion.button
      whileHover={{ scale: isOutOfStock ? 1 : 1.02, y: isOutOfStock ? 0 : -2 }}
      whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`relative p-4 rounded-xl border transition-all text-left
        ${isOutOfStock
          ? 'bg-dark-800/30 border-dark-700/30 opacity-60 cursor-not-allowed'
          : isInCart
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600/50'
        }`}
    >
      {/* Favorite Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(product.id);
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-dark-700/80
                   hover:bg-dark-600 transition-all z-10"
      >
        {product.is_favorite ? (
          <Star size={14} className="text-amber-400 fill-amber-400" />
        ) : (
          <StarOff size={14} className="text-dark-400" />
        )}
      </button>

      {/* Low Stock / Out of Stock Badge */}
      {isOutOfStock ? (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
          {t('outOfStock')}
        </div>
      ) : isLowStock && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
          {t('lowStock')}
        </div>
      )}

      {/* Product Image / Icon */}
      {product.image_path ? (
        <div className="w-full h-24 rounded-xl overflow-hidden mb-3">
          <ProductImage product={product} fill className="rounded-xl" />
        </div>
      ) : (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3
          ${isOutOfStock
            ? 'bg-dark-700/50'
            : isInCart
              ? 'bg-emerald-500/20'
              : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20'
          }`}>
          <Package size={24} className={isOutOfStock ? 'text-dark-500' : isInCart ? 'text-emerald-400' : 'text-violet-400'} />
        </div>
      )}

      {/* Product Info */}
      <h3 className="font-semibold text-white text-sm truncate mb-1">{product.name}</h3>
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold text-emerald-400">{formatCurrency(product.selling_price)}</p>
        <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-dark-400'}`}>
          {product.quantity || 0} {product.unit || 'pcs'}
        </span>
      </div>

      {/* Barcode Badge */}
      {product.barcode && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-dark-400">
          <Barcode size={14} />
          <span className="truncate">{product.barcode}</span>
        </div>
      )}

      {/* In Cart Indicator */}
      {isInCart && !isOutOfStock && (
        <div className="absolute bottom-2 right-2">
          <Check size={16} className="text-emerald-400" />
        </div>
      )}
    </motion.button>
  );
};

// ============================================
// CLIENT SELECTOR COMPONENT
// ============================================
const ClientSelector = ({ clients, selectedClient, onSelect, onSearch, searchQuery, t }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-800/50
                   border border-dark-700/50 hover:border-dark-600/50 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20
                        flex items-center justify-center">
          <User className="text-orange-400" size={20} />
        </div>
        <div className="flex-1 text-left">
          {selectedClient ? (
            <>
              <p className="font-semibold text-white">{selectedClient.name}</p>
              <p className="text-xs text-dark-400">
                {selectedClient.phone || t('noPhone')}
                {selectedClient.balance > 0 && (
                  <span className="text-amber-400 ml-2">
                    ({t('owes')} {formatCurrency(selectedClient.balance)})
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-dark-400">{t('selectClient')}</p>
              <p className="text-xs text-dark-500">{t('walkInCustomer')}</p>
            </>
          )}
        </div>
        <X
          size={16}
          className={`text-dark-400 transition-transform ${isOpen ? 'rotate-45' : ''}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-dark-800 rounded-xl
                       border border-dark-700 shadow-2xl overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-dark-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder={t('searchClients')}
                  className="w-full pl-9 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg
                           text-white placeholder-dark-400 text-sm focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>

            {/* Walk-in Option */}
            <button
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center">
                <User size={16} className="text-dark-300" />
              </div>
              <span className="text-dark-300">{t('walkInCustomer')}</span>
            </button>

            {/* Client List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    onSelect(client);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700/50
                             transition-colors border-t border-dark-700/50
                    ${selectedClient?.id === client.id ? 'bg-dark-700/30' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <User size={16} className="text-orange-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-dark-400">{client.phone || t('noPhone')}</p>
                  </div>
                  {client.balance > 0 && (
                    <span className="text-xs text-amber-400 font-medium">
                      {formatCurrency(client.balance)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// PAYMENT MODAL COMPONENT
// ============================================
const PaymentModal = ({
  isOpen,
  onClose,
  total,
  client,
  onComplete,
  t,
  isProcessing
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState(total);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPaidAmount(total);
    }
  }, [isOpen, total]);

  const change = paidAmount - total;
  const remaining = total - paidAmount;
  const status = paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

  const handleQuickAmount = (amount) => {
    setPaidAmount(amount);
  };

  const quickAmounts = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-lg mx-4 bg-dark-900 rounded-2xl
                   border border-dark-700 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700
                        bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CreditCard className="text-emerald-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t('payment')}</h2>
              <p className="text-sm text-dark-400">
                {client ? client.name : t('walkInCustomer')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Total Display */}
          <div className="text-center py-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
            <p className="text-dark-400 text-sm mb-1">{t('totalAmount')}</p>
            <p className="text-4xl font-bold text-white">{formatCurrency(total)}</p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border
                           transition-all ${paymentMethod === 'cash'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <Banknote size={20} />
                <span className="font-medium">{t('cash')}</span>
              </button>
              <button
                onClick={() => setPaymentMethod('credit')}
                className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border
                           transition-all ${paymentMethod === 'credit'
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <CreditCard size={20} />
                <span className="font-medium">{t('credit')}</span>
              </button>
            </div>
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">
              {t('paidAmount')}
            </label>
            <div className="relative">
              <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
              <input
                type="text"
                inputMode="decimal"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl
                         text-xl font-semibold text-white text-right focus:outline-none
                         focus:border-emerald-500"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleQuickAmount(total)}
                className="flex-1 px-3 py-2 bg-dark-700 rounded-lg text-sm text-dark-300
                         hover:text-white hover:bg-dark-600 transition-all"
              >
                {t('exactAmount')}
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className="px-3 py-2 bg-dark-700 rounded-lg text-sm text-dark-300
                           hover:text-white hover:bg-dark-600 transition-all"
                >
                  {amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Change/Remaining Display */}
          <div className={`p-4 rounded-xl border ${
            paidAmount >= total
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex justify-between items-center">
              <span className={paidAmount >= total ? 'text-emerald-400' : 'text-amber-400'}>
                {paidAmount >= total ? t('change') : t('remaining')}
              </span>
              <span className={`text-2xl font-bold ${
                paidAmount >= total ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {formatCurrency(paidAmount >= total ? change : remaining)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              {t('notes')} ({t('optional')})
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('orderNotes')}
              rows={2}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl
                       text-white placeholder-dark-500 focus:outline-none focus:border-dark-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-dark-700 bg-dark-800/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-dark-700 text-dark-300 font-medium
                     hover:bg-dark-600 hover:text-white transition-all"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => onComplete({
              paidAmount,
              paymentMethod,
              notes,
              status
            })}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                     bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium
                     hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>
                <Check size={20} />
                {t('completeSale')}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// KEYBOARD SHORTCUTS HELP
// ============================================
const KeyboardShortcutsHelp = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', action: t('focusBarcodeScanner') },
    { key: 'F2', action: t('focusProductSearch') },
    { key: 'F3', action: t('toggleFavorites') },
    { key: 'F4', action: t('selectClient') },
    { key: 'F8', action: t('openPayment') },
    { key: 'F9', action: t('clearCart') },
    { key: 'Esc', action: t('closeModal') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl
                   border border-dark-700 shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="text-accent-primary" size={24} />
            <h3 className="text-lg font-semibold text-white">{t('keyboardShortcuts')}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-dark-300">{action}</span>
              <kbd className="px-3 py-1 bg-dark-700 rounded-lg text-sm font-mono text-white">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SALES HISTORY COMPONENT
// ============================================
const SalesHistory = ({ t }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);

  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo.toISOString().split('T')[0], end: todayStr };
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo.toISOString().split('T')[0], end: todayStr };
      }
      case 'custom':
        return customDateRange;
      default:
        return { start: todayStr, end: todayStr };
    }
  };

  // Load sales data
  useEffect(() => {
    loadSales();
  }, [dateFilter, customDateRange]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      if (range.start && range.end) {
        const result = await window.api.sales.getByDateRange(range.start, range.end);
        if (result.success) {
          setSales(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
    setLoading(false);
  };

  // View sale details
  const viewSaleDetails = async (sale) => {
    setSelectedSale(sale);
    try {
      const itemsResult = await window.api.sales.getItems(sale.id);
      if (itemsResult.success) {
        setSaleItems(itemsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  // Calculate totals
  const totalSales = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPaid = sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0);
  const totalPending = totalSales - totalPaid;

  const dateFilterOptions = [
    { value: 'today', label: t('today') || 'Today' },
    { value: 'week', label: t('thisWeek') || 'This Week' },
    { value: 'month', label: t('thisMonth') || 'This Month' },
    { value: 'custom', label: t('customRange') || 'Custom Range' }
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">{t('salesHistory') || 'Sales History'}</h2>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-white hover:border-dark-600 transition-all"
            >
              <Calendar size={18} className="text-emerald-400" />
              {dateFilterOptions.find(o => o.value === dateFilter)?.label}
              <ChevronDown size={16} className="text-dark-400" />
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
                {dateFilterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setDateFilter(option.value);
                      if (option.value !== 'custom') setShowDatePicker(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-dark-700 transition-colors
                      ${dateFilter === option.value ? 'bg-emerald-500/10 text-emerald-400' : 'text-white'}`}
                  >
                    {option.label}
                  </button>
                ))}

                {/* Custom Date Inputs */}
                {dateFilter === 'custom' && (
                  <div className="p-4 border-t border-dark-700 space-y-3">
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">{t('startDate') || 'Start Date'}</label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">{t('endDate') || 'End Date'}</label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      {t('apply') || 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={loadSales}
          className="p-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-400 hover:text-white transition-colors"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="text-emerald-400" size={20} />
            </div>
            <span className="text-dark-400">{t('totalSales') || 'Total Sales'}</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSales)}</p>
          <p className="text-sm text-dark-400 mt-1">{sales.length} {t('transactions') || 'transactions'}</p>
        </div>

        <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Check className="text-blue-400" size={20} />
            </div>
            <span className="text-dark-400">{t('totalPaid') || 'Total Paid'}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-amber-400" size={20} />
            </div>
            <span className="text-dark-400">{t('pending') || 'Pending'}</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Sales List */}
      <div className="flex-1 bg-dark-800/30 border border-dark-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="text-emerald-400 animate-spin" size={32} />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <History className="text-dark-600 mb-4" size={48} />
            <p className="text-dark-400">{t('noSalesFound') || 'No sales found'}</p>
            <p className="text-dark-500 text-sm mt-1">{t('tryDifferentDateRange') || 'Try a different date range'}</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <table className="w-full">
              <thead className="bg-dark-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('date') || 'Date'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('client') || 'Client'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('total') || 'Total'}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('paid') || 'Paid'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase">{t('status') || 'Status'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase">{t('actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {sales.map((sale, index) => (
                  <tr key={sale.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="px-4 py-3 text-dark-400">{index + 1}</td>
                    <td className="px-4 py-3 text-white">
                      {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {sale.client_name || (t('walkInCustomer') || 'Walk-in')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-400">
                      {formatCurrency(sale.paid_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                        ${sale.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                          sale.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'}`}
                      >
                        {sale.status === 'paid' ? (t('paid') || 'Paid') :
                         sale.status === 'partial' ? (t('partial') || 'Partial') :
                         (t('pending') || 'Pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => viewSaleDetails(sale)}
                        className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      <AnimatePresence>
        {selectedSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSale(null)} />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-2xl mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800/50">
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('saleDetails') || 'Sale Details'}</h3>
                  <p className="text-sm text-dark-400">#{selectedSale.id} - {new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Client Info */}
                <div className="flex items-center gap-3 p-4 bg-dark-800/50 rounded-xl mb-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <User className="text-orange-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{selectedSale.client_name || (t('walkInCustomer') || 'Walk-in Customer')}</p>
                    <p className="text-sm text-dark-400">{selectedSale.client_phone || ''}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-dark-400 uppercase">{t('items') || 'Items'}</h4>
                  {saleItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-dark-800/30 rounded-lg">
                      <div>
                        <p className="font-medium text-white">{item.product_name || item.name || `Product #${item.product_id}`}</p>
                        <p className="text-sm text-dark-400">{formatCurrency(item.unit_price)} × {item.quantity}</p>
                      </div>
                      <p className="font-bold text-emerald-400">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dark-700 pt-4 space-y-2">
                  <div className="flex justify-between text-dark-400">
                    <span>{t('subtotal') || 'Subtotal'}</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t('discount') || 'Discount'}</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-white pt-2">
                    <span>{t('total') || 'Total'}</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>{t('paid') || 'Paid'}</span>
                    <span>{formatCurrency(selectedSale.paid_amount)}</span>
                  </div>
                  {selectedSale.total - selectedSale.paid_amount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t('remaining') || 'Remaining'}</span>
                      <span>{formatCurrency(selectedSale.total - selectedSale.paid_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN SALES POS COMPONENT
// ============================================
const Sales = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();

  // Refs
  const barcodeInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'history'

  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showPostSaleChooser, setShowPostSaleChooser] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('invoice');
  const [settings, setSettings] = useState({});

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, clientsRes, settingsRes] = await Promise.all([
        window.api.products.getAll(),
        window.api.clients.getAll(),
        window.api.settings.getAll()
      ]);

      if (productsRes.success) {
        setProducts(productsRes.data.filter(p => p.is_active));
      }
      if (clientsRes.success) {
        setClients(clientsRes.data);
      }
      if (settingsRes.success) {
        // settingsRes.data is already an object {key: value}, not an array
        setSettings(settingsRes.data || {});
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification(t('errorLoadingData'), 'error');
    }
    setLoading(false);
  };

  // Keyboard shortcuts - use refs to avoid listener accumulation
  const shortcutStateRef = useRef({ cartLength: 0, showPaymentModal: false, showShortcutsHelp: false });
  useEffect(() => {
    shortcutStateRef.current = { cartLength: cart.length, showPaymentModal, showShortcutsHelp };
  }, [cart.length, showPaymentModal, showShortcutsHelp]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const { cartLength, showPaymentModal: payModal, showShortcutsHelp: helpModal } = shortcutStateRef.current;

      // Always allow typing in form fields
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (isFormElement) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // Don't process shortcuts if modal is open
      if (payModal || helpModal) {
        if (e.key === 'Escape') {
          setShowPaymentModal(false);
          setShowShortcutsHelp(false);
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          barcodeInputRef.current?.focus();
          break;
        case 'F2':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'F3':
          e.preventDefault();
          setShowFavoritesOnly(prev => !prev);
          break;
        case 'F8':
          e.preventDefault();
          if (cartLength > 0) setShowPaymentModal(true);
          break;
        case 'F9':
          e.preventDefault();
          if (cartLength > 0 && window.confirm(t('confirmClearCart'))) {
            setCart([]);
          }
          break;
        case 'Escape':
          setShowPaymentModal(false);
          setShowShortcutsHelp(false);
          break;
        case '?':
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcutsHelp(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Register ONCE - no stale listener accumulation

  // Auto-focus barcode input
  useEffect(() => {
    if (!loading && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [loading]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!barcode.trim()) return;

    try {
      const result = await window.api.products.getByBarcode(barcode.trim());
      if (result.success && result.data) {
        addToCart(result.data);
        showNotification(`${result.data.name} ${t('addedToCart')}`);
      } else {
        // Try searching by name/code
        const searchResult = await window.api.products.search(barcode.trim());
        if (searchResult.success && searchResult.data.length === 1) {
          addToCart(searchResult.data[0]);
          showNotification(`${searchResult.data[0].name} ${t('addedToCart')}`);
        } else if (searchResult.data.length > 1) {
          setSearchQuery(barcode.trim());
          showNotification(t('multipleProductsFound'), 'info');
        } else {
          showNotification(t('productNotFound'), 'error');
        }
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      showNotification(t('scanError'), 'error');
    }

    setBarcodeInput('');
  }, [t]);

  // Add product to cart
  const addToCart = (product) => {
    const availableQty = product.quantity || 0;
    if (availableQty <= 0) return; // Out of stock

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product_id === product.id);

      if (existingIndex >= 0) {
        // Check if we can add more
        const currentInCart = prevCart[existingIndex].quantity;
        if (currentInCart >= availableQty) return prevCart; // Can't add more

        // Increase quantity
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          total: (updated[existingIndex].quantity + 1) * updated[existingIndex].unit_price,
          maxQuantity: availableQty
        };
        return updated;
      }

      // Add new item
      return [...prevCart, {
        id: Date.now(), // Temporary ID for UI
        product_id: product.id,
        name: product.name,
        unit_price: product.selling_price,
        quantity: 1,
        total: product.selling_price,
        maxQuantity: availableQty
      }];
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prevCart => prevCart.map(item => {
      if (item.id === itemId) {
        // Check max quantity available
        const maxQty = item.maxQuantity || Infinity;
        const finalQuantity = Math.min(newQuantity, maxQty);
        return {
          ...item,
          quantity: finalQuantity,
          total: finalQuantity * item.unit_price
        };
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  // Toggle favorite
  const toggleFavorite = async (productId) => {
    try {
      const result = await window.api.products.toggleFavorite(productId);
      if (result.success) {
        setProducts(prevProducts =>
          prevProducts.map(p =>
            p.id === productId ? { ...p, is_favorite: !p.is_favorite } : p
          )
        );
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discount = 0; // Can be extended
  const total = subtotal - discount;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchQuery)) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFavorite = !showFavoritesOnly || product.is_favorite;

    return matchesSearch && matchesFavorite;
  });

  // Get products in cart
  const cartProductIds = cart.map(item => item.product_id);

  // Complete sale
  const completeSale = async (paymentData) => {
    setIsProcessing(true);

    try {
      // Create sale
      const saleData = {
        client_id: selectedClient?.id || null,
        date: new Date().toISOString().split('T')[0],
        subtotal: subtotal,
        discount: discount,
        total: total,
        paid_amount: paymentData.paidAmount,
        status: paymentData.status,
        notes: paymentData.notes
      };

      const saleResult = await window.api.sales.add(saleData);

      if (!saleResult.success) {
        throw new Error(saleResult.error || 'Failed to create sale');
      }

      const saleId = saleResult.data.lastInsertRowid;

      // Add sale items - check each result, rollback on failure
      for (const item of cart) {
        const itemResult = await window.api.sales.addItem({
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        });
        if (!itemResult.success) {
          // Rollback: delete the partially created sale
          await window.api.sales.delete(saleId);
          throw new Error(itemResult.error || `Failed to add item: ${item.product_id}`);
        }
      }

      // Get full sale data for document generation
      const fullSaleResult = await window.api.sales.getById(saleId);
      const saleItems = await window.api.sales.getItems(saleId);

      const completedSale = {
        ...fullSaleResult.data,
        items: saleItems.data,
        client: selectedClient
      };

      setLastSale(completedSale);

      // Reset cart
      setCart([]);
      setSelectedClient(null);
      setShowPaymentModal(false);

      showNotification(t('saleCompleted'));

      // Offer to generate document — open chooser modal instead of window.confirm
      setTimeout(() => {
        setShowPostSaleChooser(true);
      }, 420);

    } catch (error) {
      console.error('Sale error:', error);
      showNotification(error.message || t('saleError'), 'error');
    }

    setIsProcessing(false);
  };

  // Loading state
  if (loading) {
    return (
      <div>
        <PageHeader
          title={t('pos')}
          subtitle={t('pointOfSale')}
          icon={ShoppingCart}
          gradient="from-emerald-500 to-teal-500"
        />
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-emerald-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col -m-8 -mt-8">
      {/* Tab Navigation */}
      <div className="bg-dark-900 border-b border-dark-700/50 px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
              ${activeTab === 'pos'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}
          >
            <ShoppingCart size={18} />
            {t('pos') || 'POS'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
              ${activeTab === 'history'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}
          >
            <History size={18} />
            {t('salesHistory') || 'Sales History'}
          </button>
        </div>
      </div>

      {/* Show Sales History tab */}
      {activeTab === 'history' ? (
        <SalesHistory t={t} />
      ) : (
        <>
          {/* Main Layout */}
          <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col bg-dark-900 border-r border-dark-700/50">
          {/* Header */}
          <div className="p-4 border-b border-dark-700/50 bg-dark-800/50">
            <div className="flex items-center gap-4 mb-4">
              {/* Barcode Scanner */}
              <div className="flex-1 relative">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeScan(barcodeInput);
                    }
                  }}
                  placeholder={t('scanBarcode')}
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border-2 border-emerald-500/30 rounded-xl
                           text-white placeholder-dark-400 focus:outline-none focus:border-emerald-500
                           text-lg font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-dark-500">
                  F1
                </span>
              </div>

              {/* Product Search */}
              <div className="w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchProducts')}
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl
                           text-white placeholder-dark-400 focus:outline-none focus:border-dark-600"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-dark-500">
                  F2
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                  ${showFavoritesOnly
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-dark-800 border-dark-700 text-dark-400 hover:text-white'
                  }`}
              >
                <Star size={16} className={showFavoritesOnly ? 'fill-amber-400' : ''} />
                {t('favorites')}
                <span className="text-xs text-dark-500">F3</span>
              </button>

              <div className="flex-1" />

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400
                         hover:text-white transition-all"
              >
                {viewMode === 'grid' ? <List size={20} /> : <Grid3X3 size={20} />}
              </button>

              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400
                         hover:text-white transition-all"
              >
                <Keyboard size={20} />
              </button>

              <button
                onClick={loadData}
                className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400
                         hover:text-white transition-all"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Package className="text-dark-600 mb-4" size={64} />
                <p className="text-dark-400">{t('noProductsMatch')}</p>
                <p className="text-dark-500 text-sm mt-1">{t('tryDifferentSearch')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isInCart={cartProductIds.includes(product.id)}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <motion.button
                    key={product.id}
                    whileHover={{ x: 4 }}
                    onClick={() => addToCart(product)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all
                      ${cartProductIds.includes(product.id)
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600/50'
                      }`}
                  >
                    {product.image_path ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <ProductImage product={product} fill className="rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-violet-400" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{product.name}</p>
                      {product.barcode && (
                        <p className="text-xs text-dark-400">{product.barcode}</p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatCurrency(product.selling_price)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                      className="p-2"
                    >
                      {product.is_favorite ? (
                        <Star size={18} className="text-amber-400 fill-amber-400" />
                      ) : (
                        <StarOff size={18} className="text-dark-400" />
                      )}
                    </button>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-[420px] flex flex-col bg-dark-850">
          {/* Client Selector */}
          <div className="p-4 border-b border-dark-700/50">
            <ClientSelector
              clients={clients}
              selectedClient={selectedClient}
              onSelect={setSelectedClient}
              onSearch={setClientSearchQuery}
              searchQuery={clientSearchQuery}
              t={t}
            />
          </div>

          {/* Cart Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-emerald-400" size={20} />
              <h3 className="font-semibold text-white">{t('cart')}</h3>
              <span className="px-2 py-0.5 bg-dark-700 rounded-full text-xs text-dark-300">
                {cart.length} {t('items')}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(t('confirmClearCart'))) {
                    setCart([]);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                {t('clear')}
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <AnimatePresence>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart className="text-dark-600 mb-4" size={48} />
                  <p className="text-dark-400">{t('cartEmpty')}</p>
                  <p className="text-dark-500 text-sm mt-1">{t('scanOrSelectProducts')}</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateCartQuantity}
                    onRemove={removeFromCart}
                    t={t}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Cart Summary */}
          <div className="border-t border-dark-700/50 p-4 space-y-3">
            <div className="flex justify-between text-dark-400">
              <span>{t('subtotal')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>{t('discount')}</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-dark-700/50">
              <span>{t('total')}</span>
              <span className="text-emerald-400">{formatCurrency(total)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl
                         bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold
                         hover:from-emerald-600 hover:to-teal-600 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Banknote size={20} />
                {t('pay')}
                <span className="text-xs opacity-70 ml-1">F8</span>
              </button>
            </div>
          </div>
        </div>
      </div>

          {/* Modals */}
          <AnimatePresence>
            {showPaymentModal && (
              <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                total={total}
                client={selectedClient}
                onComplete={completeSale}
                t={t}
                isProcessing={isProcessing}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showShortcutsHelp && (
              <KeyboardShortcutsHelp
                isOpen={showShortcutsHelp}
                onClose={() => setShowShortcutsHelp(false)}
                t={t}
              />
            )}
          </AnimatePresence>

          {/* Post-sale document chooser */}
          <PostSaleDocumentChooser
            isOpen={showPostSaleChooser && !!lastSale}
            onClose={() => {
              setShowPostSaleChooser(false);
            }}
            sale={lastSale}
            onSelectType={(type) => {
              setSelectedDocType(type);
              setShowPostSaleChooser(false);
              setShowDocModal(true);
            }}
            t={t}
          />

          {/* Document Generator Modal */}
          {showDocModal && lastSale && (
            <DocumentGeneratorModal
              isOpen={showDocModal}
              onClose={() => {
                setShowDocModal(false);
                setLastSale(null);
              }}
              documentType={selectedDocType}
              settings={settings}
              preSelectedSale={lastSale}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Sales;
