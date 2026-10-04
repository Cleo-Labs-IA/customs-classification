// Questions : ce que l'agent ne tranche pas seul. Questions du moteur, codes à valider,
// pièces et conditions exigées par un pays. Chaque réponse est signée, entre au journal
// et rejoue la vérification ; avant de répondre, on voit où mène chaque réponse.
import { esc, ic, etat, argent, nomPays, pluriel, urlSure, zones, toast, NIVEAU, vignette } from '../ui.js';
import { fmtCode, consequence, libelleFait, cleAttestation } from '../conformite.js';
import { sourceClassif } from './tiroirs.js';
import * as S from '../store.js';

export const titre = 'Questions';
let choisi = null, codeChoisi = null, envoi = false;
const LIB = { question: 'Engine question', validation: 'Code to validate', exigence: 'Document or condition' };
const GROUPES = { question: 'Engine questions', validation: 'Codes to validate', exigence: 'Documents and conditions' };
const ORDRE = ['question', 'validation', 'exigence'];
const dansLOrdre = (items) => ORDRE.flatMap((t) => items.filter((i) => i.type === t));
const ICONE = { question: 'questions', validation: 'check', exigence: 'bouclier' };

export function entrer(params) { if (params.get('item')) { choisi = params.get('item'); codeChoisi = null; } }

function liste(items, s) {
  const groupes = ORDRE.map((t) => [t, items.filter((i) => i.type === t)]).filter(([, g]) => g.length);
  return groupes.map(([t, g]) => `<div class="groupe-titre">${ic(ICONE[t])}${GROUPES[t]} · ${g.length}</div>${g.map((it) => {
    const p = s.produits[it.sku] || { nom: it.sku }, R = it.regle ? S.regles().find((r) => r.id === it.regle) : null;
    return `<button class="item ${it.cle === choisi ? 'actif' : ''}" data-item="${esc(it.cle)}">${vignette({ ...p, sku: it.sku }, 'moyenne')}<div><b>${esc(R ? R.titre : p.nom)}</b><small>${esc(R ? p.nom : it.texte)} · ${esc(it.pays.map(nomPays).join(', '))}</small></div><div class="impact"><b data-compte="${it.commandes}" data-cle="q-${esc(it.cle)}">${it.commandes}</b><br>orders</div></button>`;
  }).join('')}`).join('');
}

// Où mène une réponse : combien de lignes à expédier changent, et vers quel niveau.
function mene(c) {
  if (!c.changees) return '<span class="faint">no line changes status</span>';
  return Object.entries(c.vers).filter(([, n]) => n).map(([n, k]) => `${etat(n, `${k} ${NIVEAU[n].court.toLowerCase()}`)}`).join(' ');
}

function impactTexte(it) {
  return `${pluriel(it.commandes, 'order', 'orders')} pending · ${esc(it.pays.map(nomPays).join(', '))} · ${argent(it.valeur)}`;
}

function panneauQuestion(it, s) {
  const p = s.produits[it.sku], cl = s.classifications[it.sku] || {}, qs = cl.questions || [];
  const suites = S.suitesDemo(it.sku);
  const reps = suites ? `<div class="reponses">${suites.map((x, i) => { const top = (x.data.candidates || []).find((c) => !c.set_aside_reason); return `<button class="reponse" data-suite="${i}" ${envoi ? 'disabled' : ''}><b>${esc(x.libelle)}</b><span class="mene">leads to ${top ? `<span class="code">${esc(fmtCode(top.code))}</span> ${esc((top.title || {}).en || '')}` : 'a new assessment'}</span><span class="tag" style="align-self:flex-start">illustrative answer</span></button>`; }).join('')}</div>`
    : `<form data-form="question">${qs.map((q) => `<div class="champ"><label for="f-${esc(q.fait)}">${esc(libelleFait(q.fait))}</label><textarea class="saisie" id="f-${esc(q.fait)}" name="${esc(q.fait)}" required maxlength="200" placeholder="Merchant's answer, in one sentence"></textarea></div>`).join('')}<div style="margin-top:14px"><button class="btn noir" type="submit" ${envoi ? 'disabled' : ''}>${envoi ? 'Classification restarted…' : 'Answer and restart classification'}</button></div></form>`;
  return `<div class="sur"><span class="tag">${ic('questions')}${LIB.question}</span><span>${impactTexte(it)}</span></div>
    <h2>To classify "${esc(p.nom)}", the engine needs to know <span class="gris">${esc(qs.map((q) => libelleFait(q.fait)).join(' and ') || 'one piece of information')}.</span></h2>
    ${qs.map((q) => `<p class="pourquoi">"${esc(q.question)}"</p><p class="muted" style="font-size:13px;margin-top:6px">${esc(q.pourquoi)}</p>`).join('')}
    ${reps}
    <div class="source">${ic('agent')}<div><b>Classification engine</b><br><span class="muted">${esc(sourceClassif(cl))}</span></div></div>`;
}

function panneauValidation(it, s, lignes, ctx) {
  const p = s.produits[it.sku], cl = s.classifications[it.sku] || {}, cands = cl.candidats || [];
  const garde = cands.filter((c) => !c.ecarte), code = codeChoisi && cands.some((c) => c.code === codeChoisi) ? codeChoisi : (garde[0] || cands[0] || {}).code;
  const c = code ? consequence(lignes, ctx, (x) => ({ validations: { ...x.validations, [it.sku]: { hs6: code.slice(0, 6), par: s.qui } } })) : null;
  return `<div class="sur"><span class="tag">${ic('check')}${LIB.validation}</span><span>${impactTexte(it)}</span></div>
    <h2>Which code to select for "${esc(p.nom)}"? <span class="gris">The engine proposes, an authorised person decides.</span></h2>
    <p class="pourquoi">The validated code, at six digits, applies to all destinations. Each country's rules then apply to that code.</p>${cl.couverture ? `<p class="muted" style="font-size:12.5px;margin-top:6px">Coverage returned by the API: ${esc(cl.couverture)}</p>` : ''}
    <form data-form="validation"><div class="candidats">${cands.map((x) => `<label class="candidat ${x.ecarte ? 'ecarte' : ''}"><input type="radio" name="code" value="${esc(x.code)}" ${x.code === code ? 'checked' : ''}><div><span class="code">${esc(fmtCode(x.code))}</span><p>${esc(x.titre)}</p><p>${x.ecarte ? 'Set aside by the engine: ' + esc(x.ecarte) : esc(x.justification)}</p></div><span class="conf">${x.confiance != null ? String(x.confiance) : ''}</span></label>`).join('')}</div>
    ${c ? `<p class="muted" style="margin-top:14px;font-size:13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">Validate this code: ${mene(c)}</p>` : ''}
    <div class="champ"><label for="motif">Reason for the decision (optional)</label><input class="saisie" id="motif" name="motif" maxlength="200" placeholder="e.g. Main function: data transmission, note 3 to section XVI"></div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap"><button class="btn noir" type="submit">${ic('check')}Validate and sign</button><span class="muted" style="font-size:12.5px">Signed "${esc(s.qui)}", timestamped, recorded in the log.</span></div></form>
    <div class="source">${ic('agent')}<div><b>Classification engine</b><br><span class="muted">${esc(sourceClassif(cl))}</span>${cl.avertissement ? `<br><span class="faint" style="font-size:12px">${esc(cl.avertissement)}</span>` : ''}</div></div>`;
}

function panneauExigence(it, s, lignes, ctx) {
  const p = s.produits[it.sku], R = S.regles().find((r) => r.id === it.regle);
  if (!R) return '';
  const cle = cleAttestation(it.sku, R.id);
  const oui = consequence(lignes, ctx, (x) => ({ attestations: { ...x.attestations, [cle]: { reponse: true } } }));
  const non = consequence(lignes, ctx, (x) => ({ attestations: { ...x.attestations, [cle]: { reponse: false } } }));
  return `<div class="sur">${R.nature === 'simulation' ? '<span class="tag sim">Simulation</span>' : `<span class="tag">${ic('balance')}Official text</span>`}<span class="tag ia">AI summary, to review</span><span>${esc(zones(R.juridictions))} · ${impactTexte(it)}</span></div>
    <h2>${esc(R.effet.question)}</h2>
    <p class="pourquoi"><b>${esc(p.nom)}</b> · ${esc(R.resume)}</p>
    <form data-form="exigence"><div class="reponses">
      <button class="reponse" type="submit" name="v" value="1"><b>${ic('check')} Yes</b><span class="mene">${mene(oui)}</span><span class="faint" style="font-size:12px">${esc(R.effet.si_oui || '')}</span></button>
      <button class="reponse" type="submit" name="v" value="0"><b>No</b><span class="mene">${mene(non)}</span><span class="faint" style="font-size:12px">${esc(R.effet.si_non_texte || '')}</span></button>
    </div>
    <div class="champ"><label for="motif">Document or reference (optional)</label><input class="saisie" id="motif" name="motif" maxlength="200" placeholder="e.g. Certificate no. 2026-PSE-0412, EU declaration of conformity dated 12/03/2026"></div></form>
    <div class="source">${ic('balance')}<div><b>${esc(R.source.nom)}</b>${R.source.ref ? ' · ' + esc(R.source.ref) : ''}<br>${R.source.url ? `<a href="${urlSure(R.source.url)}" target="_blank" rel="noopener">Read the official text ${ic('lien')}</a>` : '<span class="muted">No official text: demo scenario.</span>'}</div></div>`;
}

export function rendre() {
  const s = S.lire(), items = dansLOrdre(S.aFaire());
  if (!s.lignes.length) return '<div class="page"><div class="titre"><div class="bloc"><h1>Questions</h1></div></div><div class="vide carte"><h3>Nothing to decide</h3><p>Import orders: questions appear here.</p></div></div>';
  if (!items.some((i) => i.cle === choisi)) { choisi = items[0] ? items[0].cle : null; codeChoisi = null; }
  const it = items.find((i) => i.cle === choisi), ctx = S.contexte(), lignes = s.lignes;
  const panneau = !it ? '' : it.type === 'question' ? panneauQuestion(it, s) : it.type === 'validation' ? panneauValidation(it, s, lignes, ctx) : panneauExigence(it, s, lignes, ctx);
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Questions</h1><p>What the agent cannot decide alone. Each answer is signed, timestamped, and restarts the check on the orders affected.</p></div></div>
    ${items.length ? `<div class="boite"><div class="items">${liste(items, s)}</div><div class="carte question-panneau">${panneau}</div></div>`
      : `<div class="carte vide" style="padding:70px 20px"><h3>Everything is decided.</h3><p>No open questions. New orders and new rules will raise more.</p><button class="btn blanc" data-aller="#/commandes">View orders</button></div>`}
  </div>`;
}

function suivant(avant) {
  const items = dansLOrdre(S.aFaire()), i = avant.findIndex((x) => x.cle === choisi);
  const n = items.find((x) => !avant.slice(0, i + 1).some((y) => y.cle === x.cle)) || items[0];
  choisi = n ? n.cle : null; codeChoisi = null;
}

export function brancher(racine, rerendre) {
  racine.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-item]');
    if (b) { choisi = b.dataset.item; codeChoisi = null; return rerendre(); }
    const sui = e.target.closest('[data-suite]');
    if (sui && !envoi) {
      const avant = S.aFaire(), it = avant.find((x) => x.cle === choisi), suite = S.suitesDemo(it.sku)[Number(sui.dataset.suite)];
      envoi = true; rerendre();
      const c = await S.repondreQuestion(it.sku, suite.faits, Number(sui.dataset.suite));
      envoi = false;
      toast({ titre: 'Classification restarted', texte: c.code ? `${(S.lire().produits[it.sku] || {}).nom}: ${fmtCode(c.code)} proposed, to validate` : 'New answer from the engine', niveau: 'pret', icone: 'agent' });
      choisi = 'validation:' + it.sku; rerendre();
    }
  });
  racine.addEventListener('change', (e) => { if (e.target.name === 'code') { codeChoisi = e.target.value; rerendre(); } });
  racine.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target, avant = dansLOrdre(S.aFaire()), it = avant.find((x) => x.cle === choisi);
    if (!it) return;
    const motif = (form.querySelector('[name=motif]') || {}).value || '';
    if (form.dataset.form === 'validation') {
      const code = new FormData(form).get('code');
      S.valider(it.sku, code, motif.trim());
      toast({ titre: `Code ${fmtCode(code.slice(0, 6))} validated`, texte: `${S.lire().produits[it.sku].nom} · signed ${S.lire().qui}`, niveau: 'pret', icone: 'check' });
    } else if (form.dataset.form === 'exigence') {
      const v = e.submitter && e.submitter.value === '1';
      S.attester(it.sku, it.regle, v, motif.trim());
      toast({ titre: v ? 'Requirement met' : 'Requirement not met', texte: v ? 'The lines affected go back to checking.' : 'The lines affected are blocked.', niveau: v ? 'pret' : 'bloque', icone: v ? 'check' : 'stop' });
    } else if (form.dataset.form === 'question') {
      const faits = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v));
      if (!Object.keys(faits).length) return;
      envoi = true; rerendre();
      await S.repondreQuestion(it.sku, faits);
      envoi = false;
    }
    suivant(avant); rerendre();
  });
}
