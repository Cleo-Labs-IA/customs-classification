// Les envois tiennent en un écran à deux vues : la vue d'ensemble (carte, échéances) et le
// tableau des commandes. Un seul titre, une bascule entre les deux.
import { esc } from '../ui.js';

export const enteteEnvois = (actif, sousTitre) => `<div class="titre"><div class="bloc"><h1>Shipments</h1><p>${sousTitre}</p></div>
  <div class="bascule" role="tablist">${[['envois', 'Overview', '#/envois'], ['commandes', 'Orders', '#/commandes']].map(([id, lib, url]) => `<a role="tab" href="${url}" class="${id === actif ? 'actif' : ''}" aria-selected="${id === actif}">${esc(lib)}</a>`).join('')}</div></div>`;
