// Dossier de classification d'un produit : fonctions pures (reprises du parcours
// historique), partagées par l'écran et les tests. Aucune ne lit l'horloge ni le DOM.
import { fmtCode } from '../conformite.js';

export const STATUT = {
  classified: ['Proposition à faire valider', 'pret'],
  needs_review: ['Proposition à faire relire', 'a_verifier'],
  needs_information: ['Informations nécessaires', 'a_verifier'],
  ambiguous: ['Plusieurs codes restent plausibles', 'a_verifier'],
  unsupported_jurisdiction: ['Aucun candidat retenu pour cette destination', 'bloque'],
  stale_dataset: ['Nomenclature à rafraîchir', 'bloque'],
};
export const CONTROLES = {
  calibrated_confidence_below_floor: "La confiance reste sous le seuil d'acceptation",
  chapter_margin: 'Deux chapitres restent trop proches',
  heading_margin: 'Deux positions restent trop proches',
  low_retrieval_similarity: 'La description ressemble peu aux libellés de la nomenclature',
};
export const FAIT = { material: 'Matière', sole_material: 'Matière de la semelle', upper_material: 'Matière de la tige', composition: 'Composition', function: 'Fonction', use: 'Usage', process: 'Procédé', dimensions: 'Dimensions', thickness_mm: 'Épaisseur (mm)', weight_g: 'Poids (g)', power_w: 'Puissance (W)', engine_displacement_cc: 'Cylindrée (cm³)', voltage_v: 'Tension (V)', presentation: 'Présentation', audience: 'Public' };
export const FAITS_NUMERIQUES = ['thickness_mm', 'weight_g', 'power_w', 'engine_displacement_cc', 'voltage_v'];
export const FAITS_LISTES = { presentation: ['bulk', 'retail_pack', 'retail_set', 'unassembled', 'other'], audience: ['men', 'women', 'boys', 'girls', 'babies', 'unisex', 'not_applicable'] };
export const FAITS_AJOUTABLES = ['function', 'use', 'material', 'process', 'power_w', 'voltage_v', 'weight_g'];
export const PROVENANCE = { photo: 'Étiquette photographiée', passage: 'Fiche technique', page: 'Fiche produit en ligne', fiche: 'Fiche produit', reponse: 'Réponse confirmée', main: 'Sans pièce' };
export const libelleFait = (k) => FAIT[k] || k;
export const libelleSource = (s) => (s === 'description' ? 'Description du catalogue' : s === 'fiche_technique' ? 'Fiche technique' : 'Caractéristique « ' + libelleFait(String(s).split(':')[1]) + ' »');
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
  if (k === 'composition' && Array.isArray(v)) return v.map((c) => c.material + (c.percent != null ? ' ' + c.percent + ' %' : '')).join(', ');
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
export const instantane = (d) => { const t = premierRetenu(d); return (t ? fmtCode(t.code) : 'aucun code') + ', ' + ((STATUT[d.status] || [d.status])[0] || '').toLowerCase(); };
export function verdictReformulation(avant, apres) {
  const a = premierRetenu(avant), b = premierRetenu(apres), meme = (a && a.code) === (b && b.code);
  return meme ? ['pret', 'Tient : même code retenu'] : ['bloque', 'Ne tient pas : le code retenu change'];
}
export function verdictRetrait(avant, apres, fait) {
  const a = premierRetenu(avant), b = premierRetenu(apres);
  const redemande = (apres.questions || []).some((q) => q.fact === fait) || (apres.missing_attributes || []).includes(fait);
  if (redemande) return ['pret', 'Tient : il redemande cette information'];
  if ((a && a.code) === (b && b.code) && avant.status === apres.status) return ['a_verifier', 'Aucun effet : cette information ne pesait pas dans la décision'];
  return ['bloque', "Ne tient pas : la réponse change sans redemander l'information"];
}
export const verdictContradiction = (n) => (n ? ['pret', 'Tient : contradiction signalée'] : ['bloque', 'Ne tient pas : rien de signalé']);

// Ce qu'il reste à faire avant qu'un déclarant puisse s'appuyer sur le dossier.
// e : { dernier, regle (résultat de l'arbre ou null), arbre, crit, faits, photo, valide, nomDestination }
export function travailRestant(e) {
  const d = e.dernier.data, top = premierRetenu(d), out = [], r = e.regle;
  if ((d.questions || []).length && !e.dernier.repondu) out.push('Répondre à la question du moteur : ' + d.questions.map((q) => libelleFait(q.fact)).join(', ') + '.');
  if (r && r.statut === 'information_manquante') out.push('Établir le fait qui bloque la règle encodée : ' + ((e.arbre.criteres.find((c) => c.id === r.critere) || {}).question || r.critere));
  if (r && r.statut === 'code' && top && String(top.code).slice(0, 6) !== r.code) out.push(`Trancher la divergence entre le moteur (${fmtCode(String(top.code).slice(0, 6))}) et la règle encodée (${fmtCode(r.code)}).`);
  const rep = Object.values(e.crit || {}).filter((x) => x.kind === 'reponse').length;
  if (rep) out.push(`Documenter ${rep} réponse(s) donnée(s) sans pièce dans la règle encodée.`);
  const main = Object.entries(e.faits).filter(([, f]) => f.kind === 'main').map(([k]) => libelleFait(k));
  if (main.length) out.push('Appuyer par une pièce : ' + main.join(', ') + '.');
  if (e.photo && e.photo.illisible.length) out.push(`Relire sur le produit ${e.photo.illisible.length} élément(s) non lu(s) sur la photo.`);
  if (!top) out.push('Aucun code retenu par le moteur pour cette destination.');
  else if (top.system === 'hs6') out.push(`Établir le code national de ${e.nomDestination} : la proposition s'arrête à six chiffres.`);
  if (((d.provenance && d.provenance.precedents) || []).length) out.push('Vérifier que les décisions officielles proches portent sur un produit comparable : une ressemblance de texte ne prouve rien.');
  if (e.arbre) out.push('Faire relire la règle encodée par un déclarant : elle est rédigée par IA.');
  if (!e.valide) out.push('Faire valider la proposition par une personne habilitée.');
  return out;
}
