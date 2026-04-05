import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog, Plus, Search, Edit2, Trash2, Phone, Briefcase,
  DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Play
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import EmployerModal from '../components/EmployerModal';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from '../components/CustomSelect';
import { useNotification } from '../contexts/NotificationContext';

const Employers = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [employers, setEmployers] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('employees');

  // Modal states
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);

  // Payroll generation modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1);

  const monthNames = [
    t('january'), t('february'), t('march'), t('april'), t('may'), t('june'),
    t('july'), t('august'), t('september'), t('october'), t('november'), t('december')
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employersRes, payrollRes, statsRes] = await Promise.all([
        window.api.employers.getAll(),
        window.api.payroll.getAll(),
        window.api.employers.getStats()
      ]);

      if (employersRes.success) setEmployers(employersRes.data);
      if (payrollRes.success) setPayroll(payrollRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Employer CRUD
  const handleSaveEmployer = async (data) => {
    try {
      if (editingEmployer) {
        const result = await window.api.employers.update(editingEmployer.id, data);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update employer');
        }
      } else {
        const result = await window.api.employers.add(data);
        if (!result.success) {
          throw new Error(result.error || 'Failed to add employer');
        }
      }
      setShowEmployerModal(false);
      setEditingEmployer(null);
      loadData();
    } catch (error) {
      console.error('Error saving employer:', error);
      alert(error.message || 'Error saving employer');
    }
  };

  const handleEditEmployer = (employer) => {
    setEditingEmployer(employer);
    setShowEmployerModal(true);
  };

  const handleDeleteEmployer = async (id) => {
    if (window.confirm(t('confirmDeleteEmployee'))) {
      try {
        const result = await window.api.employers.delete(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete employer');
        }
        loadData();
      } catch (error) {
        console.error('Error deleting employer:', error);
        alert(error.message || 'Error deleting employer');
      }
    }
  };

  // Payroll operations
  const handleGeneratePayroll = async () => {
    try {
      const result = await window.api.payroll.generate(generateYear, generateMonth);
      if (result.success) {
        showNotification(`Generated ${result.data.created} payroll records for ${monthNames[generateMonth - 1]} ${generateYear}`, 'success');
        setShowGenerateModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      alert(error.message || 'Error generating payroll');
    }
  };

  const handleMarkPaid = async (payrollId) => {
    try {
      const result = await window.api.payroll.markPaid(payrollId, new Date().toISOString().split('T')[0]);
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark payroll as paid');
      }
      loadData();
    } catch (error) {
      console.error('Error marking paid:', error);
      alert(error.message || 'Error marking payroll as paid');
    }
  };

  const handleDeletePayroll = async (id) => {
    if (window.confirm(t('confirmDeletePayroll'))) {
      try {
        const result = await window.api.payroll.delete(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete payroll record');
        }
        loadData();
      } catch (error) {
        console.error('Error deleting payroll:', error);
        alert(error.message || 'Error deleting payroll record');
      }
    }
  };

  // Filtering
  const filteredEmployers = employers.filter(employer => {
    const matchesSearch = employer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employer.role && employer.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (employer.phone && employer.phone.includes(searchQuery));
    const matchesStatus = !showActiveOnly || employer.status === 'active';
    return matchesSearch && matchesStatus;
  });

  const filteredPayroll = payroll.filter(p => {
    return p.employer_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingPayroll = payroll.filter(p => !p.paid);

  const statCards = [
    {
      label: t('totalEmployees'),
      value: stats?.total_employers || 0,
      icon: UserCog,
      color: 'from-indigo-500 to-purple-500'
    },
    {
      label: t('activeEmployees'),
      value: stats?.active_employers || 0,
      icon: CheckCircle,
      color: 'from-emerald-500 to-green-500'
    },
    {
      label: t('monthlySalaries'),
      value: `${(stats?.monthly_salary_total || 0).toLocaleString()} DZD`,
      icon: DollarSign,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      label: t('pendingPayments'),
      value: stats?.pending_payments || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  return (
    <div>
      <PageHeader
        title={t('employers')}
        subtitle={t('manageEmployees')}
        icon={UserCog}
        gradient="from-indigo-500 to-purple-500"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-dark-700 text-white font-medium text-sm
                       hover:bg-dark-600 transition-colors"
            >
              <Play size={18} />
              {t('generatePayroll')}
            </button>
            <button
              onClick={() => {
                setEditingEmployer(null);
                setShowEmployerModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-indigo-500 to-purple-500
                       text-white font-semibold text-sm
                       hover:shadow-lg hover:shadow-indigo-500/25
                       transition-all duration-300"
            >
              <Plus size={18} />
              {t('addEmployer')}
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-dark-800/50 rounded-2xl p-4 border border-dark-700/50"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-dark-400 text-xs">{stat.label}</p>
                <p className="text-white font-semibold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex bg-dark-800/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'employees'
                ? 'bg-indigo-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('employees')} ({employers.length})
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'payroll'
                ? 'bg-indigo-500 text-white'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            {t('payroll')} ({payroll.length})
            {pendingPayroll.length > 0 && (
              <span className="ml-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                {pendingPayroll.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={activeTab === 'employees' ? t('searchEmployees') : t('searchPayroll')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-indigo-500/50
                     transition-colors duration-200"
          />
        </div>

        {activeTab === 'employees' && (
          <button
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
              showActiveOnly
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white'
            }`}
          >
            <CheckCircle size={18} />
            {t('activeOnly')}
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'employees' ? (
          <motion.div
            key="employees"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredEmployers.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredEmployers.map((employer, index) => (
                  <motion.div
                    key={employer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-dark-800/50 rounded-2xl p-5 border border-dark-700/50 hover:border-dark-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {employer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold truncate">{employer.name}</h3>
                          <p className="text-dark-400 text-sm">
                            {employer.role || t('noRoleAssigned')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          employer.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-dark-600 text-dark-400'
                        }`}>
                          {employer.status}
                        </span>
                        <button
                          onClick={() => handleEditEmployer(employer)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployer(employer.id)}
                          className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {employer.phone && (
                        <div className="flex items-center gap-2 text-dark-400">
                          <Phone size={14} />
                          <span>{employer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-dark-400">
                        <Calendar size={14} />
                        <span>{t('hired')}: {new Date(employer.hire_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-700/50">
                      <div>
                        <p className="text-dark-500 text-xs">{t('monthlySalary')}</p>
                        <p className="text-white font-semibold">
                          {(employer.salary || 0).toLocaleString()} DZD
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-dark-500 text-xs">{t('pendingPayments')}</p>
                        <p className={`font-semibold ${
                          employer.pending_payments > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {employer.pending_payments || 0}
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
                  <UserCog className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">{t('noEmployeesYet')}</h3>
                <p className="text-dark-500 text-sm mb-6">{t('addTeamMembers')}</p>
                <button
                  onClick={() => {
                    setEditingEmployer(null);
                    setShowEmployerModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-dark-700 text-white font-medium text-sm
                           hover:bg-dark-600 transition-colors duration-200"
                >
                  <Plus size={18} />
                  {t('addFirstEmployee')}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="payroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredPayroll.length > 0 ? (
              <div className="bg-dark-800/30 rounded-2xl border border-dark-700/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">{t('period')}</th>
                      <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">{t('employee')}</th>
                      <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">{t('role')}</th>
                      <th className="text-right px-6 py-4 text-dark-400 font-medium text-sm">{t('amount')}</th>
                      <th className="text-center px-6 py-4 text-dark-400 font-medium text-sm">{t('status')}</th>
                      <th className="text-right px-6 py-4 text-dark-400 font-medium text-sm">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayroll.map((p) => (
                      <tr key={p.id} className="border-b border-dark-700/30 hover:bg-dark-800/30">
                        <td className="px-6 py-4 text-white">
                          {monthNames[p.month - 1]} {p.year}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{p.employer_name}</p>
                        </td>
                        <td className="px-6 py-4 text-dark-400">
                          {p.employer_role || '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-white font-semibold">
                          {p.amount.toLocaleString()} DZD
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            p.paid
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {p.paid ? t('paid') : t('pending')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!p.paid && (
                              <button
                                onClick={() => handleMarkPaid(p.id)}
                                className="p-2 rounded-lg text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                title={t('markAsPaid')}
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePayroll(p.id)}
                              className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                            bg-dark-800/30 border border-dark-700/30 border-dashed">
                <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
                  <DollarSign className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">{t('noPayrollRecords')}</h3>
                <p className="text-dark-500 text-sm mb-6">{t('generatePayrollForEmployees')}</p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-dark-700 text-white font-medium text-sm
                           hover:bg-dark-600 transition-colors duration-200"
                >
                  <Play size={18} />
                  {t('generatePayroll')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <EmployerModal
        isOpen={showEmployerModal}
        onClose={() => {
          setShowEmployerModal(false);
          setEditingEmployer(null);
        }}
        onSave={handleSaveEmployer}
        editItem={editingEmployer}
      />

      {/* Generate Payroll Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowGenerateModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{t('generatePayroll')}</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-dark-400 text-sm">
                  {t('payrollDescription')}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      {t('year')}
                    </label>
                    <CustomSelect
                      value={generateYear}
                      onChange={(val) => setGenerateYear(parseInt(val))}
                      options={[2024, 2025, 2026].map(year => ({ value: year, label: String(year) }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      {t('month')}
                    </label>
                    <CustomSelect
                      value={generateMonth}
                      onChange={(val) => setGenerateMonth(parseInt(val))}
                      options={monthNames.map((month, index) => ({ value: index + 1, label: month }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-dark-800/50 text-sm">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle size={16} />
                    <span>{t('payrollSkipWarning')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-5 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleGeneratePayroll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
                  >
                    <Play size={18} />
                    {t('generate')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Employers;
