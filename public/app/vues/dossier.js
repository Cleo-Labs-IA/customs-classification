// Classer un produit : des pièces (photo, étiquette, pictogramme, fiche en ligne, texte)
// au code signé. Même parcours que le dossier historique, dans le design du cockpit.
import { esc, ic, drapeau, nomPays, etat, toast } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { dossierHtml } from '../../dossier.js';
import { donneesHorsLigne, suggestionsHorsLigne, etatServeur } from '../api.js';
import { estImage } from '../dossier/photo.js';
import { lireFait, travailRestant, STATUT } from '../dossier/logique.js';
import { versImprimable } from '../dossier/imprimable.js';
import * as E from '../dossier/etat.js';
import * as S from '../store.js';
import { ouvrirContenu } from './tiroirs.js';
import { enteteProduit } from './produit-entete.js';
import { piecesHtml, EXEMPLES } from './dossier/pieces.js';
import { piecesCarte, faitsCarte, contradictionsCarte, regleCarte, toursHtml, questionHtml } from './dossier/graphe.js';
import { propositionCarte, epreuvesCarte, obligationsCarte, destinationsCarte } from './dossier/outils.js';
import { decisionCarte, exigencesCarte, exigencesDossier, exigencesClic } from './dossier/decision.js';
import { identiteCarte } from './dossier/identite.js';
import { diffusionCarte, csvImport } from './dossier/diffusion.js';

export const titre = 'Classify a product';
let plusOuvert = false;
// 'etapes' : une étape à l'écran (défaut) · 'tout' : tout le dossier sur une page ·
// 'apercu' : vue d'ensemble en tuiles et sections
let vue = 'etapes';
export const titrePour = () => (E.lire().produit && S.lire().produits[E.lire().produit.sku] ? 'Products' : 'Classify a product');
let details = [], horsLigne = null, serveur = { mode: 'illustratif', ia: false };
const det = (html) => { details.push(html); return details.length - 1; };
let MONDE = null;
if (typeof fetch === 'function' && typeof document !== 'undefined') fetch('/data/monde-produits.json').then((r) => (r.ok ? r.json() : null)).then((m) => { MONDE = m; }).catch(() => null);
etatServeur().then((s) => { serveur = s; if (s.mode !== 'direct') donneesHorsLigne().then((d) => { horsLigne = d; }); });

// Arrivée depuis une fiche produit du cockpit (#/dossier?sku=PWR-20K&dest=JP), ou depuis
// une ancienne adresse du dossier (desc, ds, dest, origin dans l'adresse).
export function entrer(params) {
  section = 'apercu';
  const sku = params.get('sku'), p = sku && S.lire().produits[sku];
  const dest = params.get('dest') || (p && (S.lire().lignes.find((l) => l.sku === sku) || {}).pays) || 'FR';
  if (p) {
    // déjà ouvert pour ce produit : on le retrouve tel quel
    if (E.lire().produit && E.lire().produit.sku === sku) return;
    // la fiche est préremplie avec les critères déjà établis ; le classement, qui enregistre
    // une classification dans l'API, attend le geste de la personne
    return E.preparer({ pieces: { sku, desc: p.description || p.nom, ds: p.fiche_technique || '', dest, origin: p.origine || 'CN' }, criteres: p.criteres || null });
  }
  // la boutique n'est pas encore chargée (arrivée directe par l'adresse) : la même fiche vient des exemples
  const ex = sku && EXEMPLES.find((x) => x.sku === sku);
  if (ex && !E.lire().produit) return E.preparer({ pieces: { sku: ex.sku, desc: ex.desc, ds: ex.ds || '', dest: params.get('dest') || ex.dest, origin: ex.origin } });
  if (params.get('desc')) return E.preparer({ pieces: { sku: (sku || '').slice(0, 48), desc: params.get('desc').slice(0, 1800), ds: (params.get('ds') || '').slice(0, 12000), dest, origin: params.get('origin') || 'CN' } });
  // « Add a product » : une nouvelle fiche, pas le dossier d'un produit déjà ouvert
  const ouvert = E.lire().produit;
  if (!sku && ouvert && S.lire().produits[ouvert.sku]) E.nouveau();
}

const visuel = (P) => {
  const cat = S.lire().produits[P.sku] || (EXEMPLES.find((x) => x.sku === P.sku) ? { image: EXEMPLES.find((x) => x.sku === P.sku).image } : null);
  const src = P.photo ? P.photo.apercu : P.page && P.page.image ? P.page.image : cat && cat.image;
  return `<div class="vignette v-${esc((cat && cat.teinte) || 'gris')} dossier-visuel">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : esc(P.sku.slice(0, 3))}</div>`;
};

// Le parcours : six étapes, une seule à l'écran. Chaque étape dit ce qui s'y passe.
const ETAPES = [
  ['Product record', 'You give a photo of the label, a product page address or a few lines.'],
  ['Identity', 'You confirm which physical product this file is about.'],
  ['Facts', 'The agent reads the documents. Each fact cites its passage; you settle contradictions and answer the one question that decides.'],
  ['Decision', 'One code, the rule drawn as a graph, and the reason for each choice.'],
  ['Review', 'A declarant examines the file and signs. The approval is saved in the Cleo Legal API.'],
  ['Distribution', 'Exports of the approved file, and what each country requires.'],
];
function etatsEtapes(D, dec) {
  const t = E.dernier(), d = t && t.data, question = d && (d.questions || []).length && !t.repondu;
  const faits = !D.produit ? 'attente' : D.contradictions.length || question ? 'toi' : D.occupe && !t ? 'encours' : t ? 'fait' : D.erreur ? 'toi' : 'encours';
  const decision = !dec ? 'attente' : dec.blocages.some((b) => b.id === 'question_regle') ? 'toi' : dec.code || dec.blocages.some((b) => b.id === 'arbitrage') ? 'fait' : 'attente';
  return [D.produit ? 'fait' : 'encours', !D.produit ? 'attente' : D.identite && D.identite.confirmee ? 'fait' : 'toi', faits, decision,
    D.valide ? 'fait' : dec && (dec.peutValider || dec.blocages.some((b) => b.id === 'arbitrage')) ? 'toi' : 'attente', D.valide ? 'fait' : 'attente'];
}
const LIB_ETAT = { fait: 'done', toi: 'your turn', encours: 'in progress', attente: '' };
function parcours(D, dec) {
  const e = etatsEtapes(D, dec), n = D.produit ? D.etape : 1;
  return `<ol class="parcours-6" aria-label="The six steps">${ETAPES.map(([nom], i) => `<li><button type="button" class="${e[i]} ${n === i + 1 ? 'ici' : ''}" data-etape="${i + 1}" ${D.produit || i === 0 ? '' : 'disabled'} ${n === i + 1 ? 'aria-current="step"' : ''}><span class="pastille">${e[i] === 'fait' ? ic('check') : i + 1}</span><span class="nom">${nom}</span><small>${LIB_ETAT[e[i]]}</small></button></li>`).join('')}</ol>`;
}
function suggestions(qs) {
  if (serveur.mode === 'direct') return {};
  return suggestionsHorsLigne(horsLigne, { sku: E.lire().produit.sku, description: E.lire().produit.desc, faits: qs.map((q) => q.fact) });
}

const CSS = `
.parcours-6 { list-style: none; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0; margin: 0 0 16px; padding: 0; border-radius: var(--r-lg); box-shadow: 0 0 0 1px var(--line); background: var(--panel); overflow: hidden; }
.parcours-6 li { border-left: 1px solid var(--line); }
.parcours-6 li:first-child { border-left: 0; }
.parcours-6 button { width: 100%; height: 100%; display: grid; grid-template-columns: 26px minmax(0, 1fr); grid-template-rows: auto auto; column-gap: 9px; align-items: center; padding: 11px 14px; background: none; border: 0; font: inherit; text-align: left; cursor: pointer; color: var(--ink-3); }
.parcours-6 button:disabled { cursor: default; opacity: .55; }
.parcours-6 button:not(:disabled):hover { background: #FAF9F6; }
.parcours-6 .pastille { grid-row: 1 / 3; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-family: var(--mono); font-size: 11.5px; background: var(--sunk); color: var(--ink-3); }
.parcours-6 .pastille svg { width: 13px; height: 13px; }
.parcours-6 .nom { font-weight: 550; font-size: 13.5px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.parcours-6 small { font-size: 11.5px; min-height: 14px; }
.parcours-6 .fait .pastille { background: var(--ok-dot); color: #fff; }
.parcours-6 .toi .pastille { background: var(--warn-bg); color: var(--warn); box-shadow: 0 0 0 2px var(--warn-dot); }
.parcours-6 .toi small { color: var(--warn); font-weight: 550; }
.parcours-6 .encours .pastille { background: var(--wait-bg); color: var(--wait); }
.parcours-6 .ici { background: var(--ink); }
.parcours-6 .ici .nom, .parcours-6 .ici small { color: #fff; }
.parcours-6 button.ici:hover { background: var(--ink); }
.etape-tete { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin: 0 2px 14px; }
.etape-tete h2 { font-family: var(--display); font-weight: 500; font-size: 30px; letter-spacing: -.035em; margin: 2px 0 4px; }
.etape-tete p { margin: 0; color: var(--ink-3); font-size: 14.5px; max-width: 720px; }
.etape-tete .nav { display: flex; gap: 8px; }
.vue-dossier { display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin: 0 2px 8px; }
.vue-dossier .chip { cursor: pointer; }
.section-etape { display: flex; align-items: baseline; gap: 10px; margin: 26px 2px 10px; padding-top: 14px; border-top: 1px solid var(--line); font-family: var(--display); font-weight: 500; font-size: 21px; letter-spacing: -.02em; scroll-margin-top: 12px; }
.section-etape:first-of-type { margin-top: 6px; padding-top: 0; border-top: 0; }
.section-etape .num { font-family: var(--mono); font-size: 11.5px; letter-spacing: 0; color: var(--ink-3); }
@media (max-width: 1000px) { .parcours-6 { grid-template-columns: repeat(3, 1fr); } .parcours-6 li:nth-child(4) { border-left: 0; } .parcours-6 li:nth-child(n+4) { border-top: 1px solid var(--line); } }
`;
if (typeof document !== 'undefined') document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CSS }));
// La liste de travail « mise sur le marché en France » (public/data/exigences.json) est écrite
// pour les alimentations externes et chargeurs : elle ne vaut que pour un code 8504.40.
const PERIMETRE_FR = ['850440'];
const codeDuDossier = (dec, res) => (dec && dec.code) || (res && res.statut === 'code' ? res.code : null);
const dansPerimetreFR = (dec, res) => { const c = codeDuDossier(dec, res); return Boolean(c) && PERIMETRE_FR.some((p) => String(c).startsWith(p)); };
const horsPerimetreFR = (P) => `<div class="carte"><div class="carte-corps"><span class="eyebrow">Market access requirements</span><p style="margin-top:8px">The detailed France checklist is encoded for external power supplies and chargers (8504.40) only. ${S.lire().produits[P.sku] ? `The verified requirements of each market for this product are in the <a href="#/monde?sku=${encodeURIComponent(P.sku)}" style="color:var(--cleo)">World tab</a>.` : ''}</p></div></div>`;

// Le dossier s'ouvre sur sa vue d'ensemble : où en est chaque partie, la décision, et le
// seul geste attendu. Le détail est rangé dans cinq sections, une à la fois.
const SECTIONS = [['apercu', 'Overview'], ['pieces', 'Documents & facts'], ['moteur', 'Engine'], ['regle', 'Encoded rule'], ['marche', 'Requirements & cost'], ['epreuves', 'Stress tests']];
let section = 'apercu';

function tuiles(D, res) {
  const t = E.dernier(), d = t && t.data, st = d ? STATUT[d.status] || [d.status, 'a_verifier'] : null;
  const faits = Object.keys(D.faits).length + Object.values(D.crit).filter((x) => x.kind === 'pieces').length;
  const T = [
    ['pieces', 'Documents & facts', `${faits} fact${faits === 1 ? '' : 's'}`, D.contradictions.length ? ['bloque', 'contradiction to resolve'] : D.lectureErreur ? ['a_verifier', 'not read by AI here'] : ['pret', 'read, every fact quoted']],
    ['moteur', 'Engine', t ? `${D.tours.length} round${D.tours.length === 1 ? '' : 's'}` : 'waiting', !t ? ['en_attente', D.occupe ? 'classifying' : 'not run'] : (d.questions || []).length && !t.repondu ? ['a_verifier', 'question to the seller'] : [st[1], st[0]]],
    ['regle', 'Encoded rule', res && res.statut === 'code' ? fmtCode(res.code) : '—', !res ? ['en_attente', 'loading'] : res.statut === 'code' ? ['pret', 'reaches a code'] : res.statut === 'information_manquante' ? ['a_verifier', 'waiting for a fact'] : ['en_attente', 'does not cover it']],
    ['marche', 'Requirements & cost', nomPays(D.produit.dest), D.oblig && D.oblig !== 'encours' && !D.oblig.erreur ? ['pret', 'computed'] : ['en_attente', 'open to compute']],
    ['epreuves', 'Stress tests', `${D.epreuves.length} run`, D.epreuves.some((e) => e.ton === 'bloque') ? ['bloque', 'one does not hold'] : D.epreuves.length ? ['pret', 'all hold'] : ['en_attente', 'optional']],
  ];
  return `<div class="tuiles-dossier">${T.map(([id, lib, val, [niv, txt]]) => `<button data-section="${id}"><span class="eyebrow">${lib}</span><b>${esc(val)}</b>${etat(niv, txt)}</button>`).join('')}</div>`;
}

// Un code déjà validé pour la boutique (vue d'ensemble du produit) : le dossier le dit, et dit
// ce qui reste pour que le dossier lui-même soit complet.
function dejaValide(P, D) {
  const v = S.lire().validations[P.sku];
  if (!v || D.valide) return '';
  return `<div class="valide-bande">${ic('check')}<span><b>${esc(fmtCode(v.hs6))} is already validated for the shop</b> by ${esc(v.par)} on ${esc(new Date(v.le).toLocaleDateString('en-GB'))}. This file keeps the full reasoning; answer what is open below to complete it.</span></div>`;
}

// Un point sur l'onglet d'une section qui attend un geste.
function attention(D, res) {
  const t = E.dernier();
  return { pieces: D.contradictions.length > 0, moteur: Boolean(t && (t.data.questions || []).length && !t.repondu), regle: Boolean(res && res.statut === 'information_manquante' && !D.valide) };
}

function dossierEcran(D) {
  const P = D.produit, R = E.regleChargee(), res = E.resultatRegle(), t = E.dernier(), pret = t && !D.occupe && !D.contradictions.length, n = D.etape;
  const travail = t ? travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: R && R.arbre, crit: D.crit, faits: D.faits, photo: P.photo, valide: Boolean(D.valide), nomDestination: nomPays(P.dest) }) : [];
  const st = t ? STATUT[t.data.status] || [t.data.status, 'a_verifier'] : null, dec = pret ? E.decision() : null, qui = S.lire().qui;
  const attente = `<div class="agent bandeau"><span class="rond"></span><span class="txt">${esc(D.occupe || 'The agent is working on this product')}</span></div>`;
  const pasEncore = (quoi) => `<div class="carte"><div class="carte-corps"><p class="muted">${quoi}</p>${D.occupe ? attente : ''}</div></div>`;
  const repli = (titre, html) => `<details class="carte repli" data-plus ${plusOuvert ? 'open' : ''}><summary class="carte-tete"><h3>${titre}</h3></summary>${html}</details>`;
  const corpsFiche = () => `<div class="cols-dossier"><div class="col">${piecesCarte(D, det)}</div><div class="col"><div class="carte"><div class="carte-corps"><p>The record is in. The agent reads it and classifies the product while you confirm its identity.</p><p class="muted" style="font-size:13px">To change the record, start again with a new product.</p></div></div></div></div>`;
  const corpsIdentite = () => identiteCarte(D) + (D.occupe ? attente : '');
  const corpsFaits = () => `<div class="cols-dossier"><div class="col"><span class="eyebrow col-titre">What the documents say</span>${piecesCarte(D, det)}${faitsCarte(D, det, Boolean(D.occupe || D.valide))}${contradictionsCarte(D)}</div>
      <div class="col"><span class="eyebrow col-titre">What the engine asks and answers</span>${!t && D.occupe ? `<div class="candidats-grille">${[1, 2, 3].map(() => '<div class="cand-carte"><span class="miroite" style="height:22px;width:90px"></span><span class="miroite" style="height:38px"></span><span class="miroite" style="height:6px"></span></div>').join('')}</div>` : ''}${toursHtml(D, det, suggestions)}</div></div>`;
  const corpsDecision = (mode) => (dec ? decisionCarte(D, dec, R, res, qui, mode) + regleCarte(D, R, res, det) : pasEncore(D.contradictions.length ? 'Settle the contradictions in step 3 first: the decision comes after.' : 'The decision appears once the documents are read and the product is classified.'));
  const preuves = () => repli('Evidence to examine before signing: engine reading, similar rulings, tests', propositionCarte(D, det, travail) + epreuvesCarte(D, det));
  const corpsRevue = (seul) => (dec ? (seul ? '' : decisionCarte(D, dec, R, res, qui, 'revue')) + preuves() : pasEncore('The review opens once a decision is on the table.'));
  const corpsDiffusion = () => (dec ? `<div class="cols-dossier"><div class="col">${diffusionCarte(D, dec, MONDE)}</div><div class="col">${(dansPerimetreFR(dec, res) ? exigencesCarte(D, E.exigencesChargees(), det) : horsPerimetreFR(P)) + obligationsCarte(D, dec)}${repli('Same documents, other destinations', destinationsCarte(D, det))}</div></div>` : pasEncore('Distribution opens once a decision is on the table.'));
  const titreEtape = (i, html) => `<h3 class="section-etape" id="etape-${i}"><span class="num">Step ${i}</span>${ETAPES[i - 1][0]}</h3>${html}`;
  const catalogue = Boolean(S.lire().produits[P.sku]), a = attention(D, res), squelette = !t && D.occupe ? `<div class="candidats-grille">${[1, 2, 3].map(() => '<div class="cand-carte"><span class="miroite" style="height:22px;width:90px"></span><span class="miroite" style="height:38px"></span><span class="miroite" style="height:6px"></span></div>').join('')}</div>` : '';
  const sections = {
    apercu: () => `${tuiles(D, res)}${D.identite && D.identite.confirmee ? '' : identiteCarte(D)}${contradictionsCarte(D)}${questionHtml(D, suggestions)}${dec ? decisionCarte(D, dec, R, res, qui) : squelette}`,
    pieces: () => `${piecesCarte(D, det)}${faitsCarte(D, det, Boolean(D.occupe || D.valide))}${contradictionsCarte(D)}`,
    moteur: () => `${squelette}${toursHtml(D, det, suggestions)}${pret ? propositionCarte(D, det, travail) : ''}`,
    regle: () => (t && !D.contradictions.length ? regleCarte(D, R, res, det) : '<p class="muted">The encoded rule runs once the documents are consistent and the engine has answered.</p>'),
    marche: () => (dec ? corpsDiffusion() : '<p class="muted">Requirements, cost and exports are available once the file has a code.</p>'),
    epreuves: () => (pret ? epreuvesCarte(D, det) : '<p class="muted">Stress tests are available once the file has a code.</p>'),
  };
  const actions = `${t ? `<button class="btn blanc petit" data-action-dossier="imprimer">${ic('dossier')}${D.valide ? 'Export the approved file' : 'Export the file as it stands'}</button>` : ''}<button class="btn texte petit" data-action-dossier="nouveau">${ic('plus')}New product</button>`;
  const tout = vue === 'tout', ensemble = vue === 'apercu';
  const corps = tout
    ? titreEtape(2, corpsIdentite()) + titreEtape(3, corpsFaits()) + titreEtape(4, corpsDecision('tout')) + titreEtape(5, corpsRevue(true)) + titreEtape(6, corpsDiffusion())
    : [corpsFiche, corpsIdentite, corpsFaits, () => corpsDecision('decision'), () => corpsRevue(false), corpsDiffusion][n - 1]();
  const bascule = `<div class="vue-dossier" role="group" aria-label="File layout">${catalogue ? `<span class="actions" style="margin-right:auto;display:flex;gap:8px">${actions}</span>` : ''}${[['etapes', 'Step by step'], ['tout', 'Whole file on one page'], ['apercu', 'Overview']].map(([k, nom]) => `<button type="button" class="chip ${vue === k ? 'actif' : ''}" data-vue-dossier="${k}" aria-pressed="${vue === k}">${nom}</button>`).join('')}</div>`;
  const tete = catalogue ? enteteProduit(P.sku, 'dossier') : `<div class="carte dossier-tete">${visuel(P)}<div class="infos"><span class="eyebrow">Classification file · ${esc(P.sku)}</span><h1>${esc(P.desc.length > 110 ? P.desc.slice(0, 108) + '…' : P.desc)}</h1>
      <div class="route">${drapeau(P.origin)}${esc(nomPays(P.origin))} ${ic('droite')} ${drapeau(P.dest)}<b>${esc(nomPays(P.dest))}</b>${st ? etat(st[1], st[0]) : ''}${D.valide ? etat('pret', 'Approved') : ''}</div></div>
      <div class="actions">${actions}</div></div>`;
  if (ensemble) return `<div class="page entre">${tete}${bascule}${dejaValide(P, D)}
    <div class="dossier-barre"><div class="onglets petits sections" role="tablist">${SECTIONS.map(([id, lib]) => `<button role="tab" data-section="${id}" class="${section === id ? 'actif' : ''}">${lib}${a[id] ? '<i class="pt-attention" title="Waiting for you"></i>' : ''}</button>`).join('')}</div></div>
    ${D.occupe ? attente : ''}
    ${D.erreur ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreur)}</span></div>` : ''}
    <div class="section-dossier">${sections[section]()}</div></div>`;
  return `<div class="page entre">${tete}
    ${bascule}${dejaValide(P, D)}
    ${parcours(D, dec)}
    ${tout ? '' : `<div class="etape-tete"><div><span class="eyebrow">Step ${n} of 6</span><h2>${ETAPES[n - 1][0]}</h2><p>${ETAPES[n - 1][1]}</p></div>
      <div class="nav">${n > 1 ? `<button class="btn blanc" data-etape="${n - 1}">Back</button>` : ''}${n < 6 ? `<button class="btn noir" data-etape="${n + 1}">Continue to ${ETAPES[n][0].toLowerCase()}${ic('droite')}</button>` : ''}</div></div>`}
    ${D.erreur ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreur)}</span></div>` : ''}
    ${corps}</div>`;
}

export function rendre() {
  details = [];
  const D = E.lire();
  if (D.produit) return dossierEcran(D);
  const fiche = piecesHtml(D, serveur.ia), i = fiche.indexOf('</div></div>') + '</div></div>'.length;
  const html = fiche.slice(0, i) + parcours(D, null) + fiche.slice(i), sku = (D.pieces.sku || '').trim();
  return S.lire().produits[sku] ? html.replace('<div class="page entre">', '<div class="page entre">' + enteteProduit(sku, 'dossier')) : html;
}

function imprimer() {
  const D = E.lire(), res = E.resultatRegle(), t = E.dernier();
  const travail = travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: E.regleChargee() && E.regleChargee().arbre, crit: D.crit, faits: D.faits, photo: D.produit.photo, valide: Boolean(D.valide), nomDestination: nomPays(D.produit.dest) });
  const doc = dossierHtml(D.valide || versImprimable(D, E.regleChargee(), res, travail, null, E.decision(), dansPerimetreFR(E.decision(), res) ? exigencesDossier(D, E.exigencesChargees()) : null)), w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(doc); w.document.close(); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' })); a.download = `classification-file-${D.produit.sku}.html`; a.click();
}
function telecharger() {
  const D = E.lire(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(D.valide, null, 1)], { type: 'application/json' }));
  a.download = `classification-file-${D.produit.sku}-${D.produit.dest}.json`; a.click();
}

function deposer(dt) {
  const f = [...(dt.files || [])].find(estImage);
  if (f) return E.lirePhoto(f);
  const lien = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim().split('\n')[0];
  if (/^https?:\/\//i.test(lien)) return E.lireAdresse(lien);
  if (lien) E.saisir('desc', lien.slice(0, 1800));
}

function soumettre(f) {
  const v = (n) => (f.elements[n] ? String(f.elements[n].value).trim() : '');
  switch (f.dataset.form) {
    case 'url': return E.lireAdresse(v('f-url') || f.querySelector('input').value);
    case 'fiche': if (!E.lire().pieces.desc.trim()) { toast({ titre: 'Description missing', texte: 'A customs description is required.', niveau: 'a_verifier', icone: 'alerte' }); return null; } return E.lancer();
    case 'fait': { const k = v('k'), val = lireFait(k, v('v')); return val == null ? null : E.ajouterFait(k, val); }
    case 'question': { const rep = {}; for (const [k, x] of new FormData(f).entries()) { const val = lireFait(k, x); if (val != null) rep[k] = val; } return Object.keys(rep).length ? E.repondre(rep) : null; }
    case 'identite': return E.confirmerIdentite({ fabricant: v('fabricant'), modele: v('modele'), configuration: v('configuration') });
    case 'arbitrage': { const fd = new FormData(f), choix = fd.get('code'); return E.arbitrer({ code: choix === 'autre' ? fd.get('autre') : choix, raison: fd.get('raison'), qui: fd.get('qui'), elements: fd.getAll('vu') }); }
    case 'valider': return valider(v('v-qui') || f.querySelector('#v-qui').value, f.querySelector('#v-motif').value.trim());
    case 'ep-ref': return E.eprouverReformulation(v('v'));
    case 'ep-ret': return E.eprouverRetrait(v('v'));
    case 'ep-con': return E.eprouverContradiction(v('v'));
    case 'oblig': return E.chercherObligations(parseFloat(v('v')));
    case 'autres': { const pays = new FormData(f).getAll('c'); return pays.length ? E.autresDestinations(pays) : null; }
    default: return null;
  }
}

async function valider(qui, motif) {
  const D = E.lire(), res = E.resultatRegle(), t = E.dernier(), dec = E.decision();
  // la validation est refusée tant que le dossier est incohérent ou incomplet
  if (!dec || !dec.peutValider) return toast({ titre: 'Not approved', texte: 'This file cannot be approved yet: open points remain.', niveau: 'a_verifier', icone: 'alerte' });
  const travail = travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: E.regleChargee() && E.regleChargee().arbre, crit: D.crit, faits: D.faits, photo: D.produit.photo, valide: true, nomDestination: nomPays(D.produit.dest) });
  if (qui.trim() && qui.trim() !== S.lire().qui) S.nommer(qui);
  const dansCockpit = Boolean(S.lire().produits[D.produit.sku]);
  const ok = await E.valider(qui.trim(), motif, { ...versImprimable(D, E.regleChargee(), res, travail, qui.trim(), dec, dansPerimetreFR(dec, res) ? exigencesDossier(D, E.exigencesChargees()) : null), cockpit: dansCockpit });
  if (!ok) return;
  const r = E.lire().revue;
  toast({ titre: `Code ${dec.code.slice(0, 4)}.${dec.code.slice(4, 6)} approved`, texte: r && !r.locale ? 'The Cleo Legal API acknowledged the review.' : 'Signed, time-stamped, kept in this browser.', niveau: 'pret', icone: 'check' });
}

export function brancher(racine, rerendre) {
  const D = E.lire();
  racine.addEventListener('input', (e) => { const c = e.target.dataset.champ; if (c) E.saisir(c, e.target.value); });
  racine.addEventListener('change', (e) => {
    if (e.target.id === 'f-photo' && e.target.files[0]) return E.lirePhoto(e.target.files[0]);
    if (e.target.matches('[data-niveau]')) return E.choisirNiveau(e.target.value);
    if (e.target.dataset.champ && e.target.tagName === 'SELECT') { E.saisir(e.target.dataset.champ, e.target.value); e.target.previousElementSibling.outerHTML = drapeau(e.target.value); }
  });
  racine.addEventListener('submit', (e) => { e.preventDefault(); soumettre(e.target); });
  racine.addEventListener('click', (e) => {
    const t = e.target, b = (sel) => t.closest(sel);
    if (b('[data-vue-dossier]')) { vue = ['tout', 'apercu'].includes(b('[data-vue-dossier]').dataset.vueDossier) ? b('[data-vue-dossier]').dataset.vueDossier : 'etapes'; return E.redessiner(); }
    if (vue === 'tout' && b('[data-etape]') && E.lire().produit) { const cible = document.getElementById('etape-' + b('[data-etape]').dataset.etape); if (cible) cible.scrollIntoView({ behavior: 'smooth', block: 'start' }); else document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (b('[data-etape]')) { E.aller(b('[data-etape]').dataset.etape); document.querySelector('.main')?.scrollTo({ top: 0 }); return; }
    if (b('[data-identite-modifier]')) return E.modifierIdentite();
    if (b('[data-choisir]') && !b('input')) return racine.querySelector('#f-photo').click();
    if (b('[data-exemple]')) { const x = EXEMPLES[Number(b('[data-exemple]').dataset.exemple)]; return E.preparer({ pieces: { sku: x.sku, desc: x.desc, ds: x.ds || '', dest: x.dest, origin: x.origin, kg: x.kg || '' } }); }
    if (b('[data-detail]') && !b('a')) return ouvrirContenu(`File ${ic('droite')} <b>${esc(D.produit ? D.produit.sku : '')}</b>`, details[Number(b('[data-detail]').dataset.detail)]);
    // exigences de mise sur le marché : texte officiel en tiroir, réponse à une question, pièce déclarée détenue
    if (b('[data-d]')) return ouvrirContenu(`File ${ic('droite')} <b>${esc(E.lire().produit ? E.lire().produit.sku : '')}</b>`, details[Number(b('[data-d]').dataset.d)]);
    if (exigencesClic(e, E.lire(), E.exigencesChargees())) return E.redessiner();
    if (b('[data-arb-rouvrir]')) return E.rouvrirArbitrage();
    if (b('[data-retirer-fait]')) { e.stopPropagation(); return E.retirerFait(b('[data-retirer-fait]').dataset.retirerFait); }
    if (b('[data-garder]')) { const [i, s] = b('[data-garder]').dataset.garder.split(':'); return E.garder(Number(i), s); }
    if (b('[data-crit]')) { const [k, v] = b('[data-crit]').dataset.crit.split(':'); return E.choisirCritere(k, v); }
    if (b('[data-retirer-crit]')) return E.retirerReponsesCriteres();
    if (b('[data-applic]')) return E.verifierApplicabilite(b('[data-applic]').dataset.applic);
    if (b('[data-suggestion]')) { const s = b('[data-suggestion]'), champ = racine.querySelector(`[name="${s.dataset.suggestion}"]`); if (champ) { champ.value = s.dataset.valeur; champ.focus(); } return; }
    if (b('[data-section]')) { section = b('[data-section]').dataset.section; rerendre(); document.querySelector('.dossier-barre')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const a = b('[data-action-dossier]');
    if (a) {
      const api = (format) => E.dossierApi(format).catch((err) => toast({ titre: 'Dossier not downloaded', texte: String(err.message || err).slice(0, 200), niveau: 'a_verifier', icone: 'alerte' }));
      const csv = () => { const texte = csvImport(E.lire(), E.decision()); if (!texte) return; const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([texte], { type: 'text/csv' })); l.download = `export-for-import-${E.lire().produit.sku}.csv`; l.click(); };
      const actions = { imprimer, telecharger, csv, historique: () => E.chargerHistorique(), 'verifier-code': () => E.verifierCode(), 'dossier-api-pdf': () => api('pdf'), 'dossier-api-json': () => api('json'), nouveau: () => { E.nouveau(); document.querySelector('.main')?.scrollTo({ top: 0 }); } };
      return actions[a.dataset.actionDossier] && actions[a.dataset.actionDossier]();
    }
  });
  const zone = racine.querySelector('#depot-produit');
  if (zone) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('survol'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('survol'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('survol'); deposer(e.dataTransfer); });
  }
}
export { deposer };
