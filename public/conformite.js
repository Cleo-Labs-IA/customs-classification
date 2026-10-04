// Market-access work list: turns the encoded requirements (public/data/exigences.json)
// into work for one product and one sale. Rendering only: the rules are data and the
// logic is in exigences-moteur.js. The host page owns the state object and the drawer.
//
// state = { valeurs: { <critere>: { valeur, kind: 'pieces' | 'reponse', citation?, source? } }, declarees: [evidence ids] }
import { evaluerExigences } from './exigences-moteur.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https:\/\//.test(String(u || '')) ? esc(u) : '#');

export const CSS = `
.cf{cursor:default}
.cf .sum{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0 4px}
.cf .sum div b{display:block;font-size:20px;font-family:var(--mono)}
.cf .sum div span{font-size:12px;color:var(--g5)}
.cf .req{border:1px solid var(--rule);border-radius:9px;margin-top:10px;overflow:hidden;background:#fff}
.cf .req>.h{padding:9px 11px;display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap}
.cf .req>.h b{font-size:14px}
.cf .req .row{display:grid;grid-template-columns:104px minmax(0,1fr);gap:10px;padding:7px 11px;font-size:13px;border-top:1px solid var(--rule)}
.cf .req .row>span:first-child{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--g5);padding-top:2px}
.cf .ev{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0;flex-wrap:wrap}
.cf .ev+.ev{border-top:1px dashed var(--rule)}
.cf .lnk{border:0;background:transparent;color:var(--ink);cursor:pointer;padding:0;text-decoration:underline;font-size:12.5px}
.cf .ask{border:1px solid var(--warn);background:var(--warn-bg);border-radius:9px;padding:10px 12px;margin-top:10px}
.cf .ask .opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
.cf .ask .opts button{border:1px solid var(--warn);background:#fff;border-radius:7px;padding:5px 10px;cursor:pointer;font-size:13px}
.cf .ask .opts button:hover{border-color:var(--ink)}
.cf .na{font-size:12.5px;color:var(--g5);margin-top:10px}
.tri{display:grid;gap:8px;margin-top:8px;font-size:12.5px}
.tri div{border-radius:7px;padding:7px 9px;background:var(--off-bg)}
.tri div.c{background:var(--warn-bg)}
.tri div.x{background:#fff;border:1px dashed var(--rule)}
.tri b{display:block;margin-bottom:2px}
.tri ul{padding-left:16px}
`;

// What a photo can and cannot establish. The third list is fixed: no reading of a picture changes it.
const NOT_FROM_PHOTO = ['The customs origin of the product', 'Which tests were carried out, and by whom', 'Whether the product actually conforms', 'Who the legal manufacturer is, when it is not printed', 'The exact model, when the reference is not legible'];
export function photoTriage(photo) {
  if (!photo) return '';
  const lus = photo.lignes || [], non = photo.illisible || [];
  return `<div class="tri">
    <div><b>Observed on the photo (${lus.length} line${lus.length === 1 ? '' : 's'})</b>${lus.length ? esc(lus.slice(0, 6).join(' · ')) + (lus.length > 6 ? ' …' : '') : 'Nothing could be read.'}</div>
    <div class="c"><b>To confirm (${non.length + (photo.reference ? 0 : 1)})</b><ul>${non.map((x) => `<li>${esc(x)}</li>`).join('')}${photo.reference ? '' : '<li>The model reference: none was read on the label.</li>'}</ul>${non.length ? 'A close-up photo of the rating label would settle these.' : ''}</div>
    <div class="x"><b>Cannot be deduced from a photo</b><ul>${NOT_FROM_PHOTO.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  </div>`;
}

const brTxt = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === true ? 'Yes' : 'No');
const vals = (state) => Object.fromEntries(Object.entries(state.valeurs).map(([k, x]) => [k, x.valeur]));
export const evaluer = (data, state, etiquette) => evaluerExigences(data, { valeurs: vals(state), etiquette, declarees: state.declarees });

const EV = { vu_sur_etiquette: ['Seen on the label', 'warn'], declaree: ['Declared held, not checked', 'warn'], manquante: ['Missing', 'bad'] };

// detail(html) registers a drawer and returns its index (host page convention: data-d="<index>").
export function conformiteHtml(data, textes, state, { etiquette = [], destination, detail, locked = false, srcLabel = (s) => s } = {}) {
  if (!data) return '';
  const head = '<div class="link"></div>';
  if (destination !== data.marche) return head + `<div class="node static cf"><div class="k">Market access requirements</div><div class="s">Requirements are encoded for one market so far: ${esc(data.marche)}. Nothing is shown for another destination rather than guessed.</div></div>`;
  const C = Object.fromEntries(data.criteres.map((c) => [c.id, c])), T = Object.fromEntries((textes || []).map((t) => [t.id, t]));
  const R = Object.fromEntries((data.roles || []).map((r) => [r.id, r])), res = evaluer(data, state, etiquette);
  const txt = (id, label) => { const t = T[id]; return t ? `<button type="button" class="lnk" data-d="${detail(`<h3>${esc(t.ref)}</h3><p class="muted">${esc(t.source || '')} · <a href="${safeUrl(t.url)}" target="_blank" rel="noopener">official text</a></p><blockquote>${esc(t.texte)}</blockquote>`)}">${esc(label || t.ref)}</button>` : esc(id); };
  const fact = (id) => { const c = C[id], f = state.valeurs[id]; if (!c || !f) return ''; return `<div>${esc(c.question)} <b>${esc(brTxt(c, f.valeur))}</b> <span class="muted">${f.kind === 'reponse' ? '· answered by the seller, no document' : `· “${esc(f.citation)}” (${esc(srcLabel(f.source))})`}</span></div>`; };
  const condIds = (cond) => [...((cond && cond.tous) || []), ...((cond && cond.aucun) || [])].map((x) => x.critere);

  // questions still open, the seller's ones first
  const ask = res.questions.map((id) => C[id]).filter(Boolean).sort((a, b) => (a.source === 'projet' ? 0 : 1) - (b.source === 'projet' ? 0 : 1));
  const askHtml = ask.length && !locked ? `<div class="ask"><div class="k">${ask.length} fact${ask.length === 1 ? '' : 's'} still needed to decide what applies</div>${ask.slice(0, 3).map((c) => `<div style="margin-top:8px"><b>${esc(c.question)}</b>${c.aide ? `<div class="muted" style="font-size:12.5px">${esc(c.aide)}</div>` : ''}<div class="opts">${(c.type === 'bool' ? [['oui', 'Yes'], ['non', 'No']] : (c.valeurs || []).map((x) => [x.v, x.libelle || x.v])).map(([v, l]) => `<button type="button" data-cq="${esc(c.id)}:${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`).join('')}${ask.length > 3 ? `<div class="hint" style="margin-top:8px">${ask.length - 3} more after these.</div>` : ''}</div>` : '';

  const role = res.role.role ? R[res.role.role] : null;
  const roleHtml = role
    ? `<div class="req"><div class="h"><b>Your role: ${esc(role.libelle)}</b><span class="muted">${(role.base || []).map((b) => txt(b)).join(' · ')}</span></div><div class="row"><span>Why</span><span>${esc(role.pourquoi || '')}${condIds(role.si).map(fact).join('')}</span></div></div>`
    : `<div class="req"><div class="h"><b>Your role is not established yet</b></div><div class="row"><span>Why</span><span>The duties below depend on whether you act as manufacturer, importer or distributor. Answer the questions above.</span></div></div>`;

  const D = Object.fromEntries(data.exigences.map((e) => [e.id, e]));
  const applicable = res.lignes.filter((l) => l.etat === 'applicable').map((l) => {
    const e = D[l.id], O = Object.fromEntries(e.obligations.map((o) => [o.id, o]));
    const duties = l.obligations.map((lo) => {
      const o = O[lo.id], P = Object.fromEntries(o.preuves.map((p) => [p.id, p]));
      return `<div class="row"><span>Duty</span><span>${esc(o.resume)} ${txt(o.texte)}</span></div>
        <div class="row"><span>Evidence</span><span>${lo.preuves.map((lp) => { const p = P[lp.id], v = EV[lp.etat]; return `<div class="ev"><span>${esc(p.libelle)}${lp.etat === 'vu_sur_etiquette' ? ` <span class="muted">(“${esc(lp.ligne)}”: a visible marking is not proof of conformity)</span>` : ''}</span><span><span class="tag ${v[1]}">${v[0]}</span>${p.type !== 'marquage' && !locked ? ` <button type="button" class="lnk" data-have="${esc(p.id)}">${lp.etat === 'declaree' ? 'I do not hold it' : 'I hold this'}</button>` : ''}</span></div>`; }).join('')}</span></div>
        <div class="row"><span>Who acts</span><span>${esc(o.qui_agit)}</span></div>`;
    }).join('');
    return `<div class="req"><div class="h"><b>${esc(e.titre)}</b><a href="${safeUrl(e.acte && e.acte.url)}" target="_blank" rel="noopener" style="font-size:12.5px">${esc((e.acte && e.acte.nom) || '')}</a></div>
      <div class="row"><span>Why you</span><span>${esc(e.pourquoi)} ${(e.base || []).map((b) => txt(b)).join(' · ')}${condIds(e.applicable_si).map(fact).join('')}</span></div>
      ${role ? duties || `<div class="row"><span>Duty</span><span class="muted">No duty is encoded for a ${esc(role.libelle.toLowerCase())} under this act.</span></div>` : '<div class="row"><span>Duty</span><span class="muted">Shown once your role is established.</span></div>'}</div>`;
  }).join('');
  const pending = res.lignes.filter((l) => l.etat === 'a_determiner');
  const na = res.lignes.filter((l) => l.etat === 'non_applicable');
  const b = res.bilan;
  return head + `<div class="node static cf"><div class="k">Market access requirements · ${esc(data.marche)}</div>
    <div class="ver muted" style="font-size:12px">${esc(data.titre || '')}. Encoded from the official texts cited on each line, drafted by AI, not reviewed by a compliance lawyer. It lists the work to do; it never says a product is compliant.</div>
    <div class="sum"><div><b>${b.applicables}</b><span>requirements apply</span></div><div><b>${b.a_determiner}</b><span>still to determine</span></div><div><b>${b.preuves_manquantes}</b><span>evidence items missing</span></div><div><b>${b.preuves_declarees}</b><span>declared, not checked</span></div><div><b>${b.marquages_vus}</b><span>markings seen on the label</span></div></div>
    ${askHtml}${roleHtml}${applicable}
    ${pending.length ? `<div class="na"><b>Cannot be decided yet:</b> ${pending.map((l) => esc(D[l.id].titre)).join(' · ')}.</div>` : ''}
    ${na.length ? `<div class="na"><b>Not applicable on the facts given:</b> ${na.map((l) => esc(D[l.id].titre)).join(' · ')}.</div>` : ''}</div>`;
}

// Click handling for the block. Returns true when the click was for this module.
export function onClick(e, data, state) {
  const q = e.target.closest('[data-cq]');
  if (q) { const [k, v] = q.dataset.cq.split(':'), c = data.criteres.find((x) => x.id === k); state.valeurs[k] = { valeur: c.type === 'bool' ? v === 'oui' : v, kind: 'reponse' }; return true; }
  const h = e.target.closest('[data-have]');
  if (h) { const id = h.dataset.have, i = state.declarees.indexOf(id); if (i < 0) state.declarees.push(id); else state.declarees.splice(i, 1); return true; }
  return false;
}

// What goes into the readable file.
export function conformiteDossier(data, state, etiquette) {
  if (!data) return null;
  const res = evaluer(data, state, etiquette), D = Object.fromEntries(data.exigences.map((e) => [e.id, e]));
  return { marche: data.marche, role: res.role.role, bilan: res.bilan,
    exigences: res.lignes.filter((l) => l.etat === 'applicable').map((l) => ({ titre: D[l.id].titre, acte: D[l.id].acte, obligations: l.obligations.map((o) => { const od = D[l.id].obligations.find((x) => x.id === o.id); return { resume: od.resume, qui_agit: od.qui_agit, preuves: o.preuves.map((p) => ({ libelle: od.preuves.find((x) => x.id === p.id).libelle, etat: p.etat })) }; }) })),
    a_determiner: res.lignes.filter((l) => l.etat === 'a_determiner').map((l) => D[l.id].titre) };
}
