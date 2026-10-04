// Accueil : d'abord par où commencer (déposer une fiche produit), puis les six étapes du
// dossier, puis les produits de la boutique, chacun en trois temps lisibles d'un coup d'œil :
// 1. ce qui est lu sur l'étiquette, 2. le code et pourquoi, 3. le monde (lignes tarifaires
// par pays, exigences vérifiées).
import { esc, ic, etat } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { evaluer } from '../../arbre-moteur.js';
import { regle } from '../regle.js';
import { reponseTxt } from '../graphe-arbre.js';
import * as S from '../store.js';
import * as E from '../dossier/etat.js';
import { estImage } from '../dossier/photo.js';

export const titre = 'Products';
let R = null, MONDE = null, rerendreLocal = () => {}, saisi = '';
regle().then((r) => { R = r; rerendreLocal(); });
fetch('/data/monde-produits.json').then((r) => (r.ok ? r.json() : null)).then((m) => { MONDE = m; rerendreLocal(); }).catch(() => null);

const CSS = `
.depart { background: var(--ink); color: #fff; border-radius: var(--r-lg); padding: 28px 30px 26px; display: grid; grid-template-columns: minmax(0, .62fr) minmax(0, 1.38fr); gap: 18px 36px; align-items: center; margin-bottom: 14px; border: 1.5px dashed transparent; transition: border-color var(--fast); }
.depart.survol { border-color: rgba(255, 255, 255, .7); }
.depart .eyebrow { color: rgba(255, 255, 255, .6); }
.depart h2 { font-family: var(--display); font-weight: 500; font-size: 30px; line-height: 1.08; letter-spacing: -.035em; margin: 10px 0 8px; text-wrap: balance; }
.depart p { color: rgba(255, 255, 255, .72); font-size: 14px; margin: 0; max-width: 420px; }
.depart-champ { display: flex; gap: 8px; align-items: center; background: #fff; border-radius: 14px; padding: 8px 8px 8px 16px; }
.depart-champ:focus-within { box-shadow: 0 0 0 4px rgba(255, 255, 255, .22); }
.depart-champ input[type="text"] { flex: 1; min-width: 0; height: 44px; border: 0; background: none; outline: none; font-size: 15.5px; color: var(--ink); }
.depart-champ .btn { height: 44px; flex: none; }
.depart-champ .btn.noir { padding: 0 22px; font-size: 15px; }
.depart-champ .btn.blanc { color: var(--ink); }
.depart .aide { margin-top: 10px; font-size: 12.5px; color: rgba(255, 255, 255, .6); max-width: none; }
.six { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin-bottom: 34px; overflow: hidden; }
.six > div { padding: 16px 18px 18px; border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.six > div:first-child { border-left: 0; background: var(--sunk); }
.six .n { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); display: flex; align-items: center; gap: 8px; }
.six .n i { font-style: normal; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; box-shadow: inset 0 0 0 1px var(--line-2); color: var(--ink); font-size: 11px; letter-spacing: 0; }
.six > div:first-child .n i { background: var(--ink); color: #fff; box-shadow: none; }
.six b { font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
.six p { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--ink-3); }
.essai-tete { display: flex; flex-direction: column; gap: 6px; margin: 0 0 16px; }
.essai-tete h2 { font-family: var(--display); font-weight: 500; font-size: 26px; letter-spacing: -.035em; margin: 0; }
.essai-tete p { margin: 0; color: var(--ink-3); font-size: 14px; max-width: 640px; }
.prod-grand a.btn { text-decoration: none; }
.prod-grand .lancer { height: auto; min-height: 34px; padding: 7px 12px; white-space: normal; text-align: left; line-height: 1.25; }
@media (max-width: 1180px) { .depart { grid-template-columns: 1fr; } .six { grid-template-columns: repeat(3, minmax(0, 1fr)); } .six > div:nth-child(4) { border-left: 0; } .six > div:nth-child(n+4) { border-top: 1px solid var(--line); } }
@media (max-width: 640px) { .six { grid-template-columns: 1fr; } .six > div { border-left: 0; border-top: 1px solid var(--line); } .depart-champ { flex-wrap: wrap; } .depart-champ input[type="text"] { flex-basis: 100%; } }
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
      <div class="bas"><a class="btn noir petit lancer" href="/#/dossier?sku=${esc(p.sku)}">Run the six steps on this product${ic('droite')}</a></div></div>
    <div><span class="temps">2 · The code, and why</span>
      ${code ? `<div class="grand-code" style="font-size:40px">${esc(fmtCode(code))}</div><p class="muted" style="font-size:13px">${esc(noeud.libelle || '')}</p>` : `<p>${res ? etat('a_verifier', 'The rule is waiting for a fact') : 'Loading the rule'}</p>`}
      <ol class="chemin">${chemin}</ol>
      <p style="font-size:12.5px">${v ? etat('pret', 'Validated by ' + v.par) : etat('a_verifier', 'Not validated by a declarant yet')}</p>
      <div class="bas"><a class="btn blanc petit" href="/#/arbre?sku=${esc(p.sku)}">${ic('arbre')}See the reasoning as a graph</a></div></div>
    <div><span class="temps">3 · The world</span>
      ${m ? `<div class="chiffres"><div><b>${m.bilan.lignes_nationales}</b><span>countries with a national tariff line proposed under ${esc(fmtCode(m.code_regle))}</span></div>
        <div><b>${m.bilan.desaccord}</b><span>countries where the engine alone proposes another code</span></div>
        <div><b>${m.bilan.exigences}</b><span>requirements checked word for word against the official text</span></div>
        <div><b>${m.bilan.marches_exigences}</b><span>markets covered by these requirements</span></div></div>` : '<p class="muted">Loading the world data</p>'}
      <div class="bas"><a class="btn blanc petit" href="/#/monde?sku=${esc(p.sku)}">${ic('veille')}Open the world view</a></div></div>
  </div>`;
}

const ETAPES = [
  ['Product record', 'You give a photo of the label, a product page address or a few lines.'],
  ['Identity', 'You confirm which physical product it is.'],
  ['Facts', 'The agent reads the documents. Each fact cites its passage, a person settles contradictions.'],
  ['Decision', 'One code, the rule drawn as a graph, and why each choice was made.'],
  ['Review', 'A declarant signs. The approval is saved in the Cleo Legal API.'],
  ['Distribution', 'What each country requires, and the exports.'],
];

// La carte de départ : même mécanisme que le dépôt rapide de la vue d'ensemble
// (E.preparer puis #/dossier), branché ici dans brancher().
function depart() {
  return `<form class="depart" id="depart" novalidate>
    <div><span class="eyebrow">Start here</span><h2>Add your product record</h2>
      <p>The agent reads it and takes it through the six steps below. You confirm, a declarant signs.</p></div>
    <div><div class="depart-champ"><input type="text" id="depart-saisie" value="${esc(saisi)}" placeholder="Product page address or a description" autocomplete="off" aria-label="Product page address or description">
        <label class="btn blanc" title="Choose a photo of the label">${ic('fichier')}<span>Choose a photo</span><input type="file" accept="image/*,.heic,.heif" class="sr" id="depart-photo"></label>
        <button class="btn noir" type="submit" id="depart-go">Start${ic('droite')}</button></div>
      <p class="aide">A photo of the label, a product page address, or a few lines of text. You can also drop a photo on this card.</p></div>
  </form>`;
}

export function rendre() {
  const s = S.lire(), produits = Object.values(s.produits);
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>From a product record to a customs code</h1><p>Add a product record: a photo of the label, a product page address or a few lines. The app takes it through six steps to a customs code you can check and what each country requires.</p></div></div>
    ${depart()}
    <div class="carte six" id="six-etapes">${ETAPES.map(([t, l], i) => `<div><span class="n"><i>${i + 1}</i>Step ${i + 1}</span><b>${t}</b><p>${l}</p></div>`).join('')}</div>
    <div class="essai-tete" id="essai"><h2>Try it on a real product</h2><p>Two products from the demo store, already taken through the steps. Open one to see each step with real data.</p></div>
    ${produits.length ? produits.map((p) => carte(p, s)).join('') : '<div class="agent"><span class="rond"></span><span class="txt">Loading the store</span></div>'}
    <p class="faint" style="font-size:12.5px;max-width:860px">The rule that gives the code is drafted by AI from the official texts it cites and is not reviewed by a customs declarant. The engine proposals are recorded calls to the Cleo Legal API. Nothing here states that a product is compliant.</p>
  </div>`;
}

function vers(entree) { saisi = ''; E.preparer(entree); location.hash = '#/dossier'; }
const versTexte = (v) => vers(/^https?:\/\//i.test(v) ? { adresse: v } : { texte: v });

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  const f = racine.querySelector('#depart');
  if (!f) return;
  const champ = f.querySelector('#depart-saisie');
  champ.addEventListener('input', () => { saisi = champ.value; });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = champ.value.trim();
    if (v) versTexte(v); else champ.focus();
  });
  f.querySelector('#depart-photo').addEventListener('change', (e) => { if (e.target.files[0]) vers({ fichier: e.target.files[0] }); });
  f.addEventListener('dragover', (e) => { e.preventDefault(); f.classList.add('survol'); });
  f.addEventListener('dragleave', () => f.classList.remove('survol'));
  f.addEventListener('drop', (e) => {
    e.preventDefault(); f.classList.remove('survol');
    const img = [...e.dataTransfer.files].find(estImage);
    if (img) return vers({ fichier: img });
    const lien = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').trim().split('\n')[0];
    if (lien) versTexte(lien);
  });
}
