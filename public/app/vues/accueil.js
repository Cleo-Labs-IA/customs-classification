// Accueil : les produits de la boutique, chacun en trois temps lisibles d'un coup d'œil.
// 1. ce qui est lu sur l'étiquette, 2. le code et pourquoi, 3. le monde (lignes tarifaires
// par pays, exigences vérifiées). Tout le reste est derrière un lien.
import { esc, ic, etat } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { evaluer } from '../../arbre-moteur.js';
import { regle } from '../regle.js';
import { reponseTxt } from '../graphe-arbre.js';
import * as S from '../store.js';

export const titre = 'Products';
let R = null, MONDE = null, rerendreLocal = () => {};
regle().then((r) => { R = r; rerendreLocal(); });
fetch('/data/monde-produits.json').then((r) => (r.ok ? r.json() : null)).then((m) => { MONDE = m; rerendreLocal(); }).catch(() => null);

const CSS = `
.prod-grand { display: grid; grid-template-columns: 300px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr); gap: 0; margin-bottom: 16px; overflow: hidden; }
.prod-grand > div { padding: 20px 22px; border-left: 1px solid var(--line); min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.prod-grand > div:first-child { border-left: 0; padding: 0; background: var(--sunk); }
.prod-grand > div:first-child { justify-content: center; }
.prod-grand .photo { width: 100%; max-height: 320px; object-fit: contain; display: block; }
.prod-grand h2 { font-family: var(--display); font-weight: 500; font-size: 22px; letter-spacing: -.03em; margin: 0; }
.prod-grand .temps { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); }
.prod-grand .lu { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.prod-grand .lu li { font-family: var(--mono); font-size: 11.5px; color: var(--ink-2); background: var(--sunk); border-radius: 6px; padding: 3px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prod-grand .chemin { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.prod-grand .chemin li { display: grid; grid-template-columns: 18px minmax(0, 1fr); gap: 8px; color: var(--ink-2); }
.prod-grand .chemin span.n { font-family: var(--mono); font-size: 10.5px; color: var(--ink-4); padding-top: 2px; }
.prod-grand .chiffres { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.prod-grand .chiffres b { display: block; font-family: var(--display); font-weight: 500; font-size: 30px; letter-spacing: -.04em; line-height: 1; }
.prod-grand .chiffres span { font-size: 12px; color: var(--ink-3); }
.prod-grand .bas { margin-top: auto; padding-top: 6px; }
@media (max-width: 1250px) { .prod-grand { grid-template-columns: 220px minmax(0, 1fr) minmax(0, 1fr); } .prod-grand > div:last-child { grid-column: 2 / -1; border-top: 1px solid var(--line); } }
@media (max-width: 820px) { .prod-grand { grid-template-columns: 1fr; } .prod-grand > div { border-left: 0; border-top: 1px solid var(--line); grid-column: auto !important; } }
`;
if (typeof document !== 'undefined') document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));

function carte(p, s) {
  const crit = p.criteres || {}, res = R ? evaluer(R.arbre, Object.fromEntries(Object.entries(crit).map(([k, x]) => [k, x.valeur]))) : null;
  const C = R ? Object.fromEntries(R.arbre.criteres.map((c) => [c.id, c])) : {}, v = s.validations[p.sku], m = MONDE && MONDE.produits[p.sku];
  const lus = (p.etiquette || []).slice(0, 6), reste = (p.etiquette || []).length - lus.length;
  const code = res && res.statut === 'code' ? res.code : null, noeud = code ? R.arbre.noeuds[res.noeud] : null;
  const chemin = res ? res.chemin.map((x, i) => `<li><span class="n">${i + 1}</span><span>${esc((C[x.critere] || {}).libelle || x.critere)}: <b>${esc(String(reponseTxt(C[x.critere], x.valeur)).split(':')[0])}</b>${crit[x.critere] && crit[x.critere].kind === 'reponse' ? ' <span class="faint">(stated by the seller)</span>' : ''}</span></li>`).join('') : '';
  return `<div class="carte prod-grand">
    <div>${p.image ? `<img class="photo" src="${esc(p.image)}" alt="Photographed label of the product">` : ''}</div>
    <div><span class="temps">1 · Read on the label</span><h2>${esc(p.nom)}</h2>
      <ul class="lu">${lus.map((l) => `<li title="${esc(l)}">${esc(l)}</li>`).join('')}</ul>
      <p class="faint" style="font-size:12.5px">${reste > 0 ? `${reste} more lines · ` : ''}${(p.marques_vues || []).length} conformity marks seen · ${(p.a_confirmer || []).length} point${(p.a_confirmer || []).length === 1 ? '' : 's'} a photo cannot establish</p>
      <div class="bas"><a class="btn texte petit" href="/#/dossier?sku=${esc(p.sku)}">${ic('dossier')}Open the classification file</a></div></div>
    <div><span class="temps">2 · The code, and why</span>
      ${code ? `<div class="grand-code" style="font-size:40px">${esc(fmtCode(code))}</div><p class="muted" style="font-size:13px">${esc(noeud.libelle || '')}</p>` : `<p>${res ? etat('a_verifier', 'The rule is waiting for a fact') : 'Loading the rule'}</p>`}
      <ol class="chemin">${chemin}</ol>
      <p style="font-size:12.5px">${v ? etat('pret', 'Validated by ' + v.par) : etat('a_verifier', 'Not validated by a declarant yet')}</p>
      <div class="bas"><a class="btn noir petit" href="/#/arbre?sku=${esc(p.sku)}">${ic('arbre')}See the reasoning as a graph</a></div></div>
    <div><span class="temps">3 · The world</span>
      ${m ? `<div class="chiffres"><div><b>${m.bilan.lignes_nationales}</b><span>countries with a national tariff line proposed under ${esc(fmtCode(m.code_regle))}</span></div>
        <div><b>${m.bilan.desaccord}</b><span>countries where the engine alone proposes another code</span></div>
        <div><b>${m.bilan.exigences}</b><span>requirements checked word for word against the official text</span></div>
        <div><b>${m.bilan.marches_exigences}</b><span>markets covered by these requirements</span></div></div>` : '<p class="muted">Loading the world data</p>'}
      <div class="bas"><a class="btn noir petit" href="/#/monde?sku=${esc(p.sku)}">${ic('veille')}Open the world view</a></div></div>
  </div>`;
}

export function rendre() {
  const s = S.lire(), produits = Object.values(s.produits);
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Your products</h1><p>From the photo of a label to a customs code you can check, then to what each country asks for.</p></div></div>
    ${produits.length ? produits.map((p) => carte(p, s)).join('') : '<div class="agent"><span class="rond"></span><span class="txt">Loading the store</span></div>'}
    <p class="faint" style="font-size:12.5px;max-width:860px">The rule that gives the code is drafted by AI from the official texts it cites and is not reviewed by a customs declarant. The engine proposals are recorded calls to the Cleo Legal API. Nothing here states that a product is compliant.</p>
  </div>`;
}
export function brancher(racine, rerendre) { rerendreLocal = rerendre; }
