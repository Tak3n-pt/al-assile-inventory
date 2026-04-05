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

const ExpenseReportTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    dateRange = {},
    expenses = [],
    categories = [],
    grandTotal = 0,
    notes,
    preparedBy
  } = data;

  // Group expenses by category for the table
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const cat = expense.category_name || 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(expense);
    return acc;
  }, {});

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-amber-700 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-amber-800 mb-2">
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
          <div className="bg-amber-700 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">RAPPORT DES DÉPENSES</h2>
            <p className="text-amber-100 text-sm">تقرير المصاريف</p>
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

      {/* Expenses Table grouped by category */}
      {Object.entries(expensesByCategory).map(([categoryName, catExpenses]) => {
        const catTotal = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return (
          <div key={categoryName} className="mb-4">
            {/* Category header row */}
            <div className="bg-amber-100 border border-amber-300 px-4 py-2 rounded-t-lg">
              <span className="font-semibold text-amber-800 uppercase text-xs tracking-wide">
                {categoryName}
              </span>
            </div>
            <table className="w-full border-collapse border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="py-2 px-3 text-left text-xs font-semibold uppercase w-24">Date</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold uppercase">Description</th>
                  <th className="py-2 px-3 text-right text-xs font-semibold uppercase w-32">Montant (DZD)</th>
                </tr>
              </thead>
              <tbody>
                {catExpenses.map((expense, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-3 border-b border-gray-100 text-gray-600 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-2 px-3 border-b border-gray-100">
                      {expense.description}
                    </td>
                    <td className="py-2 px-3 border-b border-gray-100 text-right font-mono">
                      {formatCurrency(expense.amount)} DA
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50">
                  <td colSpan={2} className="py-2 px-3 text-right text-xs font-semibold text-amber-800 uppercase">
                    Sous-total {categoryName}:
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                    {formatCurrency(catTotal)} DA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* Grand Total */}
      <div className="flex justify-end mt-4 mb-6">
        <div className="w-80">
          <div className="flex justify-between py-3 bg-amber-700 text-white px-4 rounded-lg">
            <span className="font-bold">Total Général / المجموع الكلي:</span>
            <span className="font-bold font-mono">{formatCurrency(grandTotal)} DA</span>
          </div>
        </div>
      </div>

      {/* Category Summary Section */}
      {categories.length > 0 && (
        <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Récapitulatif par catégorie / ملخص حسب الفئة
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-0">
            {categories.map((cat, index) => (
              <div
                key={index}
                className={`flex justify-between items-center px-4 py-2 border-b border-gray-100 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <span className="text-gray-700">{cat.name}</span>
                <span className="font-mono font-semibold text-amber-800">
                  {formatCurrency(cat.total)} DA
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-amber-50 border-t border-amber-200">
            <span className="font-semibold text-amber-800">Total</span>
            <span className="font-mono font-bold text-amber-800">
              {formatCurrency(grandTotal)} DA
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Notes / ملاحظات:</p>
          <p className="text-gray-600">{notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-10">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Préparé par</p>
          <p className="text-xs text-gray-400 mb-2">أعده</p>
          {preparedBy && <p className="text-sm font-medium mb-6">{preparedBy}</p>}
          {!preparedBy && <div className="mb-6"></div>}
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Date</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Approuvé par</p>
          <p className="text-xs text-gray-400 mb-10">وافق عليه</p>
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

ExpenseReportTemplate.displayName = 'ExpenseReportTemplate';

export default ExpenseReportTemplate;
