// Search helpers used by the POS product filter.
//
// Design goals:
//   - Diacritic-agnostic: "café" matches "cafe", "dattes" matches "dâttes"
//   - Case-insensitive across name, barcode, description
//   - Multi-token AND: "dates premium" matches a product whose name contains both
//   - Ranked: exact match > prefix match > word-prefix > substring > all-tokens-match
//   - Fast: pure string ops, safe to run on every keystroke for a few hundred products

// NFD decomposes accented chars into base + combining mark; the \p{Mn} class strips marks.
export const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .trim();

// Split query on whitespace into non-empty tokens
const tokenize = (s) => normalize(s).split(/\s+/).filter(Boolean);

// Returns 0 when the product doesn't match at all (so callers can filter),
// or a positive number ordered by relevance (higher = better).
export const scoreProduct = (product, rawQuery) => {
  const q = normalize(rawQuery);
  if (!q) return 1; // empty query matches everything at tiebreak rank 1

  const name = normalize(product.name);
  const description = normalize(product.description);
  const barcode = normalize(product.barcode);

  // Barcode is never diacritic'd, but we keep it symmetric for consistency.
  if (barcode && barcode === q) return 10000;        // exact barcode — strongest signal
  if (name === q) return 9000;                       // exact name
  if (name.startsWith(q)) return 8000 - name.length; // prefix — shorter names rank first
  if (barcode && barcode.startsWith(q)) return 7000;

  // Word-prefix: any token of the name starts with query
  const nameTokens = name.split(/\s+/);
  if (nameTokens.some(tok => tok.startsWith(q))) return 6000;

  // Full-substring on name
  if (name.includes(q)) return 5000 - name.indexOf(q); // earlier match ranks higher

  // Multi-token AND match across name + description
  const qTokens = tokenize(rawQuery);
  if (qTokens.length > 1) {
    const haystack = name + ' ' + description;
    const allMatch = qTokens.every(tok => haystack.includes(tok));
    if (allMatch) return 4000;
  }

  if (barcode && barcode.includes(q)) return 3000;
  if (description && description.includes(q)) return 2000;

  return 0;
};

// Score-based filter+sort in one pass. Returns an array already ordered best-to-worst.
export const searchProducts = (products, rawQuery) => {
  const q = normalize(rawQuery);
  if (!q) {
    // No query → alphabetical
    return [...products].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
  }
  return products
    .map(p => ({ p, score: scoreProduct(p, rawQuery) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || normalize(a.p.name).localeCompare(normalize(b.p.name)))
    .map(x => x.p);
};

// Split a string by the positions where `query` (diacritic-insensitive) matches,
// returning tuples of [text, isMatch]. Used for highlighting in the UI.
// Works with multi-token queries — highlights each token.
export const splitForHighlight = (text, rawQuery) => {
  const raw = String(text || '');
  const qTokens = tokenize(rawQuery);
  if (!qTokens.length) return [[raw, false]];

  const haystack = normalize(raw);
  // Collect [start, end] ranges in the NORMALIZED string for each token
  const ranges = [];
  for (const tok of qTokens) {
    if (!tok) continue;
    let i = 0;
    while (true) {
      const idx = haystack.indexOf(tok, i);
      if (idx === -1) break;
      ranges.push([idx, idx + tok.length]);
      i = idx + tok.length;
    }
  }
  if (!ranges.length) return [[raw, false]];

  // Merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0].slice()];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
    else merged.push(ranges[i].slice());
  }

  // NFD-decomposition can change character indices. Keep it simple: if decomposed
  // length equals original length (true for most Latin-1 + digits), indices map 1:1.
  // For scripts that decompose (e.g., Arabic shadda), fall back to no-highlight.
  if (haystack.length !== raw.toLowerCase().length) return [[raw, false]];

  const parts = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) parts.push([raw.slice(cursor, s), false]);
    parts.push([raw.slice(s, e), true]);
    cursor = e;
  }
  if (cursor < raw.length) parts.push([raw.slice(cursor), false]);
  return parts;
};
