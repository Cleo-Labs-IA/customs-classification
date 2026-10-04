// L'espace d'un produit : un en-tête commun (photo, nom, code, état) et quatre onglets
// (vue d'ensemble, pourquoi ce code, le monde, le dossier). Les pages d'un même produit
// partagent cet en-tête ; on change de produit sans quitter l'onglet.
import { esc, ic, etat, nomPays } from '../ui.js';
import { fmtCode } from '../conformite.js';
import * as S from '../store.js';

export const ONGLETS = [
  ['produit', 'Overview', (sku) => `#/produit?sku=${encodeURIComponent(sku)}`],
  ['arbre', 'Why this code', (sku) => `#/arbre?sku=${encodeURIComponent(sku)}`],
  ['monde', 'World', (sku) => `#/monde?sku=${encodeURIComponent(sku)}`],
  ['dossier', 'Classification file', (sku) => `#/dossier?sku=${encodeURIComponent(sku)}`],
];

// Où en est le produit, en une étiquette : validé, à valider, à trancher, en cours.
export function etatProduit(sku, s = S.lire()) {
  const v = s.validations[sku], cl = s.classifications[sku], d = S.decisions(s)[sku];
  if (v) return { code: v.hs6, niveau: 'pret', texte: `Validated by ${v.par}` };
  if (cl && cl.enCours) return { code: null, niveau: 'en_attente', texte: 'Classifying' };
  // le moteur n'a pas été consulté pour ce produit : la règle encodée parle seule
  if (!cl) { const code = S.codeRegle(sku, s); return code ? { code, niveau: 'a_verifier', texte: 'Encoded rule only · engine not run', regleSeule: true } : { code: null, niveau: 'a_verifier', texte: 'To classify' }; }
  if (d && d.code) return { code: d.code, niveau: 'a_verifier', texte: d.origine === 'convergence' ? 'Engine and rule agree · to validate' : 'Proposed · to validate' };
  if (d && d.besoinArbitrage) return { code: null, niveau: 'bloque', texte: 'Engine and rule disagree' };
  if (cl.erreur) return { code: null, niveau: 'bloque', texte: 'Classification failed' };
  return { code: cl.code || null, niveau: 'a_verifier', texte: 'To classify' };
}

export const premierProduit = () => Object.keys(S.lire().produits)[0] || null;

export function enteteProduit(sku, actif) {
  const s = S.lire(), p = s.produits[sku];
  if (!p) return '';
  const e = etatProduit(sku, s), autres = Object.values(s.produits).filter((x) => x.sku !== sku);
  const lien = (ONGLETS.find(([id]) => id === actif) || ONGLETS[0])[2];
  return `<div class="produit-tete">
    <a class="retour-lien" href="#/produits">${ic('droite', 'tourne')}All products</a>
    <div class="produit-ligne">
      <div class="vignette v-${esc(p.teinte || 'gris')} produit-photo">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(sku.slice(0, 3))}</div>
      <div class="produit-nom"><span class="eyebrow">${esc(sku)} · made in ${esc(nomPays(p.origine || 'CN'))}</span><h1>${esc(p.nom)}</h1></div>
      <div class="produit-code">${e.code ? `<span class="grand-code">${esc(fmtCode(e.code))}</span>` : ''}${etat(e.niveau, e.texte)}</div>
    </div>
    <nav class="onglets produit-onglets" aria-label="Product sections">${ONGLETS.map(([id, lib, url]) => `<a href="${url(sku)}" class="${id === actif ? 'actif' : ''}">${lib}</a>`).join('')}
      ${autres.length ? `<span class="espace"></span><span class="autres-produits">${autres.map((x) => `<a class="chip" href="${lien(x.sku)}" title="Same section, other product">${x.image ? `<img src="${esc(x.image)}" alt="">` : ''}${esc(x.nom)}</a>`).join('')}</span>` : ''}</nav>
  </div>`;
}
