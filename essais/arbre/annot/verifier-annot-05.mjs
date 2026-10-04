// Vérifie annot-05.json contre le lot source et la liste de critères. node essais/arbre/annot/verifier-annot-05.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { verifier, rejouer } from '../../../public/arbre-moteur.js';
const R = new URL('../../../', import.meta.url);
const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, R), 'utf8'));
const lot = lire('essais/arbre/lots/lot-05.json'), annot = lire('essais/arbre/annot/annot-05.json'), arbre = lire('public/data/arbre.json');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
const T = Object.fromEntries(lot.map((d) => [d.id, d]));
assert.ok(Array.isArray(annot));
assert.deepEqual(annot.map((d) => d.id), lot.map((d) => d.id), 'mêmes décisions, même ordre que le lot');
let m = 0;
for (const d of annot) {
  const src = T[d.id], t = norm(src.texte);
  for (const k of ['source', 'date', 'url', 'code_officiel', 'hs6']) assert.equal(d[k], src[k], `${d.id} ${k}`);
  assert.equal(d.hs6, String(d.code_officiel).slice(0, 6), `${d.id} hs6`);
  assert.ok(d.produit && d.produit.split(/\s+/).length <= 12 && !d.produit.includes('—'), `${d.id} produit`);
  assert.ok(d.description.length > 0 && d.description.length <= 700, `${d.id} description ${d.description.length}`);
  assert.ok(t.includes(norm(d.description)), `${d.id} description non littérale`);
  assert.equal(d.motifs, '', `${d.id} motifs`);
  for (const [k, x] of Object.entries(d.criteres)) {
    const c = C[k];
    assert.ok(c, `${d.id} critère inconnu ${k}`);
    if (c.type === 'bool') assert.equal(typeof x.valeur, 'boolean', `${d.id} ${k}`);
    else assert.ok(c.valeurs.some((v) => v.v === x.valeur), `${d.id} ${k} valeur inconnue ${x.valeur}`);
    assert.ok(x.citation.length > 0 && x.citation.length <= 300, `${d.id} ${k} citation ${x.citation.length}`);
    assert.ok(t.includes(norm(x.citation)), `${d.id} ${k} citation non littérale`);
    m++;
  }
}
console.log(`${annot.length} décisions, ${m} valeurs, toutes citées mot pour mot`);
// Information seulement (aucune assertion d'accord avec le code officiel)
const pb = verifier(arbre), r = rejouer(arbre, annot);
console.log(`info moteur : arbre ${pb.length ? pb.length + ' défaut(s)' : 'jouable'} ; rejouer -> reproduit ${r.reproduit}, contredit ${r.contredit}, non tranché ${r.non_tranche}, hors périmètre ${r.hors_perimetre} sur ${r.total}`);
