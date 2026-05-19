import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { roundMoney, formatCurrencyDZD as formatCurrency } from '../lib/format';
import { searchProducts as rankProducts, splitForHighlight } from '../lib/search';
import useDataChanged from '../hooks/useDataChanged';

// Currency formatter for Algerian Dinar
// Renders `text` with any parts matching `query` visually highlighted.
// Diacritic-insensitive via splitForHighlight; safe with RTL text.
const HighlightedText = ({ text, query, className = '' }) => {
  const parts = splitForHighlight(text, query);
  return (
    <span className={className}>
      {parts.map(([chunk, isMatch], i) =>
        isMatch
          ? <mark key={i} className="bg-emerald-400/20 text-emerald-300 rounded px-0.5">{chunk}</mark>
          : <React.Fragment key={i}>{chunk}</React.Fragment>
      )}
    </span>
  );
};

const getProductPrice = (sp1, sp2, sp3, tarif) => {
  if (tarif === 2 && (sp2 || 0) > 0) return sp2;
  if (tarif === 3 && (sp3 || 0) > 0) return sp3;
  return sp1 || 0;
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

        <input
          type="text"
          inputMode="decimal"
          value={item.quantity}
          onChange={(e) => {
            const raw = e.target.value.replace(',', '.');
            if (raw === '' || raw === '.') {
              onUpdateQuantity(item.id, 0);
              return;
            }
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= 0) {
              const capped = item.maxQuantity ? Math.min(n, item.maxQuantity) : n;
              onUpdateQuantity(item.id, capped);
            }
          }}
          onFocus={(e) => e.target.select()}
          className={`w-14 text-center font-semibold rounded-lg py-1 bg-dark-700 border border-dark-600 focus:outline-none focus:border-emerald-500 ${isAtMax ? 'text-amber-400' : 'text-white'}`}
        />

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
const ProductCard = ({ product, onAdd, onToggleFavorite, isInCart, t, query = '', isHighlighted = false, cardRef }) => {
  const isOutOfStock = (product.quantity || 0) <= 0;
  const isLowStock = (product.quantity || 0) <= (product.min_stock_alert || 0) && (product.min_stock_alert || 0) > 0;

  return (
    <motion.button
      ref={cardRef}
      whileHover={{ scale: isOutOfStock ? 1 : 1.02, y: isOutOfStock ? 0 : -2 }}
      whileTap={{ scale: isOutOfStock ? 1 : 0.98 }}
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`relative p-4 rounded-xl border transition-all text-left
        ${isOutOfStock
          ? 'bg-dark-800/30 border-dark-700/30 opacity-60 cursor-not-allowed'
          : isHighlighted
            ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40'
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
      <h3 className="font-semibold text-white text-sm truncate mb-1">
        <HighlightedText text={product.name} query={query} />
      </h3>
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
          <span className="truncate">
            <HighlightedText text={product.barcode} query={query} />
          </span>
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
                {/* Sign convention (matches Clients page): negative balance = client owes shop (debt),
                    positive balance = shop owes client (credit). */}
                {selectedClient.balance < 0 && (
                  <span className="text-red-400 ml-2">
                    ({t('owes')} {formatCurrency(Math.abs(selectedClient.balance))})
                  </span>
                )}
                {selectedClient.balance > 0 && (
                  <span className="text-emerald-400 ml-2">
                    ({t('credit')} {formatCurrency(selectedClient.balance)})
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
                  {client.balance < 0 && (
                    <span className="text-xs text-red-400 font-medium">
                      -{formatCurrency(Math.abs(client.balance))}
                    </span>
                  )}
                  {client.balance > 0 && (
                    <span className="text-xs text-emerald-400 font-medium">
                      +{formatCurrency(client.balance)}
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
  // Payment type: 'full' | 'partial' | 'credit'
  const [paymentType, setPaymentType] = useState('full');
  const [paidAmount, setPaidAmount] = useState(total);
  const [notes, setNotes] = useState('');
  // Overpayment disposition: 'change' (give back, current default) or 'credit' (keep on account)
  const [overpayDisposition, setOverpayDisposition] = useState('change');

  useEffect(() => {
    if (isOpen) {
      setPaymentType('full');
      setPaidAmount(total);
      setNotes('');
      setOverpayDisposition('change');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (paymentType === 'full') setPaidAmount(total);
    else if (paymentType === 'credit') setPaidAmount(0);
  }, [paymentType, total]);

  // If the cashier swaps in a cash-only client while partial/credit is active,
  // reset the payment type back to full so the UI is consistent with the guard.
  useEffect(() => {
    if (client?.credit_blocked && (paymentType === 'partial' || paymentType === 'credit')) {
      setPaymentType('full');
    }
  }, [client?.credit_blocked, paymentType]);

  const parseAmount = (raw, fallback) => {
    if (raw === '' || raw === '.') return 0;
    const n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  };

  const change = roundMoney(paidAmount - total);
  const remaining = roundMoney(total - paidAmount);
  const isOverpay = paymentType === 'full' && paidAmount > total && change > 0;
  const status = paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
  const needsClient = paymentType === 'partial' || paymentType === 'credit' || (isOverpay && overpayDisposition === 'credit');
  const clientMissing = needsClient && !client;
  // Cash-only clients: block completion regardless of which payment type is
  // selected — the button-disable above prevents the user from picking these
  // in the first place, but this closes the case where the state was set
  // before the client was chosen.
  const blockedByCashOnly = !!client?.credit_blocked && (paymentType === 'partial' || paymentType === 'credit' || (isOverpay && overpayDisposition === 'credit'));
  const canComplete = !clientMissing && !blockedByCashOnly && (paymentType === 'credit' || paidAmount > 0);

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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Total Display */}
          <div className="text-center py-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
            <p className="text-dark-400 text-sm mb-1">{t('totalAmount')}</p>
            <p className="text-4xl font-bold text-white">{formatCurrency(total)}</p>
            {client && (
              <p className="text-xs mt-2" style={{ color: '#64748b' }}>
                {client.name}
                {client.balance !== undefined && client.balance !== 0 && (
                  // Sign convention: negative = client owes shop; positive = shop owes client
                  <span className={client.balance < 0 ? 'text-red-400 ml-2' : 'text-emerald-400 ml-2'}>
                    ({client.balance < 0 ? t('owes') : t('credit')} {Math.abs(client.balance).toLocaleString()} DZD)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Payment Type — 3 big buttons */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-3">
              {t('paymentType')}
            </label>
            {/* Cash-only guard: if the selected client is credit-blocked by
                the admin, partial and credit buttons are disabled and a red
                banner explains why. Staff can't accidentally sell on credit
                to a flagged client. */}
            {client?.credit_blocked ? (
              <div className="mb-3 p-3 rounded-xl flex items-start gap-3"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">{t('clientIsCashOnly')}</p>
                  <p className="text-xs text-dark-300 mt-0.5">{t('clientIsCashOnlyDesc')}</p>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentType('full')}
                className={`flex flex-col items-center gap-1 px-3 py-4 rounded-xl border transition-all ${
                  paymentType === 'full'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <Check size={18} />
                <span className="text-xs font-semibold">{t('fullPayment')}</span>
              </button>
              <button
                onClick={() => { if (!client?.credit_blocked) setPaymentType('partial'); }}
                disabled={!!client?.credit_blocked}
                className={`flex flex-col items-center gap-1 px-3 py-4 rounded-xl border transition-all ${
                  paymentType === 'partial'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                } ${client?.credit_blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <DollarSign size={18} />
                <span className="text-xs font-semibold">{t('partialPayment')}</span>
              </button>
              <button
                onClick={() => { if (!client?.credit_blocked) setPaymentType('credit'); }}
                disabled={!!client?.credit_blocked}
                className={`flex flex-col items-center gap-1 px-3 py-4 rounded-xl border transition-all ${
                  paymentType === 'credit'
                    ? 'bg-red-500/10 border-red-500/50 text-red-400'
                    : 'bg-dark-800/50 border-dark-700 text-dark-400 hover:border-dark-600'
                } ${client?.credit_blocked ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <CreditCard size={18} />
                <span className="text-xs font-semibold">{t('credit')}</span>
              </button>
            </div>
          </div>

          {/* Client required warning for partial / credit */}
          {clientMissing && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-400">{t('clientRequired')}</p>
                <p className="text-xs text-dark-400 mt-1">
                  {t('clientRequiredDesc')}
                </p>
              </div>
            </div>
          )}

          {/* Full payment — allow overpayment for change */}
          {paymentType === 'full' && !clientMissing && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">
                {t('amountReceived')}
              </label>
              <div className="relative">
                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseAmount(e.target.value, paidAmount))}
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-xl font-semibold text-white text-right focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => setPaidAmount(total)}
                  className="flex-1 px-3 py-2 bg-dark-700 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-600 transition-all"
                >
                  {t('exactAmount')}
                </button>
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPaidAmount(amount)}
                    className="px-3 py-2 bg-dark-700 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-600 transition-all"
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
              {isOverpay && (
                <div className="mt-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm font-semibold text-blue-400 mb-1">
                    {t('overpayChooseChange')}
                  </p>
                  <p className="text-2xl font-bold text-blue-400 mb-3">+{formatCurrency(change)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOverpayDisposition('change')}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        overpayDisposition === 'change'
                          ? 'bg-blue-500/20 border border-blue-400 text-blue-300'
                          : 'bg-dark-800 border border-dark-700 text-dark-400 hover:text-white'
                      }`}
                    >
                      {t('giveChange')}
                    </button>
                    <button
                      onClick={() => setOverpayDisposition('credit')}
                      disabled={!client}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        overpayDisposition === 'credit'
                          ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                          : 'bg-dark-800 border border-dark-700 text-dark-400 hover:text-white'
                      }`}
                    >
                      {t('keepAsCredit')}
                    </button>
                  </div>
                  {!client && overpayDisposition === 'credit' && (
                    <p className="text-xs mt-2 text-red-400">
                      {t('clientRequired')} — {t('clientRequiredDesc')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Partial payment input */}
          {paymentType === 'partial' && !clientMissing && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-3">
                {t('amountPaid')}
              </label>
              <div className="relative">
                <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  inputMode="decimal"
                  value={paidAmount}
                  onChange={(e) => {
                    const n = parseAmount(e.target.value, paidAmount);
                    setPaidAmount(Math.min(Math.max(n, 0), total));
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-xl font-semibold text-white text-right focus:outline-none focus:border-amber-500"
                />
              </div>
              {/* Quick percentage buttons */}
              <div className="flex gap-2 mt-3">
                {[25, 50, 75].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setPaidAmount(roundMoney(total * pct / 100))}
                    className="flex-1 px-3 py-2 bg-dark-700 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-600 transition-all"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center">
                <span className="text-amber-400">{t('remaining')} ({t('addedToBalance')})</span>
                <span className="text-xl font-bold text-amber-400">{formatCurrency(remaining)}</span>
              </div>
            </div>
          )}

          {/* Credit — pay nothing now */}
          {paymentType === 'credit' && !clientMissing && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 font-semibold mb-1">{t('fullCreditNotice')}</p>
              <p className="text-xs text-dark-400">
                {formatCurrency(total)} {t('addedToBalance')}
              </p>
            </div>
          )}

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

        {/* Plain-language summary — "John will still owe 2500 DZD" */}
        {(() => {
          if (clientMissing) return null;
          let tone = 'green', text = '';
          const who = client?.name || t('customer');
          if (paymentType === 'credit') {
            tone = 'amber';
            text = `${t('nothingNow')} — ${formatCurrency(total)} ${t('willBeDebt')}`;
          } else if (paymentType === 'partial') {
            tone = 'amber';
            text = `${who} ${t('willStillOwe')} ${formatCurrency(remaining)}`;
          } else if (isOverpay) {
            tone = overpayDisposition === 'credit' ? 'green' : 'blue';
            text = overpayDisposition === 'credit'
              ? `${t('fullyPaid')} — ${formatCurrency(change)} ${t('keptAsCredit')}`
              : `${t('fullyPaid')} — ${formatCurrency(change)} ${t('giveChange')}`;
          } else if (paidAmount >= total && paidAmount > 0) {
            tone = 'green';
            text = t('fullyPaid');
          } else {
            return null;
          }
          const toneClass = tone === 'green'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : tone === 'amber'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300';
          return (
            <div className={`mx-6 mb-0 mt-0 px-4 py-2.5 rounded-xl border text-sm font-semibold text-center ${toneClass}`}>
              {text}
            </div>
          );
        })()}

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
              // Overpay + "credit" → pass the FULL paidAmount so addSale credits the client;
              // any other case → cap at total (change is returned in cash, not stored).
              paidAmount: isOverpay && overpayDisposition === 'credit'
                ? paidAmount
                : Math.min(paidAmount, total),
              paymentMethod: paymentType === 'credit' ? 'credit' : 'cash',
              notes,
              status,
            })}
            disabled={isProcessing || !canComplete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                     bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium
                     hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
  const [dateFilter, setDateFilter] = useState('week');
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

  // Load sales data. Intentionally depends only on the filter mode — custom-range
  // date typing fires one DB query per keystroke otherwise. The Apply button below
  // calls loadSales() explicitly when the user finishes typing custom dates.
  useEffect(() => {
    if (dateFilter !== 'custom') loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

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
    { value: 'today', label: t('today') },
    { value: 'week', label: t('thisWeek') },
    { value: 'month', label: t('thisMonth') },
    { value: 'custom', label: t('customRange') }
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">{t('salesHistory')}</h2>

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
                      <label className="block text-xs text-dark-400 mb-1">{t('startDate')}</label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-400 mb-1">{t('endDate')}</label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        loadSales();
                        setShowDatePicker(false);
                      }}
                      disabled={!customDateRange.start || !customDateRange.end}
                      className="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('apply')}
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
            <span className="text-dark-400">{t('totalSales')}</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalSales)}</p>
          <p className="text-sm text-dark-400 mt-1">{sales.length} {t('transactions')}</p>
        </div>

        <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Check className="text-blue-400" size={20} />
            </div>
            <span className="text-dark-400">{t('totalPaid')}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
        </div>

        <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-amber-400" size={20} />
            </div>
            <span className="text-dark-400">{t('pending')}</span>
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
            <p className="text-dark-400">{t('noSalesFound')}</p>
            <p className="text-dark-500 text-sm mt-1">{t('tryDifferentDateRange')}</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            <table className="w-full">
              <thead className="bg-dark-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase">{t('client')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('total')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase">{t('paid')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase">{t('actions')}</th>
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
                      {sale.client_name || t('walkInCustomer')}
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
                        {sale.status === 'paid' ? t('paid') :
                         sale.status === 'partial' ? t('partial') :
                         t('pending')}
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
                  <h3 className="text-lg font-semibold text-white">{t('saleDetails')}</h3>
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
                    <p className="font-medium text-white">{selectedSale.client_name || t('walkInCustomer')}</p>
                    <p className="text-sm text-dark-400">{selectedSale.client_phone || ''}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium text-dark-400 uppercase">{t('items')}</h4>
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
                    <span>{t('subtotal')}</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t('discount')}</span>
                      <span>-{formatCurrency(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-white pt-2">
                    <span>{t('total')}</span>
                    <span>{formatCurrency(selectedSale.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>{t('paid')}</span>
                    <span>{formatCurrency(selectedSale.paid_amount)}</span>
                  </div>
                  {selectedSale.total - selectedSale.paid_amount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>{t('remaining')}</span>
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
  // Attached to whichever result card currently holds the keyboard cursor so
  // ArrowDown past the viewport auto-scrolls it into view.
  const highlightedCardRef = useRef(null);
  // Scanner state held outside React render: last scan to dedupe double-triggers,
  // and a flag that pauses auto-refocus while the user is intentionally typing
  // elsewhere. Concurrent scans are now allowed (the old scanInFlight drop was
  // losing legitimate fast scans of different items).
  const lastScanRef = useRef({ code: '', at: 0 });
  const suspendAutoFocusRef = useRef(false);

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
  // Keyboard-navigation cursor within the search results. Reset to 0 on query change.
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showPostSaleChooser, setShowPostSaleChooser] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('invoice');
  const [settings, setSettings] = useState({});
  const [selectedTarif, setSelectedTarif] = useState(1);
  const selectedTarifRef = useRef(1);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh on mobile sale sync, stock changes from other pages, etc.
  useDataChanged(['products', 'clients', 'sales'], () => loadData());

  // If the currently-selected client was deleted elsewhere (another tab, sync pull),
  // clear the selection so the cashier doesn't submit a sale with a dangling client_id.
  useEffect(() => {
    if (selectedClient && !clients.some(c => c.id === selectedClient.id)) {
      setSelectedClient(null);
    } else if (selectedClient) {
      // Refresh the snapshot to show up-to-date balance/phone/name after sync
      const fresh = clients.find(c => c.id === selectedClient.id);
      if (fresh && (fresh.balance !== selectedClient.balance || fresh.name !== selectedClient.name)) {
        setSelectedClient(fresh);
      }
    }
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps

  // When products reload (new stock, another terminal's sale, sync pull), refresh each
  // cart line's maxQuantity so the +/- buttons don't permit exceeding the actual stock.
  // The quantity itself is clamped if it went over.
  useEffect(() => {
    if (!products.length) return;
    setCart(prevCart => {
      let changed = false;
      const next = prevCart.map(item => {
        const p = products.find(pp => pp.id === item.product_id);
        if (!p) return item;
        const available = p.quantity || 0;
        const newQty = Math.min(item.quantity, available);
        if (newQty !== item.quantity || available !== item.maxQuantity) {
          changed = true;
          return {
            ...item,
            quantity: newQty,
            total: roundMoney(newQty * item.unit_price),
            maxQuantity: available,
          };
        }
        return item;
      });
      return changed ? next : prevCart;
    });
  }, [products]);

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

  // Keyboard shortcuts - use refs to avoid listener accumulation.
  // Track ALL modal-state flags so F-keys don't fire underneath an open dialog
  // (previously postSaleChooser + docModal were missed, letting F8/F9 punch through).
  const shortcutStateRef = useRef({
    cartLength: 0, showPaymentModal: false, showShortcutsHelp: false,
    showPostSaleChooser: false, showDocModal: false,
  });
  useEffect(() => {
    shortcutStateRef.current = {
      cartLength: cart.length,
      showPaymentModal, showShortcutsHelp, showPostSaleChooser, showDocModal,
    };
  }, [cart.length, showPaymentModal, showShortcutsHelp, showPostSaleChooser, showDocModal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const s = shortcutStateRef.current;
      const anyModal = s.showPaymentModal || s.showShortcutsHelp || s.showPostSaleChooser || s.showDocModal;

      // Always allow typing in form fields
      const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (isFormElement) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // Don't process shortcuts while ANY modal is open — Escape is the modal's job
      if (anyModal) {
        if (e.key === 'Escape') {
          setShowPaymentModal(false);
          setShowShortcutsHelp(false);
          setShowPostSaleChooser(false);
          setShowDocModal(false);
        }
        return;
      }
      const cartLength = s.cartLength;

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

  // Return focus to the barcode input — called after scans, modal close, and idle detection.
  // Skips if the user is actively typing into another form field (detected via the suspend flag).
  const refocusBarcode = useCallback(() => {
    if (suspendAutoFocusRef.current) return;
    const el = barcodeInputRef.current;
    if (!el || document.activeElement === el) return;
    const active = document.activeElement;
    const isTypingElsewhere = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
      && active !== el && active.type !== 'button';
    if (isTypingElsewhere) return;
    el.focus();
  }, []);

  // Auto-focus on load AND whenever focus ends up nowhere (document.body receives focus after
  // clicks on non-interactive areas, modal closes, etc.). This is the key fix for "scanner
  // keystrokes vanish after I click something" — a USB scanner that emits keyboard events
  // needs an input to receive them, so we keep the barcode field focused by default.
  useEffect(() => {
    if (!loading) refocusBarcode();
  }, [loading, refocusBarcode]);

  useEffect(() => {
    const onFocusIn = (e) => {
      // Fires when any element gains focus. If focus lands on the body (i.e., nothing
      // focused — typical after modal close or clicking empty space), pull it back.
      if (e.target === document.body) refocusBarcode();
    };
    // When focus LEAVES the barcode input for body within the same tick, still refocus
    // (some transitions go input→body→input, we want to land back on the barcode).
    const onFocusOut = (e) => {
      if (e.target === barcodeInputRef.current) {
        setTimeout(() => {
          if (document.activeElement === document.body) refocusBarcode();
        }, 0);
      }
    };
    // Click anywhere: if the click landed on a non-input (button, icon, empty space),
    // the browser may leave focus on that button and our focusin handler won't fire
    // (target isn't body). Snap focus back so the next scanner keystroke reaches the
    // barcode input. Input/textarea clicks are respected — the user wants to type.
    const onMouseUp = () => {
      setTimeout(() => {
        const a = document.activeElement;
        if (!a || a === document.body) { refocusBarcode(); return; }
        if (a === barcodeInputRef.current) return;
        const tag = a.tagName;
        const isInteractiveInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || a.isContentEditable;
        if (!isInteractiveInput) refocusBarcode();
      }, 0);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [refocusBarcode]);

  // Pause auto-refocus while any modal is open, or while the user is on the History
  // tab (the scanner input is unmounted there — attempting to focus it is a no-op
  // that we may as well skip). Resume + refocus on close / tab-back.
  useEffect(() => {
    const anyModalOpen = showPaymentModal || showShortcutsHelp || showPostSaleChooser || showDocModal;
    const notPosTab = activeTab !== 'pos';
    suspendAutoFocusRef.current = anyModalOpen || notPosTab;
    if (!anyModalOpen && !notPosTab && !loading) {
      // Small delay so the closing modal's unmount / tab switch completes before we yank focus.
      // `timerId` (not `t`) — avoid shadowing the `t` translator from useLanguage.
      const timerId = setTimeout(refocusBarcode, 50);
      return () => clearTimeout(timerId);
    }
  }, [showPaymentModal, showShortcutsHelp, showPostSaleChooser, showDocModal, activeTab, loading, refocusBarcode]);

  // Handle a completed barcode scan. Called from Enter/Tab/LF/CR terminator.
  //
  // Concurrency: we no longer DROP overlapping scans. Instead, each scan runs
  // independently and the trailing input-clear only fires if the field still
  // contains the code we just processed. This means a fast cashier scanning
  // A then B 30ms apart gets BOTH items in the cart — the old inflight-drop
  // behavior silently lost the second item.
  const handleBarcodeScan = useCallback(async (rawBarcode) => {
    const barcode = (rawBarcode || '').replace(/[\r\n\t]/g, '').trim();
    if (!barcode) {
      setBarcodeInput('');
      return;
    }

    // Dedupe: ignore the same code scanned within 200ms of the previous one.
    // Scanner terminator-repeat bugs and Enter-mashing fire in <50ms; a human
    // intentionally rescanning for quantity has a ≥300ms physical gap.
    const now = Date.now();
    if (lastScanRef.current.code === barcode && now - lastScanRef.current.at < 200) {
      return;
    }
    lastScanRef.current = { code: barcode, at: now };

    // Smart clear: only wipe the input if it still holds exactly this code.
    // If the user (or a fast scanner) has started typing a NEW code while we
    // were awaiting, leave their in-progress characters alone.
    const smartClear = () => {
      setBarcodeInput(current => {
        const normalized = (current || '').replace(/[\r\n\t]/g, '').trim();
        return normalized === barcode ? '' : current;
      });
    };

    try {
      // Exact-then-zero-normalized lookup happens in main process (one IPC).
      const result = await window.api.products.getByBarcode(barcode);
      let product = null;
      let matchSource = 'barcode'; // 'barcode' | 'name' | 'barcode-fuzzy'

      if (result.success && result.data) {
        product = result.data;
      } else {
        // No barcode hit → fall back to name/description search. Only auto-add
        // if exactly one match; ambiguous matches open the search panel.
        const searchResult = await window.api.products.search(barcode);
        if (searchResult.success && Array.isArray(searchResult.data)) {
          if (searchResult.data.length === 1) {
            product = searchResult.data[0];
            // Distinguish "barcode substring hit via LIKE" from "name hit" — the
            // former means admin typo/padding rather than a real name match.
            matchSource = (product.barcode && product.barcode.includes(barcode))
              ? 'barcode-fuzzy'
              : 'name';
          } else if (searchResult.data.length > 1) {
            setSearchQuery(barcode);
            showNotification(t('multipleProductsFound'), 'info');
            smartClear();
            refocusBarcode();
            return;
          }
        }
      }

      if (!product) {
        showNotification(t('productNotFound'), 'error');
        smartClear();
        refocusBarcode();
        return;
      }

      const outcome = addToCart(product);
      if (outcome === 'out_of_stock') {
        showNotification(`${product.name}: ${t('outOfStock')}`, 'warning');
      } else if (outcome === 'max_reached') {
        showNotification(`${product.name}: ${t('maxQuantityReached')}`, 'warning');
      } else {
        const prefix = matchSource === 'name' ? '(name) '
          : matchSource === 'barcode-fuzzy' ? '(~) '
          : '';
        showNotification(`${prefix}${product.name} ${t('addedToCart')}`);
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      showNotification(t('scanError'), 'error');
    }

    smartClear();
    refocusBarcode();
  }, [t, showNotification, refocusBarcode]);

  // Add product to cart. Returns 'added' | 'out_of_stock' | 'max_reached'.
  //
  // Correctness note: the max-reached guard MUST live inside the setCart updater so
  // it reads prevCart (the freshest state React has), not a stale `cart` closure.
  // Without this, two common races would let the cart over-allocate stock:
  //   (a) Stale-closure handleBarcodeScan captures an earlier render's `cart`.
  //   (b) The [products]-reconciler effect clamps a quantity in the same React batch
  //       as a scan — reading `cart` from outer scope sees the pre-reconcile cart.
  // The `outcome` mutation across the updater is idempotent (deterministic from
  // prevCart), so Strict Mode's double-invocation produces the same answer twice.
  const addToCart = (product) => {
    const availableQty = product.quantity || 0;
    if (availableQty <= 0) return 'out_of_stock';

    let outcome = 'added';
    setCart(prevCart => {
      const idx = prevCart.findIndex(item => item.product_id === product.id);
      if (idx >= 0) {
        const current = prevCart[idx].quantity;
        if (current >= availableQty) {
          outcome = 'max_reached';
          return prevCart;
        }
        const updated = [...prevCart];
        const newQty = Math.min(current + 1, availableQty);
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          total: roundMoney(newQty * updated[idx].unit_price),
          maxQuantity: availableQty,
        };
        outcome = 'added';
        return updated;
      }
      outcome = 'added';
      const price = getProductPrice(product.selling_price || 0, product.selling_price2 || 0, product.selling_price3 || 0, selectedTarifRef.current);
      return [...prevCart, {
        // Include a random suffix so two adds in the same millisecond (fast scanner
        // or automated test) don't collide on React's key — Date.now() alone can repeat.
        id: Date.now() + Math.random(),
        product_id: product.id,
        name: product.name,
        unit_price: price,
        quantity: 1,
        total: roundMoney(price),
        maxQuantity: availableQty,
        sp1: product.selling_price || 0,
        sp2: product.selling_price2 || 0,
        sp3: product.selling_price3 || 0,
      }];
    });
    // Keep scanner input focused after any add (click or scan) so the next scan
    // never lands on a <button> whose focus was just stolen by the browser.
    refocusBarcode();
    return outcome;
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prevCart => prevCart.map(item => {
      if (item.id === itemId) {
        const maxQty = item.maxQuantity || Infinity;
        const finalQuantity = Math.min(newQuantity, maxQty);
        return {
          ...item,
          quantity: finalQuantity,
          total: roundMoney(finalQuantity * item.unit_price)
        };
      }
      return item;
    }));
  };

  // Remove from cart
  const removeFromCart = (itemId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const changeTarif = (n) => {
    const tarif = (n === 1 || n === 2 || n === 3) ? n : 1;
    selectedTarifRef.current = tarif;
    setSelectedTarif(tarif);
    setCart(prev => prev.map(item => {
      const price = getProductPrice(item.sp1 ?? item.unit_price, item.sp2 ?? 0, item.sp3 ?? 0, tarif);
      return { ...item, unit_price: price, total: roundMoney(price * item.quantity) };
    }));
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

  // Calculate totals (rounded at every accumulation step to avoid float drift)
  const subtotal = roundMoney(cart.reduce((sum, item) => sum + roundMoney(item.total), 0));
  const discount = 0; // Can be extended
  const total = roundMoney(subtotal - discount);

  // Filter + rank products. Diacritic-insensitive, case-insensitive, multi-token.
  // Active products only (a deactivated product shouldn't be sellable through POS).
  // Favorites filter is applied before ranking so the result order is stable.
  const filteredProducts = useMemo(() => {
    const pool = products.filter(p => p.is_active && (!showFavoritesOnly || p.is_favorite));
    return rankProducts(pool, searchQuery);
  }, [products, searchQuery, showFavoritesOnly]);

  // Reset the keyboard cursor whenever the result set changes so "Enter to add"
  // always targets the top-ranked current result, not a stale index.
  useEffect(() => {
    setHighlightedIdx(0);
  }, [searchQuery, showFavoritesOnly]);

  // Keep the cursor in bounds (e.g., if products list shrinks due to sync pull).
  useEffect(() => {
    if (highlightedIdx >= filteredProducts.length && filteredProducts.length > 0) {
      setHighlightedIdx(0);
    }
  }, [filteredProducts.length, highlightedIdx]);

  // Scroll the keyboard-highlighted card into view as the cursor moves.
  // Uses 'nearest' so hitting ArrowDown past the fold just nudges the viewport.
  useEffect(() => {
    if (searchQuery && highlightedCardRef.current) {
      highlightedCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIdx, searchQuery]);

  // Get products in cart
  const cartProductIds = cart.map(item => item.product_id);

  // Complete sale — single atomic IPC (header + items + stock + balance in one transaction)
  const completeSale = async (paymentData) => {
    setIsProcessing(true);

    // Snapshot client up-front so post-sale document flow has the right name even
    // if setSelectedClient(null) has fired by the time the doc chooser opens.
    const clientSnapshot = selectedClient;

    try {
      const saleData = {
        client_id: selectedClient?.id || null,
        date: new Date().toISOString().split('T')[0],
        subtotal: roundMoney(subtotal),
        discount: roundMoney(discount),
        total: roundMoney(total),
        paid_amount: roundMoney(paymentData.paidAmount),
        status: paymentData.status,
        notes: paymentData.notes,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: roundMoney(item.unit_price),
          total: roundMoney(item.total),
        })),
      };

      const saleResult = await window.api.sales.createComplete(saleData);

      if (!saleResult || !saleResult.success) {
        throw new Error((saleResult && saleResult.error) || 'Failed to create sale');
      }

      const saleId = saleResult.data.lastInsertRowid;

      // The sale is already committed atomically in the DB. Reset the cart NOW so
      // the cashier can start the next sale immediately. Document-generation is a
      // cosmetic follow-up — any failure loading the sale back must not make the
      // cashier think the real sale failed.
      setCart([]);
      setSelectedClient(null);
      setShowPaymentModal(false);
      showNotification(t('saleCompleted'));

      // Best-effort fetch for the document preview; null-safe so an IPC blip here
      // doesn't masquerade as "sale failed".
      let completedSale = null;
      try {
        const fullSaleResult = await window.api.sales.getById(saleId);
        const saleItems = await window.api.sales.getItems(saleId);
        if (fullSaleResult && fullSaleResult.success) {
          completedSale = {
            ...(fullSaleResult.data || {}),
            items: (saleItems && saleItems.data) || [],
            client: clientSnapshot,
          };
        }
      } catch (docErr) {
        console.error('Post-sale fetch failed (sale itself was saved):', docErr);
      }

      if (completedSale) {
        setLastSale(completedSale);
        setTimeout(() => setShowPostSaleChooser(true), 420);
      }
    } catch (error) {
      console.error('Sale error:', error);
      showNotification(error.message || t('saleError'), 'error');
    } finally {
      setIsProcessing(false);
    }
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
            {t('pos')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
              ${activeTab === 'history'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}
          >
            <History size={18} />
            {t('salesHistory')}
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
              {/* Barcode Scanner
                  - Accepts Enter, Tab, LF, CR as scan terminators (USB scanners vary).
                  - onChange strips any LF/CR that arrived as text (some scanners emit them as chars)
                    and auto-fires the scan so no keyDown is needed. */}
              <div className="flex-1 relative">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={20} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t('scanBarcode')}
                  value={barcodeInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (/[\r\n]/.test(raw)) {
                      // Scanner injected a line-feed as text — treat as terminator
                      const clean = raw.replace(/[\r\n]/g, '');
                      setBarcodeInput('');
                      handleBarcodeScan(clean);
                    } else {
                      setBarcodeInput(raw);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Tab') {
                      // Stop Tab from escaping to the next element mid-scan.
                      // Read the live DOM value — React state can lag one render behind
                      // when a fast scanner fires Enter before the last setBarcodeInput settles,
                      // and the stale state would send a truncated barcode to the server.
                      e.preventDefault();
                      handleBarcodeScan(e.currentTarget.value);
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

              {/* Product Search — diacritic-insensitive, ranked, keyboard-navigable */}
              <div className="w-80 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Arrow nav inside results; Enter adds the highlighted product; Esc clears
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (filteredProducts.length > 0) {
                        setHighlightedIdx(i => (i + 1) % filteredProducts.length);
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (filteredProducts.length > 0) {
                        setHighlightedIdx(i => (i - 1 + filteredProducts.length) % filteredProducts.length);
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const pick = filteredProducts[highlightedIdx];
                      if (pick) {
                        const outcome = addToCart(pick);
                        if (outcome === 'out_of_stock') {
                          showNotification(`${pick.name}: ${t('outOfStock')}`, 'warning');
                        } else if (outcome === 'max_reached') {
                          showNotification(`${pick.name}: ${t('maxQuantityReached')}`, 'warning');
                        } else {
                          showNotification(`${pick.name} ${t('addedToCart')}`);
                          // Clear query so cashier can start the next search immediately
                          setSearchQuery('');
                        }
                      }
                    } else if (e.key === 'Escape') {
                      if (searchQuery) {
                        e.preventDefault();
                        setSearchQuery('');
                      }
                    }
                  }}
                  placeholder={t('searchProducts')}
                  className="w-full pl-12 pr-16 py-3 bg-dark-800 border border-dark-700 rounded-xl
                           text-white placeholder-dark-400 focus:outline-none focus:border-dark-600"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                    aria-label={t('clear')}
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-dark-500 pointer-events-none">
                  F2
                </span>
                {/* Result count / no-match hint below the input */}
                {searchQuery && (
                  <div className="absolute left-0 right-0 top-full mt-1 text-xs text-dark-400 px-2">
                    {filteredProducts.length === 0
                      ? t('noProductsMatch')
                      : `${filteredProducts.length} ${t('results')} — ${t('enterToAdd')}`}
                  </div>
                )}
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
                {filteredProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addToCart}
                    onToggleFavorite={toggleFavorite}
                    isInCart={cartProductIds.includes(product.id)}
                    t={t}
                    query={searchQuery}
                    isHighlighted={!!searchQuery && idx === highlightedIdx}
                    cardRef={idx === highlightedIdx ? highlightedCardRef : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((product, idx) => {
                  const isOutOfStock = (product.quantity || 0) <= 0;
                  const isHighlighted = !!searchQuery && idx === highlightedIdx;
                  return (
                  <motion.button
                    key={product.id}
                    ref={idx === highlightedIdx ? highlightedCardRef : undefined}
                    whileHover={{ x: isOutOfStock ? 0 : 4 }}
                    disabled={isOutOfStock}
                    onClick={() => {
                      const outcome = addToCart(product);
                      if (outcome === 'max_reached') {
                        showNotification(`${product.name}: ${t('maxQuantityReached')}`, 'warning');
                      }
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all
                      ${isOutOfStock
                        ? 'bg-dark-800/30 border-dark-700/30 opacity-60 cursor-not-allowed'
                        : isHighlighted
                          ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-400/40'
                          : cartProductIds.includes(product.id)
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
                      <p className="font-medium text-white"><HighlightedText text={product.name} query={searchQuery} /></p>
                      {product.barcode && (
                        <p className="text-xs text-dark-400"><HighlightedText text={product.barcode} query={searchQuery} /></p>
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
                  );
                })}
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

          {/* Tarif Selector */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-700/50">
            <span className="text-xs text-dark-400 font-medium">{t('tarif') || 'Tarif'}</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => changeTarif(n)}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                    selectedTarif === n
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
                  }`}
                >
                  T{n}
                </button>
              ))}
            </div>
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
              // If cashier dismisses without picking a doc type, drop lastSale too —
              // otherwise it lingers across sessions and could pre-fill stale data.
              setShowPostSaleChooser(false);
              setLastSale(null);
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
