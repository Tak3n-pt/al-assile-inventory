import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, FileCheck, FilePlus, Printer, Download, Eye,
  Search, Calendar, Check, RefreshCw, ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import InvoiceTemplate from './InvoiceTemplate';
import DeliveryNoteTemplate from './DeliveryNoteTemplate';
import ProformaTemplate from './ProformaTemplate';
import PurchaseOrderTemplate from './PurchaseOrderTemplate';
import ExitVoucherTemplate from './ExitVoucherTemplate';
import CreditNoteTemplate from './CreditNoteTemplate';
import QuoteTemplate from './QuoteTemplate';
import ReceptionVoucherTemplate from './ReceptionVoucherTemplate';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' DZD';
};

const DocumentGeneratorModal = ({
  isOpen,
  onClose,
  documentType,
  settings,
  preSelectedSale = null,
  sales: propSales = null
}) => {
  const { t, language } = useLanguage();
  const printRef = useRef(null);
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentData, setDocumentData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const documentConfig = {
    invoice: {
      title: t('invoice'),
      titleAr: 'فاتورة',
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-500',
      Template: InvoiceTemplate
    },
    delivery: {
      title: t('deliveryNote'),
      titleAr: 'سند التسليم',
      icon: FileCheck,
      gradient: 'from-blue-500 to-cyan-500',
      Template: DeliveryNoteTemplate
    },
    proforma: {
      title: t('proformaInvoice'),
      titleAr: 'فاتورة مبدئية',
      icon: FilePlus,
      gradient: 'from-violet-500 to-purple-500',
      Template: ProformaTemplate
    },
    purchase_order: {
      title: t('purchaseOrder') || 'Bon de Commande',
      titleAr: 'طلب شراء',
      icon: FileText,
      gradient: 'from-sky-500 to-blue-500',
      Template: PurchaseOrderTemplate
    },
    exit_voucher: {
      title: t('exitVoucher') || 'Bon de Sortie',
      titleAr: 'سند الخروج',
      icon: FileText,
      gradient: 'from-amber-500 to-orange-500',
      Template: ExitVoucherTemplate
    },
    credit_note: {
      title: t('creditNote') || 'Avoir',
      titleAr: 'إشعار دائن',
      icon: FileText,
      gradient: 'from-rose-500 to-red-500',
      Template: CreditNoteTemplate
    },
    quote: {
      title: t('quoteEstimate') || 'Devis',
      titleAr: 'عرض أسعار',
      icon: FilePlus,
      gradient: 'from-violet-500 to-indigo-500',
      Template: QuoteTemplate
    },
    reception_voucher: {
      title: t('receptionVoucher') || 'Bon de Réception',
      titleAr: 'سند الاستلام',
      icon: FileCheck,
      gradient: 'from-teal-500 to-cyan-500',
      Template: ReceptionVoucherTemplate
    }
  };

  const config = documentConfig[documentType] || documentConfig.invoice;
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Auto-select sale if preSelectedSale is provided
      if (preSelectedSale) {
        setSelectedSale(preSelectedSale);
      }
    } else {
      // Reset state when modal closes
      setSelectedSale(null);
      setShowPreview(false);
      setDocumentData(null);
      setSaleItems([]);
    }
  }, [isOpen, preSelectedSale]);

  useEffect(() => {
    if (selectedSale) {
      loadSaleItems(selectedSale.id);
    }
  }, [selectedSale]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Use prop sales if provided, otherwise load from API
      if (propSales && propSales.length > 0) {
        setSales(propSales);
      } else {
        const salesResult = await window.api.sales.getAll();
        if (salesResult?.success) setSales(salesResult.data);
      }

      // Always load clients
      const clientsResult = await window.api.clients.getAll();
      if (clientsResult?.success) setClients(clientsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSaleItems = async (saleId) => {
    try {
      const result = await window.api.sales.getItems(saleId);
      if (result?.success) {
        setSaleItems(result.data);
      }
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  const prepareDocumentData = async () => {
    if (!selectedSale) return;

    const nextNumber = await window.api.documents.getNextNumber(documentType);
    const client = clients.find(c => c.id === selectedSale.client_id) || selectedClient;

    setDocumentData({
      number: nextNumber?.success ? nextNumber.data : `DOC-${Date.now()}`,
      date: selectedSale.date || new Date().toISOString().split('T')[0],
      client: client,
      items: saleItems,
      subtotal: selectedSale.subtotal || 0,
      discount: selectedSale.discount || 0,
      total: selectedSale.total || 0,
      paidAmount: selectedSale.paid_amount || 0,
      notes: selectedSale.notes,
      validityDays: 30
    });

    setShowPreview(true);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.title} - ${documentData?.number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            ${getStyles()}
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const getStyles = () => `
    .bg-white { background-color: white; }
    .text-black { color: black; }
    .p-8 { padding: 2rem; }
    .font-sans { font-family: Arial, sans-serif; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .font-mono { font-family: monospace; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mb-12 { margin-bottom: 3rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-8 { margin-top: 2rem; }
    .mt-12 { margin-top: 3rem; }
    .ml-1 { margin-left: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .p-4 { padding: 1rem; }
    .w-full { width: 100%; }
    .w-80 { width: 20rem; }
    .w-40 { width: 10rem; }
    .h-16 { height: 4rem; }
    .flex { display: flex; }
    .flex-1 { flex: 1; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .uppercase { text-transform: uppercase; }
    .tracking-wide { letter-spacing: 0.025em; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .border { border: 1px solid #e5e7eb; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-t { border-top: 1px solid #e5e7eb; }
    .border-b-2 { border-bottom: 2px solid; }
    .rounded-lg { border-radius: 0.5rem; }
    .inline-block { display: inline-block; }
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-700 { color: #374151; }
    .text-gray-800 { color: #1f2937; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-100 { color: #d1fae5; }
    .text-blue-600 { color: #2563eb; }
    .text-blue-700 { color: #1d4ed8; }
    .text-blue-100 { color: #dbeafe; }
    .text-violet-600 { color: #7c3aed; }
    .text-violet-700 { color: #6d28d9; }
    .text-violet-100 { color: #ede9fe; }
    .text-violet-800 { color: #5b21b6; }
    .text-amber-800 { color: #92400e; }
    .text-orange-600 { color: #ea580c; }
    .text-green-600 { color: #16a34a; }
    .text-red-600 { color: #dc2626; }
    .text-white { color: white; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-violet-50 { background-color: #f5f3ff; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-emerald-600 { background-color: #059669; }
    .bg-blue-600 { background-color: #2563eb; }
    .bg-violet-600 { background-color: #7c3aed; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-gray-300 { border-color: #d1d5db; }
    .border-gray-400 { border-color: #9ca3af; }
    .border-emerald-600 { border-color: #059669; }
    .border-blue-600 { border-color: #2563eb; }
    .border-violet-600 { border-color: #7c3aed; }
    .border-violet-200 { border-color: #ddd6fe; }
    .border-amber-200 { border-color: #fde68a; }
    .pb-6 { padding-bottom: 1.5rem; }
    .pt-4 { padding-top: 1rem; }
    table { border-collapse: collapse; }
  `;

  const handleGenerateDocument = async () => {
    if (!documentData) return;

    setGenerating(true);
    try {
      const result = await window.api.documents.create({
        type: documentType,
        sale_id: selectedSale?.id,
        client_id: selectedClient?.id || selectedSale?.client_id,
        date: documentData.date,
        data: {
          items: saleItems,
          client: documentData.client,
          subtotal: documentData.subtotal,
          discount: documentData.discount,
          total: documentData.total,
          paidAmount: documentData.paidAmount
        },
        total: documentData.total
      });

      if (result?.success) {
        handlePrint();
        onClose();
      }
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setGenerating(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const query = searchQuery.toLowerCase();
    const client = clients.find(c => c.id === sale.client_id);
    return (
      sale.id.toString().includes(query) ||
      client?.name?.toLowerCase().includes(query) ||
      sale.date?.includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-dark-900 rounded-3xl border border-dark-700/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-dark-700/50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient}
                            flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{t('generateDocument')}</h2>
                <p className="text-dark-400 text-sm">{config.title} / {config.titleAr}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-dark-800 hover:bg-dark-700
                       flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-dark-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {!showPreview ? (
              <div className="p-6">
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchSales') + '...'}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                               text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sales List */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
                    {t('selectSale')}
                  </h3>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                  ) : filteredSales.length === 0 ? (
                    <p className="text-dark-500 text-center py-8">{t('noSalesYet')}</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {filteredSales.map((sale) => {
                        const client = clients.find(c => c.id === sale.client_id);
                        const isSelected = selectedSale?.id === sale.id;

                        return (
                          <motion.div
                            key={sale.id}
                            onClick={() => setSelectedSale(sale)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all
                                      ${isSelected
                                        ? 'bg-dark-700 border-indigo-500'
                                        : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'}`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                              ${isSelected ? 'bg-indigo-500' : 'bg-dark-700'}`}>
                                  {isSelected ? (
                                    <Check className="w-5 h-5 text-white" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-dark-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {t('sales')} #{sale.id} - {client?.name || t('client')}
                                  </p>
                                  <p className="text-dark-400 text-sm flex items-center gap-2">
                                    <Calendar size={14} />
                                    {sale.date}
                                    <span className={`px-2 py-0.5 rounded-full text-xs
                                                    ${sale.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                                                      sale.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
                                                      'bg-red-500/20 text-red-400'}`}>
                                      {sale.status === 'paid' ? t('paid') : sale.status === 'partial' ? t('partial') : t('unpaid')}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-semibold">{formatCurrency(sale.total)}</p>
                                <p className="text-dark-500 text-xs">
                                  {sale.paid_amount > 0 && `${t('paid')}: ${formatCurrency(sale.paid_amount)}`}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Preview */
              <div className="bg-gray-200 p-8 overflow-auto">
                <div ref={printRef} className="mx-auto shadow-2xl">
                  <config.Template
                    data={documentData}
                    settings={settings}
                    language={language}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-700/50 flex justify-between gap-3 flex-shrink-0">
            <div>
              {showPreview && (
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-5 py-2.5 rounded-xl bg-dark-800 text-dark-300 font-medium
                           hover:bg-dark-700 hover:text-white transition-colors"
                >
                  ← {t('back')}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-dark-800 text-dark-300 font-medium
                         hover:bg-dark-700 hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>

              {!showPreview ? (
                <button
                  onClick={prepareDocumentData}
                  disabled={!selectedSale}
                  className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2
                            ${selectedSale
                              ? `bg-gradient-to-r ${config.gradient} text-white hover:shadow-lg transition-all`
                              : 'bg-dark-700 text-dark-500 cursor-not-allowed'}`}
                >
                  <Eye size={18} />
                  {t('preview')}
                </button>
              ) : (
                <button
                  onClick={handleGenerateDocument}
                  disabled={generating}
                  className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${config.gradient}
                           text-white font-medium flex items-center gap-2
                           hover:shadow-lg transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {generating ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Printer size={18} />
                  )}
                  {t('printDocument')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentGeneratorModal;
