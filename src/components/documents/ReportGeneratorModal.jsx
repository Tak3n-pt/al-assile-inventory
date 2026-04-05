import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Package, BarChart2, Users, Printer, Eye,
  Calendar, RefreshCw, ChevronDown,
  DollarSign, LayoutDashboard, FileText, Factory
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../CustomSelect';
import StockReportTemplate from './StockReportTemplate';
import SalesReportTemplate from './SalesReportTemplate';
import ClientStatementTemplate from './ClientStatementTemplate';
import ExpenseReportTemplate from './ExpenseReportTemplate';
import MonthlySummaryTemplate from './MonthlySummaryTemplate';
import ProductSheetTemplate from './ProductSheetTemplate';
import ProductionReportTemplate from './ProductionReportTemplate';

const ReportGeneratorModal = ({ isOpen, onClose, reportType, settings }) => {
  const { t, language } = useLanguage();
  const printRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Report data
  const [stockItems, setStockItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Date filters
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const reportConfig = {
    stock: {
      title: t('stockReport'),
      titleAr: 'تقرير المخزون',
      icon: Package,
      gradient: 'from-teal-500 to-emerald-500',
      Template: StockReportTemplate,
      needsDateRange: false,
      needsClient: false
    },
    sales: {
      title: t('salesReport'),
      titleAr: 'تقرير المبيعات',
      icon: BarChart2,
      gradient: 'from-indigo-500 to-purple-500',
      Template: SalesReportTemplate,
      needsDateRange: true,
      needsClient: false
    },
    clientStatement: {
      title: t('clientStatement'),
      titleAr: 'كشف حساب الزبون',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-500',
      Template: ClientStatementTemplate,
      needsDateRange: true,
      needsClient: true
    },
    expenseReport: {
      title: t('expenseReport') || 'Expense Report',
      titleAr: 'تقرير المصاريف',
      icon: DollarSign,
      gradient: 'from-amber-500 to-orange-500',
      Template: ExpenseReportTemplate,
      needsDateRange: true,
      needsClient: false
    },
    monthlySummary: {
      title: t('monthlySummary') || 'Monthly Summary',
      titleAr: 'الملخص الشهري',
      icon: LayoutDashboard,
      gradient: 'from-indigo-500 to-violet-500',
      Template: MonthlySummaryTemplate,
      needsDateRange: false,
      needsClient: false,
      needsMonthYear: true
    },
    productSheet: {
      title: t('productSheet') || 'Product Sheet',
      titleAr: 'بطاقة المنتج',
      icon: Package,
      gradient: 'from-emerald-500 to-teal-500',
      Template: ProductSheetTemplate,
      needsDateRange: false,
      needsClient: false,
      needsProduct: true
    },
    productionReport: {
      title: t('productionReport') || 'Production Report',
      titleAr: 'تقرير الإنتاج',
      icon: Factory,
      gradient: 'from-purple-500 to-violet-500',
      Template: ProductionReportTemplate,
      needsDateRange: true,
      needsClient: false
    }
  };

  const config = reportConfig[reportType] || reportConfig.stock;
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setShowPreview(false);
      setReportData(null);
      setSelectedClient(null);
      setSelectedProduct(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [
        window.api.stock.getAll(),
        window.api.sales.getAll(),
        window.api.clients.getAll(),
        window.api.products.getAll(),
        window.api.batches.getAll()
      ];

      const [stockResult, salesResult, clientsResult, productsResult, batchesResult] = await Promise.all(promises);

      if (stockResult?.success) setStockItems(stockResult.data);
      if (salesResult?.success) setSales(salesResult.data);
      if (clientsResult?.success) setClients(clientsResult.data);
      if (productsResult?.success) setAllProducts(productsResult.data);
      if (batchesResult?.success) setBatches(batchesResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareReportData = async () => {
    let data = {};

    switch (reportType) {
      case 'stock':
        data = {
          date: new Date().toISOString(),
          items: stockItems
        };
        break;

      case 'sales':
        const filteredSales = sales.filter(sale => {
          const saleDate = new Date(sale.date);
          const from = new Date(fromDate);
          const to = new Date(toDate);
          to.setHours(23, 59, 59);
          return saleDate >= from && saleDate <= to;
        });
        data = {
          fromDate,
          toDate,
          sales: filteredSales
        };
        break;

      case 'clientStatement':
        if (!selectedClient) return;
        const clientSales = sales.filter(sale => {
          if (sale.client_id !== selectedClient.id) return false;
          const saleDate = new Date(sale.date);
          const from = new Date(fromDate);
          const to = new Date(toDate);
          to.setHours(23, 59, 59);
          return saleDate >= from && saleDate <= to;
        });
        data = {
          client: selectedClient,
          fromDate,
          toDate,
          sales: clientSales
        };
        break;

      case 'expenseReport': {
        const expResult = await window.api.expenses.getByDateRange(fromDate, toDate);
        const expList = expResult?.success ? expResult.data : [];
        const catMap = {};
        let grandTotal = 0;
        for (const e of expList) {
          const cat = e.category_name || 'Other';
          if (!catMap[cat]) catMap[cat] = { name: cat, total: 0 };
          catMap[cat].total += e.amount || 0;
          grandTotal += e.amount || 0;
        }
        data = {
          dateRange: { start: fromDate, end: toDate },
          expenses: expList,
          categories: Object.values(catMap),
          grandTotal
        };
        break;
      }

      case 'monthlySummary': {
        const [salesSum, expSum, prodSum] = await Promise.all([
          window.api.sales.getSummary(selectedYear, selectedMonth),
          window.api.expenses.getByMonth(selectedYear, selectedMonth),
          window.api.reports.getProductionByMonth(selectedYear)
        ]);
        const sData = salesSum?.success ? salesSum.data : {};
        const eList = expSum?.success ? expSum.data : [];
        const expTotal = eList.reduce((s, e) => s + (e.amount || 0), 0);
        const eCatMap = {};
        for (const e of eList) {
          const cat = e.category_name || 'Other';
          if (!eCatMap[cat]) eCatMap[cat] = { name: cat, total: 0 };
          eCatMap[cat].total += e.amount || 0;
        }
        const monthBatches = batches.filter(b => {
          const d = new Date(b.date);
          return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        });
        const revenue = sData.total_sales || 0;
        data = {
          month: selectedMonth,
          year: selectedYear,
          sales: { count: sData.sale_count || 0, total: revenue, paid: sData.total_paid || 0, pending: revenue - (sData.total_paid || 0) },
          expenses: { total: expTotal, byCategory: Object.values(eCatMap) },
          production: { batches: monthBatches.length, units: monthBatches.reduce((s, b) => s + (b.quantity_produced || 0), 0), cost: monthBatches.reduce((s, b) => s + (b.total_cost || 0), 0) },
          revenue,
          profit: revenue - expTotal
        };
        break;
      }

      case 'productSheet': {
        if (!selectedProduct) return;
        const recipeResult = await window.api.products.getRecipe(selectedProduct.id);
        data = {
          product: selectedProduct,
          recipe: recipeResult?.success ? recipeResult.data : []
        };
        break;
      }

      case 'productionReport': {
        const filteredBatches = batches.filter(b => {
          const d = new Date(b.date);
          const from = new Date(fromDate);
          const to = new Date(toDate);
          to.setHours(23, 59, 59);
          return d >= from && d <= to;
        });
        data = {
          dateRange: { start: fromDate, end: toDate },
          batches: filteredBatches,
          summary: {
            totalBatches: filteredBatches.length,
            totalProduced: filteredBatches.reduce((s, b) => s + (b.quantity_produced || 0), 0),
            totalCost: filteredBatches.reduce((s, b) => s + (b.total_cost || 0), 0)
          }
        };
        break;
      }
    }

    setReportData(data);
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
          <title>${config.title}</title>
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
    .p-4 { padding: 1rem; }
    .p-6 { padding: 1.5rem; }
    .font-sans { font-family: Arial, sans-serif; }
    .text-sm { font-size: 0.875rem; }
    .text-xs { font-size: 0.75rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
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
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-8 { margin-top: 2rem; }
    .mt-12 { margin-top: 3rem; }
    .pt-2 { padding-top: 0.5rem; }
    .pt-4 { padding-top: 1rem; }
    .pt-6 { padding-top: 1.5rem; }
    .pb-6 { padding-bottom: 1.5rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .mx-8 { margin-left: 2rem; margin-right: 2rem; }
    .w-full { width: 100%; }
    .w-2 { width: 0.5rem; }
    .w-4 { width: 1rem; }
    .h-2 { height: 0.5rem; }
    .h-4 { height: 1rem; }
    .flex { display: flex; }
    .flex-1 { flex: 1; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    .gap-2 { gap: 0.5rem; }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .gap-8 { gap: 2rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .justify-between { justify-content: space-between; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .uppercase { text-transform: uppercase; }
    .tracking-wide { letter-spacing: 0.025em; }
    .italic { font-style: italic; }
    .border { border: 1px solid #e5e7eb; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-t { border-top: 1px solid #e5e7eb; }
    .border-b-2 { border-bottom: 2px solid; }
    .border-t-2 { border-top: 2px solid; }
    .rounded { border-radius: 0.25rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    .block { display: block; }
    .inline-block { display: inline-block; }
    .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-700 { color: #374151; }
    .text-gray-800 { color: #1f2937; }
    .text-teal-100 { color: #ccfbf1; }
    .text-teal-600 { color: #0d9488; }
    .text-teal-700 { color: #0f766e; }
    .text-teal-800 { color: #115e59; }
    .text-cyan-600 { color: #0891b2; }
    .text-cyan-700 { color: #0e7490; }
    .text-cyan-800 { color: #155e75; }
    .text-indigo-100 { color: #e0e7ff; }
    .text-indigo-700 { color: #4338ca; }
    .text-indigo-800 { color: #3730a3; }
    .text-emerald-600 { color: #059669; }
    .text-emerald-700 { color: #047857; }
    .text-emerald-800 { color: #065f46; }
    .text-blue-700 { color: #1d4ed8; }
    .text-blue-800 { color: #1e40af; }
    .text-amber-600 { color: #d97706; }
    .text-amber-700 { color: #b45309; }
    .text-amber-800 { color: #92400e; }
    .text-red-600 { color: #dc2626; }
    .text-red-700 { color: #b91c1c; }
    .text-red-800 { color: #991b1b; }
    .text-white { color: white; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .bg-teal-50 { background-color: #f0fdfa; }
    .bg-teal-600 { background-color: #0d9488; }
    .bg-teal-800 { background-color: #115e59; }
    .bg-cyan-50 { background-color: #ecfeff; }
    .bg-indigo-50 { background-color: #eef2ff; }
    .bg-indigo-600 { background-color: #4f46e5; }
    .bg-indigo-800 { background-color: #3730a3; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .bg-blue-50 { background-color: #eff6ff; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-amber-500 { background-color: #f59e0b; }
    .bg-red-50 { background-color: #fef2f2; }
    .bg-red-500 { background-color: #ef4444; }
    .bg-green-500 { background-color: #22c55e; }
    .bg-white { background-color: white; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-gray-300 { border-color: #d1d5db; }
    .border-gray-400 { border-color: #9ca3af; }
    .border-teal-200 { border-color: #99f6e4; }
    .border-teal-300 { border-color: #5eead4; }
    .border-teal-600 { border-color: #0d9488; }
    .border-cyan-200 { border-color: #a5f3fc; }
    .border-cyan-300 { border-color: #67e8f9; }
    .border-cyan-600 { border-color: #0891b2; }
    .border-indigo-200 { border-color: #c7d2fe; }
    .border-indigo-600 { border-color: #4f46e5; }
    .border-emerald-200 { border-color: #a7f3d0; }
    .border-blue-200 { border-color: #bfdbfe; }
    .border-amber-200 { border-color: #fde68a; }
    .border-amber-300 { border-color: #fcd34d; }
    .border-red-200 { border-color: #fecaca; }
    table { border-collapse: collapse; width: 100%; }
  `;

  const canGenerate = () => {
    if (reportType === 'clientStatement') return !!selectedClient;
    if (reportType === 'productSheet') return !!selectedProduct;
    return true;
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
          className="bg-dark-900 rounded-3xl border border-dark-700/50 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
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
                <h2 className="text-xl font-semibold text-white">{t('generateReport')}</h2>
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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Date Range Filter */}
                    {config.needsDateRange && (
                      <div>
                        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
                          {t('selectDateRange')}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-dark-400 mb-2">{t('fromDate')}</label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                              <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                                         text-white focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-dark-400 mb-2">{t('toDate')}</label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                              <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700
                                         text-white focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Client Selection for Statement */}
                    {config.needsClient && (
                      <div>
                        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
                          {t('selectClient')}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                          {clients.map((client) => (
                            <motion.div
                              key={client.id}
                              onClick={() => setSelectedClient(client)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all
                                        ${selectedClient?.id === client.id
                                          ? 'bg-dark-700 border-cyan-500'
                                          : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'}`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                              ${selectedClient?.id === client.id ? 'bg-cyan-500' : 'bg-dark-700'}`}>
                                  <Users className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">{client.name}</p>
                                  <p className="text-dark-400 text-sm">{client.phone}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Month/Year Picker */}
                    {config.needsMonthYear && (
                      <div>
                        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
                          Select Month
                        </h3>
                        <div className="flex gap-3">
                          <CustomSelect
                            value={selectedMonth}
                            onChange={val => setSelectedMonth(parseInt(val))}
                            options={['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => ({ value: i + 1, label: m }))}
                            className="flex-1"
                          />
                          <input
                            type="number"
                            value={selectedYear}
                            onChange={e => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                            min={2020}
                            max={2030}
                            className="w-28 px-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50 text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Product Selector */}
                    {config.needsProduct && (
                      <div>
                        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
                          Select Product
                        </h3>
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                          {allProducts.map(product => (
                            <motion.div
                              key={product.id}
                              onClick={() => setSelectedProduct(product)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all
                                        ${selectedProduct?.id === product.id
                                          ? 'bg-dark-700 border-emerald-500'
                                          : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'}`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                              ${selectedProduct?.id === product.id ? 'bg-emerald-500' : 'bg-dark-700'}`}>
                                  <Package className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{product.name}</p>
                                  <p className="text-dark-400 text-xs">{product.unit}</p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Report Summary */}
                    {reportType === 'stock' && (
                      <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
                        <h3 className="text-sm font-medium text-dark-400 mb-2">{t('reportSummary')}</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-dark-500 text-xs">{t('totalItems')}</p>
                            <p className="text-white font-semibold">{stockItems.length}</p>
                          </div>
                          <div>
                            <p className="text-dark-500 text-xs">{t('lowStock')}</p>
                            <p className="text-amber-400 font-semibold">
                              {stockItems.filter(i => i.quantity <= i.min_quantity && i.quantity > 0).length}
                            </p>
                          </div>
                          <div>
                            <p className="text-dark-500 text-xs">{t('outOfStock')}</p>
                            <p className="text-red-400 font-semibold">
                              {stockItems.filter(i => i.quantity <= 0).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportType === 'sales' && (
                      <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50">
                        <h3 className="text-sm font-medium text-dark-400 mb-2">{t('reportSummary')}</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-dark-500 text-xs">{t('totalSales')}</p>
                            <p className="text-white font-semibold">
                              {sales.filter(s => {
                                const d = new Date(s.date);
                                return d >= new Date(fromDate) && d <= new Date(toDate);
                              }).length}
                            </p>
                          </div>
                          <div>
                            <p className="text-dark-500 text-xs">{t('totalClients')}</p>
                            <p className="text-white font-semibold">{clients.length}</p>
                          </div>
                          <div>
                            <p className="text-dark-500 text-xs">{t('period')}</p>
                            <p className="text-white font-semibold text-xs">{fromDate} → {toDate}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Preview */
              <div className="bg-gray-200 p-8 overflow-auto">
                <div ref={printRef} className="mx-auto shadow-2xl">
                  <config.Template
                    data={reportData}
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
                  onClick={prepareReportData}
                  disabled={!canGenerate()}
                  className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2
                            ${canGenerate()
                              ? `bg-gradient-to-r ${config.gradient} text-white hover:shadow-lg transition-all`
                              : 'bg-dark-700 text-dark-500 cursor-not-allowed'}`}
                >
                  <Eye size={18} />
                  {t('preview')}
                </button>
              ) : (
                <button
                  onClick={handlePrint}
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
                  {t('printReport')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportGeneratorModal;
