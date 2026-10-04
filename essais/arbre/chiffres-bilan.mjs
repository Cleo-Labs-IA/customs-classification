// Chiffres du bilan : rejeu par le moteur, puis part des « reproduit » qui ne repose que sur des faits explicites.
import fs from 'node:fs';
import { verifier, rejouer } from '../../public/arbre-moteur.js';
const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const arbre = lire('../../public/data/arbre.json'), decisions = lire('../../public/data/decisions.json');
const D = Object.fromEntries(decisions.map((d) => [d.id, d]));
const r = rejouer(arbre, decisions);
console.log('verifier :', JSON.stringify(verifier(arbre)), '| critères', arbre.criteres.length, '| nœuds', Object.keys(arbre.noeuds).length);
console.log(`total ${r.total} reproduit ${r.reproduit} contredit ${r.contredit} non_tranche ${r.non_tranche} hors_perimetre ${r.hors_perimetre}`);
const appuis = {};
for (const d of decisions) for (const x of Object.values(d.criteres)) appuis[x.appui] = (appuis[x.appui] || 0) + 1;
console.log('appuis :', JSON.stringify(appuis));
const strict = {}, tout = {};
for (const l of r.lignes) {
  const d = D[l.id], faibles = l.r.chemin.filter((c) => d.criteres[c.critere].appui !== 'explicite').map((c) => `${c.critere}:${d.criteres[c.critere].appui}`);
  const s = d.source;
  (tout[s] ||= {})[l.verdict] = ((tout[s] ||= {})[l.verdict] || 0) + 1;
  if (l.verdict === 'reproduit' && !faibles.length) strict[s] = (strict[s] || 0) + 1;
  console.log([l.id, l.hs6, l.obtenu || '-', l.verdict, l.r.noeud || '', l.r.critere || '', faibles.join(',')].join(' | '));
}
console.log('reproduit sur faits explicites seuls :', JSON.stringify(strict), '| par source :', JSON.stringify(tout));
