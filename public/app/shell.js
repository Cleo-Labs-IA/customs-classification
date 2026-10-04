// Barre latérale de Stamped. Elle lit l'état sans lancer l'agent.
import { esc, ic, ilYA } from './ui.js';

// Quatre écrans. Un produit ouvre son propre espace (vue d'ensemble, pourquoi ce code,
// monde, dossier) ; l'éditeur de la règle encodée est un outil d'expert, à part.
const NAV = [
  { id: 'accueil', href: '/#/', lib: 'Products', ic: 'produits' },
  { id: 'envois', href: '/#/envois', lib: 'Shipments', ic: 'commandes' },
  { id: 'questions', href: '/#/questions', lib: 'Questions', ic: 'questions' },
  { id: 'veille', href: '/#/veille', lib: 'Regulatory watch', ic: 'veille' },
];
const OUTILS = [
  { id: 'arbre', href: '/#/arbre', lib: 'Rule editor', ic: 'arbre' },
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
       <div class="arbo"><button class="navitem" data-action="flux" style="width:100%" title="Simulated orders">${ic(infos.fluxDemo ? 'pause' : 'lecture')}<span>${infos.fluxDemo ? 'Stop the simulated stream' : 'Start a simulated order stream'}</span></button></div>`
    : `<button class="boutique navitem" data-action="importer" style="width:100%"><span class="bulle creuse"></span><div><b>No store</b><small>Import a Shopify or Etsy export</small></div></button>`;
  const mode = infos.mode === 'direct'
    ? `<div class="mode" title="Each classification is a live call"><span class="dot live"></span><div><b>Live</b><small>${esc(String(infos.api || '').replace('https://', ''))}</small></div></div>`
    : infos.mode === 'illustratif'
      ? `<div class="mode" title="Without an API key, the cockpit replays a recorded response and illustrative responses"><span class="dot warn"></span><div><b>Offline</b><small>No API key: recorded or illustrative responses</small></div></div>`
      : '';
  return `
  <div class="side-top">
    <a class="logo" href="/#/" title="Stamped">${tampon()}</a>
    <div class="nom"><span class="marque">Stamped</span><small>Customs compliance</small></div>
    <a class="icobtn" href="/#/veille" title="Regulatory watch">${ic('cloche')}${infos.alerte ? '<span class="pastille"></span>' : ''}</a>
    <button class="icobtn" id="replier" title="Collapse the sidebar">${ic('panneau')}</button>
  </div>
  <button class="side-new" data-action="nouveau">${ic('plus')}<span>New…</span>${ic('chevron')}</button>
  <nav aria-label="Main navigation">${NAV.map(item).join('')}</nav>
  <div class="sec">Expert</div>
  <nav>${OUTILS.map(item).join('')}</nav>
  <div class="sec">Stores</div>
  <nav>${boutique}</nav>
  <div class="side-bas">${mode}
    <button class="qui" data-action="qui" title="Answers and validations are signed with this name"><span class="avatar">${esc(initiales(infos.qui || 'Compliance team'))}</span><span style="text-align:left">${esc(infos.qui || 'Compliance team')}</span>${ic('chevron', 'faint')}</button>
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
