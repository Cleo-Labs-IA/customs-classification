// Veille réglementaire : les règles suivies, leur texte officiel, et ce qu'elles
// changent pour les commandes en cours. Les simulations sont des annonces fictives,
// signalées comme telles partout où elles produisent un effet.
import { esc, ic, argent, jour, dateHeure, rebours, zones, urlSure, pluriel, nomPays } from '../ui.js';
import { phase, fmtCode } from '../conformite.js';
import * as S from '../store.js';

export const titre = 'Regulatory watch';
let onglet = 'tout';
const ONGLETS = [['tout', 'All'], ['en_vigueur', 'In force'], ['a_venir', 'Upcoming'], ['simulation', 'Simulations']];
const TYPES = { exigence: 'Document or condition', interdiction: 'Ban', droit_additionnel: 'Duty increase', taxe_fixe: 'Fixed duty', info: 'Information' };

// Ce qu'une règle fait aux lignes à expédier.
function impact(r, ev) {
  const touchees = ev.lignes.filter((l) => l.expedition !== 'expediee' && l.etat.raisons.some((x) => x.regle === r.id));
  const raisons = touchees.map((l) => l.etat.raisons.find((x) => x.regle === r.id));
  return {
    produits: new Set(touchees.map((l) => l.sku)).size, lignes: touchees.length,
    bloquees: raisons.filter((x) => x.niveau === 'bloque').length, attente: raisons.filter((x) => x.type === 'exigence').length,
    surcout: raisons.reduce((s, x) => s + (x.surcout || 0), 0), evitable: raisons.reduce((s, x) => s + (x.evitable || 0), 0),
  };
}

function regleHtml(r, ev, maintenant) {
  const ph = phase(r, maintenant), i = impact(r, ev), sim = r.nature === 'simulation';
  const quand = ph === 'a_venir'
    ? `<div class="quand">${esc(dateHeure(r.debut))}<small>in <span class="mono" data-rebours="${esc(r.debut)}">${rebours(Date.parse(r.debut) - maintenant)}</span></small></div>`
    : `<div class="quand">${esc(jour(r.debut))}<small>${sim ? 'published ' + esc(dateHeure(r.publieeLe || r.debut)) : 'in force'}</small></div>`;
  const sh = (r.sh || ['*']).includes('*') ? '<span class="tag contour">all products</span>' : r.sh.map((c) => `<span class="tag contour mono">${esc(c.length >= 6 ? fmtCode(c) : c)}</span>`).join('');
  return `<article class="regle ${sim ? 'sim' : ''}">${quand}<div>
    <div class="meta">${sim ? '<span class="tag sim">Simulation · fictional announcement</span>' : `<span class="tag">${ic('balance')}Official text</span><span class="tag ia">AI summary, to review</span>`}<span class="tag contour">${esc(TYPES[r.effet.type] || r.effet.type)}</span><span class="tag contour">${ic('globe')}${esc(zones(r.juridictions))}${r.origines ? ' · origin ' + esc(r.origines.map(nomPays).join(', ')) : ''}</span>${sh}</div>
    <h3>${esc(r.titre)}</h3><p>${esc(r.resume)}</p>
    <div class="impact-l">${i.lignes ? `<span><b>${pluriel(i.lignes, 'line', 'lines')}</b> to ship, ${pluriel(i.produits, 'product', 'products')}</span>` : '<span>No current order affected</span>'}
      ${i.bloquees ? `<span style="color:var(--bad)"><b style="color:inherit">${i.bloquees}</b> blocked</span>` : ''}${i.attente ? `<span style="color:var(--warn)"><b style="color:inherit">${i.attente}</b> waiting for an answer</span>` : ''}
      ${i.surcout ? `<span>extra cost <b>${argent(i.surcout)}</b></span>` : ''}${i.evitable ? `<span>avoidable <b>${argent(i.evitable)}</b></span>` : ''}
      <span class="espace"></span>${r.exigences ? `<a class="btn texte petit" href="/#/monde?marche=${esc(r.marche)}&famille=${esc(r.famille)}">Read the ${r.exigences.length} quoted text${r.exigences.length === 1 ? '' : 's'}${ic('droite')}</a>` : r.source.url ? `<a class="btn texte petit" href="${urlSure(r.source.url)}" target="_blank" rel="noopener">${esc(r.source.nom.length > 60 ? r.source.nom.slice(0, 58) + '…' : r.source.nom)}${ic('lien')}</a>` : `<span class="faint">${esc(r.source.nom)}</span>`}</div>
  </div></article>`;
}

export function rendre() {
  const ev = S.evaluation(), maintenant = Date.now(), F = S.fixes();
  const toutes = S.regles().filter((r) => phase(r, maintenant) !== 'expiree').sort((a, b) => (b.nature === 'simulation') - (a.nature === 'simulation') || Date.parse(b.debut) - Date.parse(a.debut));
  const garde = { tout: () => true, en_vigueur: (r) => phase(r, maintenant) === 'en_vigueur', a_venir: (r) => phase(r, maintenant) === 'a_venir', simulation: (r) => r.nature === 'simulation' };
  const liste = toutes.filter(garde[onglet]);
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Regulatory watch</h1><p>The texts that apply to your shipments, applied to each product's code. A new rule immediately reruns the check on all current orders.</p></div>
      <div style="display:flex;gap:8px">${S.lire().simulations.length ? `<button class="btn texte" data-action="retirer-sim">${ic('annuler')}Remove simulations</button>` : ''}<button class="btn noir" data-action="simuler">${ic('eclair')}Simulate an announcement</button></div></div>
    <div class="onglets">${ONGLETS.map(([k, l]) => `<button data-onglet="${k}" class="${onglet === k ? 'actif' : ''}">${l}<sup>${toutes.filter(garde[k]).length}</sup></button>`).join('')}</div>
    <div class="source" style="margin:0 0 8px">${ic('info')}<div><b>${pluriel(F.regles.length, 'official text tracked', 'official texts tracked')}, sources checked on ${esc(jour(F.fixeLe || '2026-10-04'))}.</b><br><span class="muted">${esc(F.avertissement)}</span></div></div>
    <div class="chrono">${liste.map((r) => regleHtml(r, ev, maintenant)).join('') || '<div class="vide">No rule in this view.</div>'}</div>
  </div>`;
}

export function brancher(racine, rerendre) {
  racine.addEventListener('click', (e) => {
    const o = e.target.closest('[data-onglet]');
    if (o) { onglet = o.dataset.onglet; rerendre(); }
  });
}
