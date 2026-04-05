import React, { forwardRef } from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MONTH_NAMES_AR = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const MonthlySummaryTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    month,
    year,
    sales = {},
    expenses = {},
    production = {},
    revenue = 0,
    profit = 0
  } = data;

  const monthLabel = month
    ? `${MONTH_NAMES_FR[month - 1]} ${year}`
    : `${year}`;
  const monthLabelAr = month
    ? `${MONTH_NAMES_AR[month - 1]} ${year}`
    : `${year}`;

  const isProfit = profit >= 0;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-indigo-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-indigo-700 mb-2">
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
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">RÉCAPITULATIF MENSUEL</h2>
            <p className="text-indigo-100 text-sm">الملخص الشهري</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">Période:</p>
            <p className="font-bold text-lg text-indigo-700">{monthLabel}</p>
            <p className="text-gray-400 text-sm" dir="rtl">{monthLabelAr}</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Revenue Card */}
        <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
          <p className="text-xs text-indigo-500 uppercase font-semibold mb-1">
            Chiffre d'affaires
          </p>
          <p className="text-xs text-indigo-400 mb-2" dir="rtl">رقم الأعمال</p>
          <p className="text-xl font-bold text-indigo-700 font-mono">
            {formatCurrency(revenue)} DA
          </p>
        </div>
        {/* Expenses Card */}
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <p className="text-xs text-red-500 uppercase font-semibold mb-1">
            Total Dépenses
          </p>
          <p className="text-xs text-red-400 mb-2" dir="rtl">إجمالي المصاريف</p>
          <p className="text-xl font-bold text-red-700 font-mono">
            {formatCurrency(expenses.total || 0)} DA
          </p>
        </div>
        {/* Profit Card */}
        <div
          className={`border rounded-lg p-4 ${
            isProfit
              ? 'border-green-200 bg-green-50'
              : 'border-orange-200 bg-orange-50'
          }`}
        >
          <p
            className={`text-xs uppercase font-semibold mb-1 ${
              isProfit ? 'text-green-500' : 'text-orange-500'
            }`}
          >
            {isProfit ? 'Bénéfice net' : 'Perte nette'}
          </p>
          <p
            className={`text-xs mb-2 ${isProfit ? 'text-green-400' : 'text-orange-400'}`}
            dir="rtl"
          >
            {isProfit ? 'الربح الصافي' : 'الخسارة الصافية'}
          </p>
          <p
            className={`text-xl font-bold font-mono ${
              isProfit ? 'text-green-700' : 'text-orange-700'
            }`}
          >
            {isProfit ? '' : '-'}{formatCurrency(Math.abs(profit))} DA
          </p>
        </div>
      </div>

      {/* Sales Summary Table */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
          Résumé des ventes / ملخص المبيعات
        </h3>
        <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="py-2 px-4 text-left text-xs font-semibold uppercase">Indicateur</th>
              <th className="py-2 px-4 text-right text-xs font-semibold uppercase">Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              <td className="py-2 px-4 border-b border-gray-100 text-gray-700">
                Nombre de ventes / عدد المبيعات
              </td>
              <td className="py-2 px-4 border-b border-gray-100 text-right font-mono font-semibold">
                {sales.count || 0}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-2 px-4 border-b border-gray-100 text-gray-700">
                Total facturé / إجمالي الفواتير
              </td>
              <td className="py-2 px-4 border-b border-gray-100 text-right font-mono font-semibold">
                {formatCurrency(sales.total || 0)} DA
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 border-b border-gray-100 text-gray-700">
                Montant encaissé / المبلغ المحصل
              </td>
              <td className="py-2 px-4 border-b border-gray-100 text-right font-mono font-semibold text-green-700">
                {formatCurrency(sales.paid || 0)} DA
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="py-2 px-4 text-gray-700">
                Reste à encaisser / المبلغ المتبقي
              </td>
              <td className="py-2 px-4 text-right font-mono font-semibold text-red-600">
                {formatCurrency(sales.pending || 0)} DA
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenses by Category */}
      {expenses.byCategory && expenses.byCategory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            Dépenses par catégorie / المصاريف حسب الفئة
          </h3>
          <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="py-2 px-4 text-left text-xs font-semibold uppercase">Catégorie</th>
                <th className="py-2 px-4 text-right text-xs font-semibold uppercase">Montant</th>
                <th className="py-2 px-4 text-right text-xs font-semibold uppercase w-20">%</th>
              </tr>
            </thead>
            <tbody>
              {expenses.byCategory.map((cat, index) => {
                const pct =
                  expenses.total > 0
                    ? ((cat.total / expenses.total) * 100).toFixed(1)
                    : '0.0';
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-100">{cat.name}</td>
                    <td className="py-2 px-4 border-b border-gray-100 text-right font-mono">
                      {formatCurrency(cat.total)} DA
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 text-right text-gray-500 text-xs">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 font-semibold">
                <td className="py-2 px-4 text-indigo-700 text-xs uppercase">Total</td>
                <td className="py-2 px-4 text-right font-mono text-indigo-700">
                  {formatCurrency(expenses.total || 0)} DA
                </td>
                <td className="py-2 px-4 text-right text-indigo-500 text-xs">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Production Summary */}
      {(production.batches || production.units || production.cost) && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            Résumé de production / ملخص الإنتاج
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-gray-200 rounded-lg p-3 text-center bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Lots produits</p>
              <p className="text-lg font-bold text-gray-800">{production.batches || 0}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Unités produites</p>
              <p className="text-lg font-bold text-gray-800">{production.units || 0}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 text-center bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">Coût total</p>
              <p className="text-base font-bold text-gray-800 font-mono">
                {formatCurrency(production.cost || 0)} DA
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profit Calculation */}
      <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Calcul du résultat / حساب النتيجة
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-700">Chiffre d'affaires</span>
            <span className="font-mono font-semibold text-indigo-700">
              + {formatCurrency(revenue)} DA
            </span>
          </div>
          <div className="flex justify-between px-4 py-2">
            <span className="text-gray-700">Total dépenses</span>
            <span className="font-mono font-semibold text-red-600">
              - {formatCurrency(expenses.total || 0)} DA
            </span>
          </div>
          <div
            className={`flex justify-between px-4 py-3 font-bold ${
              isProfit ? 'bg-green-50' : 'bg-orange-50'
            }`}
          >
            <span className={isProfit ? 'text-green-700' : 'text-orange-700'}>
              {isProfit ? 'Bénéfice net' : 'Perte nette'}
            </span>
            <span
              className={`font-mono text-lg ${
                isProfit ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {isProfit ? '+' : '-'} {formatCurrency(Math.abs(profit))} DA
            </span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-8">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Préparé par</p>
          <p className="text-xs text-gray-400 mb-10">أعده</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Date</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Validé par</p>
          <p className="text-xs text-gray-400 mb-10">اعتمده</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Document généré le {new Date().toLocaleDateString('fr-DZ')} |
          {settings?.business_name_fr || 'Al Assile'} — {monthLabel}
        </p>
      </div>
    </div>
  );
});

MonthlySummaryTemplate.displayName = 'MonthlySummaryTemplate';

export default MonthlySummaryTemplate;
