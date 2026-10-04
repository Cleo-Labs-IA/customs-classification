// Dossier de classification d'un produit : l'état et les gestes (reprise du parcours
// historique). Une photo, une étiquette, un pictogramme, l'adresse d'une fiche produit ou
// un texte deviennent des pièces ; les pièces sont lues, les contradictions tranchées,
// le produit classé, la règle encodée parcourue, la proposition éprouvée puis signée.
import { evaluer } from '../../arbre-moteur.js';
import { decider, arbitrageValide } from '../../decision.js';
import { classifier, lectureIA, post } from '../api.js';
import { regle } from '../regle.js';
import { versJpeg } from './photo.js';
import { effectif, valeursFaits, premierRetenu, libelleFait, instantane, verdictReformulation, verdictRetrait, verdictContradiction } from './logique.js';
import * as S from '../store.js';

const piecesVides = () => ({ sku: '', gtin: '', desc: '', ds: '', dest: 'FR', origin: 'CN', l: '', w: '', h: '', kg: '', photo: null, page: null });
const vierge = () => ({ pieces: piecesVides(), lit: null, erreurPieces: null, produit: null, faits: {}, barres: [], contradictions: [], lecture: null, lectureErreur: null, tours: [], epreuves: [], autres: [], crit: {}, critRejetes: 0, critErreur: null, applic: {}, oblig: null, arbitrage: null, niveau: 'hs6', conf: { valeurs: {}, declarees: [] }, occupe: null, erreur: null, valide: null });
let D = vierge();
let R = null; // { arbre, textes, T } : la règle encodée de référence
const abonnes = new Set();
const notifier = () => abonnes.forEach((fn) => fn(D));
export const lire = () => D;
export const regleChargee = () => R;
export function abonner(fn) { abonnes.add(fn); return () => abonnes.delete(fn); }
regle().then((r) => { R = r; notifier(); });
// Exigences de mise sur le marché encodées (un marché à ce jour) et leurs textes officiels.
let X = null; // { data, textes }
const json = (f) => fetch('/data/' + f).then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (typeof fetch === 'function' && typeof document !== 'undefined') Promise.all([json('exigences.json'), json('textes-conformite.json')]).then(([e, t]) => { if (e && e.exigences && t) { X = { data: e, textes: t }; notifier(); } });
export const exigencesChargees = () => X;
export const redessiner = () => notifier();

export function nouveau() { D = vierge(); notifier(); }
// Les champs du formulaire suivent la saisie sans redessiner l'écran.
export function saisir(champ, valeur) { D.pieces = { ...D.pieces, [champ]: valeur }; }

// ---------- pièces ----------
export async function lirePhoto(fichier) {
  D = { ...D, lit: 'photo', erreurPieces: null };
  notifier();
  try {
    const grand = await versJpeg(fichier, 2400, 0.85), apercu = await versJpeg(grand.blob, 700, 0.7);
    D.pieces = { ...D.pieces, photo: { nom: fichier.name, apercu: apercu.url, lignes: [], illisible: [], lue: false } };
    notifier();
    const j = await lectureIA('/api/photo', { jpeg_base64: grand.url.split(',')[1] });
    const p = D.pieces;
    D.pieces = { ...p, photo: { ...p.photo, lignes: j.lignes, illisible: j.illisible, reference: j.reference, secondes: j.seconds, lue: true }, ds: j.lignes.join('\n'), desc: p.desc.trim() ? p.desc : j.description, sku: p.sku.trim() ? p.sku : (j.reference || fichier.name.replace(/\.[^.]+$/, '')).slice(0, 48) };
  } catch (e) {
    D.erreurPieces = 'Photo not read: ' + (e.message || e) + '. Describe the product by hand; the photo stays attached to the file.';
    if (!D.pieces.sku.trim()) D.pieces = { ...D.pieces, sku: fichier.name.replace(/\.[^.]+$/, '').slice(0, 48) };
  }
  D.lit = null;
  notifier();
}

export async function lireAdresse(adresse) {
  D = { ...D, lit: 'url', erreurPieces: null };
  notifier();
  try {
    const p = await post('/api/url', { url: adresse });
    const lignes = p.caracteristiques.map((c) => `${c.nom}: ${c.valeur}`);
    const ds = [...lignes, p.description].filter(Boolean).join('\n') || p.texte.slice(0, 3000);
    const court = p.description ? '. ' + p.description.split(/(?<=\.)\s/)[0].slice(0, 280) : '';
    D.pieces = { ...D.pieces, page: p, desc: (p.titre + court).slice(0, 1800), ds: ds.slice(0, 12000), sku: (p.sku || D.pieces.sku || p.titre.split(/\s+/).slice(0, 3).join('-').toUpperCase()).slice(0, 48), gtin: p.gtin || D.pieces.gtin };
  } catch (e) { D.erreurPieces = 'Page not read: ' + (e.message || e); }
  D.lit = null;
  notifier();
}

// Entrée depuis la vue d'ensemble : un fichier, une adresse ou un texte.
export function preparer({ fichier, adresse, texte, pieces } = {}) {
  D = vierge();
  if (pieces) D.pieces = { ...D.pieces, ...pieces };
  if (texte) D.pieces = { ...D.pieces, desc: texte.slice(0, 1800) };
  notifier();
  if (fichier) lirePhoto(fichier);
  else if (adresse) lireAdresse(adresse);
}

// ---------- classement ----------
export function lancer() {
  const p = D.pieces, faits = {}, kg = parseFloat(p.kg);
  if (kg > 0) faits.weight_g = { value: Math.round(kg * 1000), kind: 'fiche', origin: `Product record, "Weight" field (${p.kg} kg)` };
  const dims = Object.fromEntries([['length_mm', p.l], ['width_mm', p.w], ['height_mm', p.h]].map(([k, v]) => [k, parseFloat(v) * 10]).filter(([, v]) => v > 0));
  if (Object.keys(dims).length) faits.dimensions = { value: dims, kind: 'fiche', origin: 'Product record, "Dimensions" field' };
  D = { ...vierge(), pieces: p, produit: { ...p, sku: p.sku.trim() || 'PRODUCT', desc: p.desc.trim(), ds: p.ds.trim() }, faits };
  return tour('First evaluation');
}

const desc = () => effectif(D.produit.desc, 'description', D.barres);
const fiche = () => effectif(D.produit.ds, 'fiche_technique', D.barres);
const provenance = (c) => (D.produit.photo ? { kind: 'photo', origin: `Photographed label (${D.produit.photo.nom}), line read from the photo then checked by the person` } : D.produit.page ? { kind: 'page', origin: `Online product page (${D.produit.page.domaine}), cited passage` } : { kind: 'passage', origin: 'Datasheet, cited passage' });

async function lirePieces() {
  try {
    const L = await lectureIA('/api/lire', { description: desc(), fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits) });
    D.lecture = L; D.lectureErreur = null;
    if (!D.tours.length) for (const c of L.caracteristiques) if (!D.faits[c.fact]) D.faits[c.fact] = { value: c.value, quotes: c.quotes, ...provenance(c) };
    D.contradictions = L.contradictions;
  } catch (e) { D.lecture = null; D.lectureErreur = String(e.message || e); D.contradictions = []; }
}

async function tour(cause) {
  D.erreur = null;
  try {
    D.occupe = 'Reading the documents: characteristics and contradictions'; notifier();
    await lirePieces();
    if (D.contradictions.length) { D.occupe = null; return notifier(); }
    D.occupe = 'Classification on the Cleo Legal API'; notifier();
    const lectureCriteres = R ? lectureIA('/api/criteres', { pieces: { description: desc(), fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits) }, criteres: R.arbre.criteres }).catch((e) => ({ erreur: String(e.message || e) })) : null;
    const lectureExigences = X && D.produit.dest === X.data.marche ? lectureIA('/api/criteres', { pieces: { description: desc(), fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits) }, criteres: X.data.criteres.filter((c) => c.source !== 'projet') }).catch(() => null) : null;
    const [r, cr, ce] = await Promise.all([classifier({ sku: D.produit.sku, description: desc(), pays: D.produit.dest, faits: valeursFaits(D.faits) }), lectureCriteres, lectureExigences]);
    if (ce && ce.valeurs) D.conf = { ...D.conf, valeurs: { ...Object.fromEntries(Object.entries(ce.valeurs).map(([k, x]) => [k, { ...x, kind: 'pieces' }])), ...Object.fromEntries(Object.entries(D.conf.valeurs).filter(([, x]) => x.kind === 'reponse')) } };
    if (cr && !cr.erreur) {
      D.critRejetes = cr.rejected; D.critErreur = null;
      const repondu = Object.fromEntries(Object.entries(D.crit).filter(([, x]) => x.kind === 'reponse'));
      D.crit = { ...Object.fromEntries(Object.entries(cr.valeurs).map(([k, x]) => [k, { ...x, kind: 'pieces' }])), ...repondu };
    } else if (cr) D.critErreur = cr.erreur;
    D.tours = [...D.tours, { ...r, cause, repondu: null, faits: structuredClone(D.faits) }];
    try { const t = premierRetenu(r.data); localStorage.setItem('dossier', JSON.stringify({ sku: D.produit.sku, description: desc(), fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits), code_moteur: t ? t.code : null, crit: D.crit })); } catch { /* dossier non partagé avec l'arbre */ }
  } catch (e) { D.erreur = String(e.message || e); }
  D.occupe = null;
  notifier();
}

export const dernier = () => D.tours[D.tours.length - 1] || null;
export const valeursCriteres = () => Object.fromEntries(Object.entries(D.crit).map(([k, x]) => [k, x.valeur]));
export const resultatRegle = () => (R ? evaluer(R.arbre, valeursCriteres()) : null);

export function repondre(reponses) {
  const n = D.tours.length;
  D.tours = D.tours.map((t, i) => (i === n - 1 ? { ...t, repondu: reponses } : t));
  for (const [k, v] of Object.entries(reponses)) D.faits[k] = { value: v, kind: 'reponse', origin: `Seller's answer to the question of round ${n}` };
  return tour("Seller's answer: " + Object.keys(reponses).map(libelleFait).join(', '));
}
export function ajouterFait(k, v) {
  D.faits = { ...D.faits, [k]: { value: v, kind: 'main', origin: 'Entered by hand on this screen, with no supporting document' } };
  return tour('Characteristic added without a document: ' + libelleFait(k));
}
export function retirerFait(k) {
  const f = { ...D.faits }; delete f[k]; D.faits = f;
  return tour('Characteristic removed: ' + libelleFait(k));
}
export function garder(i, cote) {
  const c = D.contradictions[i], perd = c[cote === 'a' ? 'b' : 'a'];
  if (perd.source.startsWith('caracteristique:')) { const f = { ...D.faits }; delete f[perd.source.split(':')[1]]; D.faits = f; }
  else D.barres = [...D.barres, { source: perd.source, quote: perd.quote, garde: c[cote], sujet: c.sujet }];
  D.contradictions = [];
  return tour(`Contradiction resolved (${c.sujet}): "${perd.quote}" declared false`);
}
export function choisirCritere(k, v) {
  const c = R.arbre.criteres.find((x) => x.id === k);
  D.crit = { ...D.crit, [k]: { valeur: c.type === 'bool' ? v === 'oui' : v, kind: 'reponse' } };
  notifier();
}
export function retirerReponsesCriteres() { D.crit = Object.fromEntries(Object.entries(D.crit).filter(([, x]) => x.kind !== 'reponse')); notifier(); }

// ---------- vérifications complémentaires ----------
export async function verifierApplicabilite(id) {
  const x = ((dernier().data.provenance || {}).precedents || []).find((q) => q.ruling_id === id);
  if (!x) return;
  D.applic = { ...D.applic, [id]: 'encours' }; notifier();
  try { D.applic = { ...D.applic, [id]: await lectureIA('/api/applicabilite', { produit: { description: desc(), fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits) }, decision: x, destination: D.produit.dest }) }; }
  catch (e) { D.applic = { ...D.applic, [id]: { erreur: String(e.message || e).slice(0, 160) } }; }
  notifier();
}
export async function chercherObligations(valeur) {
  const dec = decision();
  if (!dec || !dec.code) return;
  D.oblig = 'encours'; notifier();
  try { D.oblig = await post('/api/obligations', { description: desc(), sku: D.produit.sku, hs6: dec.code, origine: D.produit.origin, destination: D.produit.dest, valeur_usd: valeur > 0 ? valeur : undefined }); }
  catch (e) { D.oblig = { erreur: String(e.message || e).slice(0, 220) }; }
  notifier();
}
export async function autresDestinations(pays) {
  D.occupe = `Evaluating ${pays.length} destination(s) in parallel`; D.erreur = null; notifier();
  D.autres = await Promise.all(pays.map(async (country) => {
    try { const r = await classifier({ sku: D.produit.sku, description: desc(), pays: country, faits: valeursFaits(D.faits) }); return { country, status: r.data.status, top: premierRetenu(r.data), source: r.source, request_id: r.request_id, brut: r.body }; }
    catch (e) { return { country, erreur: String(e.message || e) }; }
  }));
  D.occupe = null; notifier();
}

// Les trois épreuves rejouent un appel à côté du dossier, sans le modifier.
async function epreuve(libelle, fn) {
  D.occupe = libelle; D.erreur = null; notifier();
  try { D.epreuves = [...D.epreuves, await fn()]; } catch (e) { D.erreur = String(e.message || e); }
  D.occupe = null; notifier();
}
export function eprouverReformulation(texte) {
  const base = dernier().data;
  return epreuve('Test: rewording replayed', async () => {
    const r = await classifier({ sku: D.produit.sku, description: texte, pays: D.produit.dest, faits: valeursFaits(D.faits) }), [ton, verdict] = verdictReformulation(base, r.data);
    return { type: 'Rewording', entree: texte, avant: instantane(base), apres: instantane(r.data), ton, verdict, brut: r.body };
  });
}
export function eprouverRetrait(k) {
  const base = dernier().data;
  return epreuve(`Test: call replayed without "${libelleFait(k)}"`, async () => {
    const f = { ...D.faits }; delete f[k];
    const r = await classifier({ sku: D.produit.sku, description: desc(), pays: D.produit.dest, faits: valeursFaits(f) }), [ton, verdict] = verdictRetrait(base, r.data, k);
    return { type: 'Removal', entree: libelleFait(k), avant: instantane(base), apres: instantane(r.data), ton, verdict, brut: r.body };
  });
}
export function eprouverContradiction(texte) {
  return epreuve('Test: document reading replayed with the added sentence', async () => {
    const L = await lectureIA('/api/lire', { description: desc() + ' ' + texte, fiche_technique: fiche(), caracteristiques: valeursFaits(D.faits) }), n = L.contradictions.length, [ton, verdict] = verdictContradiction(n);
    return { type: 'Contradiction', entree: texte, avant: 'no contradiction', apres: n ? `${n} contradiction(s) flagged: ${L.contradictions.map((c) => c.sujet).join(', ')}` : 'nothing flagged', ton, verdict, brut: L };
  });
}

// ---------- décision unique, arbitrage, validation signée ----------
// One decision for the file: the engine and the encoded rule read together, with what still blocks validation.
const memesCodes = (a, b) => Boolean(a && b) && a.moteur === b.moteur && a.regle === b.regle;
export function decision() {
  const t = dernier(); if (!t) return null;
  const d = t.data, top = premierRetenu(d), res = resultatRegle();
  const couvert = R && (Object.keys(D.crit).length || (top && Object.values(R.arbre.noeuds).some((n) => n.type === 'code' && n.code === String(top.code).slice(0, 6))));
  const entree = {
    conflits: D.contradictions.length,
    moteur: { statut: d.status, code: top ? top.code : null, questions: (d.questions || []).length && !t.repondu ? d.questions.length : 0 },
    regle: res && couvert ? { statut: res.statut, code: res.code } : res && res.statut === 'hors_perimetre' ? { statut: 'hors_perimetre' } : null,
    niveauRequis: D.niveau, niveauObtenu: top ? (top.system === 'hs6' ? 'hs6' : 'national') : null,
  };
  // an arbitration only stands for the two readings it was signed on
  const arbitrage = D.arbitrage && memesCodes(D.arbitrage.codes_en_presence, decider(entree).codes) ? D.arbitrage : null;
  return decider({ ...entree, arbitrage });
}
export function arbitrer({ code, raison, qui, elements }) {
  const a = { code: String(code || '').replace(/\D/g, ''), raison: String(raison || '').trim(), qui: String(qui || '').trim(), elements: elements || [], quand: new Date().toISOString(), codes_en_presence: decision().codes };
  if (!arbitrageValide(a)) { D.erreur = 'The arbitration needs a six-digit code, a reason of at least 20 characters and a name.'; notifier(); return false; }
  D.erreur = null; D.arbitrage = a; D.oblig = null; notifier(); return true;
}
export function rouvrirArbitrage() { D.arbitrage = null; D.oblig = null; notifier(); }
export function choisirNiveau(n) { D.niveau = n === 'national' ? 'national' : 'hs6'; notifier(); }

export function valider(qui, motif, dossier) {
  const dec = decision();
  if (!dec || !dec.peutValider) { D.erreur = 'This file cannot be validated yet: open points remain.'; notifier(); return false; }
  const entree = { ...dossier, validated_by: qui, validated_at: new Date().toISOString(), motif };
  try { const tout = JSON.parse(localStorage.getItem('catalogue') || '[]').filter((r) => !(r.sku === entree.sku && r.destination === entree.destination)); localStorage.setItem('catalogue', JSON.stringify([...tout, entree])); } catch { /* catalogue local non écrit */ }
  if (S.lire().produits[D.produit.sku]) S.valider(D.produit.sku, dec.code, motif || 'Validated in the classification file');
  D.erreur = null; D.valide = entree;
  notifier(); return true;
}
export const pieces = () => ({ description: desc(), fiche_technique: fiche() });
