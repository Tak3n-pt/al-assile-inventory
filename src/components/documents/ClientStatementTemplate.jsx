import React from 'react';

const ClientStatementTemplate = ({ data, settings, language }) => {
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

  // Calculate totals
  const totalPurchases = data?.sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
  const totalPayments = data?.sales?.reduce((sum, s) => sum + (s.paid_amount || 0), 0) || 0;
  const currentBalance = totalPurchases - totalPayments;

  // Get transaction history
  const transactions = [];
  let runningBalance = 0;

  // Sort sales by date
  const sortedSales = [...(data?.sales || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedSales.forEach(sale => {
    // Add sale entry
    runningBalance += sale.total || 0;
    transactions.push({
      date: sale.date,
      type: 'sale',
      description: `Vente #${sale.id}`,
      descriptionAr: `بيع #${sale.id}`,
      debit: sale.total || 0,
      credit: 0,
      balance: runningBalance
    });

    // Add payment entry if there's a payment
    if (sale.paid_amount > 0) {
      runningBalance -= sale.paid_amount;
      transactions.push({
        date: sale.date,
        type: 'payment',
        description: `Paiement #${sale.id}`,
        descriptionAr: `دفع #${sale.id}`,
        debit: 0,
        credit: sale.paid_amount,
        balance: runningBalance
      });
    }
  });

  const client = data?.client || {};

  return (
    <div className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-cyan-600">
        <div>
          <h1 className="text-2xl font-bold text-cyan-700 mb-2">
            RELEVÉ DE COMPTE CLIENT
          </h1>
          <p className="text-gray-500 text-lg">كشف حساب الزبون</p>
          <p className="text-gray-500 text-sm mt-2">
            Date d'émission: {formatDate(new Date().toISOString())}
          </p>
          {data?.fromDate && data?.toDate && (
            <p className="text-gray-400 text-xs">
              Période: {formatDate(data.fromDate)} - {formatDate(data.toDate)}
            </p>
          )}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{settings?.companyName || 'Entreprise'}</h2>
          <p className="text-gray-500 text-sm mt-1">{settings?.address}</p>
          <p className="text-gray-500 text-sm">{settings?.phone}</p>
          {settings?.nif && <p className="text-gray-400 text-xs mt-1">NIF: {settings.nif}</p>}
        </div>
      </div>

      {/* Client Information */}
      <div className="bg-cyan-50 p-6 rounded-lg mb-8 border border-cyan-200">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-cyan-700 mb-3 uppercase tracking-wide">
              Informations Client / معلومات الزبون
            </h3>
            <div className="space-y-2">
              <p className="text-lg font-bold text-gray-800">{client.name || 'Client'}</p>
              {client.phone && (
                <p className="text-gray-600 text-sm">Tél: {client.phone}</p>
              )}
              {client.email && (
                <p className="text-gray-600 text-sm">Email: {client.email}</p>
              )}
              {client.address && (
                <p className="text-gray-600 text-sm">Adresse: {client.address}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-semibold text-cyan-700 mb-3 uppercase tracking-wide">
              Résumé du Compte / ملخص الحساب
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Achats:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(totalPurchases)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Paiements:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(totalPayments)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-cyan-300">
                <span className="text-gray-700 font-semibold">Solde Actuel:</span>
                <span className={`font-bold text-lg ${currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(currentBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status Indicator */}
      <div className={`p-4 rounded-lg mb-8 ${currentBalance > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {currentBalance > 0 ? 'Solde Débiteur / رصيد مدين' : 'Compte Soldé / حساب مسوى'}
            </p>
            <p className={`text-xs ${currentBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {currentBalance > 0
                ? 'Ce client a un solde à régler.'
                : 'Ce client n\'a aucun solde en cours.'}
            </p>
          </div>
          <div className={`text-2xl font-bold ${currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {formatCurrency(Math.abs(currentBalance))}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Historique des Transactions / سجل المعاملات
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-cyan-600 text-cyan-700">
              <th className="text-left py-3 px-2 font-semibold">Date / التاريخ</th>
              <th className="text-left py-3 px-2 font-semibold">Description / الوصف</th>
              <th className="text-right py-3 px-2 font-semibold">Débit / مدين</th>
              <th className="text-right py-3 px-2 font-semibold">Crédit / دائن</th>
              <th className="text-right py-3 px-2 font-semibold">Solde / الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance */}
            <tr className="bg-gray-100">
              <td colSpan="4" className="py-2 px-2 text-gray-600 italic">
                Solde d'ouverture / الرصيد الافتتاحي
              </td>
              <td className="text-right py-2 px-2 font-semibold text-gray-700">
                {formatCurrency(0)}
              </td>
            </tr>

            {transactions.map((trans, index) => (
              <tr
                key={index}
                className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="py-2 px-2 text-gray-700">{formatDate(trans.date)}</td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${trans.type === 'sale' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    <span className="font-medium text-gray-800">{trans.description}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{trans.descriptionAr}</span>
                </td>
                <td className="text-right py-2 px-2">
                  {trans.debit > 0 && (
                    <span className="text-amber-600 font-medium">{formatCurrency(trans.debit)}</span>
                  )}
                </td>
                <td className="text-right py-2 px-2">
                  {trans.credit > 0 && (
                    <span className="text-emerald-600 font-medium">{formatCurrency(trans.credit)}</span>
                  )}
                </td>
                <td className={`text-right py-2 px-2 font-semibold ${trans.balance > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                  {formatCurrency(trans.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-cyan-600 bg-cyan-50 font-semibold">
              <td colSpan="2" className="py-3 px-2 text-right text-cyan-700">
                SOLDE FINAL / الرصيد النهائي:
              </td>
              <td className="text-right py-3 px-2 text-amber-700">{formatCurrency(totalPurchases)}</td>
              <td className="text-right py-3 px-2 text-emerald-700">{formatCurrency(totalPayments)}</td>
              <td className={`text-right py-3 px-2 ${currentBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(currentBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Sales Summary Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Détail des Achats / تفاصيل المشتريات
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-400 text-gray-700">
              <th className="text-left py-3 px-2 font-semibold">N° Vente</th>
              <th className="text-left py-3 px-2 font-semibold">Date</th>
              <th className="text-right py-3 px-2 font-semibold">Montant</th>
              <th className="text-right py-3 px-2 font-semibold">Payé</th>
              <th className="text-right py-3 px-2 font-semibold">Reste</th>
              <th className="text-center py-3 px-2 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {sortedSales.map((sale, index) => {
              const remaining = (sale.total || 0) - (sale.paid_amount || 0);
              const statusConfig = {
                paid: { bg: '#dcfce7', color: '#16a34a', text: 'Payé' },
                partial: { bg: '#fef3c7', color: '#d97706', text: 'Partiel' },
                pending: { bg: '#fee2e2', color: '#dc2626', text: 'En attente' }
              };
              const status = statusConfig[sale.status] || statusConfig.pending;

              return (
                <tr
                  key={sale.id}
                  className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="py-2 px-2 font-mono text-gray-600">#{sale.id}</td>
                  <td className="py-2 px-2 text-gray-700">{formatDate(sale.date)}</td>
                  <td className="text-right py-2 px-2 font-semibold text-gray-800">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="text-right py-2 px-2 text-emerald-600">
                    {formatCurrency(sale.paid_amount)}
                  </td>
                  <td className={`text-right py-2 px-2 font-medium ${remaining > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {formatCurrency(remaining)}
                  </td>
                  <td className="text-center py-2 px-2">
                    <span
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Message */}
      {currentBalance > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-8">
          <p className="text-amber-800 text-sm font-medium">
            Nous vous remercions de bien vouloir régulariser votre situation dans les meilleurs délais.
          </p>
          <p className="text-amber-700 text-xs mt-1">
            نشكركم على تسوية وضعيتكم في أقرب وقت ممكن.
          </p>
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
          <p className="text-sm text-gray-600 mb-12">Service Comptabilité / قسم المحاسبة</p>
          <div className="border-t border-gray-400 mx-8">
            <p className="text-xs text-gray-500 mt-1">Signature / التوقيع</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-12">Lu et Approuvé / قرأت ووافقت</p>
          <div className="border-t border-gray-400 mx-8">
            <p className="text-xs text-gray-500 mt-1">Signature Client / توقيع الزبون</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientStatementTemplate;
