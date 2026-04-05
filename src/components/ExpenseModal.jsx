import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';

const ExpenseModal = ({ isOpen, onClose, onSave, editItem, categories }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_period: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const recurringPeriods = [
    { value: 'daily', label: t('daily') },
    { value: 'weekly', label: t('weekly') },
    { value: 'monthly', label: t('monthly') },
    { value: 'quarterly', label: t('quarterly') },
    { value: 'yearly', label: t('yearly') },
  ];

  useEffect(() => {
    if (editItem) {
      setFormData({
        category_id: editItem.category_id || '',
        description: editItem.description || '',
        amount: editItem.amount || '',
        date: editItem.date || new Date().toISOString().split('T')[0],
        is_recurring: editItem.is_recurring === 1,
        recurring_period: editItem.recurring_period || '',
        notes: editItem.notes || ''
      });
    } else {
      setFormData({
        category_id: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurring_period: '',
        notes: ''
      });
    }
    setErrors({});
  }, [editItem, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.category_id) {
      newErrors.category_id = t('categoryRequired');
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('validAmountRequired');
    }
    if (!formData.date) {
      newErrors.date = t('dateRequired');
    }
    if (formData.is_recurring && !formData.recurring_period) {
      newErrors.recurring_period = t('selectRecurringPeriod');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: parseInt(formData.category_id),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-lg mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[85vh] flex flex-col"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editExpense') : t('addExpense')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('expenseCategory')} *
              </label>
              <CustomSelect
                value={formData.category_id}
                onChange={(val) => handleChange({ target: { name: 'category_id', value: val } })}
                options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                placeholder={t('selectCategory')}
                className="w-full"
              />
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-400">{errors.category_id}</p>
              )}
            </div>

            {/* Amount & Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('expenseAmount')} *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.amount ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-rose-500 transition-colors`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-400">{errors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('expenseDate')} *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.date ? 'border-red-500' : 'border-dark-700'
                  } text-white focus:outline-none focus:border-rose-500 transition-colors`}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-400">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('description')}
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="e.g., Monthly electricity bill"
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Recurring Expense Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_recurring"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-dark-800 border-dark-600 text-rose-500 focus:ring-rose-500 focus:ring-offset-dark-900"
              />
              <label htmlFor="is_recurring" className="text-sm font-medium text-dark-300">
                {t('isRecurring')}
              </label>
            </div>

            {/* Recurring Period (shown only if recurring) */}
            {formData.is_recurring && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('recurringPeriod')} *
                </label>
                <CustomSelect
                  value={formData.recurring_period}
                  onChange={(val) => handleChange({ target: { name: 'recurring_period', value: val } })}
                  options={recurringPeriods}
                  placeholder={t('selectPeriod')}
                  className="w-full"
                />
                {errors.recurring_period && (
                  <p className="mt-1 text-sm text-red-400">{errors.recurring_period}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={t('additionalNotes')}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all"
              >
                <Save size={18} />
                {editItem ? t('update') : t('save')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExpenseModal;
