// Dossier de classification d'un produit : fonctions pures (reprises du parcours
// historique), partagées par l'écran et les tests. Aucune ne lit l'horloge ni le DOM.
import { fmtCode } from '../conformite.js';

export const STATUT = {
  classified: ['Proposal to be validated', 'pret'],
  needs_review: ['Proposal to be reviewed', 'a_verifier'],
  needs_information: ['Information needed', 'a_verifier'],
  ambiguous: ['Several codes remain plausible', 'a_verifier'],
  unsupported_jurisdiction: ['No candidate kept for this destination', 'bloque'],
  stale_dataset: ['Nomenclature to refresh', 'bloque'],
};
export const CONTROLES = {
  calibrated_confidence_below_floor: 'Confidence remains below the acceptance threshold',
  chapter_margin: 'Two chapters remain too close',
  heading_margin: 'Two headings remain too close',
  low_retrieval_similarity: 'The description has little resemblance to the nomenclature wording',
};
export const FAIT = { material: 'Material', sole_material: 'Sole material', upper_material: 'Upper material', composition: 'Composition', function: 'Function', use: 'Use', process: 'Process', dimensions: 'Dimensions', thickness_mm: 'Thickness (mm)', weight_g: 'Weight (g)', power_w: 'Power (W)', engine_displacement_cc: 'Engine displacement (cm³)', voltage_v: 'Voltage (V)', presentation: 'Presentation', audience: 'Audience' };
export const FAITS_NUMERIQUES = ['thickness_mm', 'weight_g', 'power_w', 'engine_displacement_cc', 'voltage_v'];
export const FAITS_LISTES = { presentation: ['bulk', 'retail_pack', 'retail_set', 'unassembled', 'other'], audience: ['men', 'women', 'boys', 'girls', 'babies', 'unisex', 'not_applicable'] };
export const FAITS_AJOUTABLES = ['function', 'use', 'material', 'process', 'power_w', 'voltage_v', 'weight_g'];
export const PROVENANCE = { photo: 'Photographed label', passage: 'Datasheet', page: 'Online product page', fiche: 'Product record', reponse: 'Confirmed answer', main: 'No supporting document' };
export const libelleFait = (k) => FAIT[k] || k;
export const libelleSource = (s) => (s === 'description' ? 'Catalogue description' : s === 'fiche_technique' ? 'Datasheet' : 'Fact "' + libelleFait(String(s).split(':')[1]) + '"');
export const titre = (c) => (c && c.title && (c.title.fr || c.title.en)) || '';
export const premierRetenu = (d) => ((d && d.candidates) || []).find((c) => !c.set_aside_reason) || null;

// Texte réellement transmis : la pièce moins les passages qu'une personne a déclarés faux.
export function effectif(texte, source, barres = []) {
  let t = String(texte || '');
  for (const b of barres) if (b.source === source) t = t.split(b.quote).join(' ');
  return t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').replace(/([,;])(?:\s*[,;])+/g, '$1').replace(/^[\s,;.]+|[\s,;]+$/g, '').trim();
}
export const valeursFaits = (faits) => Object.fromEntries(Object.entries(faits).map(([k, f]) => [k, f.value]));

export function valeurFait(k, v) {
  if (k === 'dimensions' && v && typeof v === 'object') return Object.entries(v).map(([a, b]) => a.replace('_mm', '') + ' ' + b + ' mm').join(' × ');
  if (k === 'composition' && Array.isArray(v)) return v.map((c) => c.material + (c.percent != null ? ' ' + c.percent + '%' : '')).join(', ');
  return String(v);
}

// Une saisie (réponse au moteur, caractéristique ajoutée) dans la forme qu'attend l'API.
export function lireFait(nom, v) {
  if (nom === 'composition') return String(v).split(',').map((x) => { const m = x.trim().match(/^(.*?)(?:\s+(\d+(?:\.\d+)?)\s*%?)?$/); return m[2] ? { material: m[1].trim(), percent: parseFloat(m[2]) } : { material: m[1].trim() }; }).filter((c) => c.material);
  if (FAITS_NUMERIQUES.includes(nom)) { const n = parseFloat(String(v).replace(',', '.')); return n > 0 ? n : null; }
  const s = String(v).trim();
  return s || null;
}

// Les trois épreuves : un verdict mécanique sur le code retenu et le statut.
export const instantane = (d) => { const t = premierRetenu(d); return (t ? fmtCode(t.code) : 'no code') + ', ' + ((STATUT[d.status] || [d.status])[0] || '').toLowerCase(); };
export function verdictReformulation(avant, apres) {
  const a = premierRetenu(avant), b = premierRetenu(apres), meme = (a && a.code) === (b && b.code);
  return meme ? ['pret', 'Holds: same code kept'] : ['bloque', 'Does not hold: the code kept changes'];
}
export function verdictRetrait(avant, apres, fait) {
  const a = premierRetenu(avant), b = premierRetenu(apres);
  const redemande = (apres.questions || []).some((q) => q.fact === fait) || (apres.missing_attributes || []).includes(fait);
  if (redemande) return ['pret', 'Holds: it asks for this information again'];
  if ((a && a.code) === (b && b.code) && avant.status === apres.status) return ['a_verifier', 'No effect: this information carried no weight in the decision'];
  return ['bloque', 'Does not hold: the answer changes without asking for the information again'];
}
export const verdictContradiction = (n) => (n ? ['pret', 'Holds: contradiction flagged'] : ['bloque', 'Does not hold: nothing flagged']);

// Ce qu'il reste à faire avant qu'un déclarant puisse s'appuyer sur le dossier.
// e : { dernier, regle (résultat de l'arbre ou null), arbre, crit, faits, photo, valide, nomDestination }
export function travailRestant(e) {
  const d = e.dernier.data, top = premierRetenu(d), out = [], r = e.regle;
  if ((d.questions || []).length && !e.dernier.repondu) out.push('Answer the engine question: ' + d.questions.map((q) => libelleFait(q.fact)).join(', ') + '.');
  if (r && r.statut === 'information_manquante') out.push('Establish the fact that blocks the encoded rule: ' + ((e.arbre.criteres.find((c) => c.id === r.critere) || {}).question || r.critere));
  if (r && r.statut === 'code' && top && String(top.code).slice(0, 6) !== r.code) out.push(`Resolve the divergence between the engine (${fmtCode(String(top.code).slice(0, 6))}) and the encoded rule (${fmtCode(r.code)}).`);
  const rep = Object.values(e.crit || {}).filter((x) => x.kind === 'reponse').length;
  if (rep) out.push(`Document ${rep} answer(s) given without a supporting document in the encoded rule.`);
  const main = Object.entries(e.faits).filter(([, f]) => f.kind === 'main').map(([k]) => libelleFait(k));
  if (main.length) out.push('Back with a document: ' + main.join(', ') + '.');
  if (e.photo && e.photo.illisible.length) out.push(`Check on the product ${e.photo.illisible.length} item(s) not read on the photo.`);
  if (!top) out.push('No code kept by the engine for this destination.');
  else if (top.system === 'hs6') out.push(`Establish the national code for ${e.nomDestination}: the proposal stops at six digits.`);
  if (((d.provenance && d.provenance.precedents) || []).length) out.push('Check that the similar official rulings concern a comparable product: a text resemblance proves nothing.');
  if (e.arbre) out.push('Have the encoded rule reviewed by a customs declarant: it is drafted by AI.');
  if (!e.valide) out.push('Have the proposal validated by an authorised person.');
  return out;
}
