// Assemble les annotations (annot/annot-*.json) en public/data/decisions.json, puis rejoue l'arbre.
// Déterministe : mêmes fichiers en entrée, mêmes octets en sortie. Ne modifie ni arbre.json ni
// aucune valeur annotée ; la seule correction possible est le RETRAIT d'un critère dont la
// citation n'est pas retrouvée mot pour mot dans le texte du candidat (retraits comptés).
//
// « Mot pour mot » = sous-chaîne du texte du candidat après réduction des suites de blancs à une
// espace (même règle que annot/verifier-*.mjs). Le nombre de citations qui passent aussi sans
// aucune normalisation est affiché à part.
import fs from 'node:fs';
import { verifier, rejouer } from '../../public/arbre-moteur.js';

const ici = (p) => new URL(p, import.meta.url);
const lire = (p) => JSON.parse(fs.readFileSync(ici(p), 'utf8'));
const ecrire = (p, v) => fs.writeFileSync(ici(p), JSON.stringify(v, null, 1) + '\n');
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const candidats = lire('./candidats.json');
const arbre = lire('../../public/data/arbre.json');
const fichiers = fs.readdirSync(ici('./annot/')).filter((f) => /^annot-.*\.json$/.test(f)).sort();

const CAND = Object.fromEntries(candidats.map((c) => [c.id, c]));
const CRIT = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));

// 1. Fusion
const fusion = [], parFichier = {}, vus = new Map(), doublons = [];
for (const f of fichiers) {
  const lot = lire('./annot/' + f);
  parFichier[f] = lot.length;
  for (const d of lot) {
    if (vus.has(d.id)) { doublons.push(`${d.id} (${vus.get(d.id)} et ${f})`); continue; }
    vus.set(d.id, f);
    fusion.push(d);
  }
}

// 2. Recontrôle contre le texte du candidat
const retraits = [], defauts = [];
let citationsLues = 0, citationsGardees = 0, citationsStrictes = 0, descriptionsOk = 0, motifsOk = 0, motifsVides = 0;
const decisions = [];
for (const d of fusion) {
  const c = CAND[d.id];
  if (!c) { defauts.push(`${d.id} : absent de candidats.json, décision écartée`); continue; }
  for (const k of ['source', 'date', 'url', 'code_officiel', 'hs6']) if (d[k] !== c[k]) defauts.push(`${d.id} : ${k} diffère du candidat`);
  const t = norm(c.texte);
  if (d.description && t.includes(norm(d.description))) descriptionsOk++;
  else defauts.push(`${d.id} : description non retrouvée mot pour mot`);
  if (!d.motifs) motifsVides++;
  else if (t.includes(norm(d.motifs))) motifsOk++;
  else defauts.push(`${d.id} : motifs non retrouvés mot pour mot`);
  const criteres = {};
  for (const [k, x] of Object.entries(d.criteres || {})) {
    citationsLues++;
    const def = CRIT[k];
    const valide = def && (def.type === 'bool' ? typeof x.valeur === 'boolean' : (def.valeurs || []).some((v) => v.v === x.valeur));
    const cite = !!x.citation && norm(x.citation) !== '' && t.includes(norm(x.citation));
    if (!def) { retraits.push({ id: d.id, critere: k, raison: 'critère inconnu de l\'arbre' }); continue; }
    if (!cite) { retraits.push({ id: d.id, critere: k, raison: 'citation non retrouvée mot pour mot' }); continue; }
    if (!valide) defauts.push(`${d.id} : valeur hors domaine ${k}=${x.valeur} (gardée telle quelle)`);
    if (c.texte.includes(x.citation)) citationsStrictes++;
    citationsGardees++;
    criteres[k] = x;
  }
  decisions.push({ ...d, criteres });
}

// 3. Tri : source croissante, puis date décroissante, puis identifiant (départage stable)
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
decisions.sort((a, b) => cmp(a.source, b.source) || cmp(b.date, a.date) || cmp(a.id, b.id));
ecrire('../../public/data/decisions.json', decisions);

// 4. Rejeu par le moteur
const structure = verifier(arbre);
const r = rejouer(arbre, decisions);
const SRC = Object.fromEntries(decisions.map((d) => [d.id, d.source]));
const vide = () => ({ total: 0, reproduit: 0, contredit: 0, non_tranche: 0, hors_perimetre: 0 });
const par_source = {};
for (const l of r.lignes) {
  const s = (par_source[SRC[l.id]] ||= vide());
  s.total++; s[l.verdict]++;
}
const rejeu = {
  total: r.total, reproduit: r.reproduit, contredit: r.contredit, non_tranche: r.non_tranche, hors_perimetre: r.hors_perimetre,
  par_source: Object.fromEntries(Object.entries(par_source).sort(([a], [b]) => cmp(a, b))),
  lignes: r.lignes.map((l) => ({ id: l.id, hs6: l.hs6, obtenu: l.obtenu, verdict: l.verdict,
    critere_manquant: l.verdict === 'non_tranche' ? l.r.critere : null })),
};
ecrire('./rejeu.json', rejeu);

// 5. Compte rendu
const absents = candidats.filter((c) => !vus.has(c.id)).map((c) => c.id);
console.log(`fichiers : ${fichiers.map((f) => `${f}=${parFichier[f]}`).join(', ')}`);
console.log(`décisions : ${decisions.length} écrites sur ${fusion.length} fusionnées (${candidats.length} candidats ; doublons ${doublons.length} ; candidats sans annotation ${absents.length})`);
console.log(`descriptions mot pour mot : ${descriptionsOk}/${fusion.length} ; motifs mot pour mot : ${motifsOk}/${fusion.length - motifsVides} (${motifsVides} vides)`);
console.log(`citations : ${citationsLues} lues, ${citationsGardees} gardées, ${retraits.length} retirées ; ${citationsStrictes} passent aussi sans normaliser les blancs`);
console.log(`structure de l'arbre : ${structure.length ? structure.length + ' défaut(s)' : 'saine'}`);
console.log(`rejeu : total ${rejeu.total}, reproduit ${rejeu.reproduit}, contredit ${rejeu.contredit}, non tranché ${rejeu.non_tranche}, hors périmètre ${rejeu.hors_perimetre}`);
for (const [s, v] of Object.entries(rejeu.par_source)) console.log(`  ${s} : total ${v.total}, reproduit ${v.reproduit}, contredit ${v.contredit}, non tranché ${v.non_tranche}, hors périmètre ${v.hors_perimetre}`);
for (const x of retraits) console.log(`retrait : ${x.id} / ${x.critere} : ${x.raison}`);
for (const x of doublons) console.log(`doublon : ${x}`);
for (const x of absents) console.log(`sans annotation : ${x}`);
for (const x of defauts) console.log(`défaut : ${x}`);
for (const x of structure) console.log(`structure : ${x}`);
if (defauts.length || doublons.length || structure.length) process.exitCode = 1;
