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
import { useAuth } from '../contexts/AuthContext';
import useDataChanged from '../hooks/useDataChanged';

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
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditBusy, setAuditBusy] = useState(false);

  const runAudit = async () => {
    setAuditBusy(true);
    try {
      const r = await window.api.clients.audit();
      if (r.success) { setAuditData(r.data); setAuditOpen(true); }
    } finally { setAuditBusy(false); }
  };

  const repairOne = async (clientId) => {
    const r = await window.api.clients.repairBalance(clientId, user?.id);
    if (r.success) { await runAudit(); loadData(); }
    return r;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardResult, lowStockResult, debtorsResult] = await Promise.all([
        window.api.reports.getDashboardStats(),
        window.api.reports.getLowStockItems(),
        window.api.clients.getWithDebt()
      ]);

      if (dashboardResult.success) {
        setStats(dashboardResult.data);
      }
      if (lowStockResult.success) {
        setLowStockItems(lowStockResult.data);
      }
      if (debtorsResult.success) {
        setDebtors(debtorsResult.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Dashboard shows cross-domain metrics, so refresh on any mutation
  useDataChanged(['sales', 'clients', 'products', 'stock', 'expenses'], () => loadData());

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
          <div className="flex items-center gap-2">
            <button
              onClick={runAudit}
              disabled={auditBusy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-amber-500/10 border border-amber-500/25
                       text-amber-300 font-medium text-sm
                       hover:bg-amber-500/20 transition-all duration-300"
              title={t('balanceAudit')}
            >
              <AlertTriangle size={16} />
              {t('balanceAudit')}
            </button>
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
          </div>
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

          {debtors.length > 0 && (() => {
            const totalOwed = debtors.reduce((sum, d) => sum + Math.max(0, -(d.balance || 0)), 0);
            const daysSince = (iso) => {
              if (!iso) return null;
              const ms = Date.now() - new Date(iso).getTime();
              return Math.floor(ms / (1000 * 60 * 60 * 24));
            };
            // Human-friendly time phrasing — reads like a reminder, not a log line.
            const timeLabel = (days) => {
              if (days == null) return t('noActivityYet');
              if (days === 0) return t('activeToday');
              if (days < 7) return `${t('sinceLastVisit')}: ${days === 1 ? t('oneDay') : `${days} ${t('days')}`}`;
              if (days < 30) {
                const w = Math.floor(days / 7);
                return `${t('sinceLastVisit')}: ${w === 1 ? t('oneWeek') : `${w} ${t('weeks')}`}`;
              }
              const m = Math.floor(days / 30);
              return `${t('sinceLastVisit')}: ${m === 1 ? t('oneMonth') : `${m} ${t('months')}`}`;
            };
            const initials = (name) => (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            // Aging buckets — tier each debtor so the shopkeeper sees which ones
            // need action today versus which are routine. null activity = treat
            // as cold (we can't tell, assume the worst).
            const tierOf = (days) => {
              if (days == null || days >= 90) return 'collection';
              if (days >= 30) return 'cold';
              if (days >= 7)  return 'followup';
              return 'fresh';
            };
            const tierMeta = {
              fresh:      { color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  label: t('tierFresh') },
              followup:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  label: t('tierFollowUp') },
              cold:       { color: '#fb923c', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.35)', label: t('tierCold') },
              collection: { color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',  label: t('tierCollection') },
            };
            const buckets = { fresh: 0, followup: 0, cold: 0, collection: 0 };
            for (const d of debtors) buckets[tierOf(daysSince(d.last_activity_at))]++;
            const top = debtors.slice(0, 5);
            return (
              <div className="rounded-2xl overflow-hidden"
                   style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.06))', border: '1px solid rgba(245,158,11,0.25)' }}
                   dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Header: big total with clear call to attention */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                       style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <Wallet className="w-7 h-7" style={{ color: '#fbbf24' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                      {t('debtsToCollect')}
                    </p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color: '#fbbf24' }} dir="ltr">
                      {formatCurrency(totalOwed)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#a16207' }}>
                      {debtors.length === 1
                        ? t('fromOneClient')
                        : `${t('fromNClientsPrefix')} ${debtors.length} ${t('fromNClientsSuffix')}`}
                    </p>
                  </div>
                  <Link
                    to="/clients?filter=debtors"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
                  >
                    {t('reviewAll')}
                    <ArrowRight size={16} style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />
                  </Link>
                </div>

                {/* Aging-bucket summary — one-glance health check across the whole
                    debtor pool. Only tiers with count > 0 show, so the strip
                    stays calm when things are calm. */}
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {['fresh', 'followup', 'cold', 'collection'].map(tier => {
                    const n = buckets[tier];
                    if (!n) return null;
                    const m = tierMeta[tier];
                    return (
                      <div
                        key={tier}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                        <span dir="ltr">{n}</span>
                        <span>{m.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Debtor cards — bigger, glanceable, each tappable */}
                <div className="px-3 pb-3 pt-1 grid gap-2">
                  {top.map(d => {
                    const owed = Math.max(0, -(d.balance || 0));
                    const days = daysSince(d.last_activity_at);
                    const tier = tierOf(days);
                    const m = tierMeta[tier];
                    return (
                      <Link
                        key={d.id}
                        to={`/clients?open=${d.id}`}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${m.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        {/* Avatar with tier-colored ring */}
                        <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                             style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                          {initials(d.name)}
                        </div>
                        {/* Name + tier pill + time */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-white truncate">{d.name}</p>
                            {d.credit_blocked ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                {t('cashOnly')}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs" style={{ color: m.color, opacity: 0.9 }}>
                            {timeLabel(days)}
                          </p>
                        </div>
                        {/* Amount — LTR direction so digits read naturally in Arabic */}
                        <p className="text-base font-bold flex-shrink-0" style={{ color: m.color }} dir="ltr">
                          {formatCurrency(owed)}
                        </p>
                      </Link>
                    );
                  })}
                </div>

                {/* Subtle hint at the bottom of card */}
                <p className="text-[11px] text-center pb-3" style={{ color: '#a16207' }}>
                  {t('tapAnyClientForDetails')}
                </p>
              </div>
            );
          })()}

          {!stock?.low_stock_count && !outstanding?.pendingPayrollCount && debtors.length === 0 && (
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

      {/* Audit modal — lists drifts and lets admin one-click repair */}
      {auditOpen && auditData && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-6"
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
                  <h2 className="text-lg font-bold text-white">{t('balanceAudit')}</h2>
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
              {auditData.drifts.length === 0 ? (
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
                      {user?.role === 'admin' ? (
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
        </div>
      )}
    </div>
  );
};

export default Dashboard;
