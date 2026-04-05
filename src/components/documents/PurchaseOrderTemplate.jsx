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

const PurchaseOrderTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    deliveryDate,
    client,
    items = [],
    subtotal,
    total,
    paymentConditions,
    orderConditions,
    notes
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
          {settings?.business_email && (
            <p className="text-gray-600 text-sm">Email: {settings.business_email}</p>
          )}
        </div>

        {/* Document Title */}
        <div className="text-right">
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">BON DE COMMANDE</h2>
            <p className="text-blue-100 text-sm">طلب شراء</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° Commande:</p>
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

      {/* Client & Delivery Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Client Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Fournisseur / المورد</h3>
          <p className="font-bold text-lg">{client?.name || 'Fournisseur'}</p>
          {client?.address && <p className="text-gray-600">{client.address}</p>}
          {client?.phone && <p className="text-gray-600">Tél: {client.phone}</p>}
          {client?.email && <p className="text-gray-600">Email: {client.email}</p>}
        </div>

        {/* Delivery Info */}
        <div className="border border-gray-300 rounded-lg p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Informations livraison / معلومات التسليم</h3>
          <p className="text-gray-600 mb-1">
            <span className="text-gray-500">Date de livraison souhaitée:</span>
          </p>
          <p className="font-semibold text-blue-700">
            {deliveryDate ? formatDate(deliveryDate) : 'À convenir'}
          </p>
          {settings?.business_address && (
            <p className="text-gray-600 mt-2 text-xs">
              <span className="text-gray-500">Lieu de livraison:</span><br />
              {settings.business_address}
            </p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase w-10">#</th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-20">Qté</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase w-20">Unité</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase w-32">P.U HT</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase w-32">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="py-3 px-4 border-b border-gray-200">{index + 1}</td>
              <td className="py-3 px-4 border-b border-gray-200 font-medium">{item.product_name || item.name}</td>
              <td className="py-3 px-4 border-b border-gray-200 text-center">{item.quantity}</td>
              <td className="py-3 px-4 border-b border-gray-200 text-center">{item.unit || 'pcs'}</td>
              <td className="py-3 px-4 border-b border-gray-200 text-right font-mono">
                {formatCurrency(item.unit_price)} DA
              </td>
              <td className="py-3 px-4 border-b border-gray-200 text-right font-mono font-semibold">
                {formatCurrency(item.total)} DA
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Sous-total HT:</span>
            <span className="font-mono">{formatCurrency(subtotal)} DA</span>
          </div>
          <div className="flex justify-between py-3 bg-blue-600 text-white px-4 rounded-lg mt-2">
            <span className="font-bold">Total HT:</span>
            <span className="font-bold font-mono">{formatCurrency(total || subtotal)} DA</span>
          </div>
        </div>
      </div>

      {/* Order Conditions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-800 mb-2">Conditions de commande / شروط الطلب:</h4>
        <p className="text-gray-700 text-sm">
          {orderConditions || 'Merci de confirmer la disponibilité et le délai de livraison avant exécution de cette commande.'}
        </p>
      </div>

      {/* Payment Conditions */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-gray-700 mb-2">Conditions de paiement / شروط الدفع:</h4>
        <p className="text-gray-700 text-sm">
          {paymentConditions || 'Paiement à 30 jours après réception de la marchandise et de la facture correspondante.'}
        </p>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Notes / ملاحظات:</p>
          <p className="text-gray-600 text-sm">{notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Client / Donneur d'ordre</p>
          <p className="text-xs text-gray-400 mb-12">العميل / مصدر الطلب</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Fournisseur / Bon pour accord</p>
          <p className="text-xs text-gray-400 mb-12">المورد / موافقة</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-500">
          Document généré le {new Date().toLocaleDateString('fr-DZ')} |
          Ce bon de commande est soumis à nos conditions générales d'achat
        </p>
      </div>
    </div>
  );
});

PurchaseOrderTemplate.displayName = 'PurchaseOrderTemplate';

export default PurchaseOrderTemplate;
