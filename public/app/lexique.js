// Plain-language labels for the technical terms the API returns, so a merchant can read
// a screen without knowing tariff jargon. Pure functions, shared by the views and the tests.

// Tariff system codes returned by the Cleo Legal API → who uses them.
const SYSTEMES = {
  hs6: 'International code (6 digits)',
  cn8: 'EU code', uk10: 'UK code', ch8: 'Swiss code', no8: 'Norway code',
  hts: 'US code', ca8: 'Canada code', ca10: 'Canada code', tigie8: 'Mexico code',
  jp9: 'Japan code', hsk10: 'South Korea code', au8: 'Australia code', au10: 'Australia code', nz8: 'New Zealand code',
  il10: 'Israel code', itchs8: 'India code', tn_ved: 'Eurasian Union code', gcc12: 'Gulf states code',
  ahtn8: 'Southeast Asia code', ncm8: 'Mercosur code', nandina8: 'Andean code', caricom8: 'Caribbean code',
  eac8: 'East Africa code', ecowas10: 'West Africa code', sacu8: 'Southern Africa code',
};
export const systeme = (s) => SYSTEMES[String(s || '').toLowerCase()] || 'National code';

// A 0–1 score from the API → a word. Thresholds follow the API's own acceptance floors
// (0.9 for the strongest model, 0.7 for the fallback).
export function confiance(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return '';
  if (x >= 0.85) return 'High confidence';
  if (x >= 0.6) return 'Medium confidence';
  return 'Low confidence';
}

// A duty range read from the tariff → a sentence. Null means nothing was read: say so,
// never show it as 0 %.
export function droit(d) {
  if (!d) return { texte: 'Duty unknown', connu: false };
  const u = d.unite || '%', v = d.min === d.max ? `${d.min}${u}` : `${d.min}–${d.max}${u}`;
  return { texte: `Duty ${v}`, connu: true, approx: !d.ligne_exacte };
}

// The API's coverage hint is written for developers (it names an endpoint). Keep the meaning.
export function couverture(texte) {
  const t = String(texte || '');
  if (!t) return '';
  if (/hs6 \(6 digits\) only|six digits only|no national catalog/i.test(t)) return 'For this country, only the 6-digit international code is available; the national digits are not proposed.';
  return t.replace(/\s*See GET \S+\.?/g, '').trim();
}

// The four statuses an order line can have, in the words used everywhere.
export const STATUTS = [
  ['pret', 'Ready', 'Code signed and every rule for the country met. The line can ship.'],
  ['a_verifier', 'To check', 'Waiting for something: a code to sign, a question, or a document.'],
  ['bloque', 'Blocked', 'A rule of the destination country forbids it as it stands.'],
  ['en_attente', 'In progress', 'The product is being classified.'],
];
