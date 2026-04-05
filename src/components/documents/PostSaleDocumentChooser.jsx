import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  X,
  Receipt,
  Truck,
  FileText,
  ClipboardList,
  LogOut,
  RotateCcw,
  Package,
  User,
  ChevronRight
} from 'lucide-react';

// ─── Currency formatter ────────────────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0) + ' DZD';

// ─── Document type definitions ─────────────────────────────────────────────────
const DOC_TYPES = [
  {
    type: 'invoice',
    icon: Receipt,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-400/60',
    iconColor: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    labelKey: 'invoice',
    labelFallback: 'Invoice',
    descKey: 'invoiceDesc',
    descFallback: 'Official billing document for the client',
  },
  {
    type: 'delivery',
    icon: Truck,
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-400/60',
    iconColor: 'text-blue-400',
    glowColor: 'shadow-blue-500/20',
    labelKey: 'deliveryNote',
    labelFallback: 'Delivery Note',
    descKey: 'deliveryNoteDesc',
    descFallback: 'Confirms goods have been delivered',
  },
  {
    type: 'proforma',
    icon: FileText,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    hoverBorder: 'hover:border-violet-400/60',
    iconColor: 'text-violet-400',
    glowColor: 'shadow-violet-500/20',
    labelKey: 'proformaInvoice',
    labelFallback: 'Proforma Invoice',
    descKey: 'proformaDesc',
    descFallback: 'Preliminary invoice before final billing',
  },
  {
    type: 'purchase_order',
    icon: ClipboardList,
    color: 'sky',
    gradient: 'from-sky-500 to-blue-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    hoverBorder: 'hover:border-sky-400/60',
    iconColor: 'text-sky-400',
    glowColor: 'shadow-sky-500/20',
    labelKey: 'purchaseOrder',
    labelFallback: 'Purchase Order',
    descKey: 'purchaseOrderDesc',
    descFallback: 'Authorization to purchase goods',
  },
  {
    type: 'exit_voucher',
    icon: LogOut,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-400/60',
    iconColor: 'text-amber-400',
    glowColor: 'shadow-amber-500/20',
    labelKey: 'exitVoucher',
    labelFallback: 'Exit Voucher',
    descKey: 'exitVoucherDesc',
    descFallback: 'Stock exit authorization slip',
  },
  {
    type: 'credit_note',
    icon: RotateCcw,
    color: 'rose',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    hoverBorder: 'hover:border-rose-400/60',
    iconColor: 'text-rose-400',
    glowColor: 'shadow-rose-500/20',
    labelKey: 'creditNote',
    labelFallback: 'Credit Note',
    descKey: 'creditNoteDesc',
    descFallback: 'Adjustment for returns or overpayment',
  },
];

// ─── Document card ─────────────────────────────────────────────────────────────
const DocCard = ({ doc, onSelect, t, index }) => {
  const Icon = doc.icon;
  const label = t ? (t(doc.labelKey) !== doc.labelKey ? t(doc.labelKey) : doc.labelFallback) : doc.labelFallback;
  const desc = t ? (t(doc.descKey) !== doc.descKey ? t(doc.descKey) : doc.descFallback) : doc.descFallback;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 + index * 0.055, type: 'spring', stiffness: 320, damping: 26 }}
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.975 }}
      onClick={() => onSelect(doc.type)}
      className={`
        group relative flex items-center gap-4 p-4 w-full text-left
        rounded-2xl border bg-dark-800/60 backdrop-blur-sm
        ${doc.border} ${doc.hoverBorder}
        transition-all duration-200
        hover:bg-dark-800 hover:shadow-lg ${doc.glowColor}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900
      `}
    >
      {/* Icon bubble */}
      <div className={`
        flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
        ${doc.bg} transition-all duration-200
        group-hover:scale-110
      `}>
        <Icon className={`w-5 h-5 ${doc.iconColor}`} strokeWidth={1.8} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight truncate">{label}</p>
        <p className="text-xs text-dark-400 mt-0.5 leading-snug line-clamp-1">{desc}</p>
      </div>

      {/* Arrow indicator */}
      <ChevronRight
        className={`
          flex-shrink-0 w-4 h-4 text-dark-600
          group-hover:${doc.iconColor} group-hover:translate-x-0.5
          transition-all duration-200
        `}
      />

      {/* Subtle gradient shimmer on hover */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
        bg-gradient-to-r ${doc.gradient} transition-opacity duration-300
        pointer-events-none
      `} style={{ opacity: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.04'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
      />
    </motion.button>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
/**
 * PostSaleDocumentChooser
 *
 * Usage in Sales.jsx:
 *   <PostSaleDocumentChooser
 *     isOpen={showPostSaleChooser}
 *     onClose={() => setShowPostSaleChooser(false)}
 *     sale={lastSale}
 *     onSelectType={(type) => { setDocumentType(type); setShowDocModal(true); }}
 *     t={t}
 *   />
 */
const PostSaleDocumentChooser = ({ isOpen, onClose, sale, onSelectType, t }) => {
  const handleSelect = (type) => {
    onSelectType(type);
    onClose();
  };

  // Sale summary derivations
  const total = sale?.total ?? 0;
  const itemCount = Array.isArray(sale?.items) ? sale.items.length : (sale?.item_count ?? 0);
  const clientName = sale?.client?.name ?? sale?.client_name ?? null;

  const translate = (key, fallback) => {
    if (!t) return fallback;
    const result = t(key);
    return result !== key ? result : fallback;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            className="relative w-full max-w-lg bg-dark-900 rounded-3xl border border-dark-700/60
                       shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[85vh]"
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── SUCCESS HEADER ───────────────────────────────────────────── */}
            <div className="relative overflow-hidden px-6 pt-7 pb-6">
              {/* Green gradient background layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-teal-500/10 to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent pointer-events-none" />

              {/* Decorative glow orb */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-dark-800/80 hover:bg-dark-700
                           flex items-center justify-center transition-colors z-10"
                aria-label={translate('close', 'Close')}
              >
                <X className="w-4 h-4 text-dark-400" />
              </button>

              {/* Check icon + heading */}
              <div className="relative flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                  className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500
                             flex items-center justify-center shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle className="w-7 h-7 text-white" strokeWidth={2} />
                </motion.div>

                <div className="pt-1">
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 }}
                    className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1"
                  >
                    {translate('saleCompleted', 'Sale Completed!')}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.16 }}
                    className="text-3xl font-bold text-white tracking-tight leading-none"
                  >
                    {formatCurrency(total)}
                  </motion.p>
                </div>
              </div>

              {/* Sale meta chips */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative flex flex-wrap items-center gap-2 mt-4"
              >
                {itemCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                   bg-dark-800/80 border border-dark-700/60 text-xs text-dark-300">
                    <Package className="w-3 h-3 text-dark-400" />
                    {itemCount} {translate('items', 'items')}
                  </span>
                )}
                {clientName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                   bg-dark-800/80 border border-dark-700/60 text-xs text-dark-300 truncate max-w-[200px]">
                    <User className="w-3 h-3 text-dark-400 flex-shrink-0" />
                    <span className="truncate">{clientName}</span>
                  </span>
                )}
                {sale?.status && (
                  <span className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    ${sale.status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : sale.status === 'partial'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        : 'bg-red-500/15 text-red-400 border border-red-500/25'}
                  `}>
                    {sale.status === 'paid'
                      ? translate('paid', 'Paid')
                      : sale.status === 'partial'
                        ? translate('partial', 'Partial')
                        : translate('unpaid', 'Unpaid')}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Divider with label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="px-6 pb-1"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-dark-700/60" />
                <p className="text-xs font-medium text-dark-400 whitespace-nowrap">
                  {translate('generateDocumentQuestion', 'Which document would you like to generate?')}
                </p>
                <div className="flex-1 h-px bg-dark-700/60" />
              </div>
            </motion.div>

            {/* ── DOCUMENT CARDS GRID ──────────────────────────────────────── */}
            <div className="px-5 pt-3 pb-2 grid grid-cols-2 gap-2.5 overflow-y-auto max-h-[340px]">
              {DOC_TYPES.map((doc, index) => (
                <DocCard
                  key={doc.type}
                  doc={doc}
                  onSelect={handleSelect}
                  t={t}
                  index={index}
                />
              ))}
            </div>

            {/* ── SKIP BUTTON ───────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.52 }}
              className="px-6 py-5 flex items-center justify-center"
            >
              <button
                onClick={onClose}
                className="text-sm text-dark-500 hover:text-dark-300 transition-colors
                           underline underline-offset-4 decoration-dark-600
                           hover:decoration-dark-400 focus:outline-none"
              >
                {translate('skip', 'Skip')}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostSaleDocumentChooser;
