import React, { forwardRef } from 'react';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ExitVoucherTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    items = [],
    warehouseLocation,
    authorizedBy,
    recipient,
    purpose,
    notes
  } = data;

  const totalItems = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-amber-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-amber-700 mb-2">
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
        </div>

        {/* Document Title */}
        <div className="text-right">
          <div className="bg-amber-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">BON DE SORTIE</h2>
            <p className="text-amber-100 text-sm">سند الخروج</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° BS:</p>
            <p className="font-bold text-lg">{number}</p>
            <p className="text-gray-500 text-xs mt-2">Date:</p>
            <p className="font-semibold">{formatDate(date)}</p>
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

      {/* Warehouse & Authorization Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Warehouse Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Entrepôt / المستودع</h3>
          <p className="text-gray-600 mb-1">
            <span className="text-gray-500 text-xs">Emplacement:</span>
          </p>
          <p className="font-semibold text-amber-700">
            {warehouseLocation || 'Entrepôt principal'}
          </p>
        </div>

        {/* Authorization Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Autorisation / التفويض</h3>
          {authorizedBy && (
            <p className="text-gray-600 mb-1">
              <span className="text-gray-500 text-xs">Autorisé par:</span><br />
              <span className="font-semibold">{authorizedBy}</span>
            </p>
          )}
          {purpose && (
            <p className="text-gray-600 mt-2">
              <span className="text-gray-500 text-xs">Motif de sortie:</span><br />
              <span className="text-sm">{purpose}</span>
            </p>
          )}
        </div>
      </div>

      {/* Items Table — No prices for internal document */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-amber-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase w-10">#</th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-24">Quantité</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-20">Unité</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-40">Observations</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="py-4 px-4 border-b border-gray-200 text-center">{index + 1}</td>
              <td className="py-4 px-4 border-b border-gray-200 font-medium">{item.product_name || item.name}</td>
              <td className="py-4 px-4 border-b border-gray-200 text-center font-semibold text-lg">
                {item.quantity}
              </td>
              <td className="py-4 px-4 border-b border-gray-200 text-center">{item.unit || 'pcs'}</td>
              <td className="py-4 px-4 border-b border-gray-200 text-center text-gray-500">
                {item.observations || '-'}
              </td>
            </tr>
          ))}
          {/* Empty rows for manual additions */}
          {items.length < 10 && [...Array(3)].map((_, index) => (
            <tr key={`empty-${index}`} className="bg-white">
              <td className="py-4 px-4 border-b border-gray-200">&nbsp;</td>
              <td className="py-4 px-4 border-b border-gray-200"></td>
              <td className="py-4 px-4 border-b border-gray-200"></td>
              <td className="py-4 px-4 border-b border-gray-200"></td>
              <td className="py-4 px-4 border-b border-gray-200"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total Items Count */}
      <div className="flex justify-end mb-8">
        <div className="bg-amber-50 border border-amber-200 px-6 py-4 rounded-lg">
          <p className="text-gray-600 text-sm">Nombre total d'articles sortis / إجمالي الأصناف الخارجة:</p>
          <p className="text-2xl font-bold text-amber-700 text-right mt-1">
            {totalItems} unités
          </p>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Observations / ملاحظات:</p>
          <p className="text-gray-600">{notes}</p>
        </div>
      )}

      {/* 3 Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Autorisé par</p>
          <p className="text-xs text-gray-400 mb-12">مفوض من قبل</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Responsable magasin</p>
          <p className="text-xs text-gray-400 mb-12">أمين المستودع</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Récepteur / Bénéficiaire</p>
          <p className="text-xs text-gray-400 mb-12">المستلم / المستفيد</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Document généré le {new Date().toLocaleDateString('fr-DZ')} |
          Document interne — Ce bon de sortie fait foi du mouvement de stock
        </p>
      </div>
    </div>
  );
});

ExitVoucherTemplate.displayName = 'ExitVoucherTemplate';

export default ExitVoucherTemplate;
