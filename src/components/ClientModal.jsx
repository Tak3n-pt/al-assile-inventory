import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Save, Phone, Mail, MapPin, FileText, Tag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';

const NEW_CATEGORY_VALUE = '__new__';

const ClientModal = ({ isOpen, onClose, onSave, editItem, categories = [] }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    new_category_name: '',
    phone: '',
    email: '',
    address: '',
    balance: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        category_id: editItem.category_id || '',
        new_category_name: '',
        phone: editItem.phone || '',
        email: editItem.email || '',
        address: editItem.address || '',
        balance: editItem.balance || '',
        notes: editItem.notes || ''
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
        new_category_name: '',
        phone: '',
        email: '',
        address: '',
        balance: '',
        notes: ''
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
    if (formData.category_id === NEW_CATEGORY_VALUE && !formData.new_category_name.trim()) {
      newErrors.new_category_name = t('categoryNameRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const createNewCategory = formData.category_id === NEW_CATEGORY_VALUE;
      onSave({
        ...formData,
        category_id: createNewCategory ? null : formData.category_id || null,
        new_category_name: createNewCategory ? formData.new_category_name.trim() : '',
        balance: parseFloat(formData.balance) || 0,
      });
    }
  };

  if (!isOpen) return null;

  const categoryOptions = [
    { value: '', label: t('noCategory') },
    ...categories.map(category => ({
      value: category.id,
      label: category.name
    })),
    { value: NEW_CATEGORY_VALUE, label: t('createNewCategory') }
  ];

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editClient') : t('addNewClient')}
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
                {t('clientName')} *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Ahmed Benali"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.name ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('clientCategory')}
              </label>
              <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
                <div className="h-[46px] rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-dark-500" />
                </div>
                <CustomSelect
                  value={formData.category_id}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      category_id: value,
                      new_category_name: value === NEW_CATEGORY_VALUE ? prev.new_category_name : ''
                    }));
                    if (errors.new_category_name) {
                      setErrors(prev => ({ ...prev, new_category_name: '' }));
                    }
                  }}
                  options={categoryOptions}
                  placeholder={t('selectClientCategory')}
                />
              </div>
              {formData.category_id === NEW_CATEGORY_VALUE && (
                <div className="mt-3">
                  <input
                    type="text"
                    name="new_category_name"
                    value={formData.new_category_name}
                    onChange={handleChange}
                    placeholder={t('newCategoryName')}
                    className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                      errors.new_category_name ? 'border-red-500' : 'border-dark-700'
                    } text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors`}
                  />
                  {errors.new_category_name && (
                    <p className="mt-1 text-sm text-red-400">{errors.new_category_name}</p>
                  )}
                </div>
              )}
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g., 0555 123 456"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g., client@email.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border ${
                      errors.email ? 'border-red-500' : 'border-dark-700'
                    } text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors`}
                  />
                </div>
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
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-dark-500" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g., 123 Rue Didouche Mourad, Algiers"
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Initial Balance */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('initialBalance')}
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
                } text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors`}
              />
              {errors.balance && (
                <p className="mt-1 text-sm text-red-400">{errors.balance}</p>
              )}
              <p className="mt-1 text-xs text-dark-500">
                {t('amountOwed')}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('notes')}
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-dark-500" />
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder={t('additionalNotes')}
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                <Save size={18} />
                {editItem ? t('update') : t('addClient')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClientModal;
