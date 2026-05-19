// Shared formatting helpers used by all document templates, reports, and POS screens.
// Single source of truth — if a rounding or locale rule changes, fix it here.

// Round a number to 2dp to avoid IEEE-754 drift on accumulated totals
export const roundMoney = (v) => Math.round((Number(v) || 0) * 100) / 100;

// French (Algerian) decimal format, no currency symbol — templates add "DZD" themselves
export const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

// Same as formatCurrency but with " DZD" suffix baked in — convenient for report templates
// where the currency code travels with the value through table cells.
export const formatCurrencyDZD = (value) => formatCurrency(value) + ' DZD';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateLong = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('fr-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// French number-to-words (used in "amount in words" on invoices)
export const numberToWordsFR = (num) => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'zéro';
  if (n < 10) return units[n];
  if (n < 20) return teens[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) return tens[t - 1] + '-' + teens[u];
    return tens[t] + (u ? '-' + units[u] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h === 1 ? 'cent' : units[h] + ' cent') + (r ? ' ' + numberToWordsFR(r) : '');
  }
  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    return (th === 1 ? 'mille' : numberToWordsFR(th) + ' mille') + (r ? ' ' + numberToWordsFR(r) : '');
  }
  return n.toLocaleString('fr-FR');
};

// "Deux mille cinq cents dinars et cinquante centimes"
export const amountInWords = (amount) => {
  const value = Number(amount) || 0;
  const intPart = Math.floor(value);
  const decPart = Math.round((value - intPart) * 100);
  let result = numberToWordsFR(intPart) + ' dinars';
  if (decPart > 0) {
    result += ' et ' + numberToWordsFR(decPart) + ' centimes';
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// Compute invoice totals from a subtotal + discount + tvaRate (percentage, e.g. 19)
// Returns rounded { subtotal, discount, tvaAmount, totalTTC, remaining }
export const computeDocumentTotals = ({ subtotal = 0, discount = 0, tvaRate = 0, paidAmount = 0 } = {}) => {
  const sub = roundMoney(subtotal);
  const disc = roundMoney(discount);
  const tvaAmount = roundMoney(sub * (Number(tvaRate) || 0) / 100);
  const totalTTC = roundMoney(sub + tvaAmount - disc);
  const remaining = roundMoney(totalTTC - (Number(paidAmount) || 0));
  return { subtotal: sub, discount: disc, tvaAmount, totalTTC, remaining };
};
