import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, FileCheck, FilePlus, Package, TrendingUp, Users, Wallet,
  Settings, Printer, Download, Eye, Calendar, Building2, Phone, Mail,
  MapPin, CreditCard, Percent, Save, X, ChevronRight, Clock, Hash,
  Sparkles, RefreshCw
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../contexts/LanguageContext';
import DocumentGeneratorModal from '../components/documents/DocumentGeneratorModal';
import ReportGeneratorModal from '../components/documents/ReportGeneratorModal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' DZD';
};

// Elite Document Card Component
const DocumentCard = ({ title, description, icon: Icon, gradient, onClick, badge }) => (
  <motion.button
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl bg-dark-800/40 backdrop-blur-xl
               border border-dark-700/50 p-6 text-left w-full
               hover:border-dark-600 transition-all duration-500"
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Animated gradient background */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0
                    group-hover:opacity-10 transition-opacity duration-500`} />

    {/* Glow effect */}
    <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${gradient}
                    opacity-20 blur-3xl rounded-full group-hover:opacity-40
                    transition-opacity duration-500`} />

    {/* Icon with gradient background */}
    <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient}
                    flex items-center justify-center mb-4 shadow-lg
                    group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
      <Icon className="w-7 h-7 text-white" />
    </div>

    {/* Badge */}
    {badge && (
      <span className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-medium
                       bg-gradient-to-r ${gradient} text-white`}>
        {badge}
      </span>
    )}

    {/* Content */}
    <div className="relative">
      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white/90">
        {title}
      </h3>
      <p className="text-dark-400 text-sm leading-relaxed group-hover:text-dark-300">
        {description}
      </p>
    </div>

    {/* Arrow indicator */}
    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100
                   transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
      <ChevronRight className="w-5 h-5 text-dark-400" />
    </div>
  </motion.button>
);

// Recent Document Row
const RecentDocumentRow = ({ doc, onClick }) => {
  const typeColors = {
    invoice: 'from-emerald-500 to-teal-500',
    delivery: 'from-blue-500 to-cyan-500',
    proforma: 'from-violet-500 to-purple-500'
  };

  const typeIcons = {
    invoice: FileText,
    delivery: FileCheck,
    proforma: FilePlus
  };

  const Icon = typeIcons[doc.type] || FileText;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/30 border border-dark-700/30
                hover:bg-dark-800/50 hover:border-dark-600/50 cursor-pointer transition-all duration-300"
      onClick={onClick}
      whileHover={{ x: 4 }}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeColors[doc.type]}
                      flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{doc.number}</p>
        <p className="text-dark-400 text-sm">{doc.client_name || 'N/A'}</p>
      </div>

      <div className="text-right">
        <p className="text-white font-semibold">{formatCurrency(doc.total)}</p>
        <p className="text-dark-500 text-xs flex items-center gap-1 justify-end">
          <Clock size={12} />
          {doc.date}
        </p>
      </div>
    </motion.div>
  );
};

// Settings Modal
const SettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

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
          className="bg-dark-900 rounded-3xl border border-dark-700/50 w-full max-w-2xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-dark-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500
                            flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">{t('companySettings')}</h2>
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
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Company Info Section */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={16} />
                {t('companyInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('businessNameAr')}</label>
                  <input
                    type="text"
                    value={formData.business_name || ''}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('businessNameFr')}</label>
                  <input
                    type="text"
                    value={formData.business_name_fr || ''}
                    onChange={(e) => setFormData({ ...formData, business_name_fr: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-dark-400 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={14} /> {t('businessAddress')}
                  </label>
                  <input
                    type="text"
                    value={formData.business_address || ''}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} /> {t('businessPhone')}
                  </label>
                  <input
                    type="text"
                    value={formData.business_phone || ''}
                    onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5 flex items-center gap-1.5">
                    <Mail size={14} /> {t('businessEmail')}
                  </label>
                  <input
                    type="email"
                    value={formData.business_email || ''}
                    onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Legal Info Section */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard size={16} />
                {t('legalInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('nif')}</label>
                  <input
                    type="text"
                    value={formData.business_nif || ''}
                    onChange={(e) => setFormData({ ...formData, business_nif: e.target.value })}
                    placeholder="000000000000000"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('rc')}</label>
                  <input
                    type="text"
                    value={formData.business_rc || ''}
                    onChange={(e) => setFormData({ ...formData, business_rc: e.target.value })}
                    placeholder="00/00-0000000A00"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('ai')}</label>
                  <input
                    type="text"
                    value={formData.business_ai || ''}
                    onChange={(e) => setFormData({ ...formData, business_ai: e.target.value })}
                    placeholder="00000000000"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('nis')}</label>
                  <input
                    type="text"
                    value={formData.business_nis || ''}
                    onChange={(e) => setFormData({ ...formData, business_nis: e.target.value })}
                    placeholder="000000000000000"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-dark-400 mb-1.5">{t('rib')}</label>
                  <input
                    type="text"
                    value={formData.business_rib || ''}
                    onChange={(e) => setFormData({ ...formData, business_rib: e.target.value })}
                    placeholder="00000 00000 00000000000 00"
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5 flex items-center gap-1.5">
                    <Percent size={14} /> {t('tvaRate')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.tva_rate || '19'}
                    onChange={(e) => setFormData({ ...formData, tva_rate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Document Prefixes */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Hash size={16} />
                {t('documentPrefixes')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('invoicePrefix')}</label>
                  <input
                    type="text"
                    value={formData.invoice_prefix || 'FAC'}
                    onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('deliveryNotePrefix')}</label>
                  <input
                    type="text"
                    value={formData.delivery_prefix || 'BL'}
                    onChange={(e) => setFormData({ ...formData, delivery_prefix: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-dark-400 mb-1.5">{t('proformaPrefix')}</label>
                  <input
                    type="text"
                    value={formData.proforma_prefix || 'PRO'}
                    onChange={(e) => setFormData({ ...formData, proforma_prefix: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                             text-white placeholder-dark-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-700/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-dark-800 text-dark-300 font-medium
                       hover:bg-dark-700 hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500
                       text-white font-medium flex items-center gap-2
                       hover:shadow-lg hover:shadow-indigo-500/25 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {t('saveSettings')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Documents = () => {
  const { t, language } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState(null);
  const [settings, setSettings] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResult, docsResult] = await Promise.all([
        window.api.settings.getAll(),
        window.api.documents.getAll(10)
      ]);

      if (settingsResult?.success) setSettings(settingsResult.data || {});
      if (docsResult?.success) setRecentDocs(docsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const result = await window.api.settings.setMultiple(newSettings);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save settings');
      }
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error.message || 'Error saving settings');
    }
  };

  const handleDocumentClick = (type) => {
    if (['invoice', 'delivery', 'proforma'].includes(type)) {
      setSelectedDocType(type);
      setShowGenerator(true);
    } else if (['stock', 'sales', 'client'].includes(type)) {
      // Map report types to ReportGeneratorModal types
      const reportTypeMap = {
        stock: 'stock',
        sales: 'sales',
        client: 'clientStatement'
      };
      setSelectedReportType(reportTypeMap[type]);
      setShowReportGenerator(true);
    } else {
      console.log('Report not yet implemented:', type);
    }
  };

  const salesDocuments = [
    {
      id: 'invoice',
      title: t('invoice'),
      description: t('invoiceDesc'),
      icon: FileText,
      gradient: 'from-emerald-500 to-teal-500',
      badge: 'FAC'
    },
    {
      id: 'delivery',
      title: t('deliveryNote'),
      description: t('deliveryNoteDesc'),
      icon: FileCheck,
      gradient: 'from-blue-500 to-cyan-500',
      badge: 'BL'
    },
    {
      id: 'proforma',
      title: t('proformaInvoice'),
      description: t('proformaInvoiceDesc'),
      icon: FilePlus,
      gradient: 'from-violet-500 to-purple-500',
      badge: 'PRO'
    }
  ];

  const businessReports = [
    {
      id: 'stock',
      title: t('stockReport'),
      description: t('stockReportDesc'),
      icon: Package,
      gradient: 'from-amber-500 to-orange-500'
    },
    {
      id: 'sales',
      title: t('salesReport'),
      description: t('salesReportDesc'),
      icon: TrendingUp,
      gradient: 'from-pink-500 to-rose-500'
    },
    {
      id: 'client',
      title: t('clientStatement'),
      description: t('clientStatementDesc'),
      icon: Users,
      gradient: 'from-indigo-500 to-blue-500'
    },
    {
      id: 'expense',
      title: t('expenseReport'),
      description: t('expenseReportDesc'),
      icon: Wallet,
      gradient: 'from-red-500 to-orange-500'
    }
  ];

  return (
    <div>
      <PageHeader
        title={t('documentsReports')}
        subtitle={t('generateDocuments')}
        icon={FileText}
        gradient="from-violet-500 to-purple-500"
        actions={
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-dark-800/50 border border-dark-700/50
                     text-dark-300 font-medium text-sm
                     hover:bg-dark-700 hover:text-white
                     transition-all duration-300"
          >
            <Settings size={18} />
            {t('companySettings')}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Document Types */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sales Documents Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500
                            flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t('salesDocuments')}</h2>
                <p className="text-dark-400 text-sm">{t('salesDocsDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {salesDocuments.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <DocumentCard
                    {...doc}
                    onClick={() => handleDocumentClick(doc.id)}
                  />
                </motion.div>
              ))}
            </div>
          </section>

          {/* Business Reports Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500
                            flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t('businessReports')}</h2>
                <p className="text-dark-400 text-sm">{t('reportsDesc')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <DocumentCard
                    {...report}
                    onClick={() => handleDocumentClick(report.id)}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar - Recent Documents */}
        <div className="lg:col-span-1">
          <motion.div
            className="bg-dark-800/30 backdrop-blur-xl rounded-2xl border border-dark-700/50 p-5 sticky top-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={18} className="text-dark-400" />
                {t('recentDocuments')}
              </h3>
              <span className="text-xs text-dark-500 bg-dark-700/50 px-2 py-1 rounded-full">
                {recentDocs.length}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400 text-sm mb-1">{t('noDocumentsYet')}</p>
                <p className="text-dark-500 text-xs">{t('generateFirstDocument')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <RecentDocumentRow
                    key={doc.id}
                    doc={doc}
                    onClick={() => console.log('View:', doc.id)}
                  />
                ))}
              </div>
            )}

            {/* Quick Stats */}
            <div className="mt-6 pt-5 border-t border-dark-700/50">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-dark-800/50">
                  <p className="text-2xl font-bold text-emerald-400">
                    {recentDocs.filter(d => d.type === 'invoice').length}
                  </p>
                  <p className="text-dark-500 text-xs mt-1">{t('invoices')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-dark-800/50">
                  <p className="text-2xl font-bold text-blue-400">
                    {recentDocs.filter(d => d.type === 'delivery').length}
                  </p>
                  <p className="text-dark-500 text-xs mt-1">{t('deliveryNotes')}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-dark-800/50">
                  <p className="text-2xl font-bold text-violet-400">
                    {recentDocs.filter(d => d.type === 'proforma').length}
                  </p>
                  <p className="text-dark-500 text-xs mt-1">{t('proformaInvoice')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Document Generator Modal */}
      <DocumentGeneratorModal
        isOpen={showGenerator}
        onClose={() => {
          setShowGenerator(false);
          setSelectedDocType(null);
          loadData(); // Refresh recent documents
        }}
        documentType={selectedDocType}
        settings={settings}
      />

      {/* Report Generator Modal */}
      <ReportGeneratorModal
        isOpen={showReportGenerator}
        onClose={() => {
          setShowReportGenerator(false);
          setSelectedReportType(null);
        }}
        reportType={selectedReportType}
        settings={settings}
      />
    </div>
  );
};

export default Documents;
