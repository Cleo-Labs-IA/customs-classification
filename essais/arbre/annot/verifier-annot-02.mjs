// Contrôle indépendant de annot-02.json contre le lot et la liste de critères.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const ici = new URL('.', import.meta.url);
const lire = (p) => JSON.parse(readFileSync(new URL(p, ici), 'utf8'));
const lot = lire('../lots/lot-02.json'), annot = lire('annot-02.json'), arbre = lire('../../../public/data/arbre.json');
const { verifier, rejouer } = await import(new URL('../../../public/arbre-moteur.js', ici));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
const L = Object.fromEntries(lot.map((d) => [d.id, d]));
assert.equal(annot.length, lot.length, 'une annotation par décision du lot');
assert.equal(new Set(annot.map((d) => d.id)).size, annot.length, 'identifiants uniques');
let m = 0;
for (const d of annot) {
  const src = L[d.id];
  assert.ok(src, d.id + ' : absent du lot');
  for (const k of ['source', 'date', 'url', 'code_officiel', 'hs6']) assert.equal(d[k], src[k], `${d.id} : ${k} modifié`);
  assert.equal(d.hs6, String(d.code_officiel).slice(0, 6), d.id + ' : hs6');
  const t = norm(src.texte);
  assert.ok(d.description && d.description.length <= 700 && t.includes(norm(d.description)), d.id + ' : description non littérale ou trop longue');
  assert.ok(d.produit && d.produit.split(/\s+/).length <= 12 && !d.produit.includes('—'), d.id + ' : produit');
  assert.equal(d.motifs, '', d.id + ' : motifs');
  for (const [id, x] of Object.entries(d.criteres)) {
    const c = C[id];
    assert.ok(c, `${d.id} : critère inconnu ${id}`);
    if (c.type === 'bool') assert.equal(typeof x.valeur, 'boolean', `${d.id}.${id} : booléen attendu`);
    else assert.ok(c.valeurs.some((y) => y.v === x.valeur), `${d.id}.${id} : valeur hors liste ${x.valeur}`);
    assert.ok(x.citation && x.citation.length <= 300, `${d.id}.${id} : citation absente ou > 300`);
    assert.ok(t.includes(norm(x.citation)), `${d.id}.${id} : citation non littérale`);
    m++;
  }
}
// témoin négatif : une citation altérée doit être refusée par le même test
assert.ok(!norm(lot[0].texte).includes(norm(annot[0].description + ' zz')), 'le témoin négatif aurait dû échouer');
console.log(`${annot.length} décisions, ${m} valeurs, toutes citées mot pour mot`);
const pb = verifier(arbre), r = rejouer(arbre, annot);
console.log('moteur (information seulement) : arbre', pb.length ? pb.length + ' défauts' : 'jouable', '| rejeu', JSON.stringify({ total: r.total, reproduit: r.reproduit, contredit: r.contredit, non_tranche: r.non_tranche, hors_perimetre: r.hors_perimetre }));
