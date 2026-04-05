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

const CreditNoteTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    originalInvoiceNumber,
    client,
    items = [],
    subtotal,
    discount = 0,
    tva = 0,
    total,
    returnReason,
    notes
  } = data;

  const tvaRate = parseFloat(settings?.tva_rate || 19);
  const tvaAmount = (subtotal || 0) * (tvaRate / 100);
  const creditTotal = (subtotal || 0) + tvaAmount - (discount || 0);

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-red-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-red-700 mb-2">
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
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">AVOIR</h2>
            <p className="text-red-100 text-sm">إشعار دائن</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° Avoir:</p>
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

      {/* Reference to Original Invoice */}
      {originalInvoiceNumber && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-red-800 font-semibold text-xs uppercase tracking-wide mb-1">
              Réf. Facture / مرجع الفاتورة
            </p>
            <p className="text-red-700 font-bold text-lg">{originalInvoiceNumber}</p>
          </div>
          <div className="text-right text-sm text-red-600">
            <p>Cet avoir annule partiellement ou totalement</p>
            <p>la facture référencée ci-contre.</p>
          </div>
        </div>
      )}

      {/* Client Info */}
      <div className="mb-6 border border-gray-300 rounded-lg p-4">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2">Client / العميل</h3>
        <p className="font-bold text-lg">{client?.name || 'Client'}</p>
        {client?.address && <p className="text-gray-600">{client.address}</p>}
        {client?.phone && <p className="text-gray-600">Tél: {client.phone}</p>}
        {client?.email && <p className="text-gray-600">Email: {client.email}</p>}
      </div>

      {/* Return Reason */}
      {returnReason && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
          <h4 className="font-semibold text-amber-800 mb-2 text-xs uppercase tracking-wide">
            Motif du retour / سبب الإرجاع:
          </h4>
          <p className="text-gray-700 text-sm">{returnReason}</p>
        </div>
      )}

      {/* Items Table — amounts shown as credits */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="bg-red-600 text-white">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">#</th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase">Désignation / التسمية</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase">Qté</th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase">Unité</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase">P.U HT</th>
            <th className="py-3 px-4 text-right text-xs font-semibold uppercase">Crédit HT</th>
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
              <td className="py-3 px-4 border-b border-gray-200 text-right font-mono font-semibold text-red-600">
                -{formatCurrency(item.total)} DA
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Credit Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Sous-total HT:</span>
            <span className="font-mono text-red-600">-{formatCurrency(subtotal)} DA</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between py-2 border-b border-gray-200 text-orange-600">
              <span>Remise:</span>
              <span className="font-mono">{formatCurrency(discount)} DA</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">TVA ({tvaRate}%):</span>
            <span className="font-mono text-red-600">-{formatCurrency(tvaAmount)} DA</span>
          </div>
          <div className="flex justify-between py-3 bg-red-600 text-white px-4 rounded-lg mt-2">
            <span className="font-bold">Total Avoir TTC:</span>
            <span className="font-bold font-mono">-{formatCurrency(total || creditTotal)} DA</span>
          </div>
        </div>
      </div>

      {/* Credit Notice */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 text-center">
        <p className="text-sm text-gray-700 font-medium">
          Ce crédit sera déduit de votre prochaine facture ou remboursé selon accord.
        </p>
        <p className="text-xs text-gray-500 mt-1" dir="rtl">
          سيتم خصم هذا الرصيد من فاتورتك القادمة أو إعادته وفقًا للاتفاق.
        </p>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Notes / ملاحظات:</p>
          <p className="text-gray-600 text-sm">{notes}</p>
        </div>
      )}

      {/* Bank Info */}
      {settings?.business_rib && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-xs text-gray-500 mb-1">Coordonnées bancaires / RIB:</p>
          <p className="font-mono text-sm">{settings.business_rib}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-12">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Client / Bon pour accord</p>
          <p className="text-xs text-gray-400 mb-12">العميل / موافقة</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Émetteur / Société</p>
          <p className="text-xs text-gray-400 mb-12">الشركة المصدرة</p>
          <div className="border-b border-gray-400 mb-2"></div>
          <p className="text-xs text-gray-400">Signature & Cachet</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-end">
        <div className="text-xs text-gray-500">
          <p>Document généré le {new Date().toLocaleDateString('fr-DZ')}</p>
        </div>
        <div className="text-xs text-gray-500 text-right">
          {originalInvoiceNumber && (
            <p>En référence à la facture N° {originalInvoiceNumber}</p>
          )}
        </div>
      </div>
    </div>
  );
});

CreditNoteTemplate.displayName = 'CreditNoteTemplate';

export default CreditNoteTemplate;
