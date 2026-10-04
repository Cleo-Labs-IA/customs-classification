// Commandes : une ligne par article commandé, vérifiée pour son pays de livraison.
// Onglets par état, recherche, filtres pays et échéance, expédition groupée.
import { esc, ic, etat, pays, argent, nomPays, toast, pluriel, NIVEAU, vignette } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { ouvrir } from './tiroirs.js';
import * as S from '../store.js';

export const titre = 'Orders';
const ONGLETS = [['a_expedier', 'To ship'], ['bloque', 'Blocked'], ['a_verifier', 'To check'], ['pret', 'Ready'], ['expediees', 'Shipped'], ['toutes', 'All']];
let f = { onglet: 'a_expedier', recherche: '', pays: '', echeance: '' };
const selection = new Set();

const garde = {
  a_expedier: (l) => l.expedition !== 'expediee',
  bloque: (l) => l.expedition !== 'expediee' && l.etat.niveau === 'bloque',
  a_verifier: (l) => l.expedition !== 'expediee' && l.etat.niveau === 'a_verifier',
  pret: (l) => l.expedition !== 'expediee' && l.etat.niveau === 'pret',
  expediees: (l) => l.expedition === 'expediee',
  toutes: () => true,
};
const norme = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Les paramètres de l'adresse (#/commandes?pays=JP&niveau=bloque) priment à l'arrivée.
export function entrer(params) {
  f = { onglet: params.get('niveau') || (params.get('echeance') ? 'a_expedier' : f.onglet), recherche: '', pays: params.get('pays') || '', echeance: params.get('echeance') || '' };
  if (f.onglet === 'en_attente') f.onglet = 'a_expedier';
  selection.clear();
}

function filtrer(lignes, produits) {
  const q = norme(f.recherche.trim());
  return lignes.filter((l) => {
    if (f.pays && l.pays !== f.pays) return false;
    if (f.echeance && !l.etat.raisons.some((r) => r.regle === f.echeance && r.echeance)) return false;
    if (!q) return true;
    return norme([l.commande, l.produit, l.sku, nomPays(l.pays), l.client, (produits[l.sku] || {}).nom].join(' ')).includes(q);
  });
}

function ligneHtml(l, p, i = 0) {
  const e = l.etat, exp = l.expedition === 'expediee';
  return `<tr style="--r:${i}" data-id="${esc(l.id)}" class="${selection.has(l.id) ? 'sel' : ''} ${exp ? 'expediee' : ''}">
    <td style="width:36px" data-stop>${exp ? '' : `<input type="checkbox" aria-label="Select ${esc(l.commande)}" data-sel="${esc(l.id)}" ${selection.has(l.id) ? 'checked' : ''}>`}</td>
    <td class="cmd"><b>${esc(l.commande)}</b><small>${esc(l.client || '')}</small></td>
    <td>${pays(l.pays)}</td>
    <td class="produit"><div class="prod-cell">${vignette({ ...p, sku: l.sku }, 'petite')}<div><b>${esc(p.nom || l.produit)}</b><small>${esc(l.sku)}${l.quantite > 1 ? ' · ×' + l.quantite : ''}</small></div></div></td>
    <td class="num">${argent(e.valeur, l.devise, true)}</td>
    <td>${e.code ? `<span class="code ${e.provisoire ? 'provisoire' : ''}" title="${e.provisoire ? 'Proposed by the engine, not validated' : 'Validated'}">${esc(fmtCode(e.code))}</span>` : '<span class="faint">-</span>'}</td>
    <td>${exp ? '<span class="tag">Shipped</span>' : etat(e.niveau)}</td>
    <td class="raison" title="${esc(e.principale.texte)}">${esc(e.principale.texte)}</td>
    <td class="num">${e.surcout ? argent(e.surcout, l.devise, true) : e.evitable ? `<span style="color:var(--warn)" title="Avoidable before the deadline">${argent(e.evitable, l.devise, true)}</span>` : '<span class="faint">-</span>'}</td>
    <td style="width:28px">${ic('droite', 'chev')}</td></tr>`;
}

export function rendre() {
  const s = S.lire();
  if (!s.lignes.length) return `<div class="page"><div class="titre"><div class="bloc"><h1>Orders</h1></div></div><div class="vide carte"><h3>No orders</h3><p>Import a Shopify or Etsy export, or load the demo store.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn noir" data-action="demo">Demo store</button><button class="btn blanc" data-action="importer">Import</button></div></div></div>`;
  const ev = S.evaluation(), base = filtrer(ev.lignes, s.produits), lignes = base.filter(garde[f.onglet]);
  const R = f.echeance ? S.regles().find((r) => r.id === f.echeance) : null;
  const pays = [...new Set(ev.lignes.map((l) => l.pays))].sort((a, b) => nomPays(a).localeCompare(nomPays(b), 'en'));
  const sel = [...selection].filter((id) => ev.lignes.some((l) => l.id === id && l.expedition !== 'expediee'));
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Orders</h1><p>Every item ordered, checked for its delivery country. Only ready lines ship: a line to check waits for its answer, a blocked line waits for the rule to be lifted.</p></div></div>
    <div class="onglets" role="tablist">${ONGLETS.map(([k, lib]) => `<button role="tab" data-onglet="${k}" class="${f.onglet === k ? 'actif' : ''}">${lib}<sup>${base.filter(garde[k]).length}</sup></button>`).join('')}</div>
    <div class="outils">
      <label class="recherche">${ic('recherche')}<input id="recherche-commandes" placeholder="Order, product, country, customer…" value="${esc(f.recherche)}" autocomplete="off"></label>
      <label class="chip" style="position:relative">${ic('globe')}${f.pays ? esc(nomPays(f.pays)) : 'All countries'}${ic('chevron')}<select data-filtre="pays" style="position:absolute;inset:0;opacity:0;cursor:pointer" aria-label="Filter by country"><option value="">All countries</option>${pays.map((c) => `<option value="${c}" ${f.pays === c ? 'selected' : ''}>${esc(nomPays(c))}</option>`).join('')}</select></label>
      ${f.pays ? `<button class="chip actif" data-retirer-filtre="pays">${esc(nomPays(f.pays))}${ic('fermer')}</button>` : ''}
      ${R ? `<button class="chip actif" data-retirer-filtre="echeance">${ic('horloge')}${esc(R.titre)}${ic('fermer')}</button>` : ''}
      <span class="espace"></span>
      <span class="muted" style="font-size:12.5px">${pluriel(lignes.length, 'line', 'lines')}</span>
    </div>
    <div class="table-cadre"><table class="t"><thead><tr><th data-stop><input type="checkbox" aria-label="Select all" data-tout ${lignes.length && lignes.filter((l) => l.expedition !== 'expediee').every((l) => selection.has(l.id)) ? 'checked' : ''}></th><th>Order</th><th>${ic('globe')}Destination</th><th>${ic('produits')}Product</th><th class="num">Value</th><th>HS code</th><th>Compliance</th><th>Main reason</th><th class="num">Extra cost</th><th></th></tr></thead>
      <tbody>${lignes.map((l, i) => ligneHtml(l, s.produits[l.sku] || {}, i)).join('') || `<tr><td colspan="10"><div class="vide" style="padding:36px">No lines in this view.</div></td></tr>`}</tbody></table></div>
    ${sel.length ? `<div class="flottant"><span>${pluriel(sel.length, 'line selected', 'lines selected')}</span><button class="btn blanc petit" data-expedier-sel>${ic('camion')}Ship the ready lines</button><button class="btn texte petit" data-vider>Clear selection</button></div>` : ''}
  </div>`;
}

export function brancher(racine, rerendre) {
  const champ = racine.querySelector('#recherche-commandes');
  champ?.addEventListener('input', () => { f.recherche = champ.value; rerendre(); });
  racine.querySelector('[data-filtre="pays"]')?.addEventListener('change', (e) => { f.pays = e.target.value; rerendre(); });
  racine.addEventListener('click', (e) => {
    const t = e.target;
    const onglet = t.closest('[data-onglet]');
    if (onglet) { f.onglet = onglet.dataset.onglet; selection.clear(); return rerendre(); }
    const rf = t.closest('[data-retirer-filtre]');
    if (rf) { f[rf.dataset.retirerFiltre] = ''; return rerendre(); }
    if (t.matches('[data-sel]')) { t.checked ? selection.add(t.dataset.sel) : selection.delete(t.dataset.sel); return rerendre(); }
    if (t.matches('[data-tout]')) { const ids = [...racine.querySelectorAll('[data-sel]')].map((x) => x.dataset.sel); ids.forEach((id) => (t.checked ? selection.add(id) : selection.delete(id))); return rerendre(); }
    if (t.closest('[data-vider]')) { selection.clear(); return rerendre(); }
    if (t.closest('[data-expedier-sel]')) return expedierSelection();
    if (t.closest('[data-stop]')) return;
    const tr = t.closest('tr[data-id]');
    if (tr) ouvrir('ligne', tr.dataset.id);
  });
}

// Seules les lignes prêtes partent. Les autres restent, et c'est dit avec leur nombre.
function expedierSelection() {
  const ev = S.evaluation(), choisies = ev.lignes.filter((l) => selection.has(l.id) && l.expedition !== 'expediee');
  const ok = choisies.filter((l) => l.etat.niveau === 'pret'), restees = choisies.filter((l) => l.etat.niveau !== 'pret');
  const evite = ok.reduce((x, l) => x + l.etat.evitable, 0);
  const pourquoi = ['bloque', 'a_verifier', 'en_attente'].map((n) => [n, restees.filter((l) => l.etat.niveau === n).length]).filter(([, k]) => k).map(([n, k]) => `${k} ${NIVEAU[n].court.toLowerCase()}`).join(', ');
  selection.clear();
  if (ok.length) S.expedier(ok.map((l) => l.id));
  toast({
    titre: ok.length ? pluriel(ok.length, 'line shipped', 'lines shipped') : 'No line shipped',
    texte: [evite ? `${argent(evite)} in duties avoided before the deadline` : '', restees.length ? `${pluriel(restees.length, 'line stays', 'lines stay')} (${pourquoi}): only ready lines ship` : ''].filter(Boolean).join(' · ') || 'They leave the to-ship queue.',
    niveau: restees.length ? 'a_verifier' : 'pret', icone: 'camion', duree: 7000,
  });
}
