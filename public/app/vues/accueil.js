// Accueil : les produits de la boutique. Une carte par produit (photo, code, état, et où en
// est son parcours), une carte pour en ajouter un, et l'état des envois en une ligne.
import { esc, ic, etat, pluriel, nomPays, NIVEAU } from '../ui.js';
import { fmtCode, cleAttestation } from '../conformite.js';
import { estImage } from '../dossier/photo.js';
import * as E from '../dossier/etat.js';
import * as S from '../store.js';
import { etatProduit } from './produit-entete.js';

export const titre = 'Products';
let MONDE = null, rerendreLocal = () => {};
fetch('/data/monde-produits.json').then((r) => (r.ok ? r.json() : null)).then((m) => { MONDE = m; rerendreLocal(); }).catch(() => null);

// Les quatre temps du parcours d'un produit, et où il en est.
function etapes(p, e, s) {
  const regles = e.code ? S.regles().filter((r) => r.effet.type === 'exigence' && (r.sh || []).some((c) => String(e.code).startsWith(c))) : [];
  const repondues = regles.filter((r) => s.attestations[cleAttestation(p.sku, r.id)]).length;
  const liste = [
    [(p.etiquette || []).length ? 'fait' : 'attente', 'Label read', `${(p.etiquette || []).length} lines · ${(p.marques_vues || []).length} marks`],
    [e.code ? 'fait' : 'attente', 'Code found', e.code ? (S.decisions()[p.sku] || {}).origine === 'convergence' ? 'engine and rule agree' : 'proposed' : 'not yet'],
    [s.validations[p.sku] ? 'fait' : e.code ? 'encours' : 'attente', 'Signed', s.validations[p.sku] ? 'by ' + s.validations[p.sku].par : 'by a declarant'],
    [regles.length && repondues === regles.length ? 'fait' : repondues ? 'encours' : 'attente', 'Evidence', regles.length ? `${repondues} of ${regles.length} markets` : 'after the code'],
  ];
  return `<ol class="pc-etapes">${liste.map(([st, t, sous]) => `<li class="${st}"><span class="pt">${st === 'fait' ? ic('check') : ''}</span><b>${t}</b><small>${esc(sous)}</small></li>`).join('')}</ol>`;
}

function carte(p, s, ev, i) {
  const e = etatProduit(p.sku, s), m = MONDE && MONDE.produits[p.sku];
  const lignes = ev.lignes.filter((l) => l.sku === p.sku && l.expedition !== 'expediee');
  return `<a class="carte produit-carte" href="#/produit?sku=${encodeURIComponent(p.sku)}" style="--i:${i}">
    <div class="pc-photo v-${esc(p.teinte || 'gris')}">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span>${esc(p.sku.slice(0, 3))}</span>`}<span class="pc-origine">${ic('globe')}Made in ${esc(nomPays(p.origine || 'CN'))}</span></div>
    <div class="pc-corps">
      <span class="eyebrow">${esc(p.sku)}</span>
      <h3>${esc(p.nom)}</h3>
      <div class="pc-code">${e.code ? `<span class="code">${esc(fmtCode(e.code))}</span>` : ''}${etat(e.niveau, e.texte)}</div>
      ${etapes(p, e, s)}
      <div class="pc-pied"><span><b>${lignes.length}</b> order${lignes.length === 1 ? '' : 's'} waiting</span>${m ? `<span><b>${m.bilan.marches_exigences}</b> markets checked</span><span><b>${m.bilan.consultes}</b> countries looked up</span>` : ''}<span class="pc-ouvrir">Open ${ic('droite')}</span></div>
    </div></a>`;
}

function ajout() {
  return `<div class="carte produit-ajout" id="produit-ajout" tabindex="0" role="button" aria-label="Add a product">
    <span class="pa-ic">${ic('plus')}</span><h3>Add a product</h3>
    <p>Drop a photo of the product, its label or a pictogram. Or paste a product page link, or a few lines.</p>
    <div class="pa-actions"><label class="btn noir petit">${ic('fichier')}Choose an image<input type="file" accept="image/*,.heic,.heif" class="sr" id="ajout-photo"></label><a class="btn blanc petit" href="#/dossier">${ic('lien')}Link or text</a></div></div>`;
}

function bandeau(s, ev) {
  const t = ev.totaux, pays = Object.keys(ev.parPays).length;
  if (!s.boutique) return '';
  return `<a class="carte bandeau-envois" href="#/envois"><span class="bulle"></span><div><b>${esc(s.boutique.nom)}</b><small>${esc(s.boutique.plateforme)} · ${pluriel(t.lignes, 'order line', 'order lines')} to ship to ${pluriel(pays, 'country', 'countries')}</small></div>
    <div class="be-compte">${['pret', 'a_verifier', 'bloque'].map((n) => `<span><i class="c-${n}"></i><b data-compte="${t.compte[n]}" data-cle="acc-${n}">${t.compte[n]}</b> ${NIVEAU[n].court.toLowerCase()}</span>`).join('')}</div><span class="be-aller">Shipments ${ic('droite')}</span></a>`;
}

export function rendre() {
  const s = S.lire(), produits = Object.values(s.produits), ev = S.evaluation();
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Your products</h1><p>Each product is read from the photo of its label, classified, then checked against what every market asks for. Open one to see its code, why, and the evidence each country needs.</p></div></div>
    ${bandeau(s, ev)}
    <div class="produits-galerie">${produits.length ? produits.map((p, i) => carte(p, s, ev, i)).join('') : '<div class="agent"><span class="rond"></span><span class="txt">Loading the store</span></div>'}${ajout()}</div>
    <p class="faint" style="font-size:12.5px;max-width:860px;margin-top:18px">The rule that gives the code is drafted by AI from the official texts it cites and is not reviewed by a customs declarant. Engine proposals are ${S.fixes().mode === 'direct' ? 'live' : 'recorded'} calls to the Cleo Legal API. Nothing here states that a product is compliant.</p>
  </div>`;
}

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  const zone = racine.querySelector('#produit-ajout');
  if (!zone) return;
  const vers = (entree) => { E.preparer(entree); location.hash = '#/dossier'; };
  zone.addEventListener('click', (e) => { if (!e.target.closest('label, a, input')) location.hash = '#/dossier'; });
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = '#/dossier'; });
  racine.querySelector('#ajout-photo').addEventListener('change', (e) => { if (e.target.files[0]) vers({ fichier: e.target.files[0] }); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('survol'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('survol'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('survol');
    const img = [...e.dataTransfer.files].find(estImage);
    if (img) return vers({ fichier: img });
    const lien = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').trim().split('\n')[0];
    if (lien) vers(/^https?:\/\//i.test(lien) ? { adresse: lien } : { texte: lien });
  });
}
