// Arbre d'interprétation (mode expert) : la règle encodée est une donnée. Modifier une
// branche demande une lecture en une phrase et une signature ; le résultat, le code
// derrière et l'accord avec les décisions officielles se recalculent aussitôt.
import { esc, ic, urlSure, etat } from '../ui.js';
import { fmtCode } from '../conformite.js';
import { evaluer, verifier, rejouer, versCode, cle } from '../../arbre-moteur.js';
import { regle, decisionsOfficielles, versionDeTravail, garderVersion } from '../regle.js';
import * as E from '../dossier/etat.js';
import * as S from '../store.js';

export const titre = "Arbre d'interprétation";
let REF = null, TEXTES = [], T = {}, DECISIONS = [], arbre = null, journal = [], pret = false, rerendreLocal = () => {};
let valeurs = {}, cites = {}, sel = null, onglet = 'decisions', essai = { nom: 'Produit libre', hs6: null, moteur: null }, msg = null, brouillon = null;
const garder = () => garderVersion(REF, arbre, journal);
const C = () => Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
const modifie = (id) => JSON.stringify(arbre.noeuds[id]) !== JSON.stringify(REF.noeuds[id]);
const brLib = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === 'oui' ? 'Oui' : 'Non');
const titreNoeud = (id) => { const n = arbre.noeuds[id]; if (!n) return id + ' (absent)'; return n.type === 'code' ? fmtCode(n.code) + ' · ' + (n.libelle || '') : n.type === 'hors_perimetre' ? 'Hors périmètre' : (C()[n.critere] || {}).libelle || n.critere; };

Promise.all([regle(), decisionsOfficielles()]).then(([r, d]) => {
  if (!r) return;
  REF = r.arbre; TEXTES = r.textes; T = r.T; DECISIONS = d || [];
  ({ arbre, journal } = versionDeTravail(REF));
  pret = true; rerendreLocal();
});

// Depuis un dossier : les valeurs que ses pièces établissent, avec leurs passages.
export function entrer(params) {
  if (!params.get('dossier')) return;
  const D = E.lire(), t = E.dernier();
  if (!D.produit) return;
  valeurs = E.valeursCriteres();
  cites = Object.fromEntries(Object.entries(D.crit).map(([k, x]) => [k, { citation: x.kind === 'reponse' ? 'réponse donnée dans le dossier, sans pièce' : x.citation, source: x.kind === 'reponse' ? 'dossier' : x.source }]));
  essai = { nom: `Dossier ${D.produit.sku} : ${Object.keys(valeurs).length} critère(s) établi(s), les autres restent inconnus`, hs6: null, moteur: t && t.data.candidates && t.data.candidates.find((c) => !c.set_aside_reason) ? String(t.data.candidates.find((c) => !c.set_aside_reason).code) : null };
}

function arbreHtml(res) {
  const chemin = new Set(res.chemin.map((s) => s.noeud)), crit = C();
  const marche = (id, vus) => {
    const n = arbre.noeuds[id];
    if (!n) return `<div class="retour">nœud absent : ${esc(id)}</div>`;
    if (vus.includes(id)) return `<div class="retour">retour vers ${esc(titreNoeud(id))}</div>`;
    const atteint = chemin.has(id) || ((res.statut === 'code' || res.statut === 'hors_perimetre') && res.noeud === id);
    const cls = ['nd', n.type !== 'question' ? 'feuille' : '', sel === id ? 'sel' : '', modifie(id) ? 'mod' : '', atteint ? 'on' : '', res.statut === 'information_manquante' && res.noeud === id ? 'stop' : ''].join(' ');
    if (n.type === 'code') return `<button class="${cls}" data-n="${esc(id)}"><span class="code">${esc(fmtCode(n.code))}</span> <span>${esc(n.libelle || '')}</span></button>`;
    if (n.type === 'hors_perimetre') return `<button class="${cls}" data-n="${esc(id)}"><b>Hors périmètre</b> <small>${esc(n.motif || '')}</small></button>`;
    const c = crit[n.critere];
    return `<button class="${cls}" data-n="${esc(id)}"><span class="q">${esc(c ? c.question : n.critere)}</span><span class="w">${esc(n.pourquoi || '')}</span><small>${(n.base || []).map((b) => esc((T[b] || {}).ref || b)).join(' · ')}</small></button>
      <ul>${Object.entries(n.branches || {}).map(([v, cible]) => `<li><span class="br">${esc(brLib(c, v))}</span>${marche(cible, [...vus, id])}</li>`).join('')}</ul>`;
  };
  return `<div class="arbre"><ul><li>${marche(arbre.racine, [])}</li></ul></div>`;
}

function essaiHtml(res) {
  const crit = C(), utiles = new Set(res.chemin.map((s) => s.critere));
  if (res.critere) utiles.add(res.critere);
  const lignes = arbre.criteres.map((c) => {
    const v = cle(valeurs[c.id]);
    const ctl = c.type === 'bool' ? `<span class="seg">${[['oui', 'Oui'], ['non', 'Non'], ['', 'Inconnu']].map(([k, l]) => `<button type="button" data-v="${c.id}:${k}" class="${(v || '') === k ? 'a' : ''}">${l}</button>`).join('')}</span>`
      : `<select class="saisie" data-s="${c.id}"><option value="">Inconnu</option>${(c.valeurs || []).map((x) => `<option value="${esc(x.v)}" ${v === x.v ? 'selected' : ''}>${esc(x.libelle || x.v)}</option>`).join('')}</select>`;
    return `<div class="crit ${utiles.has(c.id) ? '' : 'pale'}"><span>${esc(c.question)}</span>${ctl}${cites[c.id] ? `<span class="cit">« ${esc(cites[c.id].citation)} » <span class="faint">${esc(cites[c.id].source)}</span></span>` : ''}</div>`;
  }).join('');
  let sortie;
  if (res.statut === 'code') {
    const n = arbre.noeuds[res.noeud];
    sortie = `<div class="resultat"><span class="eyebrow">Résultat de l'arbre</span><div class="grand-code">${esc(fmtCode(res.code))}</div><p>${esc(n.libelle || '')}</p><p class="muted">${esc(n.motif || '')}</p>
      ${essai.hs6 ? `<p>Décision officielle : <b class="code">${esc(fmtCode(essai.hs6))}</b> ${etat(essai.hs6 === res.code ? 'pret' : 'bloque', essai.hs6 === res.code ? 'Reproduite' : 'Contredite')}</p>` : ''}
      ${essai.moteur ? `<p>Proposition du moteur : <b class="code">${esc(fmtCode(essai.moteur.slice(0, 6)))}</b> ${etat(essai.moteur.slice(0, 6) === res.code ? 'pret' : 'a_verifier', essai.moteur.slice(0, 6) === res.code ? 'Même code' : 'Code différent')}</p>` : ''}
      <ol class="parcours">${res.chemin.map((s) => `<li>${esc((crit[s.critere] || {}).libelle || s.critere)} : <b>${esc(brLib(crit[s.critere], s.valeur))}</b></li>`).join('')}</ol></div>`;
  } else if (res.statut === 'information_manquante') {
    const c = crit[res.critere];
    sortie = `<div class="resultat attente"><span class="eyebrow">Information manquante</span><b>${esc(c ? c.question : res.critere)}</b><p class="muted">Ce que la réponse départage :</p><ul class="parcours">${Object.entries(res.options).map(([v, codes]) => `<li><b>${esc(brLib(c, v))}</b> → ${codes.map((x) => esc(/^\d{6}$/.test(x) ? fmtCode(x) : x)).join(', ')}</li>`).join('')}</ul></div>`;
  } else if (res.statut === 'hors_perimetre') sortie = `<div class="resultat attente"><span class="eyebrow">Hors périmètre</span><p>${esc((arbre.noeuds[res.noeud] || {}).motif || '')}</p></div>`;
  else sortie = `<p class="note-l erreur">${esc(res.message || 'Arbre non jouable')}</p>`;
  const dossier = E.lire().produit;
  return `<div class="carte"><div class="carte-tete"><h3>Produit à l'essai</h3>${dossier ? `<button class="btn texte petit" data-aller="#/arbre?dossier=1" data-reprendre>${ic('dossier')}Reprendre le dossier ${esc(dossier.sku)}</button>` : ''}<button class="btn texte petit" data-vider>Tout à inconnu</button></div>
    <p class="carte-sous">${esc(essai.nom)}. Changez une réponse : le chemin se redessine dans l'arbre.</p><div class="carte-corps">${lignes}${sortie}</div></div>`;
}

function editeurHtml() {
  if (!sel || !arbre.noeuds[sel]) return `<div class="carte"><div class="carte-tete"><h3>Modifier l'arbre</h3></div><p class="carte-sous">Cliquez un nœud pour lire sa base légale et changer votre lecture.</p><div class="carte-corps"><button class="btn blanc petit" data-ajout="code">${ic('plus')}Ajouter un code</button> <button class="btn blanc petit" data-ajout="question">${ic('plus')}Ajouter une question</button></div></div>`;
  const n = brouillon || (brouillon = structuredClone(arbre.noeuds[sel])), crit = C(), cibles = Object.keys(arbre.noeuds).filter((id) => id !== sel);
  const opt = (cur) => cibles.map((id) => `<option value="${esc(id)}" ${cur === id ? 'selected' : ''}>${esc(titreNoeud(id)).slice(0, 70)}</option>`).join('');
  const base = `<div class="champ"><label>Base légale</label><div class="base">${(n.base || []).map((b) => `<span class="tag contour" data-t="${esc(b)}">${esc((T[b] || {}).ref || b)}<button type="button" data-rb="${esc(b)}">${ic('fermer')}</button></span>`).join('') || '<span class="muted">Aucun texte cité</span>'}</div>
    <select class="saisie" id="ajoutBase"><option value="">Citer un autre texte</option>${TEXTES.filter((t) => !(n.base || []).includes(t.id)).map((t) => `<option value="${esc(t.id)}">${esc(t.ref)}</option>`).join('')}</select><div id="texte-cite"></div></div>`;
  let corps;
  if (n.type === 'question') {
    const c = crit[n.critere], vals = c ? (c.type === 'bool' ? ['oui', 'non'] : (c.valeurs || []).map((x) => x.v)) : Object.keys(n.branches || {});
    corps = `<div class="champ"><label>Critère examiné</label><select class="saisie" id="edCrit">${arbre.criteres.map((x) => `<option value="${x.id}" ${x.id === n.critere ? 'selected' : ''}>${esc(x.libelle)}</option>`).join('')}</select></div>
      <div class="champ"><label>Pourquoi ce critère décide</label><textarea class="saisie" id="edWhy">${esc(n.pourquoi || '')}</textarea></div>
      <div class="champ"><label>Où mène chaque réponse</label>${vals.map((v) => `<div class="branche"><span class="br">${esc(brLib(c, v))}</span><select class="saisie" data-b="${esc(v)}"><option value="">Choisir</option>${opt((n.branches || {})[v])}</select></div>`).join('')}</div>${base}`;
  } else if (n.type === 'code') corps = `<div class="champs2"><div class="champ"><label>Code (6 chiffres)</label><input class="saisie mono" id="edCode" value="${esc(n.code || '')}" maxlength="6" inputmode="numeric"></div><div class="champ"><label>Libellé</label><input class="saisie" id="edLib" value="${esc(n.libelle || '')}"></div></div><div class="champ"><label>Motif</label><textarea class="saisie" id="edMotif">${esc(n.motif || '')}</textarea></div>${base}`;
  else corps = `<div class="champ"><label>Motif</label><textarea class="saisie" id="edMotif">${esc(n.motif || '')}</textarea></div>`;
  const change = JSON.stringify(n) !== JSON.stringify(arbre.noeuds[sel]);
  return `<div class="carte editeur"><div class="carte-tete"><h3>${n.type === 'question' ? 'Question' : n.type === 'code' ? 'Code' : 'Hors périmètre'} <span class="faint mono" style="font-weight:400">${esc(sel)}</span></h3><button class="icobtn" data-fermer-ed>${ic('fermer')}</button></div><div class="carte-corps">${corps}
    <div class="signer"><div class="champ"><label for="edReason">Votre lecture, en une phrase</label><textarea class="saisie" id="edReason" placeholder="ex. Une station avec port réseau reste une unité d'ordinateur : le réseau n'est pas sa fonction principale."></textarea></div>
      <div class="champ"><label for="edWho">Signé par</label><input class="saisie" id="edWho" value="${esc(S.lire().qui)}"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn noir" id="appliquer" ${change ? '' : 'disabled'}>Appliquer cette lecture</button>${modifie(sel) && REF.noeuds[sel] ? '<button class="btn blanc" id="revenir">Revenir au texte de référence</button>' : ''}${!REF.noeuds[sel] ? '<button class="btn rouge" id="supprimer">Supprimer ce nœud</button>' : ''}</div></div>
    ${msg ? `<p class="note-l erreur">${ic('alerte')}${esc(msg)}</p>` : ''}</div></div>`;
}

function basHtml() {
  const ref = rejouer(REF, DECISIONS), cur = rejouer(arbre, DECISIONS), parRef = Object.fromEntries(ref.lignes.map((l) => [l.id, l]));
  const bascules = cur.lignes.filter((l) => l.verdict !== parRef[l.id].verdict || l.obtenu !== parRef[l.id].obtenu), modifiee = JSON.stringify(arbre) !== JSON.stringify(REF);
  const V = { reproduit: ['Reproduite', 'pret'], contredit: ['Contredite', 'bloque'], non_tranche: ['Non tranchée', 'a_verifier'], hors_perimetre: ['Hors périmètre', 'en_attente'] }, Dd = Object.fromEntries(DECISIONS.map((d) => [d.id, d]));
  let corps;
  if (onglet === 'decisions') {
    const ordre = [...cur.lignes].sort((a, b) => bascules.includes(b) - bascules.includes(a));
    const explicites = cur.lignes.filter((l) => l.verdict === 'reproduit' && l.r.chemin.every((st) => ((Dd[l.id].criteres[st.critere] || {}).appui || 'explicite') === 'explicite')).length;
    corps = `<div class="scores">${[[`${cur.reproduit}/${cur.total}`, 'reproduites'], [explicites, 'sur des faits tous écrits'], [cur.contredit, 'contredites'], [cur.non_tranche, 'non tranchées'], [cur.hors_perimetre, 'hors périmètre']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      <p class="note-l">${ic('info')}${modifiee ? `Référence : ${ref.reproduit}/${ref.total} reproduites. Votre arbre : <b>${cur.reproduit}/${cur.total}</b>, contredites ${ref.contredit} → <b>${cur.contredit}</b>. ${bascules.length} décision(s) changent de verdict, en tête du tableau.` : `Arbre de référence. Chaque modification rejoue les ${cur.total} décisions.`}</p>
      <div class="table-cadre defile-bas"><table class="t"><thead><tr><th>Décision</th><th>Produit</th><th>Officiel</th><th>Arbre</th><th>Verdict</th></tr></thead><tbody>${ordre.map((l) => { const d = Dd[l.id], b = bascules.includes(l); return `<tr data-d="${esc(l.id)}" class="${b ? 'bascule' : ''}"><td><a href="${urlSure(d.url)}" target="_blank" rel="noopener" data-stop>${esc(l.id)}</a><br><span class="faint">${esc(d.source === 'EU_REGLEMENT' ? 'Règlement UE' : 'CBP, États-Unis')} · ${esc(d.date)}</span></td><td>${esc(d.produit)}</td><td class="code">${esc(fmtCode(l.hs6))}</td><td class="code">${l.obtenu ? esc(fmtCode(l.obtenu)) : '·'}</td><td>${etat(V[l.verdict][1], V[l.verdict][0])}${b ? `<br><span class="faint">avant : ${V[parRef[l.id].verdict][0].toLowerCase()}</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="faint" style="font-size:12px;margin-top:10px">Cliquez une décision pour la charger comme produit à l'essai. Chaque valeur vient d'un passage de la décision ; fiches annotées par IA.</p>`;
  } else if (onglet === 'code') {
    const refL = new Set(versCode(REF).split('\n'));
    corps = `<pre class="code-bloc">${versCode(arbre).split('\n').map((l) => (refL.has(l) ? esc(l) : `<span class="chg">${esc(l)}</span>`)).join('\n')}</pre><div style="display:flex;gap:8px;margin-top:10px"><button class="btn blanc petit" data-telecharger="json">${ic('import')}Arbre (JSON)</button><button class="btn blanc petit" data-telecharger="js">${ic('import')}Code</button></div>`;
  } else corps = journal.length ? `<div class="journal">${journal.slice().reverse().map((j) => `<div><span><b>${esc(j.qui)}</b> · ${esc(j.lecture)}<small>${esc(j.quand)} · ${esc(j.noeud)} · ${esc(j.changement)} · reproduites ${esc(j.avant)} → ${esc(j.apres)}</small></span></div>`).join('')}</div>` : '<p class="muted">Aucune interprétation enregistrée. Chaque modification est signée, datée et gardée ici avec son effet sur les décisions.</p>';
  const pb = verifier(arbre), graves = pb.filter((x) => !/jamais atteint/.test(x));
  return `<div class="carte"><div class="carte-corps"><div class="onglets petits">${[['decisions', 'Décisions officielles'], ['code', 'Le code derrière'], ['journal', 'Journal' + (journal.length ? ' · ' + journal.length : '')]].map(([k, l]) => `<button data-onglet="${k}" class="${onglet === k ? 'actif' : ''}">${l}</button>`).join('')}</div>
    ${graves.length ? `<p class="note-l erreur">${ic('alerte')}Arbre à compléter : ${graves.map(esc).join(' ; ')}</p>` : ''}${corps}</div></div>`;
}

export function rendre() {
  if (!pret) return '<div class="page"><div class="titre"><div class="bloc"><h1>Arbre d\'interprétation</h1></div></div><div class="agent"><span class="rond"></span><span class="txt">Chargement de l\'arbre, des textes et des décisions</span></div></div>';
  const res = evaluer(arbre, valeurs), modifiee = JSON.stringify(arbre) !== JSON.stringify(REF);
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Arbre d'interprétation</h1><p>${esc(REF.perimetre || '')} La règle est une donnée : modifiez une branche, tout se recalcule.</p></div>
      <div style="display:flex;gap:8px;align-items:center">${modifiee ? '<span class="tag sim">Version de travail</span><button class="btn rouge petit" data-reinit>Revenir à la référence</button>' : '<span class="tag contour">Arbre de référence</span>'}</div></div>
    <div class="cols-arbre">
      <div class="carte"><div class="carte-tete"><h3>${esc(arbre.titre || 'Arbre')}</h3></div><p class="carte-sous">${esc(arbre.nomenclature || '')}, six chiffres. Rédigé par IA à partir des textes cités, non relu par un déclarant. Liseré orange : nœud modifié.</p><div class="carte-corps">${arbreHtml(res)}</div></div>
      <div class="col">${essaiHtml(res)}${editeurHtml()}${basHtml()}</div>
    </div></div>`;
}

function appliquer(racine, rerendre) {
  const lecture = racine.querySelector('#edReason').value.trim(), qui = racine.querySelector('#edWho').value.trim();
  if (lecture.length < 10 || !qui) { msg = 'Une lecture en une phrase et une signature sont nécessaires pour modifier la règle.'; return rerendre(); }
  const suivant = structuredClone(arbre); suivant.noeuds[sel] = brouillon;
  const pb = verifier(suivant).filter((p) => !/jamais atteint/.test(p));
  if (pb.length) { msg = 'Modification refusée : ' + pb.join(' ; '); return rerendre(); }
  const avant = rejouer(arbre, DECISIONS).reproduit, apres = rejouer(suivant, DECISIONS).reproduit, ancien = arbre.noeuds[sel];
  const quoi = brouillon.type === 'code' && ancien.code !== brouillon.code ? `code ${fmtCode(ancien.code)} → ${fmtCode(brouillon.code)}` : brouillon.type === 'question' && JSON.stringify(ancien.branches) !== JSON.stringify(brouillon.branches) ? 'branches modifiées' : brouillon.type === 'question' && ancien.critere !== brouillon.critere ? 'critère changé' : 'texte ou base légale modifiés';
  journal = [...journal, { qui, quand: new Date().toLocaleString('fr-FR'), noeud: sel + ' · ' + titreNoeud(sel), lecture, changement: quoi, avant: `${avant}/${DECISIONS.length}`, apres: `${apres}/${DECISIONS.length}` }];
  arbre = suivant; msg = null; brouillon = null; garder(); rerendre();
}
const telecharger = (nom, texte, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texte], { type })); a.download = nom; a.click(); };
const nouvelId = (p) => { let i = 1; while (arbre.noeuds[p + 'x' + i]) i++; return p + 'x' + i; };
// Garde la phrase de lecture et la signature quand l'éditeur se redessine.
function enGardant(racine, rerendre) { const l = racine.querySelector('#edReason')?.value, q = racine.querySelector('#edWho')?.value; rerendre(); const r = document.querySelector('#edReason'); if (r) { r.value = l || ''; document.querySelector('#edWho').value = q || S.lire().qui; } }

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  if (!pret) return;
  racine.addEventListener('click', (e) => {
    const t = e.target, b = (s) => t.closest(s);
    if (b('[data-stop]')) return;
    if (b('[data-v]')) { const [k, v] = b('[data-v]').dataset.v.split(':'); valeurs = { ...valeurs }; if (v === '') delete valeurs[k]; else valeurs[k] = v === 'oui'; delete cites[k]; return rerendre(); }
    if (b('[data-rb]')) { e.stopPropagation(); brouillon = { ...brouillon, base: (brouillon.base || []).filter((x) => x !== b('[data-rb]').dataset.rb) }; return enGardant(racine, rerendre); }
    if (b('[data-t]')) { const x = T[b('[data-t]').dataset.t]; racine.querySelector('#texte-cite').innerHTML = x ? `<blockquote><b>${esc(x.ref)}</b>\n${esc(x.texte)}\n<a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a></blockquote>` : ''; return; }
    if (b('[data-n]')) { sel = b('[data-n]').dataset.n; brouillon = null; msg = null; return rerendre(); }
    if (b('[data-onglet]')) { onglet = b('[data-onglet]').dataset.onglet; return rerendre(); }
    if (b('tr[data-d]')) { const d = DECISIONS.find((x) => x.id === b('tr[data-d]').dataset.d); valeurs = Object.fromEntries(Object.entries(d.criteres).map(([k, x]) => [k, x.valeur])); cites = Object.fromEntries(Object.entries(d.criteres).map(([k, x]) => [k, { citation: x.citation, source: d.id + (x.appui && x.appui !== 'explicite' ? ', valeur déduite : ' + x.appui : '') }])); essai = { nom: d.id + ' : ' + d.produit, hs6: d.hs6, moteur: null }; document.querySelector('.main')?.scrollTo({ top: 0, behavior: 'smooth' }); return rerendre(); }
    if (b('[data-reprendre]')) { entrer(new URLSearchParams('dossier=1')); return rerendre(); }
    if (t.id === 'appliquer') return appliquer(racine, rerendre);
    if (b('[data-fermer-ed]')) { sel = null; brouillon = null; msg = null; return rerendre(); }
    if (t.id === 'revenir') { arbre = { ...arbre, noeuds: { ...arbre.noeuds, [sel]: structuredClone(REF.noeuds[sel]) } }; brouillon = null; journal = [...journal, { qui: S.lire().qui, quand: new Date().toLocaleString('fr-FR'), noeud: sel, lecture: 'Retour au texte de référence', changement: 'annulation', avant: '', apres: rejouer(arbre, DECISIONS).reproduit + '/' + DECISIONS.length }]; garder(); return rerendre(); }
    if (t.id === 'supprimer') { if (Object.values(arbre.noeuds).some((n) => n.type === 'question' && Object.values(n.branches || {}).includes(sel))) { msg = "Ce nœud est encore la destination d'une branche."; return rerendre(); } const nd = { ...arbre.noeuds }; delete nd[sel]; arbre = { ...arbre, noeuds: nd }; sel = null; brouillon = null; garder(); return rerendre(); }
    if (b('[data-reinit]')) { arbre = structuredClone(REF); journal = []; sel = null; brouillon = null; garder(); return rerendre(); }
    if (b('[data-vider]')) { valeurs = {}; cites = {}; essai = { nom: 'Produit libre', hs6: null, moteur: null }; return rerendre(); }
    if (b('[data-ajout]')) { const q = b('[data-ajout]').dataset.ajout === 'question'; sel = nouvelId(q ? 'q' : 'c'); arbre = { ...arbre, noeuds: { ...arbre.noeuds, [sel]: q ? { type: 'question', critere: arbre.criteres[0].id, pourquoi: '', base: [], branches: {} } : { type: 'code', code: '', libelle: '', motif: '', base: [] } } }; brouillon = null; return rerendre(); }
    if (b('[data-telecharger]')) return b('[data-telecharger]').dataset.telecharger === 'json' ? telecharger('arbre-interpretation.json', JSON.stringify({ ...arbre, journal }, null, 1), 'application/json') : telecharger('classer.js', versCode(arbre), 'text/javascript');
  });
  racine.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.s) { valeurs = { ...valeurs }; if (t.value) valeurs[t.dataset.s] = t.value; else delete valeurs[t.dataset.s]; delete cites[t.dataset.s]; return rerendre(); }
    if (t.dataset.b) { const br = { ...(brouillon.branches || {}) }; if (t.value) br[t.dataset.b] = t.value; else delete br[t.dataset.b]; brouillon = { ...brouillon, branches: br }; return enGardant(racine, rerendre); }
    if (t.id === 'edCrit') { brouillon = { ...brouillon, critere: t.value, branches: {} }; return enGardant(racine, rerendre); }
    if (t.id === 'ajoutBase' && t.value) { brouillon = { ...brouillon, base: [...(brouillon.base || []), t.value] }; return enGardant(racine, rerendre); }
  });
  racine.addEventListener('input', (e) => {
    const t = e.target, champ = { edWhy: 'pourquoi', edLib: 'libelle', edMotif: 'motif', edCode: 'code' }[t.id];
    if (!brouillon || !champ) return;
    brouillon = { ...brouillon, [champ]: champ === 'code' ? t.value.replace(/\D/g, '') : t.value };
    const bouton = racine.querySelector('#appliquer');
    if (bouton) bouton.disabled = JSON.stringify(brouillon) === JSON.stringify(arbre.noeuds[sel]);
  });
}
