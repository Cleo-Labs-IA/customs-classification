// Classer un nouveau produit par simple dépôt : une photo, une étiquette, un pictogramme,
// l'adresse d'une fiche produit ou quelques lignes de texte. Deux portes d'entrée :
// la zone « New » de la première vue, et un voile qui couvre toute l'app dès qu'on y
// fait glisser une image ou un lien. Les deux mènent au même dossier.
import { ic } from './ui.js';
import { estImage } from './dossier/photo.js';
import * as E from './dossier/etat.js';

export function classer(entree) { E.preparer(entree); location.hash = '#/dossier'; }

// Ce que contient un dépôt, ramené à une entrée du dossier (ou null si rien d'utilisable).
export function lireDepot(dt) {
  const img = [...(dt.files || [])].find(estImage);
  if (img) return { fichier: img };
  const lien = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim().split('\n')[0].trim();
  if (!lien) return null;
  return /^https?:\/\//i.test(lien) ? { adresse: lien } : { texte: lien };
}
const porteQuelqueChose = (dt) => [...(dt.types || [])].some((t) => t === 'Files' || t === 'text/uri-list' || t === 'text/plain');

export function zoneNouveau() {
  return `<form class="carte zone-nouveau" id="zone-nouveau" data-form="nouveau" aria-label="Classify a new product">
    <div class="zn-gauche"><span class="zn-ic">${ic('plus')}</span><div><span class="eyebrow">New</span><b>Classify a product</b><small>Drop a photo of the product, its label or a pictogram here, or paste a product page link.</small></div></div>
    <div class="zn-droite"><div class="zn-champ">${ic('lien')}<input id="zn-texte" placeholder="https://… or a short description" autocomplete="off" aria-label="Product page link or description"></div>
      <label class="btn blanc petit" title="Choose an image">${ic('fichier')}<span>Image</span><input type="file" accept="image/*,.heic,.heif" class="sr" id="zn-photo"></label>
      <button class="btn noir petit" type="submit">Classify${ic('droite')}</button></div>
    <div class="zn-voile" aria-hidden="true">${ic('import')}<span>Drop to classify</span></div>
  </form>`;
}

export function brancherZone(racine) {
  const f = racine.querySelector('#zone-nouveau');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = f.querySelector('#zn-texte').value.trim();
    if (!v) return location.assign('#/dossier');
    classer(/^https?:\/\//i.test(v) ? { adresse: v } : { texte: v });
  });
  f.querySelector('#zn-photo').addEventListener('change', (e) => { if (e.target.files[0]) classer({ fichier: e.target.files[0] }); });
  f.addEventListener('dragover', (e) => { e.preventDefault(); f.classList.add('survol'); });
  f.addEventListener('dragleave', (e) => { if (!f.contains(e.relatedTarget)) f.classList.remove('survol'); });
  f.addEventListener('drop', (e) => {
    e.preventDefault(); e.stopPropagation(); f.classList.remove('survol'); document.body.classList.remove('depot-actif');
    const entree = lireDepot(e.dataTransfer);
    if (entree) classer(entree);
  });
}

// Le voile de toute l'app. Il laisse la main aux zones qui ont leur propre dépôt (la fiche
// du dossier, la fenêtre d'import) et ne réagit qu'aux images et aux liens.
export function brancherDepotGlobal() {
  const voile = document.createElement('div');
  voile.className = 'depot-global';
  voile.innerHTML = `<div class="dg-carte"><span class="dg-ic">${ic('import')}</span><b>Drop to classify a new product</b><small>A photo of the product, its label, a pictogram, or a product page link</small></div>`;
  document.body.appendChild(voile);
  let profondeur = 0;
  const ailleurs = () => document.querySelector('.modale-voile') || document.querySelector('#depot-produit');
  const fermer = () => { profondeur = 0; document.body.classList.remove('depot-actif'); };
  window.addEventListener('dragenter', (e) => {
    if (ailleurs() || !porteQuelqueChose(e.dataTransfer)) return;
    profondeur++;
    document.body.classList.add('depot-actif');
  });
  window.addEventListener('dragleave', () => { if (--profondeur <= 0) fermer(); });
  window.addEventListener('dragover', (e) => { if (document.body.classList.contains('depot-actif')) e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    if (!document.body.classList.contains('depot-actif')) return;
    e.preventDefault(); fermer();
    const entree = lireDepot(e.dataTransfer);
    if (entree) classer(entree);
  });
  window.addEventListener('blur', fermer);
}
