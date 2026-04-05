import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  AlertTriangle,
  Factory,
  Truck,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../contexts/LanguageContext';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' DZD';
};

const StatCard = ({ title, value, subtitle, icon: Icon, gradient, trend }) => (
  <motion.div
    className="relative overflow-hidden rounded-2xl bg-dark-800/50 border border-dark-700/50 p-6
               hover:border-dark-600/50 transition-all duration-300"
    whileHover={{ scale: 1.02, y: -4 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2`} />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </div>
        )}
      </div>
      <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
    </div>
  </motion.div>
);

const AlertCard = ({ title, count, description, icon: Icon, color, link }) => (
  <Link to={link}>
    <motion.div
      className={`flex items-center gap-4 p-4 rounded-xl bg-${color}-500/10 border border-${color}-500/20
                 hover:bg-${color}-500/20 transition-all cursor-pointer`}
      whileHover={{ x: 4 }}
    >
      <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold text-${color}-200`}>{title}</p>
        <p className={`text-xs text-${color}-300/70`}>{description}</p>
      </div>
      <span className={`text-2xl font-bold text-${color}-400`}>{count}</span>
      <ArrowRight className={`w-5 h-5 text-${color}-400`} />
    </motion.div>
  </Link>
);

const Dashboard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardResult, lowStockResult] = await Promise.all([
        window.api.reports.getDashboardStats(),
        window.api.reports.getLowStockItems()
      ]);

      if (dashboardResult.success) {
        setStats(dashboardResult.data);
      }
      if (lowStockResult.success) {
        setLowStockItems(lowStockResult.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title={t('dashboard')}
          subtitle={t('welcomeBack')}
          icon={LayoutDashboard}
          gradient="from-blue-500 to-cyan-500"
        />
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  const { stock, sales, expenses, production, outstanding, monthProfit } = stats || {};

  return (
    <div>
      <PageHeader
        title={t('dashboard')}
        subtitle={t('welcomeBack')}
        icon={LayoutDashboard}
        gradient="from-blue-500 to-cyan-500"
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-dark-800/50 border border-dark-700/50
                     text-dark-300 font-medium text-sm
                     hover:bg-dark-700 hover:text-white
                     transition-all duration-300"
          >
            <RefreshCw size={18} />
            {t('refresh')}
          </button>
        }
      />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard
            title={t('monthRevenue')}
            value={formatCurrency(sales?.total_sales)}
            subtitle={`${sales?.sale_count || 0} ${t('salesThisMonth')}`}
            icon={TrendingUp}
            gradient="from-emerald-500 to-teal-500"
            trend={1}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            title={t('monthExpenses')}
            value={formatCurrency(expenses?.total_expenses)}
            subtitle={`${expenses?.expense_count || 0} ${t('expensesCount')}`}
            icon={Wallet}
            gradient="from-red-500 to-orange-500"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard
            title={t('netProfit')}
            value={formatCurrency(monthProfit)}
            subtitle={t('thisMonth')}
            icon={DollarSign}
            gradient={monthProfit >= 0 ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-pink-500'}
            trend={monthProfit}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatCard
            title={t('stockValue')}
            value={formatCurrency(stock?.total_value)}
            subtitle={`${stock?.total_items || 0} ${t('itemsInStock')}`}
            icon={Package}
            gradient="from-violet-500 to-purple-500"
          />
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <StatCard
            title={t('production')}
            value={production?.total_produced || 0}
            subtitle={`${production?.batch_count || 0} ${t('batchesThisMonth')}`}
            icon={Factory}
            gradient="from-indigo-500 to-purple-500"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <StatCard
            title={t('receivable')}
            value={formatCurrency(outstanding?.fromClients)}
            subtitle={t('fromClients')}
            icon={Users}
            gradient="from-cyan-500 to-blue-500"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <StatCard
            title={t('payable')}
            value={formatCurrency(outstanding?.toSuppliers)}
            subtitle={t('toSuppliers')}
            icon={Truck}
            gradient="from-amber-500 to-orange-500"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <StatCard
            title={t('pendingPayroll')}
            value={formatCurrency(outstanding?.pendingPayroll)}
            subtitle={`${outstanding?.pendingPayrollCount || 0} ${t('pending')}`}
            icon={Users}
            gradient="from-pink-500 to-rose-500"
          />
        </motion.div>
      </div>

      {/* Alerts Section */}
      <motion.div
        className="rounded-2xl bg-dark-800/50 border border-dark-700/50 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4">{t('alertsNotifications')}</h2>
        <div className="space-y-3">
          {(stock?.low_stock_count > 0 || lowStockItems.length > 0) && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-200">{t('lowStockAlert')}</p>
                <p className="text-xs text-amber-300/70">
                  {lowStockItems.length} {t('itemsBelowMin')}
                </p>
              </div>
              <Link
                to="/reports"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
              >
                {t('viewDetails')}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {outstanding?.pendingPayrollCount > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-pink-200">{t('pendingPayrollAlert')}</p>
                <p className="text-xs text-pink-300/70">
                  {outstanding.pendingPayrollCount} {t('salaryPaymentsPending')}
                </p>
              </div>
              <Link
                to="/employers"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500/20 text-pink-400 text-sm font-medium hover:bg-pink-500/30 transition-colors"
              >
                {t('processPayroll')}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {outstanding?.fromClients > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-cyan-200">{t('outstandingPayments')}</p>
                <p className="text-xs text-cyan-300/70">
                  {formatCurrency(outstanding.fromClients)} {t('pendingFromClients')}
                </p>
              </div>
              <Link
                to="/clients"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition-colors"
              >
                {t('viewClients')}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {!stock?.low_stock_count && !outstanding?.pendingPayrollCount && !outstanding?.fromClients && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-200">{t('allGood')}</p>
                <p className="text-xs text-emerald-300/70">
                  {t('noAlerts')}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
