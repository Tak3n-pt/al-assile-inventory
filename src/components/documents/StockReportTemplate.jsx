import React from 'react';

const StockReportTemplate = ({ data, settings, language }) => {
  const isRTL = language === 'ar';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0) + ' DZD';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (item) => {
    if (item.quantity <= 0) return '#dc2626'; // Red - Out of stock
    if (item.quantity <= item.min_quantity) return '#f59e0b'; // Amber - Low stock
    return '#10b981'; // Green - OK
  };

  const getStatusText = (item) => {
    if (item.quantity <= 0) return { fr: 'Rupture', ar: 'نفاد' };
    if (item.quantity <= item.min_quantity) return { fr: 'Bas', ar: 'منخفض' };
    return { fr: 'OK', ar: 'جيد' };
  };

  // Calculate totals
  const totalValue = data?.items?.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0) || 0;
  const lowStockCount = data?.items?.filter(item => item.quantity <= item.min_quantity && item.quantity > 0).length || 0;
  const outOfStockCount = data?.items?.filter(item => item.quantity <= 0).length || 0;
  const totalItems = data?.items?.length || 0;

  // Group by category
  const categories = {};
  data?.items?.forEach(item => {
    const cat = item.category || 'Non classé';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(item);
  });

  return (
    <div className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-teal-600">
        <div>
          <h1 className="text-2xl font-bold text-teal-700 mb-2">
            RAPPORT DE STOCK
          </h1>
          <p className="text-gray-500 text-lg">تقرير المخزون</p>
          <p className="text-gray-500 text-sm mt-2">
            Date: {formatDate(data?.date || new Date().toISOString())}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{settings?.companyName || 'Entreprise'}</h2>
          <p className="text-gray-500 text-sm mt-1">{settings?.address}</p>
          <p className="text-gray-500 text-sm">{settings?.phone}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
          <p className="text-teal-700 text-sm font-medium">Total Articles / إجمالي المواد</p>
          <p className="text-2xl font-bold text-teal-800">{totalItems}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm font-medium">Valeur Totale / القيمة الإجمالية</p>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-amber-700 text-sm font-medium">Stock Bas / مخزون منخفض</p>
          <p className="text-2xl font-bold text-amber-800">{lowStockCount}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm font-medium">Rupture / نفاد المخزون</p>
          <p className="text-2xl font-bold text-red-800">{outOfStockCount}</p>
        </div>
      </div>

      {/* Stock Table by Category */}
      {Object.keys(categories).map((category, catIndex) => (
        <div key={category} className={catIndex > 0 ? 'mt-6' : ''}>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 px-2 py-1 bg-gray-100 rounded">
            {category}
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-teal-600 text-teal-700">
                <th className="text-left py-3 px-2 font-semibold">Article / المادة</th>
                <th className="text-center py-3 px-2 font-semibold">Unité / الوحدة</th>
                <th className="text-right py-3 px-2 font-semibold">Qté / الكمية</th>
                <th className="text-right py-3 px-2 font-semibold">Min / الحد الأدنى</th>
                <th className="text-right py-3 px-2 font-semibold">Coût Unit. / التكلفة</th>
                <th className="text-right py-3 px-2 font-semibold">Valeur / القيمة</th>
                <th className="text-center py-3 px-2 font-semibold">Statut / الحالة</th>
              </tr>
            </thead>
            <tbody>
              {categories[category].map((item, index) => {
                const status = getStatusText(item);
                const statusColor = getStatusColor(item);
                const itemValue = item.quantity * item.unit_cost;

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <td className="py-2 px-2 font-medium text-gray-800">
                      {item.name}
                      {item.description && (
                        <span className="text-gray-500 text-xs block">{item.description}</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2 text-gray-600">{item.unit}</td>
                    <td className="text-right py-2 px-2 font-semibold" style={{ color: statusColor }}>
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-500">
                      {item.min_quantity?.toLocaleString() || 0}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-600">
                      {formatCurrency(item.unit_cost)}
                    </td>
                    <td className="text-right py-2 px-2 font-semibold text-gray-800">
                      {formatCurrency(itemValue)}
                    </td>
                    <td className="text-center py-2 px-2">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusColor + '20',
                          color: statusColor
                        }}
                      >
                        {status.fr}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* Category Subtotal */}
              <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                <td colSpan="5" className="py-2 px-2 text-right text-gray-700">
                  Sous-total {category} / المجموع الفرعي:
                </td>
                <td className="text-right py-2 px-2 text-teal-700">
                  {formatCurrency(categories[category].reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Grand Total */}
      <div className="mt-8 p-4 bg-teal-600 text-white rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-teal-100 text-sm">Valeur Totale du Stock</p>
            <p className="text-teal-100 text-xs">القيمة الإجمالية للمخزون</p>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-amber-700 mb-3">
            Alertes de Stock / تنبيهات المخزون
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-300">
                  <th className="text-left py-2 px-2 text-amber-800">Article</th>
                  <th className="text-right py-2 px-2 text-amber-800">Qté Actuelle</th>
                  <th className="text-right py-2 px-2 text-amber-800">Qté Minimum</th>
                  <th className="text-right py-2 px-2 text-amber-800">À Commander</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.filter(item => item.quantity <= item.min_quantity).map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-amber-100/50' : ''}>
                    <td className="py-2 px-2 font-medium" style={{ color: getStatusColor(item) }}>
                      {item.name}
                    </td>
                    <td className="text-right py-2 px-2" style={{ color: getStatusColor(item) }}>
                      {item.quantity}
                    </td>
                    <td className="text-right py-2 px-2 text-gray-600">{item.min_quantity}</td>
                    <td className="text-right py-2 px-2 font-semibold text-amber-700">
                      {Math.max(0, (item.min_quantity * 2) - item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-300">
        <div className="flex justify-between text-xs text-gray-500">
          <div>
            <p>Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
            <p>تم إنشاؤه في {new Date().toLocaleDateString('ar-DZ')}</p>
          </div>
          <div className="text-right">
            <p>{settings?.companyName}</p>
            <p>NIF: {settings?.nif}</p>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-12">Responsable du Stock / مسؤول المخزون</p>
          <div className="border-t border-gray-400 mx-8">
            <p className="text-xs text-gray-500 mt-1">Signature / التوقيع</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-12">Directeur / المدير</p>
          <div className="border-t border-gray-400 mx-8">
            <p className="text-xs text-gray-500 mt-1">Signature / التوقيع</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockReportTemplate;
