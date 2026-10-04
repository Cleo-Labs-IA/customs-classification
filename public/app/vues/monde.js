// Le monde pour un produit : par pays, la ligne tarifaire que le moteur propose et le droit
// de base lu ; par marché, les exigences dont la citation a été retrouvée mot pour mot dans
// le texte officiel. Données enregistrées (public/data/monde-produits.json), jamais inventées.
import { esc, ic, urlSure, drapeau, etat } from '../ui.js';
import { fmtCode } from '../conformite.js';
import * as S from '../store.js';

export const titre = 'World';
let M = null, sku = null, ouvert = null, tout = false, familleVoulue = null, rerendreLocal = () => {};
fetch('/data/monde-produits.json').then((r) => (r.ok ? r.json() : null)).then((m) => { M = m; rerendreLocal(); }).catch(() => null);

const MARCHES = [['EU', 'European Union', 'FR'], ['GB', 'United Kingdom', 'GB'], ['CH', 'Switzerland', 'CH'], ['US', 'United States', 'US'], ['CA', 'Canada', 'CA'], ['MX', 'Mexico', 'MX'], ['JP', 'Japan', 'JP'], ['KR', 'South Korea', 'KR'], ['AU', 'Australia', 'AU'], ['NZ', 'New Zealand', 'NZ'], ['TW', 'Taiwan', 'TW']];
const SUJET = { safety: 'Safety', emc: 'Electromagnetic compatibility', radio: 'Radio', energy: 'Energy', chemicals: 'Substances', waste: 'Waste', battery: 'Battery', labelling: 'Labelling', customs: 'Customs', operator: 'Responsible operator' };
const CSS = `
.monde-tuiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line); border-radius: var(--r-lg); box-shadow: 0 0 0 1px var(--line); overflow: hidden; margin-bottom: 18px; }
.monde-tuiles div { background: var(--panel); padding: 16px 18px; }
.monde-tuiles b { display: block; font-family: var(--display); font-weight: 500; font-size: 34px; letter-spacing: -.045em; line-height: 1; }
.monde-tuiles span { font-size: 12.5px; color: var(--ink-3); }
@media (max-width: 980px) { .monde-tuiles { grid-template-columns: repeat(2, 1fr); } }
.marche { border-top: 1px solid var(--line); }
.marche:first-child { border-top: 0; }
.marche > button { width: 100%; display: grid; grid-template-columns: 190px minmax(0, 1.5fr) 120px minmax(0, 1fr) 20px; gap: 14px; align-items: center; padding: 13px 18px; background: none; border: 0; font: inherit; text-align: left; cursor: pointer; }
.marche > button:hover { background: #FAF9F6; }
.marche .nom { display: flex; align-items: center; gap: 9px; font-weight: 550; }
.marche .ligne-t { font-size: 13px; min-width: 0; }
.marche .ligne-t small { display: block; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.marche .exig-liste { padding: 2px 18px 18px 18px; display: flex; flex-direction: column; gap: 10px; }
.exi { border: 1px solid var(--line-2); border-radius: var(--r); padding: 12px 14px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 14px; }
.exi h4 { margin: 0; font-size: 14px; }
.exi .quoi { font-size: 13.5px; color: var(--ink-2); margin: 0; grid-column: 1 / -1; }
.exi blockquote { grid-column: 1 / -1; margin: 2px 0 0; padding: 8px 12px; border-left: 3px solid var(--ink); background: var(--sunk); border-radius: 0 8px 8px 0; font-size: 12.5px; color: var(--ink-2); }
.exi .src { grid-column: 1 / -1; font-size: 12px; color: var(--ink-3); }
.exi .src a { color: var(--cleo); }
.exi .note { grid-column: 1 / -1; font-size: 12px; color: var(--ink-3); margin: 0; }
@media (max-width: 900px) { .marche > button { grid-template-columns: 1fr 1fr; } }
`;
if (typeof document !== 'undefined') document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

export function entrer(params) { if (params.get('sku')) sku = params.get('sku'); familleVoulue = params.get('famille'); ouvert = params.get('marche') || null; }

const droit = (d) => (!d ? '<span class="faint">not read</span>' : `<b>${d.min === d.max ? d.min : d.min + ' to ' + d.max}${esc(d.unite || '%')}</b>${d.ligne_exacte ? '' : ' <span class="faint">range</span>'}`);
function ligne(x, codeRegle) {
  if (!x || !x.consulte) return '<span class="faint">six digits only: no national catalogue is enabled</span>';
  if (x.erreur) return '<span class="faint">the API did not answer for this country</span>';
  if (!x.accord_regle) return `${etat('a_verifier', 'Engine proposes ' + fmtCode(x.hs6_moteur))}<small>differs from the rule (${esc(fmtCode(codeRegle))}): not usable without a declarant</small>`;
  if (!x.ligne) return `<span class="code">${esc(fmtCode(codeRegle))}</span><small>six digits: the engine returned no national line</small>`;
  return `<span class="code">${esc(x.ligne.code)}</span> <span class="faint">${esc(x.ligne.systeme)}</span><small title="${esc(x.ligne.libelle)}">${esc(x.ligne.libelle || 'no wording returned')} · confidence ${x.ligne.confiance ?? 'not given'}</small>`;
}
const marque = (e) => (e.marque == null ? '' : e.vu_sur_etiquette ? etat('pret', e.marque + ': seen on the label') : etat('a_verifier', e.marque + ': not seen on the label'));
const exigence = (e) => `<div class="exi"><h4>${esc(e.titre)}</h4><span>${marque(e)}</span><p class="quoi">${esc(e.exigence)}</p><blockquote>${esc(e.citation)}</blockquote>
  <p class="src">${esc(SUJET[e.sujet] || e.sujet)} · <a href="${urlSure(e.url)}" target="_blank" rel="noopener">${esc(e.acte)}, ${esc(e.article)}</a> · quote found word for word in the official text on ${esc(e.verifie_le || '')}${e.en_vigueur ? ' · applies since ' + esc(e.en_vigueur) : ''}</p>${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}</div>`;

export function rendre() {
  const s = S.lire(), produits = Object.values(s.produits).filter((p) => M && M.produits[p.sku]);
  if (!M || !produits.length) return '<div class="page"><div class="titre"><div class="bloc"><h1>World</h1></div></div><div class="agent"><span class="rond"></span><span class="txt">Loading the world data</span></div></div>';
  if (familleVoulue) { const p = produits.find((x) => M.produits[x.sku].famille === familleVoulue); if (p) sku = p.sku; familleVoulue = null; }
  if (!sku || !M.produits[sku]) sku = produits[0].sku;
  const P = M.produits[sku], b = P.bilan, exig = M.reglementation.filter((e) => e.produits.includes(P.famille));
  const marches = MARCHES.map(([m, nom, pays]) => {
    const liste = exig.filter((e) => e.marche === m), x = P.pays[pays], nonVues = liste.filter((e) => e.vu_sur_etiquette === false).length, vues = liste.filter((e) => e.vu_sur_etiquette === true).length;
    if (!liste.length) return '';
    return `<div class="marche"><button type="button" data-marche="${m}" aria-expanded="${ouvert === m}"><span class="nom">${drapeau(pays === 'FR' ? 'EU' : pays)}${esc(nom)}</span><span class="ligne-t">${ligne(x, P.code_regle)}</span><span>${x && x.consulte && !x.erreur ? droit(x.droits) : '<span class="faint">not read</span>'}</span>
      <span style="font-size:13px"><b>${liste.length}</b> requirement${liste.length === 1 ? '' : 's'} verified${vues || nonVues ? ` · ${vues} mark${vues === 1 ? '' : 's'} seen${nonVues ? `, <b style="color:var(--warn)">${nonVues} not seen</b>` : ''}` : ''}</span>${ic(ouvert === m ? 'chevron' : 'droite')}</button>
      ${ouvert === m ? `<div class="exig-liste">${liste.map(exigence).join('')}</div>` : ''}</div>`;
  }).join('');
  const autres = Object.entries(P.pays).filter(([, x]) => x.consulte).sort((a, b2) => (M.noms[a[0]] || a[0]).localeCompare(M.noms[b2[0]] || b2[0]));
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>World</h1><p>For one product: the tariff line each country would use, the base duty, and what each market requires, with the official sentence behind it.</p></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${produits.map((p) => `<button class="chip ${p.sku === sku ? 'actif' : ''}" data-produit="${esc(p.sku)}">${esc(p.nom)}</button>`).join('')}</div>
    <div class="monde-tuiles"><div><b>${b.consultes}</b><span>countries looked up on the Cleo Legal API (${M.couverture.catalogue_national} have a national catalogue, ${M.couverture.six_chiffres} stop at six digits)</span></div>
      <div><b>${b.lignes_nationales}</b><span>countries where the engine proposes a national line under the rule's code ${esc(fmtCode(P.code_regle))}</span></div>
      <div><b>${b.desaccord}</b><span>countries where the engine alone proposes another code: the rule and its reasons decide</span></div>
      <div><b>${b.exigences}</b><span>requirements verified against the official text, in ${b.marches_exigences} markets</span></div></div>
    <div class="carte"><div class="carte-tete"><h3>Markets with verified requirements</h3><span class="muted">tariff line · base duty · requirements</span></div><p class="carte-sous">Each requirement quotes the official text; the quote was found word for word in the source by an independent check. A mark seen on a label is not proof of conformity.</p>${marches}</div>
    <details class="carte repli" style="margin-top:14px" ${tout ? 'open' : ''} data-tout><summary class="carte-tete"><h3>All ${autres.length} countries looked up</h3></summary>
      <div class="table-cadre" style="box-shadow:none;border-radius:0"><table class="t"><thead><tr><th>Country</th><th>Tariff line proposed by the engine</th><th>Base duty</th></tr></thead><tbody>${tout ? autres.map(([c, x]) => `<tr><td>${esc(M.noms[c] || c)} <span class="faint">${esc(c)}</span></td><td class="ligne-t" style="font-size:13px">${ligne(x, P.code_regle)}</td><td>${x.erreur ? '' : droit(x.droits)}</td></tr>`).join('') : ''}</tbody></table></div></details>
    <p class="faint" style="font-size:12.5px;max-width:900px;margin-top:14px">Recorded on ${esc(M.fixe_le)}. Tariff lines are proposals of the engine, not validated by a declarant. Base duty excludes VAT, taxes and additional duties. The requirement list is not complete: the rules that could not be checked against an official text are left out, and listed in the project files.</p>
  </div>`;
}

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  racine.addEventListener('click', (e) => {
    const p = e.target.closest('[data-produit]'); if (p) { sku = p.dataset.produit; ouvert = null; return rerendre(); }
    const m = e.target.closest('[data-marche]'); if (m) { ouvert = ouvert === m.dataset.marche ? null : m.dataset.marche; return rerendre(); }
  });
  racine.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('[data-tout]') && e.target.open !== tout) { tout = e.target.open; rerendre(); } }, true);
}
