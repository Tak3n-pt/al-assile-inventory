import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SupplierModal = ({ isOpen, onClose, onSave, editItem }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    balance: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        phone: editItem.phone || '',
        email: editItem.email || '',
        address: editItem.address || '',
        notes: editItem.notes || '',
        balance: editItem.balance || ''
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        balance: ''
      });
    }
    setErrors({});
  }, [editItem, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('invalidEmailFormat');
    }
    if (formData.balance && isNaN(parseFloat(formData.balance))) {
      newErrors.balance = t('mustBeValidNumber');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        balance: parseFloat(formData.balance) || 0,
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editSupplier') : t('addSupplier')}
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
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('supplierName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Dates Farm Algeria"
                className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                  errors.name ? 'border-red-500' : 'border-dark-700'
                } text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('phone')}
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+213 XXX XXX XXX"
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('email')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="supplier@email.com"
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.email ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('address')}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full address"
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Balance */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('currentBalance')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                placeholder="0.00"
                className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                  errors.balance ? 'border-red-500' : 'border-dark-700'
                } text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors`}
              />
              {errors.balance && (
                <p className="mt-1 text-sm text-red-400">{errors.balance}</p>
              )}
              <p className="mt-1 text-xs text-dark-500">
                {t('youOweSupplier')}
              </p>
            </div>

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
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
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

export default SupplierModal;
