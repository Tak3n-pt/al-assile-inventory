import React, { forwardRef } from 'react';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ReceptionVoucherTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    supplier,
    items = [],
    notes,
    purchaseOrderNumber
  } = data;

  const totalOrdered = items.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
  const totalReceived = items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
  const allConform = items.every(
    (item) => (item.quantity_received || 0) >= (item.quantity_ordered || 0)
  );

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-teal-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-teal-700 mb-2">
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
          <div className="bg-teal-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">BON DE RÉCEPTION</h2>
            <p className="text-teal-100 text-sm">سند الاستلام</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° BR:</p>
            <p className="font-bold text-lg">{number}</p>
            <p className="text-gray-500 text-xs mt-2">Date:</p>
            <p className="font-semibold">{formatDate(date)}</p>
            {purchaseOrderNumber && (
              <>
                <p className="text-gray-500 text-xs mt-2">N° Commande:</p>
                <p className="font-semibold text-teal-700">{purchaseOrderNumber}</p>
              </>
            )}
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

      {/* Supplier Info */}
      <div className="mb-6 border border-teal-200 rounded-lg p-4 bg-teal-50">
        <h3 className="text-xs text-teal-700 uppercase tracking-wide font-semibold mb-2">
          Fournisseur / المورد
        </h3>
        <p className="font-bold text-lg">{supplier?.name || 'Fournisseur'}</p>
        {supplier?.address && <p className="text-gray-600">{supplier.address}</p>}
        {supplier?.phone && <p className="text-gray-600">Tél: {supplier.phone}</p>}
        {supplier?.email && <p className="text-gray-600">Email: {supplier.email}</p>}
        {supplier?.rc && (
          <p className="text-gray-500 text-xs mt-1">RC: {supplier.rc}</p>
        )}
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-teal-600 text-white">
            <th className="py-3 px-3 text-left text-xs font-semibold uppercase w-8">#</th>
            <th className="py-3 px-3 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-3 text-center text-xs font-semibold uppercase w-24">Qté commandée</th>
            <th className="py-3 px-3 text-center text-xs font-semibold uppercase w-24">Qté reçue</th>
            <th className="py-3 px-3 text-center text-xs font-semibold uppercase w-20">Unité</th>
            <th className="py-3 px-3 text-center text-xs font-semibold uppercase w-28">Observations</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const ordered = item.quantity_ordered || 0;
            const received = item.quantity_received || 0;
            const isShort = received < ordered;
            const isExcess = received > ordered;
            return (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-3 border-b border-gray-200 text-center">{index + 1}</td>
                <td className="py-3 px-3 border-b border-gray-200 font-medium">
                  {item.product_name || item.name}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-center font-mono">
                  {ordered}
                </td>
                <td
                  className={`py-3 px-3 border-b border-gray-200 text-center font-mono font-semibold ${
                    isShort ? 'text-red-600' : isExcess ? 'text-orange-600' : 'text-teal-700'
                  }`}
                >
                  {received}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-center text-gray-600">
                  {item.unit || 'pcs'}
                </td>
                <td className="py-3 px-3 border-b border-gray-200 text-center text-xs text-gray-500">
                  {isShort
                    ? `Manque ${ordered - received}`
                    : isExcess
                    ? `Excès ${received - ordered}`
                    : item.observations || 'Conforme'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-teal-50 font-semibold">
            <td colSpan={2} className="py-3 px-3 border-t-2 border-teal-200 text-right text-xs uppercase text-teal-700">
              Totaux
            </td>
            <td className="py-3 px-3 border-t-2 border-teal-200 text-center font-mono">
              {totalOrdered}
            </td>
            <td
              className={`py-3 px-3 border-t-2 border-teal-200 text-center font-mono ${
                totalReceived < totalOrdered ? 'text-red-600' : 'text-teal-700'
              }`}
            >
              {totalReceived}
            </td>
            <td colSpan={2} className="py-3 px-3 border-t-2 border-teal-200"></td>
          </tr>
        </tfoot>
      </table>

      {/* Quality Check Section */}
      <div className="mb-6 border border-gray-300 rounded-lg p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
          Contrôle Qualité / مراقبة الجودة
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                allConform ? 'border-teal-600 bg-teal-600' : 'border-gray-400'
              }`}
            >
              {allConform && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-medium text-teal-700">Conforme / مطابق</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                !allConform ? 'border-red-500 bg-red-500' : 'border-gray-400'
              }`}
            >
              {!allConform && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="font-medium text-red-600">Non conforme / غير مطابق</span>
          </label>
        </div>
        {!allConform && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">Motif de non-conformité / سبب عدم المطابقة:</p>
            <div className="h-10 border-b border-dashed border-gray-400 w-full"></div>
          </div>
        )}
      </div>

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
          <p className="text-xs text-gray-600 font-semibold mb-1">Réceptionné par</p>
          <p className="text-xs text-gray-400 mb-10">المستلم</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Nom, Signature & Date</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-semibold mb-1">Contrôleur qualité</p>
          <p className="text-xs text-gray-400 mb-10">مراقب الجودة</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Nom, Signature & Date</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Document généré le {new Date().toLocaleDateString('fr-DZ')} |
          Ce bon de réception fait foi de la livraison des marchandises
        </p>
      </div>
    </div>
  );
});

ReceptionVoucherTemplate.displayName = 'ReceptionVoucherTemplate';

export default ReceptionVoucherTemplate;
