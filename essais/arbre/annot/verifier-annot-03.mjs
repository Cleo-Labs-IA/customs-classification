// Vérifie annot-03.json contre le lot et contre les critères de arbre.json.
// node verifier-annot-03.mjs            -> contrôle réel
// node verifier-annot-03.mjs --temoin   -> altère une citation en mémoire : doit échouer
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { verifier, rejouer } from '../../../public/arbre-moteur.js';
const ici = new URL('.', import.meta.url);
const lire = (p) => JSON.parse(readFileSync(new URL(p, ici), 'utf8'));
const lot = lire('../lots/lot-03.json'), annot = lire('annot-03.json'), arbre = lire('../../../public/data/arbre.json');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
if (process.argv.includes('--temoin')) { const d = annot.find((x) => Object.keys(x.criteres).length); const k = Object.keys(d.criteres)[0]; d.criteres[k].citation += ' xyz'; }
const C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
const L = Object.fromEntries(lot.map((d) => [d.id, d]));
assert.equal(annot.length, lot.length, 'une annotation par décision du lot');
assert.equal(new Set(annot.map((d) => d.id)).size, annot.length, 'identifiants uniques');
let m = 0;
for (const d of annot) {
  const s = L[d.id]; assert.ok(s, d.id + ' absent du lot');
  for (const k of ['source', 'date', 'url', 'code_officiel', 'hs6']) assert.equal(d[k], s[k], `${d.id}.${k}`);
  assert.equal(d.hs6, String(d.code_officiel).slice(0, 6), d.id + ' hs6');
  assert.ok(d.produit && d.produit.split(/\s+/).length <= 12 && !d.produit.includes('—'), d.id + ' produit');
  const t = norm(s.texte);
  assert.ok(d.description && d.description.length <= 700 && t.includes(norm(d.description)), d.id + ' description non littérale');
  assert.equal(d.motifs, '', d.id + ' motifs');
  for (const [k, x] of Object.entries(d.criteres)) {
    const c = C[k]; assert.ok(c, `${d.id} : critère inconnu ${k}`);
    if (c.type === 'bool') assert.equal(typeof x.valeur, 'boolean', `${d.id}.${k}`);
    else assert.ok(c.valeurs.some((v) => v.v === x.valeur), `${d.id}.${k} : valeur inconnue ${x.valeur}`);
    assert.ok(x.citation && x.citation.length <= 300, `${d.id}.${k} : citation de plus de 300 caractères`);
    assert.ok(t.includes(norm(x.citation)), `${d.id}.${k} : citation non littérale`);
    m++;
  }
}
console.log(`${annot.length} décisions, ${m} valeurs, toutes citées mot pour mot`);
// Information seulement (le moteur lit le format) : aucune annotation n'est ajustée d'après ce résultat.
const pb = verifier(arbre), r = rejouer(arbre, annot);
console.log(`moteur : verifier() ${pb.length} défaut(s) ; rejouer() total ${r.total}, reproduit ${r.reproduit}, contredit ${r.contredit}, non tranché ${r.non_tranche}, hors périmètre ${r.hors_perimetre}`);
