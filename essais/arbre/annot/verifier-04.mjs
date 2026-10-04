// Vérifie annot-04.json contre le lot et contre arbre.json. Sort en erreur au premier défaut.
import fs from 'node:fs';
import { verifier, rejouer } from '../../../public/arbre-moteur.js';
const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const lot = lire('../lots/lot-04.json'), annot = lire('./annot-04.json'), arbre = lire('../../../public/data/arbre.json');
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const T = Object.fromEntries(lot.map((d) => [d.id, norm(d.texte)]));
const C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
const pb = []; let m = 0;
if (annot.length !== lot.length) pb.push(`nombre : ${annot.length} annotées pour ${lot.length} au lot`);
if (new Set(annot.map((d) => d.id)).size !== annot.length) pb.push('identifiants en double');
for (const d of annot) {
  const src = lot.find((x) => x.id === d.id), t = T[d.id];
  if (!t) { pb.push(`${d.id} : absent du lot`); continue; }
  for (const k of ['source', 'date', 'url', 'code_officiel', 'hs6']) if (d[k] !== src[k]) pb.push(`${d.id} : ${k} diffère du lot`);
  if (d.hs6 !== String(d.code_officiel).slice(0, 6)) pb.push(`${d.id} : hs6 incohérent`);
  if (!d.produit || d.produit.split(/\s+/).length > 12) pb.push(`${d.id} : produit vide ou > 12 mots`);
  if (/—/.test(JSON.stringify(d))) pb.push(`${d.id} : tiret cadratin`);
  if (!d.description || d.description.length > 700 || !t.includes(norm(d.description))) pb.push(`${d.id} : description absente du texte ou > 700`);
  for (const [k, x] of Object.entries(d.criteres)) {
    m++;
    const c = C[k];
    if (!c) { pb.push(`${d.id} : critère inconnu ${k}`); continue; }
    if (c.type === 'bool' ? typeof x.valeur !== 'boolean' : !c.valeurs.some((v) => v.v === x.valeur)) pb.push(`${d.id} : valeur hors domaine ${k}=${x.valeur}`);
    if (!x.citation || x.citation.length > 300 || !t.includes(norm(x.citation))) pb.push(`${d.id} : citation de ${k} absente du texte ou > 300`);
  }
}
if (pb.length) { console.error(pb.join('\n')); process.exit(1); }
console.log(`${annot.length} décisions, ${m} valeurs, toutes citées mot pour mot`);
// Information seulement, par le moteur officiel ; aucune annotation n'est ajustée d'après ce résultat.
const st = verifier(arbre), r = rejouer(arbre, annot);
console.log(`info moteur : structure ${st.length ? st.length + ' défaut(s)' : 'saine'} ; reproduit ${r.reproduit}, contredit ${r.contredit}, non tranché ${r.non_tranche}, hors périmètre ${r.hors_perimetre} sur ${r.total}`);
