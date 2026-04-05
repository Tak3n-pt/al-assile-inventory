import React, { forwardRef } from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ProductionReportTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    dateRange = {},
    batches = [],
    summary = {},
    notes
  } = data;

  // Build per-product breakdown from batches
  const byProduct = batches.reduce((acc, batch) => {
    const name = batch.product_name || 'Produit inconnu';
    if (!acc[name]) {
      acc[name] = { batches: 0, totalProduced: 0, totalCost: 0 };
    }
    acc[name].batches += 1;
    acc[name].totalProduced += batch.quantity_produced || 0;
    acc[name].totalCost += batch.total_cost || 0;
    return acc;
  }, {});

  const avgCostPerUnit =
    summary.totalProduced > 0
      ? (summary.totalCost || 0) / summary.totalProduced
      : 0;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-purple-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-purple-700 mb-2">
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
          <div className="bg-purple-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">RAPPORT DE PRODUCTION</h2>
            <p className="text-purple-100 text-sm">تقرير الإنتاج</p>
          </div>
          <div className="mt-4 text-right">
            {dateRange.start && (
              <>
                <p className="text-gray-500 text-xs">Période:</p>
                <p className="font-semibold">
                  {formatDate(dateRange.start)} — {formatDate(dateRange.end)}
                </p>
              </>
            )}
            <p className="text-gray-500 text-xs mt-2">Généré le:</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="border border-purple-200 rounded-lg p-3 bg-purple-50 text-center">
          <p className="text-xs text-purple-500 font-semibold mb-1">Lots produits</p>
          <p className="text-xs text-purple-400 mb-1">دفعات الإنتاج</p>
          <p className="text-2xl font-bold text-purple-700">{summary.totalBatches || batches.length}</p>
        </div>
        <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50 text-center">
          <p className="text-xs text-indigo-500 font-semibold mb-1">Total produit</p>
          <p className="text-xs text-indigo-400 mb-1">إجمالي الإنتاج</p>
          <p className="text-2xl font-bold text-indigo-700">{summary.totalProduced || 0}</p>
        </div>
        <div className="border border-red-200 rounded-lg p-3 bg-red-50 text-center">
          <p className="text-xs text-red-500 font-semibold mb-1">Coût total</p>
          <p className="text-xs text-red-400 mb-1">التكلفة الإجمالية</p>
          <p className="text-base font-bold text-red-700 font-mono">
            {formatCurrency(summary.totalCost || 0)} DA
          </p>
        </div>
        <div className="border border-green-200 rounded-lg p-3 bg-green-50 text-center">
          <p className="text-xs text-green-500 font-semibold mb-1">Coût moyen/u</p>
          <p className="text-xs text-green-400 mb-1">متوسط التكلفة</p>
          <p className="text-base font-bold text-green-700 font-mono">
            {formatCurrency(avgCostPerUnit)} DA
          </p>
        </div>
      </div>

      {/* Production Batches Table */}
      <div className="mb-6">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
          Détail des lots de production / تفاصيل دفعات الإنتاج
        </h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-purple-600 text-white">
              <th className="py-3 px-3 text-left text-xs font-semibold uppercase w-24">Date</th>
              <th className="py-3 px-3 text-left text-xs font-semibold uppercase">Produit</th>
              <th className="py-3 px-3 text-center text-xs font-semibold uppercase w-24">Qté produite</th>
              <th className="py-3 px-3 text-right text-xs font-semibold uppercase w-28">Coût ingréd.</th>
              <th className="py-3 px-3 text-right text-xs font-semibold uppercase w-28">Coût total</th>
              <th className="py-3 px-3 text-left text-xs font-semibold uppercase w-32">Notes</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-3 border-b border-gray-200 text-gray-600 whitespace-nowrap">
                  {formatDate(batch.date)}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 font-medium">
                  {batch.product_name}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-center font-semibold text-purple-700">
                  {batch.quantity_produced}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-right font-mono text-gray-600">
                  {formatCurrency(batch.ingredient_cost)} DA
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-right font-mono font-semibold">
                  {formatCurrency(batch.total_cost)} DA
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-xs text-gray-500">
                  {batch.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-purple-50 font-semibold">
              <td colSpan={2} className="py-3 px-3 border-t-2 border-purple-200 text-right text-xs uppercase text-purple-700">
                Totaux
              </td>
              <td className="py-3 px-3 border-t-2 border-purple-200 text-center font-mono text-purple-700">
                {summary.totalProduced || 0}
              </td>
              <td className="py-3 px-3 border-t-2 border-purple-200 text-right font-mono text-gray-700">
                {formatCurrency(
                  batches.reduce((sum, b) => sum + (b.ingredient_cost || 0), 0)
                )} DA
              </td>
              <td className="py-3 px-3 border-t-2 border-purple-200 text-right font-mono text-purple-700">
                {formatCurrency(summary.totalCost || 0)} DA
              </td>
              <td className="py-3 px-3 border-t-2 border-purple-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* By-Product Breakdown */}
      {Object.keys(byProduct).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
            Récapitulatif par produit / ملخص حسب المنتج
          </h3>
          <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-purple-600 text-white">
                <th className="py-2 px-4 text-left text-xs font-semibold uppercase">Produit</th>
                <th className="py-2 px-4 text-center text-xs font-semibold uppercase w-20">Lots</th>
                <th className="py-2 px-4 text-center text-xs font-semibold uppercase w-28">Total produit</th>
                <th className="py-2 px-4 text-right text-xs font-semibold uppercase w-32">Coût total</th>
                <th className="py-2 px-4 text-right text-xs font-semibold uppercase w-32">Coût / unité</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byProduct).map(([productName, stats], index) => {
                const cpUnit = stats.totalProduced > 0
                  ? stats.totalCost / stats.totalProduced
                  : 0;
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border-b border-gray-100 font-medium">{productName}</td>
                    <td className="py-2 px-4 border-b border-gray-100 text-center">{stats.batches}</td>
                    <td className="py-2 px-4 border-b border-gray-100 text-center font-semibold text-purple-700">
                      {stats.totalProduced}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 text-right font-mono">
                      {formatCurrency(stats.totalCost)} DA
                    </td>
                    <td className="py-2 px-4 border-b border-gray-100 text-right font-mono text-gray-600">
                      {formatCurrency(cpUnit)} DA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Observations / ملاحظات:</p>
          <p className="text-gray-600">{notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-10">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Responsable de production</p>
          <p className="text-xs text-gray-400 mb-10">مسؤول الإنتاج</p>
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
          {settings?.business_name_fr || 'Al Assile'}
        </p>
      </div>
    </div>
  );
});

ProductionReportTemplate.displayName = 'ProductionReportTemplate';

export default ProductionReportTemplate;
