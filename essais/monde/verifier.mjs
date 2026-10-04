// Contrôle indépendant des textes réglementaires : pour chaque entrée, télécharge la source
// officielle et cherche la citation mot pour mot (espaces et typographie normalisés).
//   node essais/monde/verifier.mjs essais/monde/<fichier>.json
// Écrit le résultat dans le fichier lui-même : verifie (true | false), verifie_le, verif_note.
// Une entrée n'est « vérifiée » que si SA citation est retrouvée dans LA page de son url.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const norme = (s) => String(s || '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;|&#34;|&ldquo;|&rdquo;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&[a-z]+;|&#\d+;/g, ' ')
  .replace(/[‘’ʼ]/g, "'").replace(/[“”«»]/g, '"').replace(/[‐-―]/g, '-').replace(/[  -​ ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const texteHtml = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');

// EUR-Lex répond 202 sans contenu aux scripts : le même acte est lu sur l'entrepôt officiel de l'UE (cellar), par son numéro CELEX.
const celex = (url) => (/eur-lex\.europa\.eu/.test(url) ? (url.match(/CELEX(?::|%3A)([0-9A-Z()]+)/i) || [])[1] : null);
async function page(adresse) {
  const c = celex(adresse), url = c ? 'http://publications.europa.eu/resource/celex/' + c : adresse;
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36', 'Accept-Language': 'en', ...(c ? { Accept: 'application/xhtml+xml' } : {}) }, signal: AbortSignal.timeout(45000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const type = r.headers.get('content-type') || '', buf = Buffer.from(await r.arrayBuffer());
  if (/pdf/i.test(type) || buf.subarray(0, 4).toString() === '%PDF') return execFileSync('pdftotext', ['-layout', '-', '-'], { input: buf, maxBuffer: 1 << 28 }).toString();
  return texteHtml(buf.toString('utf8'));
}

const fichier = process.argv[2], data = JSON.parse(readFileSync(fichier, 'utf8')), cache = new Map();
let ok = 0;
for (const e of data) {
  e.verifie = false; e.verifie_le = new Date().toISOString().slice(0, 10);
  if (!/^https:\/\//.test(e.url || '') || String(e.citation || '').length < 40) { e.verif_note = 'url ou citation absente (40 caractères minimum)'; continue; }
  try {
    if (!cache.has(e.url)) cache.set(e.url, norme(await page(e.url)));
    const t = cache.get(e.url), c = norme(e.citation);
    if (t.includes(c)) { e.verifie = true; e.verif_note = 'citation retrouvée mot pour mot dans la source'; ok++; }
    else e.verif_note = `citation NON retrouvée dans la source (${t.length} caractères lus)`;
  } catch (err) { e.verif_note = 'source non lue : ' + String(err.message || err).slice(0, 120); }
}
writeFileSync(fichier, JSON.stringify(data, null, 1) + '\n');
for (const e of data) console.log(e.verifie ? 'OK  ' : 'FAIL', e.id, '|', e.verif_note);
console.log(`\n${ok}/${data.length} vérifiées dans ${fichier}`);
