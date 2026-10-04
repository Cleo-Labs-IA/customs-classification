// Classer un produit : des pièces (photo, étiquette, pictogramme, fiche en ligne, texte)
// au code signé. Même parcours que le dossier historique, dans le design du cockpit.
import { esc, ic, drapeau, nomPays, etat, toast } from '../ui.js';
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
import { piecesCarte, faitsCarte, contradictionsCarte, regleCarte, toursHtml } from './dossier/graphe.js';
import { propositionCarte, epreuvesCarte, obligationsCarte, destinationsCarte } from './dossier/outils.js';
import { decisionCarte, exigencesCarte, exigencesDossier, exigencesClic } from './dossier/decision.js';

export const titre = 'Classify a product';
export const titrePour = () => (E.lire().produit && S.lire().produits[E.lire().produit.sku] ? 'Products' : 'Classify a product');
let plusOuvert = false;
let details = [], horsLigne = null, serveur = { mode: 'illustratif', ia: false };
const det = (html) => { details.push(html); return details.length - 1; };
etatServeur().then((s) => { serveur = s; if (s.mode !== 'direct') donneesHorsLigne().then((d) => { horsLigne = d; }); });

// Arrivée depuis une fiche produit du cockpit (#/dossier?sku=PWR-20K&dest=JP), ou depuis
// une ancienne adresse du dossier (desc, ds, dest, origin dans l'adresse).
export function entrer(params) {
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

function etapes(D, res) {
  const t = E.dernier(), d = t && t.data;
  const lecture = D.contradictions.length ? 'attente' : D.lecture ? 'fait' : D.lectureErreur ? 'saute' : D.occupe ? 'encours' : 'attente';
  const classif = !t ? (D.occupe && !D.contradictions.length ? 'encours' : 'attente') : (d.questions || []).length && !t.repondu ? 'attente' : 'fait';
  const regle = !t || !res ? 'attente' : res.statut === 'code' ? 'fait' : res.statut === 'hors_perimetre' ? 'saute' : 'attente';
  const dec = E.decision();
  const valid = D.valide ? 'fait' : dec && dec.peutValider ? 'encours' : 'attente';
  const liste = [['Documents', 'fait'], ['Document reading', lecture], ['Classification', classif], ['Encoded rule', regle], ['Signed validation', valid]];
  return `<ol class="etapes-dossier">${liste.map(([l, e], i) => `<li class="${e}"><span class="pastille">${e === 'fait' ? ic('check') : e === 'saute' ? '-' : i + 1}</span><span>${l}</span></li>`).join('')}</ol>`;
}

function suggestions(qs) {
  if (serveur.mode === 'direct') return {};
  return suggestionsHorsLigne(horsLigne, { sku: E.lire().produit.sku, description: E.lire().produit.desc, faits: qs.map((q) => q.fact) });
}

function dossierEcran(D) {
  const P = D.produit, R = E.regleChargee(), res = E.resultatRegle(), t = E.dernier(), pret = t && !D.occupe && !D.contradictions.length;
  const travail = t ? travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: R && R.arbre, crit: D.crit, faits: D.faits, photo: P.photo, valide: Boolean(D.valide), nomDestination: nomPays(P.dest) }) : [];
  const st = t ? STATUT[t.data.status] || [t.data.status, 'a_verifier'] : null, dec = pret ? E.decision() : null;
  const attente = !t && D.occupe ? `<div class="candidats-grille">${[1, 2, 3].map(() => '<div class="cand-carte"><span class="miroite" style="height:22px;width:90px"></span><span class="miroite" style="height:38px"></span><span class="miroite" style="height:6px"></span></div>').join('')}</div>` : '';
  return `<div class="page entre">
    ${S.lire().produits[P.sku] ? enteteProduit(P.sku, 'dossier') : ''}
    <div class="carte dossier-tete" ${S.lire().produits[P.sku] ? 'hidden' : ''}>${visuel(P)}<div class="infos"><span class="eyebrow">Classification file · ${esc(P.sku)}</span><h1>${esc(P.desc.length > 110 ? P.desc.slice(0, 108) + '…' : P.desc)}</h1>
      <div class="route">${drapeau(P.origin)}${esc(nomPays(P.origin))} ${ic('droite')} ${drapeau(P.dest)}<b>${esc(nomPays(P.dest))}</b>${st ? etat(st[1], st[0]) : ''}${D.valide ? etat('pret', 'Validated') : ''}</div></div>
      <div class="actions">${t ? `<button class="btn blanc petit" data-action-dossier="imprimer">${ic('dossier')}${D.valide ? 'Export the validated file' : 'Export the file as it stands'}</button>` : ''}<button class="btn texte petit" data-action-dossier="nouveau">${ic('plus')}New product</button></div></div>
    ${etapes(D, res)}
    ${D.occupe ? `<div class="agent bandeau"><span class="rond"></span><span class="txt">${esc(D.occupe)}</span></div>` : ''}
    ${D.erreur ? `<div class="alerte-ligne">${ic('alerte')}<span>${esc(D.erreur)}</span></div>` : ''}
    ${dec ? decisionCarte(D, dec, R, res, S.lire().qui) : ''}
    <div class="cols-dossier">
      <div class="col"><span class="eyebrow col-titre">Documents, facts and encoded rule</span>${piecesCarte(D, det)}${faitsCarte(D, det, Boolean(D.occupe || D.valide))}${contradictionsCarte(D)}${t && !D.contradictions.length ? regleCarte(D, R, res, det) : ''}</div>
      <div class="col"><span class="eyebrow col-titre">Reasoning, requirements and consequences</span>${attente}${toursHtml(D, det, suggestions)}${pret ? exigencesCarte(D, E.exigencesChargees(), det) + obligationsCarte(D, dec) + `<details class="carte repli" data-plus ${plusOuvert ? 'open' : ''}><summary class="carte-tete"><h3>More checks: engine reading, tests, other destinations</h3></summary>${propositionCarte(D, det, travail) + epreuvesCarte(D, det) + destinationsCarte(D, det)}</details>` : ''}</div>
    </div></div>`;
}

export function rendre() {
  details = [];
  const D = E.lire();
  return D.produit ? dossierEcran(D) : piecesHtml(D, serveur.ia);
}

function imprimer() {
  const D = E.lire(), res = E.resultatRegle(), t = E.dernier();
  const travail = travailRestant({ dernier: { data: t.data, repondu: t.repondu }, regle: res, arbre: E.regleChargee() && E.regleChargee().arbre, crit: D.crit, faits: D.faits, photo: D.produit.photo, valide: Boolean(D.valide), nomDestination: nomPays(D.produit.dest) });
  const doc = dossierHtml(D.valide || versImprimable(D, E.regleChargee(), res, travail, null, E.decision(), exigencesDossier(D, E.exigencesChargees()))), w = window.open('', '_blank');
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
  if (!E.valider(qui.trim(), motif, { ...versImprimable(D, E.regleChargee(), res, travail, qui.trim(), dec, exigencesDossier(D, E.exigencesChargees())), cockpit: dansCockpit })) return;
  toast({ titre: `Code ${dec.code.slice(0, 4)}.${dec.code.slice(4, 6)} validated`, texte: dansCockpit ? 'The cockpit now applies this code to the orders of this product.' : 'Signed, time-stamped, kept in this browser.', niveau: 'pret', icone: 'check' });
}

export function brancher(racine) {
  const D = E.lire();
  racine.addEventListener('input', (e) => { const c = e.target.dataset.champ; if (c) E.saisir(c, e.target.value); });
  racine.addEventListener('change', (e) => {
    if (e.target.id === 'f-photo' && e.target.files[0]) return E.lirePhoto(e.target.files[0]);
    if (e.target.matches('[data-niveau]')) return E.choisirNiveau(e.target.value);
    if (e.target.dataset.champ && e.target.tagName === 'SELECT') { E.saisir(e.target.dataset.champ, e.target.value); e.target.previousElementSibling.outerHTML = drapeau(e.target.value); }
  });
  racine.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('[data-plus]')) plusOuvert = e.target.open; }, true);
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
