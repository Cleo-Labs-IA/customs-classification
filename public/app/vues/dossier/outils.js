// Le dossier d'un produit, colonne de droite après les tours : la proposition à signer,
// les décisions officielles proches, les épreuves, les obligations et droits, les autres
// destinations.
import { esc, ic, urlSure, nomPays, drapeau, etat } from '../../ui.js';
import { fmtCode } from '../../conformite.js';
import { STATUT, libelleFait, titre, premierRetenu } from '../../dossier/logique.js';
import { detailCandidat } from './graphe.js';

const num = (n) => (typeof n === 'number' ? String(n).replace('.', ',') : 'non fournie');
const VERDICT = { applicable: ['Comparable à ce produit', 'pret'], partiellement: ['Comparable en partie', 'a_verifier'], non_applicable: ['Ne porte pas sur un produit comparable', 'bloque'], non_verifiable: ['Non vérifiable', 'en_attente'] };
const brut = (titreBrut, x) => `<h2>${esc(titreBrut)}</h2><pre>${esc(JSON.stringify(x, null, 1))}</pre>`;

function precedentLigne(D, x, det) {
  const a = D.applic[x.ruling_id];
  let e = D.valide ? '' : `<button class="btn texte petit" data-applic="${esc(x.ruling_id)}">Vérifier si elle s'applique</button>`;
  if (a === 'encours') e = '<span class="agent" style="padding:3px 9px"><span class="rond"></span><span class="txt">vérification</span></span>';
  else if (a && a.erreur) e = `<span class="etat bloque">${esc(a.erreur)}</span>`;
  else if (a) {
    const v = VERDICT[a.verdict] || [a.verdict, 'a_verifier'], cit = (o) => (o && o.citation ? `<blockquote>${esc(o.citation)}</blockquote>` : "<p class=\"muted\">Les pièces du produit n'en disent rien.</p>");
    e = `${etat(v[1], v[0])} <button class="btn texte petit" data-detail="${det(`<h2>${esc(x.ruling_id)}</h2><p>${etat(v[1], v[0])}</p><p>${esc(a.motif || '')}</p>
      <h4>La décision</h4><p>${esc(a.decision.juridiction || '')} · ${esc(a.decision.date || '')} · ${a.decision.revoquee === true ? 'révoquée' : a.decision.revoquee === false ? 'non révoquée' : 'révocation non vérifiable'} · ${a.meme_juridiction === true ? 'même pays que la destination' : a.meme_juridiction === false ? "autre pays que la destination : elle n'engage pas cette douane" : 'pays de destination non comparé'}</p>
      <h4 class="pour">Points communs vérifiés</h4>${(a.points_communs || []).map((c) => `<p><b>${esc(c.aspect)}</b></p><p class="muted">Produit</p>${cit(c.produit)}<p class="muted">Décision</p>${cit(c.decision)}`).join('') || '<p class="muted">Aucun.</p>'}
      <h4 class="contre">Différences</h4>${(a.differences || []).map((c) => `<p><b>${esc(c.aspect)}</b>${c.decisive ? ' · décisive' : ''}</p><p class="muted">Produit</p>${cit(c.produit)}<p class="muted">Décision</p>${cit(c.decision)}${c.pourquoi_ca_compte ? `<p>${esc(c.pourquoi_ca_compte)}</p>` : ''}`).join('') || '<p class="muted">Aucune.</p>'}
      <p class="muted">${a.rejetes || 0} élément(s) écarté(s) faute de citation exacte. Le code de la décision n'est jamais repris comme code du produit.</p>`)}">Détail</button>`;
  }
  return `<div class="precedent"><div><a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.ruling_id)}</a> → <span class="code">${esc(x.official_code)}</span><br><span class="faint">${esc(x.ruling_date)} · ressemblance de texte ${num(x.similarity)}</span></div><div>${e}</div></div>`;
}

export function propositionCarte(D, det, travail, qui) {
  const t = D.tours[D.tours.length - 1], d = t.data, st = STATUT[d.status] || [d.status, 'a_verifier'], top = premierRetenu(d);
  const peutValider = top && (d.status === 'classified' || d.status === 'needs_review' || d.status === 'ambiguous');
  const enAttente = (d.questions || []).length && !t.repondu, prec = (d.provenance && d.provenance.precedents) || [], cov = d.coverage || {};
  const niveau = top ? (top.system === 'hs6' ? 'Niveau international, six chiffres' : `Nomenclature de destination (${esc(top.system)})`) : 'Sans objet';
  const sansPiece = Object.entries(D.faits).filter(([, f]) => f.kind === 'main').map(([k]) => libelleFait(k));
  const signature = D.valide
    ? `<div class="valide-bande">${ic('check')}<span>Validé par <b>${esc(D.valide.validated_by)}</b>, signé et horodaté.${D.valide.cockpit ? ' Le code vaut désormais dans le cockpit.' : ''}</span><button class="btn blanc petit" data-action-dossier="telecharger">${ic('import')}JSON</button></div>`
    : peutValider ? `<form class="signature" data-form="valider"><div class="champs2"><div class="champ"><label for="v-qui">Personne habilitée</label><input class="saisie" id="v-qui" required value="${esc(qui)}"></div><div class="champ"><label for="v-motif">Motif <span class="faint">facultatif</span></label><input class="saisie" id="v-motif" maxlength="200" placeholder="ex. note 3 de la section XVI"></div></div><button class="btn noir" type="submit">${ic('check')}Valider et signer</button></form>`
      : `<p class="faint" style="margin-top:14px">${enAttente ? 'Répondez à la question pour obtenir une proposition validable.' : 'Rien à valider à ce stade.'}</p>`;
  const frappe = D.valide ? `<div class="tampon-valide ${Date.now() - Date.parse(D.valide.validated_at) < 4000 ? 'neuf' : ''}" aria-label="Validé"><span>Validé</span><small>${esc(D.valide.validated_by)} · ${esc(new Date(D.valide.validated_at).toLocaleDateString('fr-FR'))}</small></div>` : '';
  return `<div class="carte proposition">${frappe}<div class="carte-corps">
    <div class="prop-tete"><span class="eyebrow">${enAttente ? 'Proposition provisoire' : 'Proposition'}</span>${etat(st[1], st[0])}</div>
    ${top ? `<div class="grand-code">${esc(fmtCode(top.code))}</div><p class="muted">${esc(titre(top))}</p>` : '<h3>Pas de code proposé</h3>'}
    <dl class="kv"><dt>Précision</dt><dd>${niveau}${cov.hint ? `<br><span class="faint">${esc(cov.hint)}</span>` : ''}</dd>
      ${top ? `<dt>Justification</dt><dd>${esc(top.rationale || 'non fournie')}</dd><dt>Sources</dt><dd>${(top.evidence || []).length ? top.evidence.map((e) => `<a href="${urlSure(e.url)}" target="_blank" rel="noopener">${esc(e.ref || e.kind)}</a>`).join(', ') : 'aucun extrait rendu'} · <button class="lien-detail" data-detail="${det(detailCandidat(top, d))}">Pour, contre, inconnu</button></dd>` : ''}
      ${sansPiece.length ? `<dt>Sans pièce</dt><dd>${esc(sansPiece.join(', '))} : saisie à la main.</dd>` : ''}
      <dt>Trace</dt><dd><button class="lien-detail" data-detail="${det(`<h2>Réponse brute</h2><p class="muted">${esc(t.source)} · HTTP ${esc(t.http)}${t.secondes ? ' · ' + num(t.secondes) + ' s' : ''}${t.request_id ? ' · requête ' + esc(t.request_id) : ''}</p><h4>Requête</h4><pre>${esc(JSON.stringify(t.envoye, null, 1))}</pre><h4>Réponse</h4><pre>${esc(JSON.stringify(t.body, null, 1))}</pre>`)}">Requête et réponse de l'API</button></dd></dl>
    ${prec.length ? `<h4 class="sous-titre">Décisions officielles proches</h4><div class="precedents">${prec.slice(0, 3).map((x) => precedentLigne(D, x, det)).join('')}</div><p class="faint" style="font-size:12px">Proches par le texte seulement : une ressemblance n'est pas une preuve.</p>` : ''}
    <h4 class="sous-titre">Travail restant</h4><ul class="restant">${travail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${signature}${d.advisory_disclaimer ? `<p class="faint" style="font-size:12px;margin-top:14px">${esc(d.advisory_disclaimer)}</p>` : ''}</div></div>`;
}

export function epreuvesCarte(D, det) {
  const faits = Object.keys(D.faits);
  return `<div class="carte"><div class="carte-tete"><h3>Mettre la réponse à l'épreuve</h3><span class="muted">rejouées en direct</span></div><div class="carte-corps">
    <div class="epreuves">
      <form data-form="ep-ref"><b>Reformuler</b><p>Mêmes caractéristiques, autres mots : le code ne doit pas changer.</p><input class="saisie" name="v" required minlength="4" placeholder="ex. Laptop dock with USB-C connection"><button class="btn blanc petit" type="submit">Rejouer</button></form>
      <form data-form="ep-ret"><b>Retirer une information</b><p>Sans elle, il doit la redemander, ou rester inchangé si elle ne pesait pas.</p><select class="saisie" name="v" ${faits.length ? '' : 'disabled'}>${faits.length ? faits.map((k) => `<option value="${k}">${esc(libelleFait(k))}</option>`).join('') : '<option>Aucune caractéristique</option>'}</select><button class="btn blanc petit" type="submit" ${faits.length ? '' : 'disabled'}>Rejouer</button></form>
      <form data-form="ep-con"><b>Introduire une contradiction</b><p>Une phrase contraire au dossier : la lecture des pièces doit la signaler.</p><input class="saisie" name="v" required minlength="4" placeholder="ex. Power only, no data ports."><button class="btn blanc petit" type="submit">Rejouer</button></form>
    </div>
    ${D.epreuves.length ? `<div class="table-cadre" style="margin-top:14px"><table class="t"><thead><tr><th>Essai</th><th>Avant → après</th><th>Verdict</th></tr></thead><tbody>${D.epreuves.map((e) => `<tr data-detail="${det(brut(e.type, e.brut))}"><td><b>${esc(e.type)}</b><br><span class="faint">${esc(e.entree)}</span></td><td>${esc(e.avant)}<br>→ ${esc(e.apres)}</td><td>${etat(e.ton, e.verdict)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></div>`;
}

export function obligationsCarte(D) {
  const top = premierRetenu(D.tours[D.tours.length - 1].data);
  if (!top) return '';
  const o = D.oblig, hs6 = String(top.code).slice(0, 6), p = D.produit;
  let corps = '';
  if (o && o.erreur) corps = `<p class="note-l erreur">${ic('alerte')}${esc(o.erreur)}</p>`;
  else if (o && o !== 'encours') {
    const nonS = (o.obligations || []).filter((x) => !x.sourcee).length;
    corps = `<h4 class="sous-titre">Obligations · ${(o.obligations || []).length}</h4>${(o.obligations || []).map((x) => `<div class="ob"><b>${esc(x.titre)}</b> ${etat(x.sourcee ? 'pret' : 'a_verifier', x.sourcee ? 'texte source fourni' : 'déduite par un modèle, sans texte source')}${x.autorite ? `<br><span class="faint">${esc(x.autorite)}</span>` : ''}${x.source_url ? ` <a href="${urlSure(x.source_url)}" target="_blank" rel="noopener">source</a>` : ''}</div>`).join('') || '<p class="muted">Aucune obligation rendue pour cette route.</p>'}
      ${nonS ? `<p class="faint" style="font-size:12.5px">${nonS} obligation(s) sans texte officiel : des pistes à vérifier.</p>` : ''}
      <h4 class="sous-titre">Droit de douane</h4>${o.droits ? `<div class="ob"><b>${o.droits.taux_min === o.droits.taux_max || o.droits.taux_max == null ? num(o.droits.taux) : num(o.droits.taux_min) + ' à ' + num(o.droits.taux_max)} ${esc(o.droits.unite || '%')}</b> · ${esc(o.droits.nature || '')}<br><span class="faint">${esc(o.droits.version || '')}${o.droits.ligne_exacte_connue === false ? ` · lu sur ${esc(o.droits.lignes_lues)} lignes nationales du ${esc(fmtCode(hs6))}, ligne exacte non établie` : ''}</span></div>` : '<p class="muted">Aucun taux établi.</p>'}
      <h4 class="sous-titre">Coût à l'arrivée</h4>${o.cout ? `<dl class="kv">${(o.cout.composantes || []).map((c) => `<dt>${esc(c.nom)}${c.taux_pct != null ? ' (' + num(c.taux_pct) + ' %)' : ''}</dt><dd>${c.connu ? num(c.montant) + ' ' + esc(o.cout.devise || '') : '<span style="color:var(--warn)">inconnu</span>'}</dd>`).join('')}<dt><b>Total ${o.cout.partiel ? 'partiel' : ''}</b></dt><dd><b>${o.cout.total != null ? num(o.cout.total) + ' ' + esc(o.cout.devise || '') : 'non calculable'}</b></dd></dl>` : '<p class="muted">Non calculé.</p>'}
      ${(o.manquants || []).length ? `<h4 class="sous-titre">Ce qui manque</h4><ul class="restant">${o.manquants.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}`;
  }
  return `<div class="carte"><div class="carte-tete"><h3>Obligations et droits</h3><span class="muted">${drapeau(p.origin)} → ${drapeau(p.dest)}</span></div><div class="carte-corps">
    <p class="muted" style="font-size:13px">Calculés sur le code à six chiffres <span class="code">${esc(fmtCode(hs6))}</span>, qui reste une proposition tant qu'il n'est pas validé.</p>
    <form class="ligne-form" data-form="oblig"><input class="saisie" name="v" type="number" min="0" step="any" placeholder="Valeur en USD (facultatif)"><button class="btn blanc petit" type="submit" ${o === 'encours' ? 'disabled' : ''}>${o === 'encours' ? 'Appel en cours' : 'Interroger'}</button></form>${corps}</div></div>`;
}

const AUTRES = ['FR', 'DE', 'ES', 'IT', 'NL', 'GB', 'US', 'CA', 'JP', 'AU', 'CH', 'KR', 'MX', 'IN'];
export function destinationsCarte(D, det) {
  const reste = AUTRES.filter((c) => c !== D.produit.dest);
  return `<form class="carte" data-form="autres"><div class="carte-tete"><h3>Mêmes pièces, autres destinations</h3></div><div class="carte-corps">
    <p class="muted" style="font-size:13px">Un appel par destination. Chaque ligne dit le niveau réellement obtenu : nomenclature du pays, six chiffres seulement, ou rien.</p>
    <div class="pays-choix">${reste.map((c) => `<label class="chip"><input type="checkbox" name="c" value="${c}" ${['US', 'GB', 'JP', 'CA'].includes(c) ? 'checked' : ''}>${drapeau(c)}${esc(nomPays(c))}</label>`).join('')}</div>
    <button class="btn blanc petit" type="submit">Évaluer ces destinations</button>
    ${D.autres.length ? `<div class="table-cadre" style="margin-top:14px"><table class="t"><thead><tr><th>Destination</th><th>Code</th><th>Niveau obtenu</th><th>Statut</th></tr></thead><tbody>${D.autres.map((o) => `<tr ${o.brut ? `data-detail="${det(brut(nomPays(o.country), o.brut))}"` : ''}><td><span class="pays">${drapeau(o.country)}${esc(nomPays(o.country))}</span></td><td>${o.erreur ? '' : o.top ? `<span class="code">${esc(fmtCode(o.top.code))}</span>` : 'aucun'}</td><td>${o.erreur ? `<span class="faint">${esc(o.erreur)}</span>` : o.top ? (o.top.system === 'hs6' ? 'Six chiffres seulement' : `Nomenclature du pays (${esc(o.top.system)})`) : 'Rien'}</td><td>${o.erreur ? '' : etat((STATUT[o.status] || [0, 'a_verifier'])[1], (STATUT[o.status] || [o.status])[0])}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></form>`;
}
