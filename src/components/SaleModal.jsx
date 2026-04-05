import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Save, Plus, Trash2, DollarSign } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';

const SaleModal = ({ isOpen, onClose, onSave, editItem, clients, products }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    paid_amount: '',
    status: 'pending',
    notes: ''
  });

  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editItem) {
      setFormData({
        client_id: editItem.client_id || '',
        date: editItem.date || new Date().toISOString().split('T')[0],
        paid_amount: editItem.paid_amount || '',
        status: editItem.status || 'pending',
        notes: editItem.notes || ''
      });
      // Load existing items
      loadSaleItems(editItem.id);
    } else {
      setFormData({
        client_id: '',
        date: new Date().toISOString().split('T')[0],
        paid_amount: '',
        status: 'pending',
        notes: ''
      });
      setItems([]);
    }
    setErrors({});
  }, [editItem, isOpen]);

  const loadSaleItems = async (saleId) => {
    try {
      const result = await window.api.sales.getItems(saleId);
      if (result.success) {
        setItems(result.data.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name,
          product_unit: item.product_unit
        })));
      }
    } catch (error) {
      console.error('Error loading sale items:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { product_id: '', quantity: '', unit_price: '' }]);
  };

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If product changed, update the price
      if (field === 'product_id') {
        const product = products.find(p => p.id === parseInt(value));
        if (product) {
          updated[index].unit_price = product.selling_price;
          updated[index].product_name = product.name;
          updated[index].product_unit = product.unit;
        }
      }
      return updated;
    });
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      if (item.quantity && item.unit_price) {
        return total + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }
      return total;
    }, 0);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.client_id) {
      newErrors.client_id = t('pleaseSelectClient');
    }
    if (!formData.date) {
      newErrors.date = t('dateRequired');
    }
    if (items.length === 0) {
      newErrors.items = t('addAtLeastOneProduct');
    }
    const invalidItems = items.some(item => !item.product_id || !item.quantity || !item.unit_price);
    if (invalidItems) {
      newErrors.items = t('allItemsMustHaveDetails');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const total = calculateTotal();
      const paidAmount = parseFloat(formData.paid_amount) || 0;

      let status = formData.status;
      if (paidAmount >= total) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }

      const validItems = items.filter(item =>
        item.product_id && item.quantity && item.unit_price
      ).map(item => ({
        product_id: parseInt(item.product_id),
        quantity: parseFloat(item.quantity),
        unit_price: parseFloat(item.unit_price)
      }));

      onSave({
        sale: {
          ...formData,
          client_id: parseInt(formData.client_id),
          total: total,
          paid_amount: paidAmount,
          status: status,
        },
        items: validItems
      });
    }
  };

  if (!isOpen) return null;

  const total = calculateTotal();
  const paidAmount = parseFloat(formData.paid_amount) || 0;
  const remaining = total - paidAmount;

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
          className="relative z-10 w-full max-w-2xl mx-4 bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editSale') : t('newSale')}
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
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Sale Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">{t('saleDetails')}</h3>

              {/* Client & Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('client')} *
                  </label>
                  <CustomSelect
                    value={formData.client_id}
                    onChange={(val) => handleChange({ target: { name: 'client_id', value: val } })}
                    options={clients.map(client => ({
                      value: client.id,
                      label: client.name + (client.phone ? ` (${client.phone})` : '')
                    }))}
                    placeholder={t('selectClientPlaceholder')}
                    className="w-full"
                  />
                  {errors.client_id && (
                    <p className="mt-1 text-sm text-red-400">{errors.client_id}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('date')} *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                      errors.date ? 'border-red-500' : 'border-dark-700'
                    } text-white focus:outline-none focus:border-emerald-500 transition-colors`}
                  />
                </div>
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
                  placeholder={t('orderNotes')}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">{t('products')}</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
                >
                  <Plus size={14} />
                  {t('addProduct')}
                </button>
              </div>

              {errors.items && (
                <p className="text-sm text-red-400">{errors.items}</p>
              )}

              {items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CustomSelect
                        value={item.product_id}
                        onChange={(val) => updateItem(index, 'product_id', val)}
                        options={products.map(product => ({
                          value: product.id,
                          label: `${product.name} - ${product.selling_price} DZD/${product.unit}`
                        }))}
                        placeholder={t('selectProductPlaceholder')}
                        className="flex-1"
                      />
                      <div className="w-24">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder={t('qty')}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          placeholder={t('price')}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <span className="w-24 text-right text-dark-300">
                        {item.quantity && item.unit_price
                          ? (parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)
                          : '0.00'
                        } DZD
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-xl bg-dark-800/30 border border-dark-700/50 border-dashed">
                  <p className="text-dark-500 text-sm">{t('noProductsAdded')}</p>
                  <p className="text-dark-600 text-xs mt-1">{t('clickAddProduct')}</p>
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">{t('payment')}</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('amountPaidDZD')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      inputMode="decimal"
                      name="paid_amount"
                      value={formData.paid_amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="p-3 rounded-xl bg-dark-800/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">{t('total')}:</span>
                      <span className="text-white font-semibold">{total.toFixed(2)} DZD</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-dark-400">{t('remaining')}:</span>
                      <span className={`font-semibold ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {remaining.toFixed(2)} DZD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Display */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-400">{t('status')}:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  remaining <= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : paidAmount > 0
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {remaining <= 0 ? t('paid') : paidAmount > 0 ? t('partial') : t('pending')}
                </span>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <Save size={18} />
                {editItem ? t('update') : t('createSale')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaleModal;
