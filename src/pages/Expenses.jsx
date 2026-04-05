import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, Filter, Edit2, Trash2,
  TrendingUp, Calendar, RefreshCw, AlertTriangle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ExpenseModal from '../components/ExpenseModal';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from '../components/CustomSelect';

const Expenses = () => {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    total_amount: 0,
    month_count: 0,
    month_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesRes, categoriesRes, statsRes] = await Promise.all([
        window.api.expenses.getAll(),
        window.api.expenseCategories.getAll(),
        window.api.expenses.getStats()
      ]);

      if (expensesRes.success) setExpenses(expensesRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        const result = await window.api.expenses.update(editingExpense.id, data);
        if (result.success) {
          await loadData();
          setIsModalOpen(false);
          setEditingExpense(null);
        } else {
          throw new Error(result.error || 'Failed to update expense');
        }
      } else {
        const result = await window.api.expenses.add(data);
        if (result.success) {
          await loadData();
          setIsModalOpen(false);
        } else {
          throw new Error(result.error || 'Failed to add expense');
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert(error.message || 'Error saving expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      const result = await window.api.expenses.delete(id);
      if (result.success) {
        await loadData();
        setDeleteConfirm(null);
      } else {
        throw new Error(result.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert(error.message || 'Error deleting expense');
    }
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DZD';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchQuery === '' ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === '' ||
      expense.category_id === parseInt(selectedCategory);

    const matchesRecurring = !showRecurringOnly || expense.is_recurring === 1;

    return matchesSearch && matchesCategory && matchesRecurring;
  });

  const StatCard = ({ title, value, subValue, icon: Icon, gradient }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-dark-800/50 border border-dark-700/50 p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-dark-500 text-sm mt-1">{subValue}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('expenses')}
        subtitle={t('trackExpenses')}
        icon={Receipt}
        gradient="from-rose-500 to-pink-500"
        actions={
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-rose-500 to-pink-500
                     text-white font-semibold text-sm
                     hover:shadow-lg hover:shadow-rose-500/25
                     transition-all duration-300"
          >
            <Plus size={18} />
            {t('addExpense')}
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('totalExpenses')}
          value={stats.total_count}
          subValue={formatCurrency(stats.total_amount)}
          icon={Receipt}
          gradient="from-rose-500 to-pink-500"
        />
        <StatCard
          title={t('thisMonth')}
          value={stats.month_count}
          subValue={formatCurrency(stats.month_amount)}
          icon={Calendar}
          gradient="from-purple-500 to-indigo-500"
        />
        <StatCard
          title={t('averageExpense')}
          value={stats.total_count > 0 ? formatCurrency(stats.total_amount / stats.total_count) : '0 DZD'}
          icon={TrendingUp}
          gradient="from-amber-500 to-orange-500"
        />
        <StatCard
          title={t('categories')}
          value={categories.length}
          icon={Filter}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            placeholder={t('searchExpenses')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800/50 border border-dark-700/50
                     text-white placeholder-dark-500 focus:outline-none focus:border-rose-500/50
                     transition-colors duration-200"
          />
        </div>
        <CustomSelect
          value={selectedCategory}
          onChange={(val) => setSelectedCategory(val)}
          options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
          placeholder={t('allCategories')}
        />
        <button
          onClick={() => setShowRecurringOnly(!showRecurringOnly)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl
                   border transition-all duration-200 ${
            showRecurringOnly
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
              : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-white hover:border-dark-600'
          }`}
        >
          <RefreshCw size={18} />
          {t('recurring')}
        </button>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length > 0 ? (
        <div className="bg-dark-800/30 rounded-2xl border border-dark-700/30 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="text-left py-4 px-6 text-dark-400 font-medium text-sm">{t('date')}</th>
                <th className="text-left py-4 px-6 text-dark-400 font-medium text-sm">{t('category')}</th>
                <th className="text-left py-4 px-6 text-dark-400 font-medium text-sm">{t('description')}</th>
                <th className="text-right py-4 px-6 text-dark-400 font-medium text-sm">{t('amount')}</th>
                <th className="text-center py-4 px-6 text-dark-400 font-medium text-sm">{t('recurring')}</th>
                <th className="text-right py-4 px-6 text-dark-400 font-medium text-sm">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense, index) => (
                <motion.tr
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-dark-700/30 hover:bg-dark-700/20 transition-colors"
                >
                  <td className="py-4 px-6">
                    <span className="text-white text-sm">{formatDate(expense.date)}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-sm">
                      {expense.category_name || t('uncategorized')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-white text-sm truncate">{expense.description || '-'}</p>
                      {expense.notes && (
                        <p className="text-dark-500 text-xs mt-1">{expense.notes}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-white font-medium">{formatCurrency(expense.amount)}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {expense.is_recurring === 1 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                        <RefreshCw size={14} />
                        {expense.recurring_period}
                      </span>
                    ) : (
                      <span className="text-dark-600">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(expense)}
                        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(expense)}
                        className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl
                      bg-dark-800/30 border border-dark-700/30 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-300 mb-2">
            {searchQuery || selectedCategory || showRecurringOnly
              ? t('noExpensesMatch')
              : t('noExpensesYet')}
          </h3>
          <p className="text-dark-500 text-sm mb-6">
            {searchQuery || selectedCategory || showRecurringOnly
              ? t('tryAdjustingSearch')
              : t('startTrackingExpenses')}
          </p>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-dark-700 text-white font-medium text-sm
                     hover:bg-dark-600 transition-colors duration-200"
          >
            <Plus size={18} />
            {t('recordExpense')}
          </button>
        </div>
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editItem={editingExpense}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              className="relative z-10 w-full max-w-md mx-4 bg-dark-900 rounded-2xl border border-dark-700 p-6 max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('deleteExpense')}</h3>
                  <p className="text-dark-400 text-sm">{t('cannotBeUndone')}</p>
                </div>
              </div>
              <p className="text-dark-300 mb-6">
                {t('areYouSureDelete')}{' '}
                <span className="text-white font-medium">{formatCurrency(deleteConfirm.amount)}</span>
                {deleteConfirm.description && (
                  <> - <span className="text-white font-medium">{deleteConfirm.description}</span></>
                )}?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleDeleteExpense(deleteConfirm.id)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
