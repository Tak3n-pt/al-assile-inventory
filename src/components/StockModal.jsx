import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';

const StockModal = ({ isOpen, onClose, onSave, editItem, categories, suppliers }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    quantity: '',
    unit: 'kg',
    cost_per_unit: '',
    min_stock_alert: '',
    supplier_id: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'L', label: 'Liter (L)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'box', label: 'Box' },
    { value: 'pack', label: 'Pack' },
    { value: 'bottle', label: 'Bottle' },
  ];

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        category_id: editItem.category_id || '',
        quantity: editItem.quantity || '',
        unit: editItem.unit || 'kg',
        cost_per_unit: editItem.cost_per_unit || '',
        min_stock_alert: editItem.min_stock_alert || '',
        supplier_id: editItem.supplier_id || '',
        notes: editItem.notes || ''
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
        quantity: '',
        unit: 'kg',
        cost_per_unit: '',
        min_stock_alert: '',
        supplier_id: '',
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
    if (formData.quantity && isNaN(parseFloat(formData.quantity))) {
      newErrors.quantity = t('mustBeValidNumber');
    }
    if (formData.cost_per_unit && isNaN(parseFloat(formData.cost_per_unit))) {
      newErrors.cost_per_unit = t('mustBeValidNumber');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        min_stock_alert: parseFloat(formData.min_stock_alert) || 0,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editStockItem') : t('addStockItem')}
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
                {t('itemName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Deglet Nour Dates"
                className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                  errors.name ? 'border-red-500' : 'border-dark-700'
                } text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Category & Unit Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('category')}
                </label>
                <CustomSelect
                  value={formData.category_id}
                  onChange={(val) => handleChange({ target: { name: 'category_id', value: val } })}
                  options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                  placeholder={t('selectCategory')}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('unit')}
                </label>
                <CustomSelect
                  value={formData.unit}
                  onChange={(val) => handleChange({ target: { name: 'unit', value: val } })}
                  options={units}
                  className="w-full"
                />
              </div>
            </div>

            {/* Quantity & Cost Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {editItem ? t('currentQuantity') : t('initialQuantity')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={!!editItem}
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.quantity ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors ${
                    editItem ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                {editItem && (
                  <p className="mt-1 text-xs text-dark-500">{t('useStockAdjustments')}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('costPerUnit')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="cost_per_unit"
                  value={formData.cost_per_unit}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.cost_per_unit ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors`}
                />
              </div>
            </div>

            {/* Min Stock Alert */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('lowStockAlertThreshold')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="min_stock_alert"
                value={formData.min_stock_alert}
                onChange={handleChange}
                placeholder={t('alertWhenBelow')}
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('supplier')}
              </label>
              <CustomSelect
                value={formData.supplier_id}
                onChange={(val) => handleChange({ target: { name: 'supplier_id', value: val } })}
                options={suppliers.map(sup => ({ value: sup.id, label: sup.name }))}
                placeholder={t('selectSupplier')}
                className="w-full"
              />
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
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
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

export default StockModal;
