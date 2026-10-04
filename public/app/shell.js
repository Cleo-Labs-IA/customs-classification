// Barre latérale de Stamped. Elle lit l'état sans lancer l'agent.
import { esc, ic, ilYA } from './ui.js';

const NAV = [
  { id: 'vue', href: '/#/', lib: "Vue d'ensemble", ic: 'accueil' },
  { id: 'dossier', href: '/#/dossier', lib: 'Classer un produit', ic: 'agent' },
  { id: 'commandes', href: '/#/commandes', lib: 'Commandes', ic: 'commandes' },
  { id: 'produits', href: '/#/produits', lib: 'Produits', ic: 'produits' },
  { id: 'questions', href: '/#/questions', lib: 'Questions', ic: 'questions' },
  { id: 'veille', href: '/#/veille', lib: 'Veille réglementaire', ic: 'veille' },
];
const OUTILS = [
  { id: 'arbre', href: '/#/arbre', lib: "Arbre d'interprétation", ic: 'arbre' },
];

// Le tampon de la marque Stamped (silhouette pleine, couleur du texte).
export const tampon = (cls = '') => `<svg viewBox="0 0 64 64" class="${cls}" aria-hidden="true"><g transform="rotate(-14 32 32)" fill="currentColor"><path d="M32 4c6 0 10 4.5 10 10 0 4-2.5 7-5 9-1.5 1.5-1.5 4 0 7 2 4 5 7 9 8.5 2 .8 2 2.5 2 3.5v4c0 1.7-1.3 3-3 3H19c-1.7 0-3-1.3-3-3v-4c0-1 0-2.7 2-3.5 4-1.5 7-4.5 9-8.5 1.5-3 1.5-5.5 0-7-2.5-2-5-5-5-9 0-5.5 4-10 10-10z"/><rect x="17" y="52" width="30" height="5" rx="2.5"/></g></svg>`;

const initiales = (nom) => String(nom).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('') || 'C';

// actif : identifiant de la page ; infos : { comptes, mode, api, boutique, fluxDemo, qui, alerte }
export function shellHtml(actif, infos = {}) {
  const c = infos.comptes || {};
  const item = (n) => `<a class="navitem ${n.id === actif ? 'actif' : ''}" href="${n.href}" title="${esc(n.lib)}">${ic(n.ic)}<span>${esc(n.lib)}</span>${c[n.id] ? `<span class="compte ${n.id === 'questions' ? 'chaud' : ''}">${c[n.id]}</span>` : ''}</a>`;
  const b = infos.boutique;
  const boutique = b
    ? `<div class="boutique"><span class="bulle"></span><div><b>${esc(b.nom)}</b><small>${infos.fluxDemo ? '<span class="dot live"></span>' : ''}${esc(b.plateforme)} · <span data-ilya="${esc(b.synchroLe)}">${esc(ilYA(b.synchroLe))}</span></small></div></div>
       <div class="arbo"><button class="navitem" data-action="flux" style="width:100%" title="Commandes simulées">${ic(infos.fluxDemo ? 'pause' : 'lecture')}<span>${infos.fluxDemo ? 'Arrêter le flux simulé' : 'Lancer un flux de commandes simulé'}</span></button></div>`
    : `<button class="boutique navitem" data-action="importer" style="width:100%"><span class="bulle creuse"></span><div><b>Aucune boutique</b><small>Importer un export Shopify ou Etsy</small></div></button>`;
  const mode = infos.mode === 'direct'
    ? `<div class="mode" title="Chaque classification est un appel en direct"><span class="dot live"></span><div><b>En direct</b><small>${esc(String(infos.api || '').replace('https://', ''))}</small></div></div>`
    : infos.mode === 'illustratif'
      ? `<div class="mode" title="Sans clé d'API, le cockpit rejoue une réponse enregistrée et des réponses illustratives"><span class="dot warn"></span><div><b>Hors ligne</b><small>Clé d'API absente : réponses enregistrées ou illustratives</small></div></div>`
      : '';
  return `
  <div class="side-top">
    <a class="logo" href="/#/" title="Stamped">${tampon()}</a>
    <div class="nom"><span class="marque">Stamped</span><small>Douane et conformité</small></div>
    <a class="icobtn" href="/#/veille" title="Veille réglementaire">${ic('cloche')}${infos.alerte ? '<span class="pastille"></span>' : ''}</a>
    <button class="icobtn" id="replier" title="Replier la barre">${ic('panneau')}</button>
  </div>
  <button class="side-new" data-action="nouveau">${ic('plus')}<span>Nouveau…</span>${ic('chevron')}</button>
  <nav aria-label="Navigation principale">${NAV.map(item).join('')}</nav>
  <div class="sec">Outils d'expertise</div>
  <nav>${OUTILS.map(item).join('')}</nav>
  <div class="sec">Boutiques</div>
  <nav>${boutique}</nav>
  <div class="side-bas">${mode}
    <button class="qui" data-action="qui" title="Les réponses et validations sont signées de ce nom"><span class="avatar">${esc(initiales(infos.qui || 'Équipe conformité'))}</span><span style="text-align:left">${esc(infos.qui || 'Équipe conformité')}</span>${ic('chevron', 'faint')}</button>
  </div>`;
}

// Repli de la barre, mémorisé dans ce navigateur.
// Sans préférence mémorisée, la barre se replie d'elle-même sur un écran étroit.
export function brancherRepli(shell) {
  const pref = () => { try { return localStorage.getItem('barre-repliee'); } catch { return null; } };
  const ajuster = () => { const p = pref(); shell.classList.toggle('replie', innerWidth < 760 || p === '1' || (p === null && innerWidth < 1100)); };
  ajuster();
  addEventListener('resize', ajuster);
  shell.addEventListener('click', (e) => {
    if (!e.target.closest('#replier')) return;
    shell.classList.toggle('replie');
    try { localStorage.setItem('barre-repliee', shell.classList.contains('replie') ? '1' : '0'); } catch { /* idem */ }
  });
}
