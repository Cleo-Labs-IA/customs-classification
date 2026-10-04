// État du cockpit : commandes importées, catalogue, classifications, décisions humaines
// (validations, réponses aux exigences), simulations. Gardé dans ce navigateur.
// Chaque décision humaine entre au journal avec son auteur et son heure.
import { evaluer, aTraiter, avecValeurCommande } from './conformite.js';
import { normaliserClassification } from './classification.js';
import { versCommandes } from './csv.js';
import { classifier, etatServeur } from './api.js';

const CLE = 'cleo-conformite-v1';
const VIDE = { boutique: null, lignes: [], produits: {}, classifications: {}, validations: {}, attestations: {}, simulations: [], journal: [], qui: 'Équipe conformité', fluxDemo: false };
const CONCURRENCE = 3;

let etat = charger();
let statiques = { regles: [], modeles: [], avertissement: '', demo: null, mode: 'inconnu', api: '' };
const abonnes = new Set();

function charger() {
  try { const s = JSON.parse(localStorage.getItem(CLE) || 'null'); return s ? { ...VIDE, ...s } : { ...VIDE }; } catch { return { ...VIDE }; }
}
function sauver() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* stockage plein ou interdit : l'état reste en mémoire */ }
}
function changer(patch) {
  etat = { ...etat, ...(typeof patch === 'function' ? patch(etat) : patch) };
  sauver();
  abonnes.forEach((fn) => fn(etat));
}
export const lire = () => etat;
export const fixes = () => statiques;
export function abonner(fn) { abonnes.add(fn); return () => abonnes.delete(fn); }
const note = (quoi, sku = null) => ({ journal: [{ le: new Date().toISOString(), par: etat.qui, quoi, sku }, ...etat.journal].slice(0, 300) });

// Données fixes : règles de la veille, catalogue de démonstration, mode d'appel.
export async function demarrer() {
  const json = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [veille, demo, serveur] = await Promise.all([json('/data/veille.json'), json('/data/demo.json'), etatServeur()]);
  statiques = {
    regles: (veille && veille.regles) || [], modeles: (veille && veille.simulations) || [], avertissement: (veille && veille.avertissement) || '', fixeLe: veille && veille.fixe_le,
    demo, mode: serveur.mode, ia: serveur.ia, api: serveur.api,
  };
  fusionnerValidationsDossier();
  completerImages();
  // Une classification restée « en cours » à la fermeture de la page est relancée.
  const coupees = Object.entries(etat.classifications).filter(([, c]) => c.enCours).map(([sku]) => sku);
  if (coupees.length) changer((s) => ({ classifications: Object.fromEntries(Object.entries(s.classifications).filter(([k]) => !coupees.includes(k))) }));
  if (etat.lignes.length) lancerClassifications();
  if (etat.fluxDemo) basculerFlux(true);
  abonnes.forEach((fn) => fn(etat));
}

// Un état importé avant l'ajout des images les reçoit du catalogue de démonstration.
function completerImages() {
  const cat = Object.fromEntries(((statiques.demo && statiques.demo.produits) || []).map((p) => [p.sku, p]));
  const manquent = Object.values(etat.produits).filter((p) => !p.image && cat[p.sku] && cat[p.sku].image);
  if (manquent.length) changer((s) => ({ produits: { ...s.produits, ...Object.fromEntries(manquent.map((p) => [p.sku, { ...p, image: cat[p.sku].image }])) } }));
}

// Les codes validés dans la page « Dossier de classification » remontent ici.
function fusionnerValidationsDossier() {
  let cat = [];
  try { cat = JSON.parse(localStorage.getItem('catalogue') || '[]'); } catch { return; }
  const ajouts = {};
  for (const e of cat) {
    if (!e || !e.sku || !e.code || !e.validated_by) continue;
    const deja = etat.validations[e.sku];
    if (!deja || Date.parse(deja.le) < Date.parse(e.validated_at)) ajouts[e.sku] = { hs6: String(e.code).slice(0, 6), par: e.validated_by, le: e.validated_at, motif: 'Validé dans le dossier de classification' };
  }
  if (Object.keys(ajouts).length) changer((s) => ({ validations: { ...s.validations, ...ajouts } }));
}

export const regles = () => [...statiques.regles, ...etat.simulations];
export const contexte = (s = etat) => ({ classifications: s.classifications, validations: s.validations, attestations: s.attestations, regles: [...statiques.regles, ...s.simulations], maintenant: Date.now() });
export const evaluation = () => evaluer(etat.lignes, contexte());
export const aFaire = () => aTraiter(evaluation(), contexte());

// ---------- import ----------
const idLignes = (lignes, depuis = 0) => lignes.map((l, i) => ({ ...l, id: `${l.commande}:${l.sku}:${depuis + i}` }));
function produitsDe(lignes, catalogue = []) {
  const parSku = Object.fromEntries(catalogue.map((p) => [p.sku, p]));
  const out = { ...etat.produits };
  for (const l of lignes) {
    if (out[l.sku]) continue;
    const c = parSku[l.sku];
    out[l.sku] = c ? { ...c, faits: {} } : { sku: l.sku, nom: l.produit, description: l.produit, fiche_technique: '', origine: l.origine, teinte: 'gris', prix: l.prixUnitaire, faits: {} };
  }
  return out;
}
export function importerCsv(texte, { origine = 'CN', boutique = 'Boutique importée', plateforme = '' } = {}) {
  const r = versCommandes(texte, { origine });
  if (r.erreur || !r.lignes.length) return r;
  const lignes = idLignes(r.lignes);
  changer({ ...VIDE, qui: etat.qui, boutique: { nom: boutique, plateforme: plateforme || { shopify: 'Shopify', etsy: 'Etsy' }[r.format] || 'CSV', devise: lignes[0].devise, importeLe: new Date().toISOString(), synchroLe: new Date().toISOString() }, lignes, produits: produitsDe(lignes), ...note(`Import de ${lignes.length} lignes de commande (${r.format})`) });
  lancerClassifications();
  return r;
}
export async function importerDemo() {
  const demo = statiques.demo;
  const texte = await fetch('/data/demo-commandes.csv').then((x) => x.text());
  const r = versCommandes(texte, { origine: demo.boutique.origine });
  const parSku = Object.fromEntries(demo.produits.map((p) => [p.sku, p]));
  const lignes = idLignes(r.lignes.map((l) => ({ ...l, origine: (parSku[l.sku] || {}).origine || l.origine })));
  const maintenant = new Date().toISOString();
  changer({
    ...VIDE, qui: etat.qui,
    boutique: { ...demo.boutique, importeLe: maintenant, synchroLe: maintenant, demo: true },
    lignes, produits: Object.fromEntries(demo.produits.map((p) => [p.sku, { ...p, faits: {} }])),
    validations: demo.depart.validations, attestations: demo.depart.attestations,
    journal: [{ le: maintenant, par: etat.qui, quoi: `Import de la boutique de démonstration : ${lignes.length} lignes de commande` }, { le: demo.depart.validations['HDMI-2M'].le, par: 'Équipe démo', quoi: demo.depart.libelle }],
  });
  lancerClassifications();
  return r;
}
export function reinitialiser() { basculerFlux(false); changer({ ...VIDE, qui: etat.qui }); }

// ---------- classification (agent) ----------
const file = [];
let actifs = 0;
function paysPrincipal(sku) {
  const n = {};
  for (const l of etat.lignes) if (l.sku === sku) n[l.pays] = (n[l.pays] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FR';
}
export function lancerClassifications(force = []) {
  const skus = [...new Set(etat.lignes.map((l) => l.sku))].filter((s) => force.includes(s) || !etat.classifications[s] || etat.classifications[s].erreur);
  const nouveaux = skus.filter((s) => !file.includes(s));
  if (!nouveaux.length) return;
  changer((s) => ({ classifications: { ...s.classifications, ...Object.fromEntries(nouveaux.map((sku) => [sku, { enCours: true, depuis: new Date().toISOString() }])) } }));
  file.push(...nouveaux);
  pomper();
}
function pomper() {
  while (actifs < CONCURRENCE && file.length) {
    const sku = file.shift();
    actifs++;
    classer(sku).then((c) => changer((s) => ({ classifications: { ...s.classifications, [sku]: c } }))).finally(() => { actifs--; pomper(); });
  }
}
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function classer(sku, suite = null) {
  const p = etat.produits[sku], pays = paysPrincipal(sku), at = new Date().toISOString();
  if (suite) { await pause(900 + Math.random() * 900); return normaliserClassification(suite.data, { source: 'illustrative', pays, at }); }
  try {
    const r = await classifier({ sku, description: p.description, pays, faits: p.faits || {} });
    return normaliserClassification(r.data, { source: r.source, pays, requestId: r.request_id, secondes: r.secondes, enregistreeLe: r.enregistreeLe || null, envoye: r.envoye, at });
  } catch (e) { return { erreur: String(e.message || e), at }; }
}

// ---------- décisions humaines ----------
export function suitesDemo(sku) { return (statiques.mode === 'illustratif' && statiques.demo && statiques.demo.suites[sku]) || null; }
export async function repondreQuestion(sku, faits, indexSuite = null) {
  const p = etat.produits[sku];
  changer((s) => ({ produits: { ...s.produits, [sku]: { ...p, faits: { ...p.faits, ...faits } } }, classifications: { ...s.classifications, [sku]: { enCours: true, depuis: new Date().toISOString() } }, ...note(`Réponse à la question du moteur : ${Object.values(faits).join(' ; ')}`, sku) }));
  const suites = suitesDemo(sku), suite = suites && indexSuite != null ? { ...suites[indexSuite], source: 'illustrative' } : null;
  const c = await classer(sku, suite);
  changer((s) => ({ classifications: { ...s.classifications, [sku]: c } }));
  return c;
}
export function valider(sku, hs6, motif = '') {
  changer((s) => ({ validations: { ...s.validations, [sku]: { hs6: String(hs6).slice(0, 6), par: s.qui, le: new Date().toISOString(), motif } }, ...note(`Code ${String(hs6).slice(0, 6)} validé${motif ? ' : ' + motif : ''}`, sku) }));
}
export function retirerValidation(sku) {
  changer((s) => { const v = { ...s.validations }; delete v[sku]; return { validations: v, ...note('Validation du code retirée', sku) }; });
}
export function attester(sku, regleId, reponse, motif = '') {
  const r = regles().find((x) => x.id === regleId);
  changer((s) => ({ attestations: { ...s.attestations, [`${sku}|${regleId}`]: { reponse, par: s.qui, le: new Date().toISOString(), motif } }, ...note(`${r ? r.titre : regleId} : ${reponse ? 'oui' : 'non'}${motif ? ' (' + motif + ')' : ''}`, sku) }));
}
export function retirerAttestation(sku, regleId) {
  changer((s) => { const a = { ...s.attestations }; delete a[`${sku}|${regleId}`]; return { attestations: a, ...note('Réponse retirée : ' + regleId, sku) }; });
}
export function expedier(ids) {
  const le = new Date().toISOString(), set = new Set(ids);
  changer((s) => ({ lignes: s.lignes.map((l) => (set.has(l.id) ? { ...l, expedition: 'expediee', expedieeLe: le } : l)), ...note(`${ids.length} ligne(s) marquée(s) expédiée(s)`) }));
}
export function nommer(qui) { changer({ qui: String(qui).trim().slice(0, 40) || 'Équipe conformité' }); }

// ---------- simulations ----------
const VILLES = { 'America/New_York': 'Washington', 'Europe/Brussels': 'Bruxelles', 'Asia/Tokyo': 'Tokyo', 'Australia/Sydney': 'Canberra' };
// Prochain minuit dans un fuseau donné, en instant absolu.
export function prochainMinuit(fuseau, maintenant = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: fuseau, hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(maintenant)).map((p) => [p.type, Number(p.value)]));
  const ecoule = parts.hour * 3600 + parts.minute * 60 + parts.second;
  return new Date(Math.floor(maintenant / 1000) * 1000 + (86400 - ecoule) * 1000).toISOString();
}
export function simuler(id) {
  const m = statiques.modeles.find((x) => x.id === id);
  if (!m || etat.simulations.some((x) => x.id === id)) return;
  const fuseau = m.debut.startsWith('minuit:') ? m.debut.split(':')[1] : null;
  const debut = fuseau ? prochainMinuit(fuseau) : m.debut === 'maintenant' ? new Date().toISOString() : m.debut;
  const heureLocale = fuseau ? 'minuit, heure de ' + (VILLES[fuseau] || fuseau) : null;
  changer((s) => ({ simulations: [...s.simulations, { ...m, debut, heureLocale, publieeLe: new Date().toISOString() }], ...note('Simulation publiée : ' + m.titre) }));
}
export function retirerSimulations() { changer({ simulations: [], ...note('Simulations retirées') }); }

// ---------- flux de commandes simulées (synchronisation en continu) ----------
let minuterie = null;
const DESTS = ['US', 'FR', 'JP', 'DE', 'GB', 'AU', 'IT', 'CA', 'ES', 'KR'];
export function basculerFlux(on) {
  clearInterval(minuterie);
  minuterie = null;
  if (on) minuterie = setInterval(nouvelleCommande, 6500);
  if (etat.fluxDemo !== on) changer({ fluxDemo: on });
}
function nouvelleCommande() {
  const skus = Object.keys(etat.produits);
  if (!skus.length) return;
  const p = etat.produits[skus[Math.floor(Math.random() * skus.length)]];
  const pays = DESTS[Math.floor(Math.random() * DESTS.length)];
  const n = Math.max(1000, ...etat.lignes.map((l) => parseInt(String(l.commande).replace(/\D/g, ''), 10) || 0)) + 1;
  const l = { commande: '#' + n, date: new Date().toISOString(), sku: p.sku, produit: p.nom, quantite: 1, prixUnitaire: p.prix || 30, devise: (etat.boutique && etat.boutique.devise) || 'EUR', pays, origine: p.origine || 'CN', client: 'Commande simulée', expedition: 'a_expedier', simulee: true };
  changer((s) => ({ lignes: [...s.lignes, ...idLignes([l], s.lignes.length)], boutique: { ...s.boutique, synchroLe: new Date().toISOString() } }));
  const ev = evaluer(avecValeurCommande([l]), contexte()).lignes[0];
  window.dispatchEvent(new CustomEvent('nouvelle-commande', { detail: ev }));
}
