import React, { forwardRef } from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

const ProductSheetTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    product = {},
    recipe = []
  } = data;

  const stockStatus = () => {
    const qty = product.quantity || 0;
    const minAlert = product.min_stock_alert || 0;
    if (qty <= 0) return { label: 'Rupture de stock', labelAr: 'نفاد المخزون', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (qty <= minAlert) return { label: 'Stock faible', labelAr: 'مخزون منخفض', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: 'En stock', labelAr: 'متوفر', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  const status = stockStatus();
  const margin = product.selling_price && product.purchase_price
    ? product.selling_price - product.purchase_price
    : null;
  const marginPct = margin !== null && product.purchase_price > 0
    ? ((margin / product.purchase_price) * 100).toFixed(1)
    : null;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-emerald-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-emerald-700 mb-2">
            {settings?.business_name_fr || 'Société des Dattes Algériennes'}
          </h1>
          <p className="text-lg text-gray-600 mb-3" dir="rtl">
            {settings?.business_name || 'شركة التمور الجزائرية'}
          </p>
          {settings?.business_address && (
            <p className="text-gray-600 text-sm">{settings.business_address}</p>
          )}
          {settings?.business_phone && (
            <p className="text-gray-600 text-sm">Tél: {settings.business_phone}</p>
          )}
          {settings?.business_email && (
            <p className="text-gray-600 text-sm">Email: {settings.business_email}</p>
          )}
        </div>

        {/* Document Title */}
        <div className="text-right">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">FICHE PRODUIT</h2>
            <p className="text-emerald-100 text-sm">بطاقة المنتج</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">Généré le:</p>
            <p className="font-semibold">{new Date().toLocaleDateString('fr-DZ')}</p>
          </div>
        </div>
      </div>

      {/* Legal Info */}
      <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg text-xs">
        {settings?.business_nif && (
          <div>
            <span className="text-gray-500">NIF:</span>
            <span className="font-mono ml-1">{settings.business_nif}</span>
          </div>
        )}
        {settings?.business_rc && (
          <div>
            <span className="text-gray-500">RC:</span>
            <span className="font-mono ml-1">{settings.business_rc}</span>
          </div>
        )}
        {settings?.business_ai && (
          <div>
            <span className="text-gray-500">AI:</span>
            <span className="font-mono ml-1">{settings.business_ai}</span>
          </div>
        )}
        {settings?.business_nis && (
          <div>
            <span className="text-gray-500">NIS:</span>
            <span className="font-mono ml-1">{settings.business_nis}</span>
          </div>
        )}
      </div>

      {/* Product Identity */}
      <div className="mb-6 border border-emerald-200 rounded-lg overflow-hidden">
        <div className="bg-emerald-600 px-4 py-2">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
            Identification du produit / تعريف المنتج
          </h3>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-emerald-800 mb-1">
                {product.name || 'Produit'}
              </h2>
              {product.description && (
                <p className="text-gray-600 mt-2 leading-relaxed">{product.description}</p>
              )}
            </div>
            {/* Stock Status Badge */}
            <div className={`border ${status.border} ${status.bg} px-4 py-2 rounded-lg text-center min-w-24`}>
              <p className={`font-bold text-sm ${status.color}`}>{status.label}</p>
              <p className={`text-xs ${status.color}`} dir="rtl">{status.labelAr}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Unité de mesure</p>
              <p className="font-semibold text-gray-800">{product.unit || 'pcs'}</p>
            </div>
            {product.barcode && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Code-barres</p>
                <p className="font-mono text-gray-800 text-xs">{product.barcode}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="font-semibold text-gray-800">
                {product.is_resale ? 'Revente' : 'Fabrication'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Tarification / التسعير
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-0 divide-x divide-gray-200">
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Prix de vente HT</p>
            <p className="text-xs text-gray-400 mb-2">سعر البيع</p>
            <p className="text-xl font-bold text-emerald-700 font-mono">
              {formatCurrency(product.selling_price)} DA
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">
              {product.is_resale ? "Prix d'achat" : 'Coût de revient'}
            </p>
            <p className="text-xs text-gray-400 mb-2">
              {product.is_resale ? 'سعر الشراء' : 'تكلفة الإنتاج'}
            </p>
            <p className="text-xl font-bold text-gray-700 font-mono">
              {formatCurrency(product.purchase_price)} DA
            </p>
          </div>
          {margin !== null && (
            <div className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Marge brute</p>
              <p className="text-xs text-gray-400 mb-2">هامش الربح</p>
              <p
                className={`text-xl font-bold font-mono ${
                  margin >= 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {formatCurrency(margin)} DA
              </p>
              {marginPct && (
                <p className={`text-xs mt-1 ${margin >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  ({margin >= 0 ? '+' : ''}{marginPct}%)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock Info */}
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            État du stock / حالة المخزون
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Quantité disponible</p>
            <p className="text-2xl font-bold text-gray-800">
              {product.quantity || 0}
              <span className="text-sm font-normal text-gray-500 ml-1">{product.unit || 'pcs'}</span>
            </p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Seuil d'alerte</p>
            <p className="text-2xl font-bold text-orange-600">
              {product.min_stock_alert || 0}
              <span className="text-sm font-normal text-orange-400 ml-1">{product.unit || 'pcs'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recipe / Ingredients - only for manufactured products */}
      {!product.is_resale && recipe.length > 0 && (
        <div className="mb-6">
          <div className="border border-emerald-200 rounded-lg overflow-hidden">
            <div className="bg-emerald-600 px-4 py-2">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
                Recette / Ingrédients — المكونات
              </h3>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-emerald-50">
                  <th className="py-2 px-4 text-left text-xs font-semibold uppercase text-emerald-700 w-8">#</th>
                  <th className="py-2 px-4 text-left text-xs font-semibold uppercase text-emerald-700">Ingrédient</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold uppercase text-emerald-700 w-32">Quantité nécessaire</th>
                  <th className="py-2 px-4 text-center text-xs font-semibold uppercase text-emerald-700 w-20">Unité</th>
                </tr>
              </thead>
              <tbody>
                {recipe.map((ingredient, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-100 text-center text-gray-500">
                      {index + 1}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 font-medium">
                      {ingredient.stock_name || ingredient.name}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 text-center font-mono font-semibold">
                      {ingredient.quantity_needed}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 text-center text-gray-600">
                      {ingredient.unit || 'pcs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-8">
        <div className="border-t border-gray-300 pt-4 flex justify-between items-end">
          <div className="text-xs text-gray-500">
            <p>Document généré le {new Date().toLocaleDateString('fr-DZ')}</p>
            <p>{settings?.business_name_fr || 'Al Assile'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-8">Signature et Cachet</p>
            <div className="w-40 h-1 border-b border-gray-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductSheetTemplate.displayName = 'ProductSheetTemplate';

export default ProductSheetTemplate;
