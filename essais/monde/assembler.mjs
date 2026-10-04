// Assemble ce que l'écran « World » affiche pour les deux produits de la démonstration :
// - les consultations réelles de la Cleo Legal API par pays (essais/monde/classements.json) ;
// - les exigences réglementaires dont la citation a été retrouvée mot pour mot dans le texte
//   officiel par essais/monde/verifier.mjs (les entrées non vérifiées sont écartées et comptées).
//   node essais/monde/assembler.mjs   →  public/data/monde-produits.json
import { readFileSync, writeFileSync } from 'node:fs';
const lire = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const couverture = lire('./couverture-brute.json').data.countries, classements = lire('./classements.json'), produits = lire('./produits.json');
const NOM = Object.fromEntries(couverture.map((c) => [c.country, c.name]));
const REGLE = { 'CHG-70W': '850440', 'NB-M1605N': '847130' }, FAMILLE = { 'CHG-70W': 'charger', 'NB-M1605N': 'laptop' };

const brutes = ['europe', 'ameriques', 'asie-pacifique'].flatMap((f) => lire(`./reglementation-${f}.json`));
const reglementation = brutes.filter((e) => e.verifie === true).map(({ verif_note, ...e }) => e);
const ecartees = brutes.length - reglementation.length;

const out = { fixe_le: new Date().toISOString().slice(0, 10), couverture: { pays: couverture.length, catalogue_national: couverture.filter((c) => c.level === 'national').length, six_chiffres: couverture.filter((c) => c.level !== 'national').length },
  produits: {}, noms: NOM, reglementation, exigences_ecartees: ecartees };
for (const p of produits) {
  const pays = {};
  for (const c of couverture) {
    const x = (classements[p.sku] || {})[c.country];
    const base = { niveau: c.level, bloc: c.via_bloc || null, systemes: (c.national_systems || []).map((s) => ({ systeme: s.system, version: s.source_version })) };
    if (!x) { pays[c.country] = { ...base, consulte: false }; continue; }
    if (x.erreur) { pays[c.country] = { ...base, consulte: true, erreur: x.erreur.slice(0, 160) }; continue; }
    const d = x.droits && x.droits.droits;
    pays[c.country] = { ...base, consulte: true, request_id: x.request_id, hs6_moteur: x.hs6, confiance: x.confiance_hs6, accord_regle: x.hs6 === REGLE[p.sku],
      ligne: x.ligne_nationale, droits: d ? { min: d.taux_min, max: d.taux_max, unite: d.unite, base: d.base_legale, version: d.version, lignes_lues: d.lignes_lues ?? null, ligne_exacte: d.ligne_exacte_connue !== false, miroir: d.niveau_source === 'mirror' } : null };
  }
  const v = Object.values(pays).filter((x) => x.consulte && !x.erreur);
  out.produits[p.sku] = { code_regle: REGLE[p.sku], famille: FAMILLE[p.sku], pays,
    bilan: { consultes: v.length, accord: v.filter((x) => x.accord_regle).length, desaccord: v.filter((x) => !x.accord_regle).length, lignes_nationales: v.filter((x) => x.accord_regle && x.ligne).length, droits_lus: v.filter((x) => x.droits).length, echecs: Object.values(pays).filter((x) => x.erreur).length,
      exigences: reglementation.filter((e) => e.produits.includes(FAMILLE[p.sku])).length, marches_exigences: new Set(reglementation.filter((e) => e.produits.includes(FAMILLE[p.sku])).map((e) => e.marche)).size } };
}
writeFileSync(new URL('../../public/data/monde-produits.json', import.meta.url), JSON.stringify(out));
for (const [sku, p] of Object.entries(out.produits)) console.log(sku, JSON.stringify(p.bilan));
console.log('exigences vérifiées', reglementation.length, '| écartées', ecartees, '| par marché', JSON.stringify(reglementation.reduce((a, e) => ({ ...a, [e.marche]: (a[e.marche] || 0) + 1 }), {})));
