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

const addDays = (dateString, days) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ProformaTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    client,
    items = [],
    subtotal,
    discount = 0,
    tva = 0,
    total,
    validityDays = 30,
    notes,
    paymentTerms
  } = data;

  const tvaRate = parseFloat(settings?.tva_rate || 19);
  const tvaAmount = subtotal * (tvaRate / 100);
  const totalTTC = subtotal + tvaAmount - discount;

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div className="text-9xl font-bold text-violet-600 rotate-[-30deg]">PROFORMA</div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-violet-600 pb-6 relative">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-violet-700 mb-2">
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
          <div className="bg-violet-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">FACTURE PROFORMA</h2>
            <p className="text-violet-100 text-sm">فاتورة مبدئية</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° Proforma:</p>
            <p className="font-bold text-lg">{number}</p>
            <p className="text-gray-500 text-xs mt-2">Date:</p>
            <p className="font-semibold">{formatDate(date)}</p>
          </div>
        </div>
      </div>

      {/* Validity Notice */}
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-violet-800 font-semibold">Offre valable jusqu'au:</p>
          <p className="text-violet-600">{addDays(date, validityDays)}</p>
        </div>
        <div className="text-right text-sm text-violet-600">
          <p>Validité: {validityDays} jours</p>
          <p dir="rtl" className="text-xs">صلاحية العرض: {validityDays} يوم</p>
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

      {/* Client Info */}
      <div className="mb-6 border border-gray-300 rounded-lg p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Client / العميل</h3>
        <p className="font-bold text-lg">{client?.name || 'Client'}</p>
        {client?.address && <p className="text-gray-600">{client.address}</p>}
        {client?.phone && <p className="text-gray-600">Tél: {client.phone}</p>}
        {client?.email && <p className="text-gray-600">Email: {client.email}</p>}
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-violet-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">#</th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase">Qté</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase">Unité</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase">P.U HT</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase">Total HT</th>
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
          {discount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200 text-orange-600">
              <span>Remise:</span>
              <span className="font-mono">-{formatCurrency(discount)} DA</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">TVA ({tvaRate}%):</span>
            <span className="font-mono">{formatCurrency(tvaAmount)} DA</span>
          </div>
          <div className="flex justify-between py-3 bg-violet-600 text-white px-4 rounded-lg mt-2">
            <span className="font-bold">Total TTC:</span>
            <span className="font-bold font-mono">{formatCurrency(totalTTC)} DA</span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-amber-800 mb-2">Conditions de paiement:</h4>
        <p className="text-gray-700 text-sm">
          {paymentTerms || 'Paiement à la commande. Cette proforma est valable pour la durée indiquée ci-dessus.'}
        </p>
      </div>

      {/* Bank Info */}
      {settings?.business_rib && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-xs text-gray-500 mb-1">Coordonnées bancaires / RIB:</p>
          <p className="font-mono text-sm">{settings.business_rib}</p>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1">Notes:</p>
          <p className="text-gray-600 text-sm">{notes}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 text-center">
        <p className="text-sm text-gray-600 font-medium">
          Ce document n'a pas valeur de facture. Il s'agit d'une offre de prix.
        </p>
        <p className="text-xs text-gray-500 mt-1" dir="rtl">
          هذه الوثيقة ليست فاتورة رسمية. إنها عرض أسعار.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-end">
        <div className="text-xs text-gray-500">
          <p>Document généré le {new Date().toLocaleDateString('fr-DZ')}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-8">Signature et Cachet</p>
          <div className="w-40 h-16 border-b border-gray-400"></div>
        </div>
      </div>
    </div>
  );
});

ProformaTemplate.displayName = 'ProformaTemplate';

export default ProformaTemplate;
