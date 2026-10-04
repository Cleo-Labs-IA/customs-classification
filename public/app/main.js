// Cockpit : routage par l'adresse (#/commandes?pays=JP), barre latérale, en-tête,
// actions globales, horloges (comptes à rebours, « il y a »).
import { esc, ic, toast, rebours, ilYA, nomPays, NIVEAU } from './ui.js';
import { shellHtml, brancherRepli } from './shell.js';
import { carteChargee } from './vues/carte.js';
import { rafraichir as rafraichirTiroir, fermer as fermerTiroir } from './vues/tiroirs.js';
import { ouvrirImport } from './vues/import.js';
import * as S from './store.js';
import { compter, brancherReflet, transition } from './effets.js';
import { brancherDepotGlobal } from './depot.js';
import * as vue from './vues/vue.js';
import * as commandes from './vues/commandes.js';
import * as questions from './vues/questions.js';
import * as veille from './vues/veille.js';
import * as dossier from './vues/dossier.js';
import * as arbre from './vues/arbre.js';
import * as accueil from './vues/accueil.js';
import * as monde from './vues/monde.js';
import * as produit from './vues/produit.js';
import * as E from './dossier/etat.js';

// La première vue est celle des envois ; les produits ont leur propre adresse.
const VUES = { '': vue, envois: vue, produits: accueil, produit, monde, dossier, commandes, questions, veille, arbre };
// L'entrée de la barre latérale allumée pour chaque écran. Les onglets d'un produit
// (pourquoi ce code, monde, dossier) restent sous « Products ».
const IDS = { '': 'envois', envois: 'envois', commandes: 'envois', produits: 'accueil', produit: 'accueil', monde: 'accueil', questions: 'questions', veille: 'veille', dossier: 'accueil', arbre: 'arbre' };
const actifSide = () => (route.nom === 'arbre' && route.params.get('sku') ? 'accueil' : IDS[route.nom]);
const shell = document.querySelector('.shell'), side = document.querySelector('.side'), main = document.querySelector('.main');
let route = null;

function lireAdresse() {
  const [chemin, q] = location.hash.replace(/^#\/?/, '').split('?');
  return { nom: VUES[chemin] ? chemin : '', params: new URLSearchParams(q || '') };
}

function rendreSide() {
  const s = S.lire(), F = S.fixes(), ev = s.lignes.length ? S.evaluation() : null;
  const comptes = ev ? { accueil: Object.keys(s.produits).length, envois: ev.totaux.lignes, questions: S.aFaire().length, veille: s.simulations.length || '' } : {};
  side.innerHTML = shellHtml(actifSide(), { comptes, mode: F.mode, api: F.api, boutique: s.boutique, fluxDemo: s.fluxDemo, qui: s.qui, alerte: Boolean(ev && ev.echeances.length) || s.simulations.length > 0 });
}

function topbar() {
  const s = S.lire(), V = VUES[route.nom];
  // Une action principale par écran, là où elle a du sens.
  const envois = ['', 'envois', 'commandes', 'veille'].includes(route.nom);
  const actions = route.nom === 'produits' ? `<a class="btn noir" href="#/dossier">${ic('plus')}Add a product</a>`
    : envois ? `<button class="btn texte" data-action="simuler" title="Simulate an announcement">${ic('eclair')}<span class="lib-btn">Simulate an announcement</span></button>${route.nom === 'veille' ? '' : `<button class="btn noir" data-action="importer" title="Import orders">${ic('import')}<span class="lib-btn">Import orders</span></button>`}` : '';
  const titre = V.titrePour ? V.titrePour() : V.titre;
  return `<header class="topbar"><div class="fil">${s.boutique ? `${esc(s.boutique.nom)} ${ic('droite')}` : ''}<b>${esc(titre)}</b></div>${actions}</header>`;
}

// Rendu de la page courante. Un rendu suivant le premier garde la position de saisie
// et ne rejoue pas l'animation d'entrée.
function rendre(premier = false) {
  const actif = document.activeElement, idActif = actif && actif.id, pos = actif && 'selectionStart' in actif ? actif.selectionStart : null;
  const V = VUES[route.nom];
  let html = V.rendre();
  if (!premier) html = html.replace('class="page entre"', 'class="page"');
  const conteneur = document.createElement('div');
  conteneur.className = 'vue';
  conteneur.innerHTML = topbar() + html;
  main.replaceChildren(conteneur);
  V.brancher && V.brancher(conteneur, () => rendre());
  compter(conteneur, { depuisZero: premier });
  rendreSide();
  if (idActif) { const el = document.getElementById(idActif); if (el) { el.focus(); if (pos != null && el.setSelectionRange) el.setSelectionRange(pos, pos); } }
}

let planifie = false;
function planifier() {
  if (planifie) return;
  planifie = true;
  requestAnimationFrame(() => { planifie = false; rendre(); rafraichirTiroir(); });
}

function naviguer() {
  route = lireAdresse();
  fermerTiroir();
  const V = VUES[route.nom];
  V.entrer && V.entrer(route.params);
  transition(() => { rendre(true); main.scrollTop = 0; });
}

// Menu « Simuler une annonce ».
function menuSimulation(bouton) {
  document.querySelector('.menu')?.remove();
  const F = S.fixes(), s = S.lire(), r = bouton.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'menu';
  el.style.top = r.bottom + 8 + 'px';
  el.style.right = Math.max(10, innerWidth - r.right) + 'px';
  el.innerHTML = F.modeles.map((m) => `<button data-sim="${esc(m.id)}" ${s.simulations.some((x) => x.id === m.id) ? 'disabled style="opacity:.45"' : ''}>${ic(m.effet.type === 'interdiction' ? 'stop' : 'horloge')}<span><b>${esc(m.titre)}</b><small>${esc(m.effet.type === 'interdiction' ? 'Immediate effect' : 'Takes effect at midnight, Washington time')} · fictional announcement</small></span></button>`).join('')
    + (s.simulations.length ? `<hr><button data-action="retirer-sim">${ic('annuler')}<span><b>Remove simulations</b><small>Go back to official texts only</small></span></button>` : '');
  document.body.appendChild(el);
  setTimeout(() => document.addEventListener('click', function fermer(e) { if (!el.contains(e.target)) { el.remove(); document.removeEventListener('click', fermer); } }), 0);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sim]');
    if (!b) return;
    const avant = S.evaluation().totaux.compte;
    S.simuler(b.dataset.sim);
    el.remove();
    const apres = S.evaluation(), m = F.modeles.find((x) => x.id === b.dataset.sim);
    const ech = apres.echeances.find((x) => x.regle === m.id);
    toast({ titre: 'Announcement simulated: ' + m.titre, texte: ech ? `${ech.commandes} orders affected, €${Math.round(ech.evitable)} avoidable before the deadline` : `${apres.totaux.compte.bloque - avant.bloque} line(s) become blocked`, niveau: m.effet.type === 'interdiction' ? 'bloque' : 'a_verifier', icone: 'eclair', duree: 7000 });
  });
}

// Le nom qui signe les réponses et validations, modifié sur place.
function editerNom(bouton) {
  const f = document.createElement('form');
  f.className = 'qui-edit';
  f.innerHTML = `<input class="saisie" maxlength="40" value="${esc(S.lire().qui)}" aria-label="Name that signs answers and validations"><button class="btn noir petit" type="submit">OK</button>`;
  bouton.replaceWith(f);
  const champ = f.querySelector('input');
  champ.focus(); champ.select();
  const garder = () => S.nommer(champ.value);
  f.addEventListener('submit', (e) => { e.preventDefault(); garder(); });
  champ.addEventListener('keydown', (e) => { if (e.key === 'Escape') rendreSide(); });
  champ.addEventListener('blur', () => setTimeout(garder, 120));
}

// Menu « Nouveau… » de la barre latérale.
function menuNouveau(bouton) {
  document.querySelector('.menu')?.remove();
  const r = bouton.getBoundingClientRect(), el = document.createElement('div');
  el.className = 'menu';
  el.style.top = r.bottom + 6 + 'px';
  el.style.left = r.left + 'px';
  el.innerHTML = `<button data-aller="#/dossier">${ic('agent')}<span><b>Classify a product</b><small>Photo, label, pictogram, product page address or text</small></span></button>
    <button data-action="importer">${ic('import')}<span><b>Import orders</b><small>CSV export from Shopify, Etsy or a spreadsheet</small></span></button>`;
  document.body.appendChild(el);
  setTimeout(() => document.addEventListener('click', function fermer(ev) { if (!el.contains(ev.target)) { el.remove(); document.removeEventListener('click', fermer); } }), 0);
  el.addEventListener('click', () => setTimeout(() => el.remove(), 0));
}

// Actions globales, quel que soit l'endroit du clic.
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-action], [data-aller]');
  if (!a) return;
  if (a.dataset.aller) { location.hash = a.dataset.aller; return; }
  const x = a.dataset.action;
  if (x === 'importer') ouvrirImport();
  else if (x === 'demo') ouvrirImport('demo');
  else if (x === 'nouveau') { e.stopPropagation(); menuNouveau(a); }
  else if (x === 'simuler') { e.stopPropagation(); menuSimulation(a); }
  else if (x === 'retirer-sim') { document.querySelector('.menu')?.remove(); S.retirerSimulations(); toast({ titre: 'Simulations removed', texte: 'Only official texts still apply.', icone: 'annuler' }); }
  else if (x === 'flux') S.basculerFlux(!S.lire().fluxDemo);
  else if (x === 'qui') editerNom(a);
});

window.addEventListener('nouvelle-commande', (e) => {
  const l = e.detail;
  toast({ titre: `New order ${l.commande} → ${nomPays(l.pays)}`, texte: `${l.produit} · ${NIVEAU[l.etat.niveau].court}: ${l.etat.principale.texte}`, niveau: l.etat.niveau, icone: NIVEAU[l.etat.niveau].ic });
});

// Horloges : comptes à rebours chaque seconde ; un rebours qui passe zéro rejoue la vérification.
setInterval(() => {
  let passe = false;
  document.querySelectorAll('[data-rebours]').forEach((el) => {
    const ms = Date.parse(el.dataset.rebours) - Date.now();
    if (ms <= 0) passe = true;
    const texte = el.firstChild;
    if (texte && texte.nodeType === Node.TEXT_NODE) texte.textContent = rebours(ms);
    else el.prepend(rebours(ms));
  });
  if (passe) planifier();
}, 1000);
setInterval(() => document.querySelectorAll('[data-ilya]').forEach((el) => { el.textContent = ilYA(el.dataset.ilya); }), 5000);
main.addEventListener('scroll', () => main.classList.toggle('defile', main.scrollTop > 4), { passive: true });

brancherRepli(shell);
brancherReflet();
brancherDepotGlobal();
S.abonner(planifier);
E.abonner(planifier);
window.addEventListener('hashchange', naviguer);
naviguer();
S.demarrer();
carteChargee().then(() => planifier());
