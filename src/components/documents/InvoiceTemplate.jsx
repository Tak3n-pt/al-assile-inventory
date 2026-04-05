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

const InvoiceTemplate = forwardRef(({ data, settings, language = 'fr' }, ref) => {
  const {
    number,
    date,
    client,
    items = [],
    subtotal,
    discount = 0,
    tva = 0,
    total,
    paidAmount = 0,
    notes
  } = data;

  const tvaRate = parseFloat(settings?.tva_rate || 19);
  const tvaAmount = subtotal * (tvaRate / 100);
  const totalTTC = subtotal + tvaAmount - discount;
  const remaining = totalTTC - paidAmount;

  // Number to words in French
  const numberToWordsFR = (num) => {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (num === 0) return 'zéro';
    if (num < 10) return units[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) {
        return tens[t - 1] + '-' + teens[u];
      }
      return tens[t] + (u ? '-' + units[u] : '');
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const r = num % 100;
      return (h === 1 ? 'cent' : units[h] + ' cent') + (r ? ' ' + numberToWordsFR(r) : '');
    }
    if (num < 1000000) {
      const th = Math.floor(num / 1000);
      const r = num % 1000;
      return (th === 1 ? 'mille' : numberToWordsFR(th) + ' mille') + (r ? ' ' + numberToWordsFR(r) : '');
    }
    return num.toLocaleString('fr-FR');
  };

  const amountInWords = (amount) => {
    const intPart = Math.floor(amount);
    const decPart = Math.round((amount - intPart) * 100);
    let result = numberToWordsFR(intPart) + ' dinars';
    if (decPart > 0) {
      result += ' et ' + numberToWordsFR(decPart) + ' centimes';
    }
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 w-[210mm] min-h-[297mm] mx-auto font-sans text-sm"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-emerald-600 pb-6">
        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-emerald-700 mb-2">
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

        {/* Invoice Title */}
        <div className="text-right">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-lg inline-block">
            <h2 className="text-xl font-bold">FACTURE</h2>
            <p className="text-emerald-100 text-sm">فاتورة</p>
          </div>
          <div className="mt-4 text-right">
            <p className="text-gray-500 text-xs">N° Facture:</p>
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
          <tr className="bg-emerald-600 text-white">
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
          <div className="flex justify-between py-3 bg-emerald-600 text-white px-4 rounded-lg mt-2">
            <span className="font-bold">Total TTC:</span>
            <span className="font-bold font-mono">{formatCurrency(totalTTC)} DA</span>
          </div>
          {paidAmount > 0 && (
            <>
              <div className="flex justify-between py-2 mt-2 text-green-600">
                <span>Montant payé:</span>
                <span className="font-mono">{formatCurrency(paidAmount)} DA</span>
              </div>
              <div className="flex justify-between py-2 text-red-600 font-semibold">
                <span>Reste à payer:</span>
                <span className="font-mono">{formatCurrency(remaining)} DA</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amount in Words */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-xs text-gray-500 mb-1">Arrêté la présente facture à la somme de:</p>
        <p className="font-semibold text-gray-800">{amountInWords(totalTTC)}</p>
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

InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;
