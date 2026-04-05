import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileBarChart, Calendar, TrendingUp, TrendingDown, DollarSign, Package,
  Users, AlertTriangle, Factory, ShoppingCart, Wallet, Truck, BarChart3,
  PieChart, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from '../components/CustomSelect';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' DZD';
};

const StatCard = ({ title, value, subtitle, icon: Icon, gradient, trend, trendValue }) => (
  <motion.div
    className="relative overflow-hidden rounded-2xl bg-dark-800/50 border border-dark-700/50 p-6"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2`} />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-dark-400 text-sm mb-1">{title}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
      ${active
        ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/25'
        : 'text-dark-400 hover:text-white hover:bg-dark-800'
      }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

const Reports = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Report data states
  const [dashboardStats, setDashboardStats] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [monthlyProfitLoss, setMonthlyProfitLoss] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stockByCategory, setStockByCategory] = useState([]);
  const [salesByClient, setSalesByClient] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [productionByProduct, setProductionByProduct] = useState([]);
  const [productionHistory, setProductionHistory] = useState([]);

  const loadDashboardData = async () => {
    try {
      const result = await window.api.reports.getDashboardStats();
      if (result.success) {
        setDashboardStats(result.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadProfitLossData = async () => {
    try {
      const [plResult, monthlyResult] = await Promise.all([
        window.api.reports.getProfitLoss(dateRange.startDate, dateRange.endDate),
        window.api.reports.getMonthlyProfitLoss(selectedYear)
      ]);
      if (plResult.success) setProfitLoss(plResult.data);
      if (monthlyResult.success) setMonthlyProfitLoss(monthlyResult.data);
    } catch (error) {
      console.error('Error loading profit/loss:', error);
    }
  };

  const loadStockData = async () => {
    try {
      const [lowStockResult, categoryResult] = await Promise.all([
        window.api.reports.getLowStockItems(),
        window.api.reports.getStockByCategory()
      ]);
      if (lowStockResult.success) setLowStockItems(lowStockResult.data);
      if (categoryResult.success) setStockByCategory(categoryResult.data);
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      const [clientResult, productsResult, monthlyResult] = await Promise.all([
        window.api.reports.getSalesByClient(dateRange.startDate, dateRange.endDate),
        window.api.reports.getTopProducts(dateRange.startDate, dateRange.endDate, 10),
        window.api.reports.getMonthlySales(selectedYear)
      ]);
      if (clientResult.success) setSalesByClient(clientResult.data);
      if (productsResult.success) setTopProducts(productsResult.data);
      if (monthlyResult.success) setMonthlySales(monthlyResult.data);
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
  };

  const loadExpenseData = async () => {
    try {
      const [categoryResult, monthlyResult] = await Promise.all([
        window.api.reports.getExpensesByCategory(dateRange.startDate, dateRange.endDate),
        window.api.reports.getMonthlyExpenses(selectedYear)
      ]);
      if (categoryResult.success) setExpensesByCategory(categoryResult.data);
      if (monthlyResult.success) setMonthlyExpenses(monthlyResult.data);
    } catch (error) {
      console.error('Error loading expense data:', error);
    }
  };

  const loadProductionData = async () => {
    try {
      const [productResult, historyResult] = await Promise.all([
        window.api.reports.getProductionByProduct(),
        window.api.reports.getProductionHistory(50)
      ]);
      if (productResult.success) setProductionByProduct(productResult.data);
      if (historyResult.success) setProductionHistory(historyResult.data);
    } catch (error) {
      console.error('Error loading production data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadTabData = async () => {
      setLoading(true);
      switch (activeTab) {
        case 'dashboard':
          await loadDashboardData();
          break;
        case 'profitloss':
          await loadProfitLossData();
          break;
        case 'stock':
          await loadStockData();
          break;
        case 'sales':
          await loadSalesData();
          break;
        case 'expenses':
          await loadExpenseData();
          break;
        case 'production':
          await loadProductionData();
          break;
      }
      setLoading(false);
    };
    loadTabData();
  }, [activeTab, dateRange, selectedYear]);

  const refreshData = async () => {
    setLoading(true);
    switch (activeTab) {
      case 'dashboard': await loadDashboardData(); break;
      case 'profitloss': await loadProfitLossData(); break;
      case 'stock': await loadStockData(); break;
      case 'sales': await loadSalesData(); break;
      case 'expenses': await loadExpenseData(); break;
      case 'production': await loadProductionData(); break;
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'dashboard', label: t('dashboard'), icon: BarChart3 },
    { id: 'profitloss', label: t('profitLoss'), icon: TrendingUp },
    { id: 'stock', label: t('stockAlerts'), icon: AlertTriangle },
    { id: 'sales', label: t('sales'), icon: ShoppingCart },
    { id: 'expenses', label: t('expenses'), icon: Wallet },
    { id: 'production', label: t('production'), icon: Factory },
  ];

  const renderDashboard = () => {
    if (!dashboardStats) return null;
    const { stock, sales, expenses, production, outstanding, monthProfit } = dashboardStats;

    return (
      <div className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('monthRevenue')}
            value={formatCurrency(sales?.total_sales)}
            subtitle={`${sales?.sale_count || 0} ${t('sales')}`}
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-500"
          />
          <StatCard
            title={t('monthExpenses')}
            value={formatCurrency(expenses?.total_expenses)}
            subtitle={`${expenses?.expense_count || 0} ${t('expenses')}`}
            icon={Wallet}
            gradient="from-red-500 to-orange-500"
          />
          <StatCard
            title={t('monthProfit')}
            value={formatCurrency(monthProfit)}
            icon={DollarSign}
            gradient={monthProfit >= 0 ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-pink-500'}
            trend={monthProfit >= 0 ? 'up' : 'down'}
          />
          <StatCard
            title={t('stockValue')}
            value={formatCurrency(stock?.total_value)}
            subtitle={`${stock?.total_items || 0} ${t('items')}`}
            icon={Package}
            gradient="from-violet-500 to-purple-500"
          />
        </div>

        {/* Outstanding & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={t('receivable')}
            value={formatCurrency(outstanding?.fromClients)}
            icon={Users}
            gradient="from-cyan-500 to-blue-500"
          />
          <StatCard
            title={t('payable')}
            value={formatCurrency(outstanding?.toSuppliers)}
            icon={Truck}
            gradient="from-amber-500 to-orange-500"
          />
          <StatCard
            title={t('pendingPayroll')}
            value={formatCurrency(outstanding?.pendingPayroll)}
            subtitle={`${outstanding?.pendingPayrollCount || 0} ${t('pending')}`}
            icon={Users}
            gradient="from-pink-500 to-rose-500"
          />
          <StatCard
            title={t('lowStockItems')}
            value={stock?.low_stock_count || 0}
            subtitle={`${stock?.out_of_stock_count || 0} ${t('outOfStock')}`}
            icon={AlertTriangle}
            gradient="from-yellow-500 to-amber-500"
          />
        </div>

        {/* Production Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title={t('monthProduction')}
            value={production?.total_produced || 0}
            subtitle={`${production?.batch_count || 0} ${t('batches')}`}
            icon={Factory}
            gradient="from-indigo-500 to-purple-500"
          />
          <StatCard
            title={t('productionCost')}
            value={formatCurrency(production?.total_cost)}
            icon={DollarSign}
            gradient="from-slate-500 to-gray-500"
          />
          <StatCard
            title={t('collectedThisMonth')}
            value={formatCurrency(sales?.total_collected)}
            icon={TrendingUp}
            gradient="from-emerald-500 to-green-500"
          />
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-dark-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
          <span className="text-dark-500">{t('to')}</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
        </div>
        <CustomSelect
          value={selectedYear}
          onChange={(val) => setSelectedYear(parseInt(val))}
          options={[2024, 2025, 2026].map(year => ({ value: year, label: String(year) }))}
        />
      </div>

      {/* Summary Cards */}
      {profitLoss && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title={t('totalRevenue')}
            value={formatCurrency(profitLoss.revenue.total)}
            subtitle={`${profitLoss.revenue.saleCount} ${t('sales')}`}
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-500"
          />
          <StatCard
            title={t('productionCosts')}
            value={formatCurrency(profitLoss.costs.production)}
            icon={Factory}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            title={t('totalExpenses')}
            value={formatCurrency(profitLoss.costs.expenses)}
            subtitle={`${profitLoss.costs.expenseCount} ${t('expenses')}`}
            icon={Wallet}
            gradient="from-red-500 to-orange-500"
          />
          <StatCard
            title={t('netProfit')}
            value={formatCurrency(profitLoss.profit.net)}
            subtitle={`${profitLoss.profit.margin}% ${t('margin')}`}
            icon={DollarSign}
            gradient={profitLoss.profit.net >= 0 ? 'from-emerald-500 to-green-500' : 'from-red-500 to-pink-500'}
            trend={profitLoss.profit.net >= 0 ? 'up' : 'down'}
          />
        </div>
      )}

      {/* Monthly Chart */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('monthlyProfitLoss')} - {selectedYear}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('month')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('revenue')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('production')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('expenses')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('profit')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyProfitLoss.map((month) => (
                <tr key={month.month} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="py-3 px-4 text-white font-medium">{month.monthName}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(month.revenue)}</td>
                  <td className="py-3 px-4 text-right text-blue-400">{formatCurrency(month.productionCost)}</td>
                  <td className="py-3 px-4 text-right text-red-400">{formatCurrency(month.expenses)}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${month.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(month.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStockAlerts = () => (
    <div className="space-y-6">
      {/* Stock by Category */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-violet-400" />
          {t('stockByCategory')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stockByCategory.map((cat) => (
            <div key={cat.id} className="p-4 rounded-xl bg-dark-700/50 border border-dark-600/50">
              <p className="text-white font-medium mb-1">{cat.category_name}</p>
              <p className="text-2xl font-bold text-white">{cat.item_count} <span className="text-sm text-dark-400">{t('items')}</span></p>
              <p className="text-dark-400 text-sm">{formatCurrency(cat.total_value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Low Stock Items */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle size={20} className="text-yellow-400" />
          {t('lowStockAlerts')} ({lowStockItems.length})
        </h3>
        {lowStockItems.length === 0 ? (
          <p className="text-dark-400 text-center py-8">{t('noLowStockItems')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('item')}</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('category')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('current')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('minimum')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('shortage')}</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('supplier')}</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                    <td className="py-3 px-4 text-white font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-dark-300">{item.category_name || '-'}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${item.quantity <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-dark-300">{item.min_stock_alert} {item.unit}</td>
                    <td className="py-3 px-4 text-right text-red-400">-{item.shortage_amount} {item.unit}</td>
                    <td className="py-3 px-4 text-dark-300">{item.supplier_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-dark-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
          <span className="text-dark-500">{t('to')}</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" />
            {t('topProducts')}
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-dark-400 text-center py-8">{t('noSalesData')}</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">{product.product_name}</p>
                      <p className="text-dark-400 text-sm">{product.total_quantity} {t('unitsSold')}</p>
                    </div>
                  </div>
                  <p className="text-emerald-400 font-semibold">{formatCurrency(product.total_revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Client */}
        <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-cyan-400" />
            {t('salesByClient')}
          </h3>
          {salesByClient.length === 0 ? (
            <p className="text-dark-400 text-center py-8">{t('noClientData')}</p>
          ) : (
            <div className="space-y-3">
              {salesByClient.slice(0, 10).map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-700/50">
                  <div>
                    <p className="text-white font-medium">{client.client_name}</p>
                    <p className="text-dark-400 text-sm">{client.sale_count} {t('orders')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-semibold">{formatCurrency(client.total_sales)}</p>
                    {client.outstanding > 0 && (
                      <p className="text-red-400 text-sm">{t('owes')}: {formatCurrency(client.outstanding)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Sales */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('monthlySales')} - {selectedYear}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('month')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('orders')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('totalSales')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('collected')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlySales.map((month) => (
                <tr key={month.month} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="py-3 px-4 text-white font-medium">{month.monthName}</td>
                  <td className="py-3 px-4 text-right text-dark-300">{month.sale_count}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(month.total_sales)}</td>
                  <td className="py-3 px-4 text-right text-cyan-400">{formatCurrency(month.total_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-dark-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
          <span className="text-dark-500">{t('to')}</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 text-white text-sm"
          />
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <PieChart size={20} className="text-red-400" />
          {t('expensesByCategory')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expensesByCategory.map((cat) => (
            <div key={cat.id} className="p-4 rounded-xl bg-dark-700/50 border border-dark-600/50">
              <p className="text-white font-medium mb-1">{cat.category_name}</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(cat.total_amount)}</p>
              <p className="text-dark-400 text-sm">{cat.expense_count} {t('expenses')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Expenses */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('monthlyExpenses')} - {selectedYear}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('month')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('count')}</th>
                <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('totalAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyExpenses.map((month) => (
                <tr key={month.month} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="py-3 px-4 text-white font-medium">{month.monthName}</td>
                  <td className="py-3 px-4 text-right text-dark-300">{month.expense_count}</td>
                  <td className="py-3 px-4 text-right text-red-400">{formatCurrency(month.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProduction = () => (
    <div className="space-y-6">
      {/* Production by Product */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Factory size={20} className="text-violet-400" />
          {t('productionByProduct')}
        </h3>
        {productionByProduct.length === 0 ? (
          <p className="text-dark-400 text-center py-8">{t('noProductionData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('product')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('batches')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('totalProduced')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('totalCost')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('avgUnitCost')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('sellingPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {productionByProduct.map((product) => (
                  <tr key={product.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                    <td className="py-3 px-4 text-white font-medium">{product.product_name}</td>
                    <td className="py-3 px-4 text-right text-dark-300">{product.batch_count}</td>
                    <td className="py-3 px-4 text-right text-violet-400 font-semibold">{product.total_produced}</td>
                    <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(product.total_cost)}</td>
                    <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(product.avg_unit_cost)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{formatCurrency(product.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Production History */}
      <div className="bg-dark-800/50 rounded-2xl border border-dark-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('recentProductionHistory')}</h3>
        {productionHistory.length === 0 ? (
          <p className="text-dark-400 text-center py-8">{t('noProductionHistory')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('date')}</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('product')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('quantity')}</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium text-sm">{t('totalCost')}</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium text-sm">{t('notes')}</th>
                </tr>
              </thead>
              <tbody>
                {productionHistory.slice(0, 20).map((batch) => (
                  <tr key={batch.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                    <td className="py-3 px-4 text-dark-300">{batch.date}</td>
                    <td className="py-3 px-4 text-white font-medium">{batch.product_name}</td>
                    <td className="py-3 px-4 text-right text-violet-400 font-semibold">{batch.quantity_produced}</td>
                    <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(batch.total_cost)}</td>
                    <td className="py-3 px-4 text-dark-400 truncate max-w-[200px]">{batch.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-indigo-400 animate-spin" />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'profitloss': return renderProfitLoss();
      case 'stock': return renderStockAlerts();
      case 'sales': return renderSales();
      case 'expenses': return renderExpenses();
      case 'production': return renderProduction();
      default: return null;
    }
  };

  return (
    <div>
      <PageHeader
        title={t('reports')}
        subtitle={t('businessAnalytics')}
        icon={FileBarChart}
        gradient="from-indigo-500 to-blue-500"
        actions={
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-dark-800/50 border border-dark-700/50
                     text-dark-300 font-medium text-sm
                     hover:bg-dark-700 hover:text-white
                     transition-all duration-300"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {t('refresh')}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 p-1 bg-dark-800/30 rounded-xl w-fit">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Reports;
