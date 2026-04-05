import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Save, Plus, Trash2, ImagePlus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from './CustomSelect';

// Unit conversion utilities
const unitConversions = {
  // Weight conversions (base: kg)
  kg: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  // Volume conversions (base: L)
  L: { base: 'L', factor: 1 },
  ml: { base: 'L', factor: 0.001 },
  // Individual units (no conversion)
  pcs: { base: 'pcs', factor: 1 },
  box: { base: 'box', factor: 1 },
  pack: { base: 'pack', factor: 1 },
  bottle: { base: 'bottle', factor: 1 },
};

// Get compatible units for a given unit
const getCompatibleUnits = (stockUnit) => {
  if (!stockUnit) return [];
  const baseUnit = unitConversions[stockUnit]?.base;
  if (!baseUnit) return [stockUnit];

  // Return all units with the same base
  return Object.entries(unitConversions)
    .filter(([_, info]) => info.base === baseUnit)
    .map(([unit, _]) => unit);
};

// Convert quantity from one unit to another
const convertUnit = (quantity, fromUnit, toUnit) => {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return quantity;

  const fromInfo = unitConversions[fromUnit];
  const toInfo = unitConversions[toUnit];

  if (!fromInfo || !toInfo || fromInfo.base !== toInfo.base) {
    // Units are not compatible, return as-is
    return quantity;
  }

  // Convert: fromUnit -> base -> toUnit
  const baseValue = quantity * fromInfo.factor;
  return baseValue / toInfo.factor;
};

const ProductModal = ({ isOpen, onClose, onSave, editItem, stockItems }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selling_price: '',
    manual_cost: '',
    unit: 'pcs',
    is_resale: false,
    purchase_price: '',
    image_path: ''
  });
  const [imagePreview, setImagePreview] = useState(null);

  const [recipe, setRecipe] = useState([]);
  const [errors, setErrors] = useState({});

  const units = [
    { value: 'pcs', label: t('unitPieces') },
    { value: 'kg', label: t('unitKilogram') },
    { value: 'box', label: t('unitBox') },
    { value: 'pack', label: t('unitPack') },
  ];

  // All available ingredient units
  const ingredientUnits = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'L', label: 'L' },
    { value: 'ml', label: 'ml' },
    { value: 'pcs', label: 'pcs' },
    { value: 'box', label: 'box' },
    { value: 'pack', label: 'pack' },
    { value: 'bottle', label: 'bottle' },
  ];

  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name || '',
        description: editItem.description || '',
        selling_price: editItem.selling_price || '',
        manual_cost: editItem.manual_cost || '',
        unit: editItem.unit || 'pcs',
        is_resale: editItem.is_resale === 1 || editItem.is_resale === true,
        purchase_price: editItem.purchase_price || '',
        image_path: editItem.image_path || ''
      });
      // Load image preview
      if (editItem.image_path) {
        window.api.products.getImagePath(editItem.image_path).then(res => {
          if (res?.success && res.data) {
            setImagePreview(res.data);
          } else {
            setImagePreview(null);
          }
        });
      } else {
        setImagePreview(null);
      }
      // Load existing recipe only if not a resale product
      if (!editItem.is_resale) {
        loadRecipe(editItem.id);
      } else {
        setRecipe([]);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        selling_price: '',
        manual_cost: '',
        unit: 'pcs',
        is_resale: false,
        purchase_price: '',
        image_path: ''
      });
      setImagePreview(null);
      setRecipe([]);
    }
    setErrors({});
  }, [editItem, isOpen]);

  const loadRecipe = async (productId) => {
    try {
      const result = await window.api.products.getRecipe(productId);
      if (result.success) {
        setRecipe(result.data.map(item => ({
          stock_item_id: item.stock_item_id,
          quantity_needed: item.quantity_needed,
          unit: item.unit || item.stock_unit, // Use saved unit or default to stock unit
          stock_name: item.stock_name,
          stock_unit: item.stock_unit
        })));
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const [openIngredientDropdown, setOpenIngredientDropdown] = useState(null); // index of open dropdown

  const addRecipeItem = () => {
    setRecipe(prev => [...prev, { stock_item_id: '', quantity_needed: '', unit: '' }]);
  };

  const updateRecipeItem = (index, field, value) => {
    setRecipe(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If stock item changed, update the display info and set default unit
      if (field === 'stock_item_id') {
        const stockItem = stockItems.find(s => s.id === parseInt(value));
        if (stockItem) {
          updated[index].stock_name = stockItem.name;
          updated[index].stock_unit = stockItem.unit;
          // Default to stock item's unit
          updated[index].unit = stockItem.unit;
        }
      }
      return updated;
    });
  };

  const removeRecipeItem = (index) => {
    setRecipe(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectImage = async () => {
    const productId = editItem?.id || Date.now();
    const result = await window.api.products.selectImage(productId);
    if (result?.success && result.data) {
      // Delete the previously selected NEW image (not the original one from DB)
      // Only delete if it's a new image we just uploaded (different from what's in DB)
      const originalImage = editItem?.image_path || '';
      if (formData.image_path && formData.image_path !== originalImage) {
        await window.api.products.deleteImage(formData.image_path);
      }
      setFormData(prev => ({ ...prev, image_path: result.data.fileName }));
      // Get data URL for preview
      const imgRes = await window.api.products.getImagePath(result.data.fileName);
      if (imgRes?.success && imgRes.data) {
        setImagePreview(imgRes.data);
      }
    } else if (result?.error) {
      console.error('Image selection error:', result.error);
    }
  };

  const handleRemoveImage = () => {
    // Don't delete file here — just clear the preview.
    // Old image cleanup happens when product is saved with new/empty image_path.
    setFormData(prev => ({ ...prev, image_path: '' }));
    setImagePreview(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }
    if (formData.selling_price && isNaN(parseFloat(formData.selling_price))) {
      newErrors.selling_price = t('mustBeValidNumber');
    }
    if (formData.manual_cost && isNaN(parseFloat(formData.manual_cost))) {
      newErrors.manual_cost = t('mustBeValidNumber');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Filter out empty recipe items and include unit (only for non-resale products)
      const validRecipe = formData.is_resale ? [] : recipe.filter(item =>
        item.stock_item_id && item.quantity_needed
      ).map(item => ({
        stock_item_id: parseInt(item.stock_item_id),
        quantity_needed: parseFloat(item.quantity_needed),
        unit: item.unit || item.stock_unit // Include the selected unit
      }));

      onSave({
        product: {
          ...formData,
          selling_price: parseFloat(formData.selling_price) || 0,
          manual_cost: formData.manual_cost ? parseFloat(formData.manual_cost) : null,
          is_resale: formData.is_resale ? 1 : 0,
          purchase_price: formData.is_resale ? (parseFloat(formData.purchase_price) || 0) : 0,
        },
        recipe: validRecipe
      });
    }
  };

  const calculateRecipeCost = () => {
    let total = 0;
    for (const item of recipe) {
      if (item.stock_item_id && item.quantity_needed) {
        const stockItem = stockItems.find(s => s.id === parseInt(item.stock_item_id));
        if (stockItem) {
          // Convert quantity to stock unit for cost calculation
          const quantityInStockUnit = convertUnit(
            parseFloat(item.quantity_needed || 0),
            item.unit || item.stock_unit,
            stockItem.unit
          );
          total += (stockItem.cost_per_unit || 0) * quantityInStockUnit;
        }
      }
    }
    return total;
  };

  if (!isOpen) return null;

  const recipeCost = calculateRecipeCost();

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {editItem ? t('editProduct') : t('createProductTitle')}
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
            {/* Product Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">{t('productDetails')}</h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('productName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Date Chocolate Bar"
                  className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                    errors.name ? 'border-red-500' : 'border-dark-700'
                  } text-white placeholder-dark-500 focus:outline-none focus:border-violet-500 transition-colors`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('description')}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  {t('productImage') || 'Product Image'}
                </label>
                <div className="flex items-start gap-5">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-dark-700 shadow-lg group">
                      <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-dark-900/80 text-dark-400 hover:text-red-400 hover:bg-dark-900 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-xl border-2 border-dark-700 border-dashed flex flex-col items-center justify-center bg-dark-800/30 gap-2">
                      <Package className="w-10 h-10 text-dark-600" />
                      <span className="text-dark-500 text-xs">{t('noImage') || 'No image'}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSelectImage}
                      className="px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600 transition-colors flex items-center gap-2"
                    >
                      <ImagePlus size={16} />
                      {imagePreview ? (t('changeImage') || 'Change Image') : (t('selectImage') || 'Select Image')}
                    </button>
                    <p className="text-dark-500 text-xs">JPG, PNG, WebP (max 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Resale Product Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
                <div>
                  <p className="text-white font-medium">{t('resaleProduct') || 'Resale Product'}</p>
                  <p className="text-dark-400 text-sm">{t('resaleProductDesc') || 'Buy and sell directly without production'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, is_resale: !prev.is_resale }));
                    if (!formData.is_resale) {
                      setRecipe([]); // Clear recipe when switching to resale
                    }
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    formData.is_resale ? 'bg-emerald-500' : 'bg-dark-600'
                  }`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    formData.is_resale ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Price, Cost & Unit Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {t('sellingPriceDZD')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="selling_price"
                    value={formData.selling_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                      errors.selling_price ? 'border-red-500' : 'border-dark-700'
                    } text-white placeholder-dark-500 focus:outline-none focus:border-violet-500 transition-colors`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    {formData.is_resale
                      ? (t('purchasePriceDZD') || 'Purchase Price (DZD)')
                      : t('manualCostOptional')}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name={formData.is_resale ? 'purchase_price' : 'manual_cost'}
                    value={formData.is_resale ? formData.purchase_price : formData.manual_cost}
                    onChange={handleChange}
                    placeholder={formData.is_resale ? '0.00' : t('autoCalculate')}
                    className={`w-full px-4 py-3 rounded-xl bg-dark-800 border ${
                      formData.is_resale
                        ? (errors.purchase_price ? 'border-red-500' : 'border-dark-700')
                        : (errors.manual_cost ? 'border-red-500' : 'border-dark-700')
                    } text-white placeholder-dark-500 focus:outline-none focus:border-violet-500 transition-colors`}
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
            </div>

            {/* Recipe Section - Only show for non-resale products */}
            {!formData.is_resale && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider">{t('recipeIngredients')}</h3>
                  <button
                    type="button"
                    onClick={addRecipeItem}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 text-sm hover:bg-violet-500/20 transition-colors"
                  >
                    <Plus size={14} />
                    {t('addIngredient')}
                  </button>
                </div>

                {recipe.length > 0 ? (
                  <div className="space-y-2">
                    {recipe.map((item, index) => {
                      const compatibleUnits = getCompatibleUnits(item.stock_unit);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          {/* Custom ingredient dropdown (native select broken in frameless Electron) */}
                          <div className="flex-1 relative">
                            <button
                              type="button"
                              onClick={() => setOpenIngredientDropdown(openIngredientDropdown === index ? null : index)}
                              className="w-full px-3 py-2.5 rounded-xl border border-dark-700 text-left text-sm transition-colors"
                              style={{ backgroundColor: '#1e293b', color: item.stock_item_id ? '#fff' : '#94a3b8', borderColor: openIngredientDropdown === index ? '#8b5cf6' : '' }}
                            >
                              {item.stock_item_id
                                ? (() => { const s = stockItems.find(s => s.id === parseInt(item.stock_item_id)); return s ? `${s.name} (${s.quantity} ${s.unit})` : t('selectIngredientPlaceholder'); })()
                                : t('selectIngredientPlaceholder')
                              }
                            </button>
                            {openIngredientDropdown === index && (
                              <div
                                className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-dark-600 shadow-2xl overflow-y-auto"
                                style={{ backgroundColor: '#1e293b', maxHeight: '200px', zIndex: 100 }}
                              >
                                {stockItems.length === 0 ? (
                                  <div className="px-3 py-3 text-sm text-dark-400">{t('noStockItems') || 'No stock items'}</div>
                                ) : (
                                  stockItems.map(stock => (
                                    <button
                                      key={stock.id}
                                      type="button"
                                      onClick={() => {
                                        updateRecipeItem(index, 'stock_item_id', String(stock.id));
                                        setOpenIngredientDropdown(null);
                                      }}
                                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-dark-700 transition-colors flex items-center justify-between"
                                      style={{ color: parseInt(item.stock_item_id) === stock.id ? '#D4A574' : '#fff' }}
                                    >
                                      <span>{stock.name}</span>
                                      <span className="text-xs text-dark-400">{stock.quantity} {stock.unit}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          <div className="w-24">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.quantity_needed}
                              onChange={(e) => updateRecipeItem(index, 'quantity_needed', e.target.value)}
                              placeholder={t('qty')}
                              className="w-full px-3 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-white placeholder-dark-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                            />
                          </div>
                          <CustomSelect
                            value={item.unit || item.stock_unit || ''}
                            onChange={(val) => updateRecipeItem(index, 'unit', val)}
                            options={
                              compatibleUnits.length > 0
                                ? compatibleUnits.map(u => ({ value: u, label: u }))
                                : [{ value: '', label: item.stock_unit || '-' }]
                            }
                            disabled={!item.stock_item_id}
                            className="w-20"
                          />
                          <button
                            type="button"
                            onClick={() => removeRecipeItem(index)}
                            className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 rounded-xl bg-dark-800/30 border border-dark-700/50 border-dashed">
                    <p className="text-dark-500 text-sm">{t('noIngredientsYet')}</p>
                    <p className="text-dark-600 text-xs mt-1">{t('clickAddIngredientHint')}</p>
                  </div>
                )}

                {/* Cost Summary */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/50">
                  <div>
                    <p className="text-dark-400 text-sm">{t('calculatedIngredientCost')}</p>
                    <p className="text-white font-semibold">{recipeCost.toFixed(2)} DZD</p>
                  </div>
                  {formData.selling_price && recipeCost > 0 && (
                    <div className="text-right">
                      <p className="text-dark-400 text-sm">{t('profitMargin')}</p>
                      <p className={`font-semibold ${
                        parseFloat(formData.selling_price) > recipeCost ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {(parseFloat(formData.selling_price) - recipeCost).toFixed(2)} DZD
                        ({((parseFloat(formData.selling_price) - recipeCost) / recipeCost * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resale Product Info */}
            {formData.is_resale && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-400 font-medium">{t('resaleProductNote') || 'Resale Product'}</p>
                    <p className="text-dark-400 text-sm">{t('resaleProductInfo') || 'This product will be purchased and sold directly. Use "Add Stock" in the inventory page to add quantities.'}</p>
                  </div>
                </div>
                {formData.purchase_price && formData.selling_price && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20 flex justify-between">
                    <span className="text-dark-400 text-sm">{t('profitPerUnit') || 'Profit per unit'}:</span>
                    <span className={`font-medium ${
                      parseFloat(formData.selling_price) > parseFloat(formData.purchase_price)
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}>
                      {(parseFloat(formData.selling_price) - parseFloat(formData.purchase_price)).toFixed(2)} DZD
                      {parseFloat(formData.purchase_price) > 0 && (
                        <span className="text-dark-400 ml-1">
                          ({(((parseFloat(formData.selling_price) - parseFloat(formData.purchase_price)) / parseFloat(formData.purchase_price)) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              >
                <Save size={18} />
                {editItem ? t('update') : t('createProduct')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;
