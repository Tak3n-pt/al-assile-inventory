import React from 'react';

const SalesReportTemplate = ({ data, settings, language }) => {
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

  const getStatusBadge = (status) => {
    const configs = {
      paid: { bg: '#dcfce7', color: '#16a34a', text: { fr: 'Payé', ar: 'مدفوع' } },
      partial: { bg: '#fef3c7', color: '#d97706', text: { fr: 'Partiel', ar: 'جزئي' } },
      pending: { bg: '#fee2e2', color: '#dc2626', text: { fr: 'En attente', ar: 'معلق' } }
    };
    return configs[status] || configs.pending;
  };

  // Calculate totals
  const totalSales = data?.sales?.length || 0;
  const totalRevenue = data?.sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
  const totalPaid = data?.sales?.reduce((sum, s) => sum + (s.paid_amount || 0), 0) || 0;
  const totalOutstanding = totalRevenue - totalPaid;
  const paidCount = data?.sales?.filter(s => s.status === 'paid').length || 0;
  const partialCount = data?.sales?.filter(s => s.status === 'partial').length || 0;
  const pendingCount = data?.sales?.filter(s => s.status === 'pending').length || 0;

  // Group by client
  const clientGroups = {};
  data?.sales?.forEach(sale => {
    const clientName = sale.client_name || 'Client inconnu';
    if (!clientGroups[clientName]) {
      clientGroups[clientName] = {
        sales: [],
        total: 0,
        paid: 0
      };
    }
    clientGroups[clientName].sales.push(sale);
    clientGroups[clientName].total += sale.total || 0;
    clientGroups[clientName].paid += sale.paid_amount || 0;
  });

  return (
    <div className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-indigo-600">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700 mb-2">
            RAPPORT DES VENTES
          </h1>
          <p className="text-gray-500 text-lg">تقرير المبيعات</p>
          <p className="text-gray-500 text-sm mt-2">
            Période: {formatDate(data?.fromDate || new Date().toISOString())} - {formatDate(data?.toDate || new Date().toISOString())}
          </p>
          <p className="text-gray-400 text-xs">
            الفترة: {formatDate(data?.fromDate || new Date().toISOString())} - {formatDate(data?.toDate || new Date().toISOString())}
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
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <p className="text-indigo-700 text-sm font-medium">Total Ventes / إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-indigo-800">{totalSales}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <p className="text-emerald-700 text-sm font-medium">Chiffre d'Affaires / رقم الأعمال</p>
          <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm font-medium">Montant Encaissé / المبلغ المحصل</p>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-amber-700 text-sm font-medium">Créances / المستحقات</p>
          <p className="text-2xl font-bold text-amber-800">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* Payment Status Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-8 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Répartition par Statut / التوزيع حسب الحالة</h3>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">Payé: <strong>{paidCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-700">Partiel: <strong>{partialCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">En attente: <strong>{pendingCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Détail des Ventes / تفاصيل المبيعات
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-indigo-600 text-indigo-700">
              <th className="text-left py-3 px-2 font-semibold">N° / الرقم</th>
              <th className="text-left py-3 px-2 font-semibold">Date / التاريخ</th>
              <th className="text-left py-3 px-2 font-semibold">Client / الزبون</th>
              <th className="text-right py-3 px-2 font-semibold">Total / المجموع</th>
              <th className="text-right py-3 px-2 font-semibold">Payé / مدفوع</th>
              <th className="text-right py-3 px-2 font-semibold">Reste / الباقي</th>
              <th className="text-center py-3 px-2 font-semibold">Statut / الحالة</th>
            </tr>
          </thead>
          <tbody>
            {data?.sales?.map((sale, index) => {
              const status = getStatusBadge(sale.status);
              const remaining = (sale.total || 0) - (sale.paid_amount || 0);

              return (
                <tr
                  key={sale.id}
                  className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="py-2 px-2 font-mono text-gray-600">#{sale.id}</td>
                  <td className="py-2 px-2 text-gray-700">{formatDate(sale.date)}</td>
                  <td className="py-2 px-2 font-medium text-gray-800">{sale.client_name}</td>
                  <td className="text-right py-2 px-2 font-semibold text-gray-800">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="text-right py-2 px-2 text-emerald-600">
                    {formatCurrency(sale.paid_amount)}
                  </td>
                  <td className="text-right py-2 px-2 text-amber-600 font-medium">
                    {formatCurrency(remaining)}
                  </td>
                  <td className="text-center py-2 px-2">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.text.fr}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-indigo-600 bg-indigo-50 font-semibold">
              <td colSpan="3" className="py-3 px-2 text-right text-indigo-700">
                TOTAUX / المجاميع:
              </td>
              <td className="text-right py-3 px-2 text-indigo-800">{formatCurrency(totalRevenue)}</td>
              <td className="text-right py-3 px-2 text-emerald-700">{formatCurrency(totalPaid)}</td>
              <td className="text-right py-3 px-2 text-amber-700">{formatCurrency(totalOutstanding)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sales by Client */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Ventes par Client / المبيعات حسب الزبون
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-400 text-gray-700">
              <th className="text-left py-3 px-2 font-semibold">Client / الزبون</th>
              <th className="text-center py-3 px-2 font-semibold">Nb. Ventes / عدد المبيعات</th>
              <th className="text-right py-3 px-2 font-semibold">Total / المجموع</th>
              <th className="text-right py-3 px-2 font-semibold">Payé / مدفوع</th>
              <th className="text-right py-3 px-2 font-semibold">Créances / المستحقات</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(clientGroups).sort((a, b) => clientGroups[b].total - clientGroups[a].total).map((clientName, index) => {
              const group = clientGroups[clientName];
              const outstanding = group.total - group.paid;

              return (
                <tr
                  key={clientName}
                  className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="py-2 px-2 font-medium text-gray-800">{clientName}</td>
                  <td className="text-center py-2 px-2 text-gray-600">{group.sales.length}</td>
                  <td className="text-right py-2 px-2 font-semibold text-gray-800">
                    {formatCurrency(group.total)}
                  </td>
                  <td className="text-right py-2 px-2 text-emerald-600">
                    {formatCurrency(group.paid)}
                  </td>
                  <td className={`text-right py-2 px-2 font-medium ${outstanding > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatCurrency(outstanding)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Payment Rate */}
      <div className="bg-indigo-600 text-white p-4 rounded-lg mb-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-indigo-100 text-sm">Taux de Recouvrement / نسبة التحصيل</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">
              {totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        <div className="mt-2 bg-indigo-800 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2"
            style={{ width: `${totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

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
          <p className="text-sm text-gray-600 mb-12">Responsable Commercial / المسؤول التجاري</p>
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

export default SalesReportTemplate;
