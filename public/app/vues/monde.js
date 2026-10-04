// Le monde pour un produit : par pays, la ligne tarifaire que le moteur propose et le droit
// de base lu ; par marché, les exigences dont la citation a été retrouvée mot pour mot dans
// le texte officiel. Données enregistrées (public/data/monde-produits.json), jamais inventées.
import { esc, ic, urlSure, drapeau, etat } from '../ui.js';
import { fmtCode } from '../conformite.js';
import * as S from '../store.js';
import { enteteProduit } from './produit-entete.js';

export const titre = 'Products';
let CARTE = null, paysChoisi = null;
let M = null, sku = null, ouvert = null, tout = false, familleVoulue = null, rerendreLocal = () => {};
fetch('/data/monde.json').then((r) => (r.ok ? r.json() : null)).then((c) => { CARTE = c; rerendreLocal(); }).catch(() => null);
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
.carte-monde svg { width: 100%; height: auto; display: block; }
.carte-monde path { stroke: #fff; stroke-width: .5; cursor: pointer; }
.carte-monde path:hover { stroke: var(--ink); stroke-width: 1.2; }
.carte-monde path.choisi { stroke: var(--ink); stroke-width: 1.6; }
.carte-monde .c-ligne { fill: #0B3BE0; }
.carte-monde .c-hs6 { fill: #9DB4F7; }
.carte-monde .c-autre { fill: #E0352B; }
.carte-monde .c-rien { fill: #DEDCD5; }
.carte-monde .exi-pt { fill: #fff; stroke: #131312; stroke-width: 1.4; pointer-events: none; }
.carte-monde .encart-cadre { fill: none; stroke: var(--ink-4); stroke-width: .8; stroke-dasharray: 3 2; }
.carte-monde .encart-fond { fill: var(--panel); stroke: var(--line-2); }
.carte-legende { display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 4px 18px 14px; font-size: 12.5px; color: var(--ink-2); }
.carte-legende i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.carte-legende .pt { border-radius: 50%; background: #fff; border: 1.6px solid #131312; width: 10px; height: 10px; }
.carte-detail { margin: 0 18px 16px; padding: 12px 14px; border-radius: var(--r); background: var(--sunk); font-size: 13.5px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
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

// La carte : une couleur par pays, selon ce que le moteur rend pour ce produit.
//   bleu      : ligne nationale proposée sous le code de la règle
//   bleu pâle : même code, six chiffres seulement
//   rouge     : le moteur seul propose un autre code
//   gris      : pas de catalogue national activé, ou pays non consulté
const EUROPE = { x: 450, y: 66, l: 96, h: 90 }, ENCART = { x: 12, y: 250, l: 208, h: 195 };
const classePays = (x) => (!x || !x.consulte || x.erreur ? 'c-rien' : !x.accord_regle ? 'c-autre' : x.ligne ? 'c-ligne' : 'c-hs6');
const LIB = { 'c-ligne': 'national tariff line proposed', 'c-hs6': 'same code, six digits only', 'c-autre': 'the engine alone proposes another code', 'c-rien': 'no national catalogue enabled' };
function carteHtml(P, exig) {
  if (!CARTE) return '<div class="carte-corps"><div class="agent"><span class="rond"></span><span class="txt">Loading the map</span></div></div>';
  const marches = new Set(exig.map((e) => e.marche)), aExigences = (c) => marches.has(c) || (marches.has('EU') && P.pays[c] && P.pays[c].bloc === 'EU');
  const formes = CARTE.pays.map((p) => { const x = P.pays[p.id], k = classePays(x); return `<path class="${k} ${paysChoisi === p.id ? 'choisi' : ''}" d="${p.d}" data-pays="${esc(p.id)}"><title>${esc(M.noms[p.id] || p.nom)}: ${LIB[k]}${x && x.ligne && x.accord_regle ? ' (' + esc(x.ligne.code) + ')' : x && x.consulte && !x.erreur && !x.accord_regle ? ' (' + esc(fmtCode(x.hs6_moteur)) + ')' : ''}</title></path>`; }).join('');
  const points = (k) => CARTE.pays.filter((p) => aExigences(p.id) && p.c).map((p) => `<circle class="exi-pt" cx="${p.c[0]}" cy="${p.c[1]}" r="${3.2 / k}" style="stroke-width:${1.4 / k}"/>`).join('');
  const k = ENCART.l / EUROPE.l, compte = { 'c-ligne': 0, 'c-hs6': 0, 'c-autre': 0, 'c-rien': 0 };
  for (const p of CARTE.pays) compte[classePays(P.pays[p.id])]++;
  const x = paysChoisi && P.pays[paysChoisi];
  const detail = paysChoisi ? `<div class="carte-detail"><b>${esc(M.noms[paysChoisi] || paysChoisi)}</b><span class="ligne-t">${ligne(x, P.code_regle)}</span><span>Base duty: ${x && x.consulte && !x.erreur ? droit(x.droits) : '<span class="faint">not read</span>'}</span>${aExigences(paysChoisi) ? `<button class="btn blanc petit" data-marche-voir="${marches.has(paysChoisi) ? esc(paysChoisi) : 'EU'}">See the verified requirements</button>` : '<span class="faint">no verified requirement recorded for this country</span>'}</div>` : '<p class="faint" style="margin:0 18px 16px;font-size:12.5px">Click a country to read its tariff line and duty.</p>';
  return `<div class="carte-monde" style="padding:6px 12px 0"><svg viewBox="0 0 ${CARTE.largeur} ${CARTE.hauteur}" role="img" aria-label="World map coloured by what the engine returns for this product">${formes}${points(1)}
      <rect class="encart-cadre" x="${EUROPE.x}" y="${EUROPE.y}" width="${EUROPE.l}" height="${EUROPE.h}"/><rect class="encart-fond" x="${ENCART.x - 2}" y="${ENCART.y - 2}" width="${ENCART.l + 4}" height="${ENCART.h + 4}" rx="6"/>
      <svg x="${ENCART.x}" y="${ENCART.y}" width="${ENCART.l}" height="${ENCART.h}" viewBox="${EUROPE.x} ${EUROPE.y} ${EUROPE.l} ${EUROPE.h}">${formes}${points(k)}</svg></svg></div>
    <div class="carte-legende"><span><i style="background:#0B3BE0"></i>National tariff line proposed under ${esc(fmtCode(P.code_regle))} (${compte['c-ligne']})</span><span><i style="background:#9DB4F7"></i>Same code, six digits only (${compte['c-hs6']})</span><span><i style="background:#E0352B"></i>The engine alone proposes another code (${compte['c-autre']})</span><span><i style="background:#DEDCD5"></i>No national catalogue enabled (${compte['c-rien']})</span><span><i class="pt"></i>Market with verified requirements</span></div>${detail}`;
}

export function rendre() {
  if (!M) return '<div class="page"><div class="titre"><div class="bloc"><h1>World</h1></div></div><div class="agent"><span class="rond"></span><span class="txt">Loading the world data</span></div></div>';
  // les produits qui ont des données mondiales enregistrées, qu'ils soient ou non dans la boutique du navigateur
  const s = S.lire(), catalogue = ((S.fixes().demo || {}).produits || []);
  const produits = Object.keys(M.produits).map((k) => s.produits[k] || catalogue.find((p) => p.sku === k) || { sku: k, nom: k });
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
    ${enteteProduit(sku, 'monde')}
    <p class="muted" style="margin:-4px 0 16px;max-width:760px">The tariff line each country would use, the base duty, and what each market requires, with the official sentence behind it.</p>
    <div class="monde-tuiles"><div><b>${b.consultes}</b><span>countries looked up on the Cleo Legal API (${M.couverture.catalogue_national} have a national catalogue, ${M.couverture.six_chiffres} stop at six digits)</span></div>
      <div><b>${b.lignes_nationales}</b><span>countries where the engine proposes a national line under the rule's code ${esc(fmtCode(P.code_regle))}</span></div>
      <div><b>${b.desaccord}</b><span>countries where the engine alone proposes another code: the rule and its reasons decide</span></div>
      <div><b>${b.exigences}</b><span>requirements verified against the official text, in ${b.marches_exigences} markets</span></div></div>
    <div class="carte"><div class="carte-tete"><h3>Markets with verified requirements</h3><span class="muted">tariff line · base duty · requirements</span></div><p class="carte-sous">Each requirement quotes the official text; the quote was found word for word in the source by an independent check. A mark seen on a label is not proof of conformity.</p>${marches}</div>
    <details class="carte repli" style="margin-top:14px" ${tout ? 'open' : ''} data-tout><summary class="carte-tete"><h3>All ${autres.length} countries looked up</h3></summary>
      <div class="table-cadre" style="box-shadow:none;border-radius:0"><table class="t"><thead><tr><th>Country</th><th>Tariff line proposed by the engine</th><th>Base duty</th></tr></thead><tbody>${tout ? autres.map(([c, x]) => `<tr><td>${esc(M.noms[c] || c)} <span class="faint">${esc(c)}</span></td><td class="ligne-t" style="font-size:13px">${ligne(x, P.code_regle)}</td><td>${x.erreur ? '' : droit(x.droits)}</td></tr>`).join('') : ''}</tbody></table></div></details>
    <div class="carte" style="margin-top:14px" id="carte-monde"><div class="carte-tete"><h3>The world at a glance</h3><span class="muted">${esc(produits.find((p) => p.sku === sku).nom)}</span></div><p class="carte-sous">One colour per country, from the recorded lookups for this product.</p>${carteHtml(P, exig)}</div>
    <p class="faint" style="font-size:12.5px;max-width:900px;margin-top:14px">Recorded on ${esc(M.fixe_le)}. Tariff lines are proposals of the engine, not validated by a declarant. Base duty excludes VAT, taxes and additional duties. The requirement list is not complete: the rules that could not be checked against an official text are left out, and listed in the project files.</p>
  </div>`;
}

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  racine.addEventListener('click', (e) => {
    const p = e.target.closest('[data-produit]'); if (p) { sku = p.dataset.produit; ouvert = null; paysChoisi = null; return rerendre(); }
    const pc = e.target.closest('.carte-monde [data-pays]'); if (pc) { paysChoisi = paysChoisi === pc.dataset.pays ? null : pc.dataset.pays; return rerendre(); }
    const mv = e.target.closest('[data-marche-voir]'); if (mv) { ouvert = mv.dataset.marcheVoir; rerendre(); document.querySelector(`[data-marche="${ouvert}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const m = e.target.closest('[data-marche]'); if (m) { ouvert = ouvert === m.dataset.marche ? null : m.dataset.marche; return rerendre(); }
  });
  racine.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('[data-tout]') && e.target.open !== tout) { tout = e.target.open; rerendre(); } }, true);
}
