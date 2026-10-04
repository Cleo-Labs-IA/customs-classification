// Le dossier d'un produit, colonne de gauche (pièces, faits, contradictions, règle
// encodée) et tours du moteur (candidats, question au marchand, ce qui a changé).
// Chaque case s'ouvre dans le tiroir ; chaque ligne reprend un champ de la réponse.
import { esc, ic, urlSure } from '../../ui.js';
import { fmtCode } from '../../conformite.js';
import { grapheHtml } from '../../graphe-arbre.js';
import { STATUT, CONTROLES, PROVENANCE, FAITS_AJOUTABLES, FAITS_LISTES, FAITS_NUMERIQUES, libelleFait, libelleSource, titre, premierRetenu, valeurFait } from '../../dossier/logique.js';

const num = (n) => (typeof n === 'number' ? String(n) : 'not provided');
export const SOURCES = { direct: ['Live', 'pret'], enregistree: ['Recorded response', 'en_attente'], illustrative: ['Illustrative response', 'a_verifier'] };
export const sourceTour = (t) => `${(SOURCES[t.source] || ['Engine'])[0]}${t.enregistreeLe ? ' on ' + t.enregistreeLe.split('-').reverse().join('/') : ''}${t.paysEnregistre && t.paysEnregistre !== t.envoye.country ? ' (destination ' + t.paysEnregistre + ')' : ''}`;

function barre(texte, source, barres) {
  let h = esc(texte);
  for (const b of barres) if (b.source === source) h = h.split(esc(b.quote)).join('<s>' + esc(b.quote) + '</s>');
  return h;
}

export function piecesCarte(D, det) {
  const p = D.produit;
  return `<div class="carte"><div class="carte-tete"><h3>Documents</h3><span class="muted">${p.photo ? 'photo · ' : ''}${p.page ? 'web page · ' : ''}${p.ds ? 'datasheet' : 'description only'}</span></div>
    <div class="carte-corps"><p class="citation">${barre(p.desc, 'description', D.barres)}</p>
      ${p.ds ? `<button class="lien-detail" data-detail="${det(`<h2>Datasheet</h2><p class="muted">${p.photo ? 'Label read from the photo, checked' : p.page ? 'Copied from the page ' + esc(p.page.domaine) : 'Entered in the product record'}</p><p class="pre">${barre(p.ds, 'fiche_technique', D.barres)}</p>`)}">${ic('fichier')}Read the datasheet</button>` : ''}
      ${D.barres.length ? '<p class="faint" style="font-size:12.5px;margin-top:8px">Struck-through passages were declared false by a person and are no longer sent.</p>' : ''}</div></div>`;
}

export function faitsCarte(D, det, verrou) {
  const k = Object.keys(D.faits);
  const ligne = (cle) => {
    const f = D.faits[cle];
    const d = det(`<h2>${esc(libelleFait(cle))}</h2><p class="grand-texte">${esc(valeurFait(cle, f.value))}</p><h4>Provenance</h4><p>${esc(f.origin)}</p>${(f.quotes || []).map((q) => `<blockquote>${esc(q)}</blockquote>`).join('')}${f.kind === 'main' ? '<p>No document supports this characteristic. It stays flagged as such in the file.</p>' : ''}<h4>Field sent to the API</h4><pre>facts.${esc(cle)} = ${esc(JSON.stringify(f.value))}</pre>`);
    return `<div class="fait-l ${f.kind}" data-detail="${d}"><span><b>${esc(libelleFait(cle))}</b> ${esc(valeurFait(cle, f.value))}</span><span class="prov">${esc(PROVENANCE[f.kind])}</span>${verrou ? '' : `<button class="icobtn petit" data-retirer-fait="${esc(cle)}" title="Remove and reassess">${ic('fermer')}</button>`}</div>`;
  };
  const ajout = verrou ? '' : `<form class="ajout-fait" data-form="fait"><select class="saisie" name="k">${FAITS_AJOUTABLES.filter((x) => !D.faits[x]).map((x) => `<option value="${x}">${esc(libelleFait(x))}</option>`).join('')}</select><input class="saisie" name="v" required placeholder="Add a characteristic"><button class="btn blanc petit" type="submit">Add</button></form>`;
  const notes = [D.lecture && D.lecture.rejected ? `${D.lecture.rejected} item(s) set aside at reading: the cited passage was not found word for word in the document.` : '', D.lectureErreur ? 'Documents not read: ' + D.lectureErreur + '. Contradictions between documents are not checked.' : ''].filter(Boolean);
  return `<div class="carte"><div class="carte-tete"><h3>Known characteristics</h3><span class="muted">${k.length}</span></div><div class="carte-corps">
    ${k.length ? `<div class="faits">${k.map(ligne).join('')}</div>` : '<p class="muted">Description only. No structured characteristic.</p>'}
    ${notes.map((n) => `<p class="note-l">${ic('info')}${esc(n)}</p>`).join('')}${ajout}</div></div>`;
}

export function contradictionsCarte(D) {
  if (!D.contradictions.length || D.occupe) return '';
  return `<div class="carte alerte-carte"><div class="carte-tete"><h3>${ic('alerte')} Contradiction to resolve before classifying</h3></div><div class="carte-corps">
    ${D.contradictions.map((c, i) => `<div class="contradiction"><b>${esc(c.sujet)}</b><p class="muted">${esc(c.pourquoi)}</p><div class="paire">
      ${['a', 'b'].map((s) => `<div class="cote"><span class="eyebrow">${esc(libelleSource(c[s].source))}</span><q>${esc(c[s].quote)}</q><button class="btn blanc petit" data-garder="${i}:${s}">This one is true</button></div>`).join('')}</div></div>`).join('')}</div></div>`;
}

// ---------- règle encodée : le chemin suivi pour ce produit ----------
const brTxt = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === 'oui' ? 'Yes' : 'No');
const issue = (x) => (/^\d{6}$/.test(x) ? fmtCode(x) : x);
function nomNoeud(A, id) {
  const n = A.noeuds[id];
  if (!n) return id;
  return n.type === 'code' ? fmtCode(n.code) + ' · ' + (n.libelle || '') : n.type === 'hors_perimetre' ? 'outside the scope of the rule' : 'next question: ' + ((A.criteres.find((c) => c.id === n.critere) || {}).libelle || n.critere);
}

export function regleCarte(D, R, res, det) {
  const tete = (sous) => `<div class="carte-tete"><h3>${ic('arbre')} Encoded rule</h3><button class="btn texte petit" data-aller="#/arbre?dossier=1">Open in the tree${ic('droite')}</button></div><p class="carte-sous">${sous}</p>`;
  if (!R) return `<div class="carte">${tete('No encoded rule is loaded. The proposal comes from the engine alone.')}</div>`;
  const A = R.arbre, C = Object.fromEntries(A.criteres.map((c) => [c.id, c])), t = D.tours.length ? premierRetenu(D.tours[D.tours.length - 1].data) : null;
  const version = `${esc(A.titre || '')} · ${esc(A.nomenclature || '')}, six digits. Drafted by AI from the cited texts, not reviewed by a declarant.`;
  const codes = new Set(Object.values(A.noeuds).filter((n) => n.type === 'code').map((n) => n.code));
  const couvert = Object.keys(D.crit).length || (t && codes.has(String(t.code).slice(0, 6)));
  if (!couvert || (res.statut === 'hors_perimetre' && !res.chemin.length)) return `<div class="carte">${tete(version)}<div class="carte-corps"><p><b>This rule does not cover this product.</b></p><p class="muted">${esc(res.statut === 'hors_perimetre' ? (A.noeuds[res.noeud] || {}).motif || '' : 'The documents establish none of its criteria. It covers: ' + (A.perimetre || ''))}</p>${D.critErreur ? `<p class="note-l">${ic('info')}Criteria not read: ${esc(D.critErreur)}. You can answer the criteria in the tree.</p>` : ''}</div></div>`;
  const etapes = res.chemin.map((s, i) => {
    const n = A.noeuds[s.noeud], c = C[s.critere], f = D.crit[s.critere], textes = (n.base || []).map((b) => R.T[b]).filter(Boolean);
    const fait = f.kind === 'reponse' ? `<b>${esc(brTxt(c, s.valeur))}</b> <span class="prov">confirmed answer</span>` : `<b>${esc(brTxt(c, s.valeur))}</b> <q>${esc(f.citation)}</q> <span class="faint">${esc(libelleSource(f.source))}</span>`;
    const d = det(`<h2>${esc(c.libelle)}</h2><h4>The official rule</h4>${textes.map((x) => `<p><b>${esc(x.ref)}</b> · <a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.source)}</a></p><blockquote>${esc(x.texte)}</blockquote>`).join('') || '<p class="muted">No text cited on this node.</p>'}<p>${esc(n.pourquoi || '')}</p>
      <h4>The fact checked on the product</h4><p>${esc(c.question)} <b>${esc(brTxt(c, s.valeur))}</b></p>${f.kind === 'reponse' ? '<p>Answer given on this screen. No document establishes it.</p>' : `<blockquote>${esc(f.citation)}</blockquote><p class="muted">${esc(libelleSource(f.source))}</p>`}
      <h4>The consequence</h4><p>${esc(nomNoeud(A, n.branches[s.valeur]))}</p><p class="muted">Other branches: ${Object.entries(n.branches).filter(([v]) => v !== s.valeur).map(([v, cible]) => esc(brTxt(c, v)) + ' → ' + esc(nomNoeud(A, cible))).join('; ')}</p>`);
    return `<button class="etape-regle" data-detail="${d}" style="--i:${i}"><span class="num">${i + 1}</span><div><div class="l"><span class="eyebrow">Rule</span><span>${esc(n.pourquoi || '')} <span class="faint">${textes.map((x) => esc(x.ref)).join(' · ')}</span></span></div>
      <div class="l"><span class="eyebrow">Checked fact</span><span>${esc(c.question)} ${fait}</span></div><div class="l c"><span class="eyebrow">Consequence</span><span>${esc(nomNoeud(A, n.branches[s.valeur]))}</span></div></div></button>`;
  }).join('');
  let fin;
  if (res.statut === 'information_manquante') {
    const n = A.noeuds[res.noeud], c = C[res.critere];
    fin = `<div class="blocage"><span class="eyebrow">Blocking point · a fact is missing</span><b>${esc(c.question)}</b><p class="muted">${esc(n.pourquoi || '')}</p>
      ${D.valide ? '' : `<div class="options">${Object.entries(res.options).map(([v, issues]) => `<button data-crit="${esc(res.critere)}:${esc(v)}"><b>${esc(brTxt(c, v))}</b><small>leads to ${issues.map((x) => esc(issue(x))).join(', ')}</small></button>`).join('')}</div>`}</div>`;
  } else if (res.statut === 'hors_perimetre') {
    fin = `<div class="conclusion diverge"><span class="eyebrow">Rule conclusion</span><b>This product falls outside the scope of the rule</b><p class="muted">${esc((A.noeuds[res.noeud] || {}).motif || '')}</p></div>`;
  } else {
    const n = A.noeuds[res.noeud], meme = t && String(t.code).slice(0, 6) === res.code;
    fin = `<div class="conclusion ${meme ? '' : 'diverge'}"><span class="eyebrow">Rule conclusion</span><div><span class="code grand">${esc(fmtCode(res.code))}</span> ${esc(n.libelle || '')}</div><p class="muted">${esc(n.motif || '')}</p>
      <p>${t ? (meme ? 'The engine proposes the same code: the two lines of reasoning converge.' : `The engine proposes <b class="code">${esc(fmtCode(String(t.code).slice(0, 6)))}</b>: the two lines of reasoning diverge, to be decided by an authorised person.`) : 'The engine kept no code for this destination.'}</p></div>`;
  }
  const rep = Object.values(D.crit).filter((x) => x.kind === 'reponse').length;
  return `<div class="carte">${tete(version)}<div class="carte-corps chemin">${grapheHtml(A, { res })}${etapes}${fin}
    ${rep && !D.valide ? `<p class="faint" style="margin-top:10px;font-size:12.5px">${rep} answer(s) given on this screen. <button class="lien-detail" data-retirer-crit>Remove them</button></p>` : ''}
    ${D.critRejetes ? `<p class="faint" style="font-size:12.5px">${D.critRejetes} value(s) set aside: cited passage not found word for word.</p>` : ''}
    ${D.critErreur ? `<p class="note-l">${ic('info')}Criteria not read: ${esc(D.critErreur)}. Answer the blocking point to move forward in the rule.</p>` : ''}</div></div>`;
}

// ---------- tours du moteur ----------
function preuves(c) {
  return (c.evidence || []).map((e) => `<p><b>${esc(e.ref || e.kind)}</b> · <a href="${urlSure(e.url)}" target="_blank" rel="noopener">official text</a>${e.source_version ? ` <span class="muted">(${esc(e.source_version)})</span>` : ''}</p><blockquote>${esc(e.excerpt)}</blockquote>`).join('');
}
const precedents = (liste) => '<ul>' + liste.map((x) => `<li><a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.ruling_id)}</a> → ${esc(x.official_code)} <span class="muted">(${esc(x.ruling_date)}, similarity ${num(x.similarity)})</span></li>`).join('') + '</ul>';

// Pour, contre, inconnu : uniquement des champs de la réponse de l'API.
export function detailCandidat(c, d) {
  const ecarte = Boolean(c.set_aside_reason), hs6 = String(c.code).slice(0, 6);
  const prec = (d.provenance && d.provenance.precedents) || [], meme = prec.filter((x) => String(x.official_code).startsWith(hs6)), autre = prec.filter((x) => !String(x.official_code).startsWith(hs6));
  const ctrl = (d.provenance && d.provenance.acceptance_checks) || [], qs = d.questions || [];
  return `<h2 class="mono">${esc(fmtCode(c.code))}</h2><p class="muted">${esc(titre(c))}</p><p>${ecarte ? 'Set aside' : 'Still plausible'} · confidence returned by the API: ${num(c.confidence)}</p>
    <h4 class="pour">What supports it</h4>${!ecarte && c.rationale ? `<p>${esc(c.rationale)}</p>` : ''}${preuves(c) || (ecarte ? '' : '<p class="muted">No text excerpt returned.</p>')}${meme.length ? '<p>Similar official rulings classified under this code:</p>' + precedents(meme) : ''}
    <h4 class="contre">What weighs against it</h4>${c.set_aside_reason ? `<p>${esc(c.set_aside_reason)}</p>` : ''}${autre.length ? '<p>Similar official rulings classified under another code:</p>' + precedents(autre) : ''}${!c.set_aside_reason && !autre.length ? '<p class="muted">Nothing in the response.</p>' : ''}
    <h4 class="inconnu">What is still unknown</h4>${qs.length ? '<ul>' + qs.map((q) => `<li><b>${esc(libelleFait(q.fact))}</b>: ${esc(q.why || q.question)}</li>`).join('') + '</ul>' : ''}${ctrl.length ? '<ul>' + ctrl.map((k) => `<li>${esc(CONTROLES[k] || k)} <code>${esc(k)}</code></li>`).join('') + '</ul>' : ''}${!qs.length && !ctrl.length ? '<p class="muted">No open question or failed check.</p>' : ''}
    <h4>Nomenclature</h4><p>${esc(c.system)} · version ${esc(c.source_version || 'not stated')}${c.valid_from ? ' · valid from ' + esc(c.valid_from) : ''}${(c.gri || []).length ? ' · ' + esc(c.gri.join(', ')) : ''}</p>`;
}

function champQuestion(fait) {
  if (FAITS_LISTES[fait]) return `<select class="saisie" name="${fait}" required><option value="">Choose</option>${FAITS_LISTES[fait].map((o) => `<option>${o}</option>`).join('')}</select>`;
  if (FAITS_NUMERIQUES.includes(fait)) return `<input class="saisie" name="${fait}" type="number" min="0" step="any" required placeholder="${esc(libelleFait(fait))}">`;
  return `<textarea class="saisie" name="${fait}" required maxlength="200" rows="2" placeholder="Seller's answer, in one sentence"></textarea>`;
}

export function toursHtml(D, det, suggestions) {
  return D.tours.map((t, i) => {
    const d = t.data, cands = d.candidates || [], extra = (d.alternatives_set_aside || []).filter((a) => !cands.some((c) => c.code === a.code));
    let diff = '';
    if (i > 0) {
      const av = D.tours[i - 1].data, a = premierRetenu(av), b = premierRetenu(d), st = (x) => (STATUT[x.status] || [x.status])[0];
      diff = `<div class="carte diff"><div class="carte-corps"><span class="eyebrow">What changed</span><b>${esc(t.cause)}</b><dl class="kv"><dt>Status</dt><dd>${av.status === d.status ? esc(st(d)) + ' <span class="faint">unchanged</span>' : esc(st(av)) + ' → <b>' + esc(st(d)) + '</b>'}</dd>
        <dt>Code kept</dt><dd>${(a && a.code) === (b && b.code) ? (b ? `<span class="code">${esc(fmtCode(b.code))}</span> <span class="faint">unchanged</span>` : 'none') : `${a ? `<span class="code">${esc(fmtCode(a.code))}</span>` : 'none'} → <b class="code">${b ? esc(fmtCode(b.code)) : 'none'}</b>`}</dd><dt>Confidence</dt><dd>${a ? num(a.confidence) : 'n/a'} → ${b ? num(b.confidence) : 'n/a'}</dd></dl></div></div>`;
    }
    const cartes = [...cands.map((c) => ({ c, ecarte: Boolean(c.set_aside_reason), detail: detailCandidat(c, d) })), ...extra.map((a) => ({ c: a, ecarte: true, detail: `<h2 class="mono">${esc(fmtCode(a.code))}</h2><h4 class="contre">What weighs against it</h4><p>${esc(a.set_aside_reason)}</p>` }))];
    const grille = cartes.length ? `<div class="candidats-grille">${cartes.map(({ c, ecarte, detail }) => `<button class="cand-carte ${ecarte ? 'ecarte' : ''}" data-detail="${det(detail)}"><span class="code">${esc(fmtCode(c.code))}</span><span class="cand-titre">${esc(titre(c) || c.set_aside_reason || '')}</span>
      ${typeof c.confidence === 'number' ? `<span class="jauge"><i style="width:${Math.max(3, Math.min(100, c.confidence * 100))}%"></i></span><span class="faint mono" style="font-size:11.5px">confidence ${num(c.confidence)}</span>` : ''}<span class="etat ${ecarte ? 'en_attente' : 'pret'}" style="${ecarte ? 'background:var(--sunk);color:var(--ink-3)' : ''}">${ecarte ? 'Set aside' : 'Still plausible'}</span></button>`).join('')}</div>`
      : `<p class="muted">The API returned no candidate in this round.${d.gate_hint ? ' Reason returned: ' + esc(d.gate_hint) : ''}</p>`;
    const qs = d.questions || [], dernierTour = i === D.tours.length - 1;
    let question = '';
    if (qs.length && t.repondu) question = `<div class="question-faite"><span class="eyebrow">Question to the seller · answer confirmed</span>${qs.map((q) => `<p>${esc(q.question)}</p>`).join('')}<div class="faits">${Object.entries(t.repondu).map(([k, v]) => `<div class="fait-l reponse"><span><b>${esc(libelleFait(k))}</b> ${esc(valeurFait(k, v))}</span><span class="prov">confirmed answer</span></div>`).join('')}</div></div>`;
    else if (qs.length && dernierTour && !D.occupe && !D.contradictions.length && !D.valide) {
      const sug = suggestions(qs);
      question = `<form class="question-form" data-form="question"><span class="eyebrow">Missing information · question to the seller</span>
        ${qs.map((q) => `<div class="champ"><label>${esc(q.question)}</label><p class="faint" style="font-size:12.5px">${esc(q.why || '')}</p>${champQuestion(q.fact)}${(sug[q.fact] || []).map((s) => `<button type="button" class="chip suggestion" data-suggestion="${esc(q.fact)}" data-valeur="${esc(s.valeur)}">${ic('agent')}${esc(s.libelle)}</button>`).join('')}</div>`).join('')}
        <button class="btn noir" type="submit">Answer and reassess</button></form>`;
    }
    return `${diff}<div class="tour-l"><span class="tour-pastille">${i === 0 ? 'First assessment' : 'New assessment'}${t.secondes ? ' · ' + num(t.secondes) + ' s' : ''}</span><span class="etat ${(SOURCES[t.source] || [0, 'pret'])[1]}">${esc(sourceTour(t))}</span></div>${grille}${question}`;
  }).join('');
}
