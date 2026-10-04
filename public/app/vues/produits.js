// Produits : une matrice produit × destination. La colonne « code » dit où en est la
// classification ; chaque case dit l'état des lignes de ce produit vers ce pays.
import { esc, ic, nomPays, NIVEAU, vignette, drapeau } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { ouvrir } from './tiroirs.js';
import * as S from '../store.js';

export const titre = 'Produits';

function etatCode(cl, v) {
  if (v) return `<span class="code">${esc(fmtCode(v.hs6))}</span><br><small style="color:var(--ok)">${ic('check')} validé par ${esc(v.par)}</small>`;
  if (!cl || cl.enCours) return '<span class="agent" style="padding:4px 9px;display:inline-flex"><span class="rond"></span>Classement</span>';
  if (cl.erreur) return `<small style="color:var(--bad)">${esc(cl.erreur)}</small>`;
  if (cl.statut === 'needs_information') return `<span class="code provisoire">${esc(fmtCode(cl.code) || '—')}</span><br><small style="color:var(--warn)">question en attente</small>`;
  if (cl.statut === 'ambiguous') { const n = (cl.candidats || []).filter((c) => !c.ecarte).length; return `<span class="code provisoire">${esc(fmtCode(cl.code))}</span><br><small style="color:var(--warn)">${n > 1 ? n + ' codes plausibles' : 'jugé ambigu, à trancher'}</small>`; }
  return `<span class="code provisoire">${esc(fmtCode(cl.code))}</span><br><small style="color:var(--warn)">proposé, à valider</small>`;
}

export function rendre() {
  const s = S.lire();
  if (!s.lignes.length) return '<div class="page"><div class="titre"><div class="bloc"><h1>Produits</h1></div></div><div class="vide carte"><h3>Aucun produit</h3><p>Les produits viennent des commandes importées.</p><button class="btn noir" data-action="demo">Boutique de démonstration</button></div></div>';
  const ev = S.evaluation();
  const destinations = Object.entries(ev.parPays).sort((a, b) => b[1].lignes - a[1].lignes).map(([c]) => c);
  const skus = Object.keys(s.produits).sort((a, b) => ((ev.parProduit[b] || {}).lignes || 0) - ((ev.parProduit[a] || {}).lignes || 0));
  const valides = Object.keys(s.validations).filter((k) => s.produits[k]).length;
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Produits</h1><p>Le code de chaque produit et son état pour chaque pays où il est vendu. Un code se valide une fois, à six chiffres ; il vaut pour toutes les destinations.</p></div>
      <div style="display:flex;gap:22px"><div><div class="display" style="font-size:38px;line-height:1"><span data-compte="${valides}" data-cle="valides">${valides}</span><span class="faint">/${skus.length}</span></div><div class="muted" style="font-size:12.5px">codes validés</div></div></div></div>
    <div class="table-cadre"><table class="t matrice"><thead><tr><th>Produit</th><th>Code SH</th><th class="num">Lignes</th>${destinations.map((c) => `<th class="p" title="${esc(nomPays(c))}">${drapeau(c, 'grand')}</th>`).join('')}</tr></thead>
    <tbody>${skus.map((sku) => {
      const p = s.produits[sku], q = ev.parProduit[sku] || { parPays: {}, lignes: 0 };
      return `<tr data-sku="${esc(sku)}"><td><div class="prod-cell">${vignette(p, 'moyenne')}<div class="produit"><b>${esc(p.nom)}</b><small>${esc(sku)} · ${esc(nomPays(p.origine))}</small></div></div></td>
        <td style="line-height:1.3">${etatCode(s.classifications[sku], s.validations[sku])}</td><td class="num">${q.lignes}</td>
        ${destinations.map((c) => { const n = q.parPays[c]; return `<td class="cell" ${n ? `data-cellule="${esc(sku)}|${c}" title="${esc(nomPays(c))} : ${esc(NIVEAU[n].court)}"` : ''}><span class="case ${n || 'rien'}"><i></i></span></td>`; }).join('')}</tr>`;
    }).join('')}</tbody></table></div>
    <div class="legende" style="padding:14px 2px"><span><i class="c-pret"></i>Prête</span><span><i class="c-a_verifier"></i>À vérifier</span><span><i class="c-bloque"></i>Bloquée</span><span><i class="c-en_attente"></i>Classification en cours</span><span class="faint">· Le point orange après un code : proposé par le moteur, pas encore validé.</span></div>
  </div>`;
}

export function brancher(racine) {
  racine.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cellule]');
    if (c) {
      const [sku, pays] = c.dataset.cellule.split('|');
      const l = S.evaluation().lignes.filter((x) => x.sku === sku && x.pays === pays && x.expedition !== 'expediee').sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a.etat.niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b.etat.niveau))[0];
      if (l) return ouvrir('ligne', l.id);
    }
    const tr = e.target.closest('tr[data-sku]');
    if (tr) ouvrir('produit', tr.dataset.sku);
  });
}
