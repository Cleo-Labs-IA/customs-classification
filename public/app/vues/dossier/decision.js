// Le dossier d'un produit, en tête : UNE décision (code retenu, pourquoi, preuves, état,
// ce qui bloque encore), l'arbitrage signé quand la règle encodée et le moteur divergent,
// la validation signée. Puis les exigences de mise sur le marché du pays encodé.
// La logique vit dans public/decision.js et public/exigences-moteur.js ; ici, le rendu.
import { esc, ic, nomPays, drapeau, etat } from '../../ui.js';
import { fmtCode } from '../../conformite.js';
import * as CF from '../../../conformite.js';
import { premierRetenu, titre, libelleSource } from '../../dossier/logique.js';

const TON = { keep: 'pret', warn: 'a_verifier', bad: 'bloque', out: 'en_attente' };
const un = (n, mot) => `${n} ${mot}${n === 1 ? '' : 's'}`;
const brTxt = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === 'oui' ? 'Yes' : 'No');
const fmtIssue = (x) => (/^\d{6}$/.test(x) ? fmtCode(x) : x);
const ELEMENTS = ['Label or datasheet', 'Texts cited by the encoded rule', 'Rationale of the engine', 'Similar official rulings', 'The product itself'];

// Le bloc des exigences garde ses classes d'origine : elles sont raccordées ici au design du cockpit.
const CSS = `
.decision { box-shadow: 0 0 0 1.5px var(--ink), 0 16px 40px -20px rgba(0, 0, 0, .25); margin-bottom: 14px; position: relative; }
.dec-tete { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
.dec-tete > div:first-child { flex: 1; min-width: 0; }
.dec-tete .champ { flex: none; }
@media (max-width: 760px) { .dec-tete { flex-direction: column; } }
.dec-tete .grand-code { font-size: 44px; margin: 8px 0 4px; }
.dec-tete .champ { min-width: 190px; }
.dec-vs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 10px 0 4px; }
.dec-vs div { border: 1px solid var(--line-2); border-radius: var(--r-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; color: var(--ink-3); }
.dec-vs b { font-family: var(--mono); font-size: 22px; color: var(--ink); }
.dec-bande { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.dec-bande div { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; font-size: 11.5px; color: var(--ink-3); }
@media (max-width: 1100px) { .dec-bande { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.dec-etat { margin-top: 14px; padding: 12px 14px; border-radius: var(--r); background: var(--warn-bg); color: var(--warn); font-size: 13.5px; }
.dec-etat.ok { background: var(--ok-bg); color: var(--ok); }
.dec-etat ul { margin: 6px 0 0; padding-left: 18px; color: var(--ink-2); }
.dec-bloc { margin-top: 14px; padding: 14px; border: 1px solid var(--line-2); border-radius: var(--r); display: flex; flex-direction: column; gap: 10px; }
.dec-bloc h4 { margin: 0; font-size: 14px; }
.dec-bloc label { font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
.dec-bloc .choix { display: flex; flex-wrap: wrap; gap: 8px; }
.dec-bloc .choix label { display: flex; align-items: center; gap: 7px; border: 1px solid var(--line-2); border-radius: var(--r-sm); padding: 7px 10px; font-weight: 400; cursor: pointer; }
.dec-bloc .choix b { font-family: var(--mono); }
.dec-bloc textarea.saisie { min-height: 74px; resize: vertical; }
.dec-bloc .opts { display: flex; flex-wrap: wrap; gap: 8px; }
.dec-bloc .opts button { border: 1px solid var(--line-2); background: var(--panel); border-radius: var(--r-sm); padding: 8px 12px; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 2px; font: inherit; }
.dec-bloc .opts button:hover { border-color: var(--ink); }
.dec-bloc .opts small { color: var(--ink-3); font-size: 12px; }
.exig { --rule: var(--line-2); --g5: var(--ink-3); --off-bg: var(--sunk); }
.exig .link { display: none; }
.exig .node .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); font-family: var(--mono); }
.exig .node .s, .exig .ver { font-size: 13px; color: var(--ink-3); margin-top: 6px; }
.exig .muted { color: var(--ink-3); }
.exig .hint { font-size: 12.5px; color: var(--ink-3); }
.exig .tag { display: inline-block; border-radius: 999px; padding: 2px 9px; font-size: 11.5px; font-weight: 500; background: var(--sunk); color: var(--ink-2); }
.exig .tag.warn { background: var(--warn-bg); color: var(--warn); }
.exig .tag.bad { background: var(--bad-bg); color: var(--bad); }
.exig .tag.keep { background: var(--ok-bg); color: var(--ok); }
.exig .cf .req { background: var(--panel); }
.exig a { color: var(--cleo); }
`;
if (typeof document !== 'undefined') document.head.appendChild(Object.assign(document.createElement('style'), { textContent: CF.CSS + CSS }));

const libelleCode = (D, R, code) => {
  const n = R && Object.values(R.arbre.noeuds).find((x) => x.type === 'code' && x.code === code);
  const t = D.tours[D.tours.length - 1], c = t && (t.data.candidates || []).find((x) => String(x.code).slice(0, 6) === code);
  return (n && n.libelle) || (c && titre(c)) || '';
};

// D : état du dossier, dec : résultat de decider(), R : règle encodée, res : son résultat, qui : nom par défaut.
export function decisionCarte(D, dec, R, res, qui) {
  const t = D.tours[D.tours.length - 1], d = t.data, top = premierRetenu(d), p = D.produit;
  const nFaits = Object.keys(D.faits).length + Object.values(D.crit).filter((x) => x.kind === 'pieces').length;
  const aConfirmer = (p.photo ? p.photo.illisible.length : 0) + Object.values(D.faits).filter((f) => f.kind === 'main').length + Object.values(D.crit).filter((x) => x.kind === 'reponse').length;
  const noeudRegle = res && res.statut === 'code' ? R.arbre.noeuds[res.noeud] : null;
  const pourquoi = dec.origine === 'convergence' || (dec.origine === 'arbitrage' && noeudRegle && noeudRegle.code === dec.code) ? noeudRegle.motif : dec.origine === 'arbitrage' ? D.arbitrage.raison : top ? (top.rationale || '') : '';
  const prec = (d.provenance && d.provenance.precedents) || [], verifiees = prec.filter((x) => D.applic[x.ruling_id] && D.applic[x.ruling_id].verdict);
  const passages = Object.values(D.faits).reduce((n, f) => n + (f.quotes || []).length, 0) + Object.values(D.crit).filter((x) => x.kind === 'pieces').length;
  const textesRegle = res && R ? new Set(res.chemin.flatMap((s) => R.arbre.noeuds[s.noeud].base || [])).size : 0;

  const tete = dec.code
    ? `<div class="grand-code">${esc(fmtCode(dec.code))}</div><p class="muted">${esc(libelleCode(D, R, dec.code))}</p>`
    : dec.codes.moteur || dec.codes.regle ? `<div class="dec-vs">${dec.codes.moteur ? `<div><span>Engine</span><b>${esc(fmtCode(dec.codes.moteur))}</b><span>${esc(libelleCode(D, R, dec.codes.moteur).slice(0, 70))}</span></div>` : ''}${dec.codes.regle ? `<div><span>Encoded rule</span><b>${esc(fmtCode(dec.codes.regle))}</b><span>${esc(libelleCode(D, R, dec.codes.regle).slice(0, 70))}</span></div>` : ''}</div>`
      : '<h3 style="margin:10px 0 4px">No code proposed</h3>';
  const origine = { convergence: 'Engine and encoded rule reach the same code', moteur: res && res.statut === 'information_manquante' ? 'Proposed by the engine, the encoded rule is not finished' : 'Proposed by the engine, no encoded rule covers this product', arbitrage: 'Retained by ' + (D.arbitrage ? D.arbitrage.qui : '') + ' after arbitration' }[dec.origine] || 'Two readings disagree';

  // ce qui bloque, avec le geste à côté
  let geste = '';
  if (dec.blocages.some((b) => b.id === 'question_regle')) {
    const c = R.arbre.criteres.find((x) => x.id === res.critere), n = R.arbre.noeuds[res.noeud];
    geste += `<div class="dec-bloc"><span class="eyebrow">Deciding question</span><h4>${esc(c.question)}</h4>${n.pourquoi ? `<p class="muted" style="font-size:13px">${esc(n.pourquoi)}</p>` : ''}<div class="opts">${Object.entries(res.options).map(([v, issues]) => `<button type="button" data-crit="${esc(res.critere)}:${esc(v)}"><b>${esc(brTxt(c, v))}</b><small>leads to ${issues.map((x) => esc(fmtIssue(x))).join(', ')}</small></button>`).join('')}</div></div>`;
  }
  if (dec.blocages.some((b) => b.id === 'arbitrage')) {
    const comparables = prec.filter((x) => { const a = D.applic[x.ruling_id]; return a && (a.verdict === 'applicable' || a.verdict === 'partiellement'); });
    const viaPrec = Object.fromEntries(comparables.map((x) => [String(x.official_code).slice(0, 6), x.ruling_id]));
    const opts = [...new Set([dec.codes.moteur, dec.codes.regle, ...Object.keys(viaPrec)].filter(Boolean))];
    geste += `<form class="dec-bloc" data-form="arbitrage"><span class="eyebrow">Arbitration by a declarant</span><p class="muted" style="font-size:13px">${esc(dec.motif || '')} Both readings stay in the file; one code is retained, with its reason and a signature.</p>
      <label>Code retained</label><div class="choix">${opts.map((c, i) => `<label><input type="radio" name="code" value="${c}" ${i === 0 ? 'required' : ''}><b>${esc(fmtCode(c))}</b> ${c === dec.codes.regle ? 'encoded rule' : c === dec.codes.moteur ? 'engine' : 'ruling ' + esc(viaPrec[c]) + ', checked as comparable'}</label>`).join('')}<label><input type="radio" name="code" value="autre">another code <input class="saisie" name="autre" maxlength="7" placeholder="0000.00" style="width:96px;padding:4px 8px"></label></div>
      <label for="arb-raison">Reason, as it will appear in the file</label><textarea class="saisie" id="arb-raison" name="raison" required minlength="20" placeholder="e.g. The station connects peripherals to the computer; its network port is one port among others, so it stays a unit of an ADP machine."></textarea>
      <label>Elements examined</label><div class="choix">${ELEMENTS.map((x) => `<label><input type="checkbox" name="vu" value="${x}">${x}</label>`).join('')}</div>
      <label for="arb-qui">Declarant</label><div class="ligne-form"><input class="saisie" id="arb-qui" name="qui" required minlength="2" placeholder="Name of the declarant who arbitrates" value="${esc(qui)}"><button class="btn noir petit" type="submit">${ic('check')}Record the arbitration</button></div></form>`;
  }

  const autres = dec.blocages.filter((b) => !['question_regle', 'arbitrage'].includes(b.id));
  const etatDossier = D.valide ? `<div class="dec-etat ok"><b>Validated by ${esc(D.valide.validated_by)}.</b> ${D.valide.cockpit ? 'The cockpit now applies this code to the orders of this product.' : 'The code is back on the product record.'} The file keeps the facts, the path, the evidence and the decision.</div>`
    : dec.peutValider ? `<div class="dec-etat ok"><b>The file is consistent: it can be validated.</b>${D.niveau === 'hs6' ? ' Validation covers the six-digit level; the national tariff line of the destination is not established.' : ''}</div>`
      : `<div class="dec-etat"><b>${un(dec.blocages.length, 'point')} to settle before validation</b><ul>${dec.blocages.map((b) => `<li>${esc(b.message)}</li>`).join('')}</ul>${autres.some((b) => b.id === 'question_moteur') ? '<p style="margin:6px 0 0">Answer the engine question in the rounds below.</p>' : ''}</div>`;

  const ouverts = dec.blocages.filter((b) => ['question_regle', 'question_moteur', 'contradiction'].includes(b.id)).length;
  const cout = D.oblig && D.oblig !== 'encours' && !D.oblig.erreur ? D.oblig.cout : null, inconnus = cout ? (cout.composantes || []).filter((c) => !c.connu).length : 0;
  const BANDE = [
    ['Product data', ouverts ? [un(ouverts, 'point') + ' open', 'warn'] : aConfirmer ? ['sufficient, ' + aConfirmer + ' to confirm', 'warn'] : ['sufficient', 'keep']],
    ['Coverage', top && top.system !== 'hs6' ? ['national line (' + top.system + ')', 'keep'] : ['six digits only for ' + nomPays(p.dest), 'warn']],
    ['Classification', !dec.code && !dec.codes.moteur && !dec.codes.regle ? ['no code', 'bad'] : ouverts ? ['needs information', 'warn'] : dec.blocages.some((b) => b.id === 'arbitrage') ? ['needs review: two readings', 'warn'] : ['suggested', 'keep']],
    ['Human validation', D.valide ? ['approved by ' + D.valide.validated_by, 'keep'] : D.arbitrage && dec.origine === 'arbitrage' ? ['arbitrated, not yet approved', 'warn'] : ['not validated', 'out']],
    ['Cost', !cout ? ['not computed', 'out'] : cout.partiel || inconnus ? ['partial, ' + un(inconnus, 'component') + ' unknown', 'warn'] : ['complete', 'keep']],
  ];
  const bande = `<div class="dec-bande">${BANDE.map(([k, [v, ton]]) => `<div><span>${k}</span>${etat(TON[ton], v)}</div>`).join('')}</div>`;
  const arb = D.arbitrage && dec.origine === 'arbitrage' && !D.valide ? `<p class="faint" style="margin-top:10px;font-size:13px">Arbitration recorded: ${esc(fmtCode(dec.code))}, by ${esc(D.arbitrage.qui)}. <button type="button" class="lien-detail" data-arb-rouvrir>Reopen it</button></p>` : '';
  const frappe = D.valide ? `<div class="tampon-valide ${Date.now() - Date.parse(D.valide.validated_at) < 4000 ? 'neuf' : ''}" aria-label="Validated"><span>Validated</span><small>${esc(D.valide.validated_by)} · ${esc(new Date(D.valide.validated_at).toLocaleDateString('en-GB'))}</small></div>` : '';
  const signature = D.valide
    ? `<div class="valide-bande">${ic('check')}<span>Signed and time-stamped.</span><button class="btn blanc petit" data-action-dossier="telecharger">${ic('import')}JSON</button></div>`
    : `<form class="signature" data-form="valider"><div class="champs2"><div class="champ"><label for="v-qui">Authorised person</label><input class="saisie" id="v-qui" required minlength="2" value="${esc(D.arbitrage && dec.origine === 'arbitrage' ? D.arbitrage.qui : qui)}" ${dec.peutValider ? '' : 'disabled'}></div><div class="champ"><label for="v-motif">Reason <span class="faint">optional</span></label><input class="saisie" id="v-motif" maxlength="200" placeholder="e.g. note 3 to Section XVI" ${dec.peutValider ? '' : 'disabled'}></div></div><button class="btn noir" type="submit" ${dec.peutValider ? '' : 'disabled'}>${ic('check')}Validate and sign</button></form>`;

  return `<div class="carte decision">${frappe}<div class="carte-corps">
    <div class="dec-tete"><div><span class="eyebrow">Decision · ${esc(p.sku)} ${ic('droite')} ${esc(nomPays(p.dest))}</span>${tete}<p class="faint" style="font-size:13px">${esc(origine)} · ${un(nFaits, 'fact')} established from the documents · ${aConfirmer} to confirm</p></div>
      <div class="champ"><label for="dec-niveau">Validate at</label><select class="saisie" id="dec-niveau" data-niveau ${D.valide ? 'disabled' : ''}><option value="hs6" ${D.niveau === 'hs6' ? 'selected' : ''}>six-digit level</option><option value="national" ${D.niveau === 'national' ? 'selected' : ''}>national tariff line</option></select></div></div>
    <dl class="kv"><dt>Why</dt><dd>${esc(dec.code ? (pourquoi || 'No reason was returned for this code.') : 'No single reason yet: the two readings disagree, or no code is on the table.')}</dd>
      <dt>Evidence</dt><dd>${un(passages, 'quoted passage')} from the label or datasheet · ${un(textesRegle, 'official text')} on the rule's path · ${prec.length ? (verifiees.length ? verifiees.length + ' of ' + prec.length + ' similar rulings checked for comparability' : prec.length + ' similar rulings, none checked for comparability yet') : 'no similar ruling returned'}</dd></dl>
    ${bande}${etatDossier}${D.valide ? '' : geste}${arb}${signature}</div></div>`;
}

// Exigences de mise sur le marché : la liste de travail du pays encodé, jamais un avis de conformité.
export function exigencesCarte(D, X, det) {
  if (!X) return '';
  const p = D.produit, etiquette = p.photo ? p.photo.lignes : String(p.ds || '').split('\n');
  const html = CF.conformiteHtml(X.data, X.textes, D.conf, { etiquette, destination: p.dest, detail: det, locked: Boolean(D.valide), srcLabel: libelleSource });
  return html ? `<div class="carte"><div class="carte-tete"><h3>Market access requirements</h3><span class="muted">${drapeau(p.dest)} ${esc(nomPays(p.dest))}</span></div><div class="carte-corps exig">${html}</div></div>` : '';
}
export const exigencesDossier = (D, X) => (X && D.produit.dest === X.data.marche ? CF.conformiteDossier(X.data, D.conf, D.produit.photo ? D.produit.photo.lignes : []) : null);
export const exigencesClic = (e, D, X) => Boolean(X && CF.onClick(e, X.data, D.conf));
