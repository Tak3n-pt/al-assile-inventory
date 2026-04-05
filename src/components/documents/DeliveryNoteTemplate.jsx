import React, { forwardRef } from 'react';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const DeliveryNoteTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    client,
    items = [],
    notes,
    deliveryAddress,
    vehicleNumber,
    driverName
  } = data;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-blue-700 mb-2">
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
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">BON DE LIVRAISON</h2>
            <p className="text-blue-100 text-sm">سند التسليم</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° BL:</p>
            <p className="font-bold text-lg">{number}</p>
            <p className="text-gray-500 text-xs mt-2">Date:</p>
            <p className="font-semibold">{formatDate(date)}</p>
          </div>
        </div>
      </div>

      {/* Client & Delivery Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Client Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Client / العميل</h3>
          <p className="font-bold text-lg">{client?.name || 'Client'}</p>
          {client?.address && <p className="text-gray-600">{client.address}</p>}
          {client?.phone && <p className="text-gray-600">Tél: {client.phone}</p>}
        </div>

        {/* Delivery Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Livraison / التسليم</h3>
          {deliveryAddress && (
            <p className="text-gray-600 mb-1">
              <span className="text-gray-500">Adresse:</span> {deliveryAddress}
            </p>
          )}
          {vehicleNumber && (
            <p className="text-gray-600 mb-1">
              <span className="text-gray-500">N° Véhicule:</span> {vehicleNumber}
            </p>
          )}
          {driverName && (
            <p className="text-gray-600">
              <span className="text-gray-500">Chauffeur:</span> {driverName}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase w-12">#</th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-24">Quantité</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-20">Unité</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-32">Observations</th>
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
              <td className="py-4 px-4 border-b border-gray-200 text-center text-gray-500">-</td>
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
        <div className="bg-blue-50 px-6 py-4 rounded-lg">
          <p className="text-gray-600">Nombre total d'articles:</p>
          <p className="text-2xl font-bold text-blue-700">
            {items.reduce((sum, item) => sum + item.quantity, 0)} unités
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

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-12">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-12">Expéditeur</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-12">Transporteur</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-12">Récepteur</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Document généré le {new Date().toLocaleDateString('fr-DZ')} |
          Ce bon de livraison fait foi de la réception des marchandises
        </p>
      </div>
    </div>
  );
});

DeliveryNoteTemplate.displayName = 'DeliveryNoteTemplate';

export default DeliveryNoteTemplate;
