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

export const titre = 'Classify a product';
export const titrePour = () => (E.lire().produit && S.lire().produits[E.lire().produit.sku] ? 'Products' : 'Classify a product');
let details = [], horsLigne = null, serveur = { mode: 'illustratif', ia: false };
const det = (html) => { details.push(html); return details.length - 1; };
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
    E.preparer({ pieces: { sku, desc: p.description || p.nom, ds: p.fiche_technique || '', dest, origin: p.origine || 'CN' }, criteres: p.criteres || null });
    return E.lancer();
  }
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


function suggestions(qs) {
  if (serveur.mode === 'direct') return {};
  return suggestionsHorsLigne(horsLigne, { sku: E.lire().produit.sku, description: E.lire().produit.desc, faits: qs.map((q) => q.fact) });
}

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
  const P = D.produit, R = E.regleChargee(), res = E.resultatRegle(), t = E.dernier(), pret = t && !D.occupe && !D.contradictions.length;
  const travail = t ? travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: R && R.arbre, crit: D.crit, faits: D.faits, photo: P.photo, valide: Boolean(D.valide), nomDestination: nomPays(P.dest) }) : [];
  const st = t ? STATUT[t.data.status] || [t.data.status, 'a_verifier'] : null, dec = pret ? E.decision() : null, a = attention(D, res);
  const attente = !t && D.occupe ? `<div class="candidats-grille">${[1, 2, 3].map(() => '<div class="cand-carte"><span class="miroite" style="height:22px;width:90px"></span><span class="miroite" style="height:38px"></span><span class="miroite" style="height:6px"></span></div>').join('')}</div>` : '';
  const corps = {
    apercu: () => `${tuiles(D, res)}${dejaValide(P, D)}${contradictionsCarte(D)}${questionHtml(D, suggestions)}${dec ? decisionCarte(D, dec, R, res, S.lire().qui) : attente}`,
    pieces: () => `${piecesCarte(D, det)}${faitsCarte(D, det, Boolean(D.occupe || D.valide))}${contradictionsCarte(D)}`,
    moteur: () => `${attente}${toursHtml(D, det, suggestions)}${pret ? propositionCarte(D, det, travail) : ''}`,
    regle: () => (t && !D.contradictions.length ? regleCarte(D, R, res, det) : '<p class="muted">The encoded rule runs once the documents are consistent and the engine has answered.</p>'),
    marche: () => (pret ? (dansPerimetreFR(dec, res) ? exigencesCarte(D, E.exigencesChargees(), det) : horsPerimetreFR(P)) + obligationsCarte(D, dec) : '<p class="muted">Requirements and cost are computed once the file has a code.</p>'),
    epreuves: () => (pret ? epreuvesCarte(D, det) + destinationsCarte(D, det) : '<p class="muted">Stress tests are available once the file has a code.</p>'),
  };
  return `<div class="page entre">
    ${S.lire().produits[P.sku] ? enteteProduit(P.sku, 'dossier') : ''}
    <div class="carte dossier-tete" ${S.lire().produits[P.sku] ? 'hidden' : ''}>${visuel(P)}<div class="infos"><span class="eyebrow">Classification file · ${esc(P.sku)}</span><h1>${esc(P.desc.length > 110 ? P.desc.slice(0, 108) + '…' : P.desc)}</h1>
      <div class="route">${drapeau(P.origin)}${esc(nomPays(P.origin))} ${ic('droite')} ${drapeau(P.dest)}<b>${esc(nomPays(P.dest))}</b>${st ? etat(st[1], st[0]) : ''}${D.valide ? etat('pret', 'Validated') : ''}</div></div>
      <div class="actions"><button class="btn texte petit" data-action-dossier="nouveau">${ic('plus')}New product</button></div></div>
    <div class="dossier-barre"><div class="onglets petits sections" role="tablist">${SECTIONS.map(([id, lib]) => `<button role="tab" data-section="${id}" class="${section === id ? 'actif' : ''}">${lib}${a[id] ? '<i class="pt-attention" title="Waiting for you"></i>' : ''}</button>`).join('')}</div>
      ${t ? `<button class="btn blanc petit" data-action-dossier="imprimer">${ic('dossier')}${D.valide ? 'Export the validated file' : 'Export the file'}</button>` : ''}</div>
    ${D.occupe ? `<div class="agent bandeau"><span class="rond"></span><span class="txt">${esc(D.occupe)}</span></div>` : ''}
    ${D.erreur ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreur)}</span></div>` : ''}
    <div class="section-dossier">${corps[section]()}</div></div>`;
}

export function rendre() {
  details = [];
  const D = E.lire();
  return D.produit ? dossierEcran(D) : piecesHtml(D, serveur.ia);
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

function valider(qui, motif) {
  const D = E.lire(), res = E.resultatRegle(), t = E.dernier(), dec = E.decision();
  // la validation est refusée tant que le dossier est incohérent ou incomplet
  if (!dec || !dec.peutValider) return toast({ titre: 'Not validated', texte: 'This file cannot be validated yet: open points remain.', niveau: 'a_verifier', icone: 'alerte' });
  const travail = travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: E.regleChargee() && E.regleChargee().arbre, crit: D.crit, faits: D.faits, photo: D.produit.photo, valide: true, nomDestination: nomPays(D.produit.dest) });
  if (qui.trim() && qui.trim() !== S.lire().qui) S.nommer(qui);
  const dansCockpit = Boolean(S.lire().produits[D.produit.sku]);
  if (!E.valider(qui.trim(), motif, { ...versImprimable(D, E.regleChargee(), res, travail, qui.trim(), dec, dansPerimetreFR(dec, res) ? exigencesDossier(D, E.exigencesChargees()) : null), cockpit: dansCockpit })) return;
  toast({ titre: `Code ${dec.code.slice(0, 4)}.${dec.code.slice(4, 6)} validated`, texte: dansCockpit ? 'The cockpit now applies this code to the orders of this product.' : 'Signed, time-stamped, kept in this browser.', niveau: 'pret', icone: 'check' });
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
    if (a) return { imprimer, telecharger, nouveau: () => { E.nouveau(); document.querySelector('.main')?.scrollTo({ top: 0 }); } }[a.dataset.actionDossier]();
  });
  const zone = racine.querySelector('#depot-produit');
  if (zone) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('survol'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('survol'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('survol'); deposer(e.dataTransfer); });
  }
}
export { deposer };
