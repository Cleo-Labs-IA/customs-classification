// Le dossier d'un produit, colonne de droite après les tours : la proposition à signer,
// les décisions officielles proches, les épreuves, les obligations et droits, les autres
// destinations.
import { esc, ic, urlSure, nomPays, drapeau, etat } from '../../ui.js';
import { fmtCode } from '../../conformite.js';
import { STATUT, libelleFait, titre, premierRetenu } from '../../dossier/logique.js';
import { detailCandidat } from './graphe.js';

const num = (n) => (typeof n === 'number' ? String(n) : 'not provided');
const VERDICT = { applicable: ['Comparable to this product', 'pret'], partiellement: ['Partly comparable', 'a_verifier'], non_applicable: ['Does not concern a comparable product', 'bloque'], non_verifiable: ['Cannot be verified', 'en_attente'] };
const brut = (titreBrut, x) => `<h2>${esc(titreBrut)}</h2><pre>${esc(JSON.stringify(x, null, 1))}</pre>`;

function precedentLigne(D, x, det) {
  const a = D.applic[x.ruling_id];
  let e = D.valide ? '' : `<button class="btn texte petit" data-applic="${esc(x.ruling_id)}">Check whether it applies</button>`;
  if (a === 'encours') e = '<span class="agent" style="padding:3px 9px"><span class="rond"></span><span class="txt">checking</span></span>';
  else if (a && a.erreur) e = `<span class="etat bloque">${esc(a.erreur)}</span>`;
  else if (a) {
    const v = VERDICT[a.verdict] || [a.verdict, 'a_verifier'], cit = (o) => (o && o.citation ? `<blockquote>${esc(o.citation)}</blockquote>` : '<p class="muted">The product documents say nothing about it.</p>');
    e = `${etat(v[1], v[0])} <button class="btn texte petit" data-detail="${det(`<h2>${esc(x.ruling_id)}</h2><p>${etat(v[1], v[0])}</p><p>${esc(a.motif || '')}</p>
      <h4>The ruling</h4><p>${esc(a.decision.juridiction || '')} · ${esc(a.decision.date || '')} · ${a.decision.revoquee === true ? 'revoked' : a.decision.revoquee === false ? 'not revoked' : 'revocation cannot be verified'} · ${a.meme_juridiction === true ? 'same country as the destination' : a.meme_juridiction === false ? 'another country than the destination: it does not bind this customs authority' : 'destination country not compared'}</p>
      <h4 class="pour">Common points checked</h4>${(a.points_communs || []).map((c) => `<p><b>${esc(c.aspect)}</b></p><p class="muted">Product</p>${cit(c.produit)}<p class="muted">Ruling</p>${cit(c.decision)}`).join('') || '<p class="muted">None.</p>'}
      <h4 class="contre">Differences</h4>${(a.differences || []).map((c) => `<p><b>${esc(c.aspect)}</b>${c.decisive ? ' · decisive' : ''}</p><p class="muted">Product</p>${cit(c.produit)}<p class="muted">Ruling</p>${cit(c.decision)}${c.pourquoi_ca_compte ? `<p>${esc(c.pourquoi_ca_compte)}</p>` : ''}`).join('') || '<p class="muted">None.</p>'}
      <p class="muted">${a.rejetes || 0} item(s) set aside for lack of an exact quote. The code of the ruling is never taken as the code of the product.</p>`)}">Detail</button>`;
  }
  return `<div class="precedent"><div><a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.ruling_id)}</a> → <span class="code">${esc(x.official_code)}</span><br><span class="faint">${esc(x.ruling_date)} · text similarity ${num(x.similarity)}</span></div><div>${e}</div></div>`;
}

// La lecture du moteur. La signature n'est plus ici : elle est sur la décision, en tête du dossier.
export function propositionCarte(D, det, travail) {
  const t = D.tours[D.tours.length - 1], d = t.data, st = STATUT[d.status] || [d.status, 'a_verifier'], top = premierRetenu(d);
  const enAttente = (d.questions || []).length && !t.repondu, prec = (d.provenance && d.provenance.precedents) || [], cov = d.coverage || {};
  const niveau = top ? (top.system === 'hs6' ? 'International level, six digits' : `Destination nomenclature (${esc(top.system)})`) : 'Not applicable';
  const sansPiece = Object.entries(D.faits).filter(([, f]) => f.kind === 'main').map(([k]) => libelleFait(k));
  return `<div class="carte"><div class="carte-corps">
    <div class="prop-tete"><span class="eyebrow">${enAttente ? 'Engine reading, provisional' : 'Engine reading'}</span>${etat(st[1], st[0])}</div>
    ${top ? `<div class="grand-code">${esc(fmtCode(top.code))}</div><p class="muted">${esc(titre(top))}</p>` : '<h3>No code proposed</h3>'}
    <dl class="kv"><dt>Precision</dt><dd>${niveau}${cov.hint ? `<br><span class="faint">${esc(cov.hint)}</span>` : ''}</dd>
      ${top ? `<dt>Rationale</dt><dd>${esc(top.rationale || 'not provided')}</dd><dt>Sources</dt><dd>${(top.evidence || []).length ? top.evidence.map((e) => `<a href="${urlSure(e.url)}" target="_blank" rel="noopener">${esc(e.ref || e.kind)}</a>`).join(', ') : 'no excerpt returned'} · <button class="lien-detail" data-detail="${det(detailCandidat(top, d))}">For, against, unknown</button></dd>` : ''}
      ${sansPiece.length ? `<dt>No document</dt><dd>${esc(sansPiece.join(', '))}: entered by hand.</dd>` : ''}
      <dt>Trace</dt><dd><button class="lien-detail" data-detail="${det(`<h2>Raw response</h2><p class="muted">${esc(t.source)} · HTTP ${esc(t.http)}${t.secondes ? ' · ' + num(t.secondes) + ' s' : ''}${t.request_id ? ' · request ' + esc(t.request_id) : ''}</p><h4>Request</h4><pre>${esc(JSON.stringify(t.envoye, null, 1))}</pre><h4>Response</h4><pre>${esc(JSON.stringify(t.body, null, 1))}</pre>`)}">API request and response</button></dd></dl>
    ${prec.length ? `<h4 class="sous-titre">Similar official rulings</h4><div class="precedents">${prec.slice(0, 3).map((x) => precedentLigne(D, x, det)).join('')}</div><p class="faint" style="font-size:12px">Similar by text only: a resemblance is not proof.</p>` : ''}
    <h4 class="sous-titre">Remaining work</h4><ul class="restant">${travail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${d.advisory_disclaimer ? `<p class="faint" style="font-size:12px;margin-top:14px">${esc(d.advisory_disclaimer)}</p>` : ''}</div></div>`;
}

export function epreuvesCarte(D, det) {
  const faits = Object.keys(D.faits);
  return `<div class="carte"><div class="carte-tete"><h3>Put the answer to the test</h3><span class="muted">replayed live</span></div><div class="carte-corps">
    <div class="epreuves">
      <form data-form="ep-ref"><b>Reword</b><p>Same characteristics, other words: the code must not change.</p><input class="saisie" name="v" required minlength="4" placeholder="e.g. Laptop dock with USB-C connection"><button class="btn blanc petit" type="submit">Replay</button></form>
      <form data-form="ep-ret"><b>Remove a piece of information</b><p>Without it, the engine must ask for it again, or stay unchanged if it carried no weight.</p><select class="saisie" name="v" ${faits.length ? '' : 'disabled'}>${faits.length ? faits.map((k) => `<option value="${k}">${esc(libelleFait(k))}</option>`).join('') : '<option>No characteristic</option>'}</select><button class="btn blanc petit" type="submit" ${faits.length ? '' : 'disabled'}>Replay</button></form>
      <form data-form="ep-con"><b>Introduce a contradiction</b><p>A sentence that contradicts the file: the document reading must flag it.</p><input class="saisie" name="v" required minlength="4" placeholder="e.g. Power only, no data ports."><button class="btn blanc petit" type="submit">Replay</button></form>
    </div>
    ${D.epreuves.length ? `<div class="table-cadre" style="margin-top:14px"><table class="t"><thead><tr><th>Test</th><th>Before → after</th><th>Verdict</th></tr></thead><tbody>${D.epreuves.map((e) => `<tr data-detail="${det(brut(e.type, e.brut))}"><td><b>${esc(e.type)}</b><br><span class="faint">${esc(e.entree)}</span></td><td>${esc(e.avant)}<br>→ ${esc(e.apres)}</td><td>${etat(e.ton, e.verdict)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></div>`;
}

export function obligationsCarte(D, dec) {
  const p = D.produit;
  // les conséquences viennent après la décision : rien n'est calculé sur un code encore disputé ou en attente d'un fait
  if (!dec || !dec.code || dec.blocages.some((b) => ['arbitrage', 'question_regle', 'question_moteur', 'contradiction', 'aucun_code'].includes(b.id)))
    return `<div class="carte"><div class="carte-tete"><h3>Duties and landed cost</h3><span class="muted">${drapeau(p.origin)} → ${drapeau(p.dest)}</span></div><div class="carte-corps"><p class="muted" style="font-size:13px">Computed once the classification is usable. Still open: ${esc((dec && dec.blocages.map((b) => b.message).join(' ')) || 'no code is retained.')}</p></div></div>`;
  const o = D.oblig, hs6 = dec.code;
  let corps = '';
  if (o && o.erreur) corps = `<p class="note-l erreur">${ic('alerte')}${esc(o.erreur)}</p>`;
  else if (o && o !== 'encours') {
    const nonS = (o.obligations || []).filter((x) => !x.sourcee).length;
    corps = `<h4 class="sous-titre">Obligations · ${(o.obligations || []).length}</h4>${(o.obligations || []).map((x) => `<div class="ob"><b>${esc(x.titre)}</b> ${etat(x.sourcee ? 'pret' : 'a_verifier', x.sourcee ? 'source text provided' : 'inferred by a model, no source text')}${x.autorite ? `<br><span class="faint">${esc(x.autorite)}</span>` : ''}${x.source_url ? ` <a href="${urlSure(x.source_url)}" target="_blank" rel="noopener">source</a>` : ''}</div>`).join('') || '<p class="muted">No obligation returned for this route.</p>'}
      ${nonS ? `<p class="faint" style="font-size:12.5px">${nonS} obligation(s) without an official text: leads to check, not a list of established obligations.</p>` : ''}
      <h4 class="sous-titre">Customs duty</h4>${o.droits ? `<div class="ob"><b>${o.droits.taux_min === o.droits.taux_max || o.droits.taux_max == null ? num(o.droits.taux) : num(o.droits.taux_min) + ' to ' + num(o.droits.taux_max)} ${esc(o.droits.unite || '%')}</b> · ${esc(o.droits.nature || '')}<br><span class="faint">${esc(o.droits.version || '')}${o.droits.ligne_exacte_connue === false ? ` · read across ${esc(o.droits.lignes_lues)} national tariff lines under ${esc(fmtCode(hs6))}, the exact tariff line of the product is not established` : ''}</span></div>` : '<p class="muted">No rate established.</p>'}
      <h4 class="sous-titre">Landed cost</h4>${o.cout ? `<dl class="kv">${(o.cout.composantes || []).map((c) => `<dt>${esc(c.nom)}${c.taux_pct != null ? ' (' + num(c.taux_pct) + '%)' : ''}</dt><dd>${c.connu ? num(c.montant) + ' ' + esc(o.cout.devise || '') : '<span style="color:var(--warn)">unknown</span>'}</dd>`).join('')}<dt><b>${o.cout.partiel ? 'Partial total' : 'Total'}</b></dt><dd><b>${o.cout.total != null ? num(o.cout.total) + ' ' + esc(o.cout.devise || '') : 'cannot be calculated'}</b></dd></dl>${o.cout.partiel ? '<p class="faint" style="font-size:12.5px">Partial total: the unknown components are not counted in it.</p>' : ''}` : '<p class="muted">Not calculated.</p>'}
      ${(o.manquants || []).length ? `<h4 class="sous-titre">What is missing</h4><ul class="restant">${o.manquants.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}`;
  }
  return `<div class="carte"><div class="carte-tete"><h3>Obligations and duties</h3><span class="muted">${drapeau(p.origin)} → ${drapeau(p.dest)}</span></div><div class="carte-corps">
    <p class="muted" style="font-size:13px">Calculated on the six-digit code <span class="code">${esc(fmtCode(hs6))}</span>, which remains a proposal until it is validated. A national code would change the applicable rate.</p>
    <form class="ligne-form" data-form="oblig"><input class="saisie" name="v" type="number" min="0" step="any" placeholder="Goods value in USD (optional)"><button class="btn blanc petit" type="submit" ${o === 'encours' ? 'disabled' : ''}>${o === 'encours' ? 'Call in progress' : 'Query'}</button></form>${corps}</div></div>`;
}

const AUTRES = ['FR', 'DE', 'ES', 'IT', 'NL', 'GB', 'US', 'CA', 'JP', 'AU', 'CH', 'KR', 'MX', 'IN'];
export function destinationsCarte(D, det) {
  const reste = AUTRES.filter((c) => c !== D.produit.dest);
  return `<form class="carte" data-form="autres"><div class="carte-tete"><h3>Same documents, other destinations: six-digit pre-classification</h3></div><div class="carte-corps">
    <p class="muted" style="font-size:13px">One call per destination. Each line states the level actually obtained: country nomenclature, six digits only, or nothing.</p>
    <div class="pays-choix">${reste.map((c) => `<label class="chip"><input type="checkbox" name="c" value="${c}" ${['US', 'GB', 'JP', 'CA'].includes(c) ? 'checked' : ''}>${drapeau(c)}${esc(nomPays(c))}</label>`).join('')}</div>
    <button class="btn blanc petit" type="submit">Evaluate these destinations</button>
    ${D.autres.length ? `<div class="table-cadre" style="margin-top:14px"><table class="t"><thead><tr><th>Destination</th><th>Code</th><th>Level obtained</th><th>Status</th></tr></thead><tbody>${D.autres.map((o) => `<tr ${o.brut ? `data-detail="${det(brut(nomPays(o.country), o.brut))}"` : ''}><td><span class="pays">${drapeau(o.country)}${esc(nomPays(o.country))}</span></td><td>${o.erreur ? '' : o.top ? `<span class="code">${esc(fmtCode(o.top.code))}</span>` : 'none'}</td><td>${o.erreur ? `<span class="faint">${esc(o.erreur)}</span>` : o.top ? (o.top.system === 'hs6' ? 'Six digits only' : `Country nomenclature (${esc(o.top.system)})`) : 'Nothing'}</td><td>${o.erreur ? '' : etat((STATUT[o.status] || [0, 'a_verifier'])[1], (STATUT[o.status] || [o.status])[0])}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></form>`;
}
