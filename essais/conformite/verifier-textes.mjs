// Checks that every "texte" of public/data/textes-conformite.json is found word for word in the act downloaded
// from the EU Publications Office (essais/conformite/sources/<version>.xhtml).
// The source is read here from the XHTML itself, with this file's own tag stripping (not the builder's .txt output).
// The only normalisation, on both sides: any run of white space becomes one space.
// Then a negative control: one word of one entry is altered in memory and must be rejected.
// If public/data/exigences.json exists, its text ids are checked with the engine's verifierExigences.
// Run: node essais/conformite/verifier-textes.mjs      (exit code 0 only if everything holds)
import { readFileSync, existsSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const NOMS = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const lireSource = (version) => {
  const f = new URL(`sources/${version}.xhtml`, ici);
  if (!existsSync(f)) return null;
  let x = readFileSync(f, 'utf8');
  x = x.replace(/<head[\s\S]*?<\/head>/i, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  x = x.replace(/<\/?(?:span|a|i|b|em|strong|sup|sub)(?:\s[^>]*)?>/gi, ''); // inline tags do not break a word
  x = x.replace(/<[^>]*>/g, ' ');                                            // any other tag separates
  x = x.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
  x = x.replace(/&([a-z]+);/g, (m, n) => (n in NOMS ? NOMS[n] : m));
  return norm(x);
};
const sources = new Map();
const source = (v) => { if (!sources.has(v)) sources.set(v, lireSource(v)); return sources.get(v); };

// Returns the list of defects of one entry (empty when sound).
const defauts = (t, ids) => {
  const pb = [];
  if (!/^[a-z0-9-]+$/.test(t.id || '')) pb.push('id is not lower-case ascii');
  if (ids) { if (ids.has(t.id)) pb.push('duplicate id'); ids.add(t.id); }
  for (const k of ['ref', 'source', 'celex', 'version', 'url']) if (!t[k]) pb.push('missing field: ' + k);
  if (t.url && !String(t.url).startsWith('https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:')) pb.push('url is not a EUR-Lex address');
  for (const k of ['ref', 'source']) if (/[\u2014\u2013]/.test(t[k] || '')) pb.push('dash in ' + k);
  if (/[\u25BC\u25BA\u25C4]/.test(t.texte || '')) pb.push('consolidation marker inside the text');
  const x = norm(String(t.texte || ''));
  const s = t.version ? source(t.version) : null;
  if (!x) pb.push('empty text');
  else if (s === null) pb.push('source file not downloaded: ' + t.version);
  else if (!s.includes(x)) pb.push('text not found in the source');
  return pb;
};

const textes = JSON.parse(readFileSync(new URL('../../public/data/textes-conformite.json', ici), 'utf8'));
let ok = 0;
const ids = new Set();
for (const t of textes) {
  const pb = defauts(t, ids);
  if (pb.length) console.error(`FAIL ${t.id}: ${pb.join('; ')}`); else ok++;
}
console.log(`${ok}/${textes.length} texts found verbatim`);
let echec = !(ok === textes.length && textes.length > 0);

// Negative control: swap one word of a sound entry, the check must now fail on that entry.
const temoin = textes.find((t) => / shall /.test(t.texte));
if (!temoin) { console.error('negative control: no entry to alter'); echec = true; } else {
  const altere = { ...temoin, texte: temoin.texte.replace(' shall ', ' may ') };
  const rejete = defauts(altere, null).includes('text not found in the source');
  const intact = defauts(temoin, null).length === 0;
  console.log(`negative control on ${temoin.id} ("shall" replaced by "may"): ${rejete ? 'rejected as expected' : 'NOT REJECTED'}; original entry ${intact ? 'still accepted' : 'NOT ACCEPTED'}`);
  if (!rejete || !intact) echec = true;
}

// Optional: the rules file written by another team must only cite text ids that exist here (engine check, not reimplemented).
const fx = new URL('../../public/data/exigences.json', ici);
if (existsSync(fx)) {
  const { verifierExigences } = await import('../../public/exigences-moteur.js');
  const pb = verifierExigences(JSON.parse(readFileSync(fx, 'utf8')), textes);
  console.log(`exigences.json: ${pb.length} structural defect(s) reported by the engine`);
  for (const p of pb) console.error('  ' + p);
  if (pb.length) echec = true;
} else console.log('exigences.json: not present yet, engine check skipped');

process.exit(echec ? 1 : 0);
