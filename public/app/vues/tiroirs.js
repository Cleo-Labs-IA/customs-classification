// Tiroirs latéraux : une ligne de commande, un produit, un pays. Chaque raison montre
// d'où elle vient (classification, texte officiel, réponse signée) et le geste possible.
import { esc, ic, etat, pays, nomPays, argent, dateHeure, jour, urlSure, zones, NIVEAU, pluriel, ilYA, vignette, drapeau } from '../ui.js';
import { fmtCode, phase, dansZone } from '../conformite.js';
import * as S from '../store.js';
import { compter } from '../effets.js';

let courant = null;
const regle = (id) => S.regles().find((r) => r.id === id);

function dom() {
  let t = document.querySelector('.tiroir');
  if (t) return t;
  document.body.insertAdjacentHTML('beforeend', '<div class="voile"></div><aside class="tiroir" aria-modal="true" role="dialog"><div class="tiroir-tete"><div class="fil" id="tiroir-fil"></div><button class="icobtn" data-fermer title="Close (Esc)">' + ic('fermer') + '</button></div><div class="tiroir-corps" id="tiroir-corps"></div></aside>');
  t = document.querySelector('.tiroir');
  document.querySelector('.voile').addEventListener('click', fermer);
  t.addEventListener('click', agir);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
  return t;
}
export function fermer() { courant = null; document.querySelector('.tiroir')?.classList.remove('ouvert'); document.querySelector('.voile')?.classList.remove('ouvert'); }
export function ouvrir(type, id) { courant = { type, id }; rafraichir(); }
// Un contenu déjà rendu (détail d'un candidat, d'un fait, réponse brute de l'API).
export function ouvrirContenu(fil, corps) { courant = { type: 'contenu', fil, corps }; rafraichir(); }
export function rafraichir() {
  if (!courant) return;
  const t = dom(), ev = S.evaluation();
  const r = courant.type === 'contenu' ? { fil: courant.fil, corps: courant.corps } : { ligne: ligneHtml, produit: produitHtml, pays: paysHtml }[courant.type](courant.id, ev);
  if (!r) return fermer();
  t.querySelector('#tiroir-fil').innerHTML = r.fil;
  const neuf = !t.classList.contains('ouvert');
  t.querySelector('#tiroir-corps').innerHTML = r.corps;
  compter(t, { depuisZero: neuf });
  t.classList.add('ouvert');
  document.querySelector('.voile').classList.add('ouvert');
}

function agir(e) {
  const b = e.target.closest('button, a');
  if (!b) return;
  if (b.hasAttribute('data-fermer')) return fermer();
  const d = b.dataset;
  if (d.attester) { const [sku, id, v] = d.attester.split('|'); return S.attester(sku, id, v === '1'); }
  if (d.retirer) { const [sku, id] = d.retirer.split('|'); return S.retirerAttestation(sku, id); }
  if (d.devalider) return S.retirerValidation(d.devalider);
  if (d.expedier) return S.expedier([d.expedier]);
  if (d.ouvrir) { const [type, id] = d.ouvrir.split('|'); return ouvrir(type, id); }
  if (d.aller) { fermer(); location.hash = d.aller; }
}

// ---------- une raison ----------
const SOURCES_CLASSIF = { direct: 'Live call to the Cleo Legal API', enregistree: 'Real response from the Cleo Legal API, recorded', illustrative: 'Illustrative response (offline demo)' };
export function sourceClassif(c) {
  if (!c || c.enCours || c.erreur) return '';
  const base = SOURCES_CLASSIF[c.source] || 'Classification engine';
  const det = [c.enregistreeLe && 'on ' + jour(c.enregistreeLe), c.requestId && 'request ' + String(c.requestId).slice(0, 8), c.secondes && String(c.secondes) + ' s'].filter(Boolean).join(' · ');
  return base + (det ? ' · ' + det : '');
}
export function raisonHtml(r, sku, avecActions = true) {
  const R = r.regle ? regle(r.regle) : null, cl = S.lire().classifications[sku];
  const a = R ? S.lire().attestations[`${sku}|${R.id}`] : null;
  let detail = '';
  if (R) detail = `${R.nature === 'simulation' ? '<span class="tag sim">Simulation</span> ' : ''}${esc(R.source.nom)}${R.source.ref ? ', ' + esc(R.source.ref) : ''}${R.exigences ? ` · <a href="/#/monde?marche=${esc(R.marche)}&famille=${esc(R.famille)}">the ${R.exigences.length} quoted text${R.exigences.length === 1 ? '' : 's'}</a>` : R.source.url ? ` · <a href="${urlSure(R.source.url)}" target="_blank" rel="noopener">official text</a>` : ''}`;
  else if (r.type === 'code_valide') detail = esc((S.lire().validations[sku] || {}).motif || '');
  else detail = esc(sourceClassif(cl));
  if (a) detail += `<br>Answer "${a.reponse ? 'yes' : 'no'}" from ${esc(a.par)}, ${esc(ilYA(a.le))}${a.motif ? ': ' + esc(a.motif) : ''}`;
  if (r.sur_code_provisoire) detail += '<br><span style="color:var(--warn)">Applied to a proposed code, not yet validated.</span>';
  let agir = '';
  if (avecActions && r.type === 'exigence') agir = `<div class="agir"><button class="btn blanc petit" data-attester="${esc(sku)}|${esc(r.regle)}|1">${ic('check')}Yes</button><button class="btn rouge petit" data-attester="${esc(sku)}|${esc(r.regle)}|0">No</button></div>`;
  else if (avecActions && a) agir = `<div class="agir"><button class="btn texte petit" data-retirer="${esc(sku)}|${esc(r.regle)}">${ic('annuler')}Remove the answer</button></div>`;
  else if (avecActions && (r.type === 'question' || r.type === 'validation')) agir = `<div class="agir"><button class="btn noir petit" data-aller="#/questions?item=${encodeURIComponent(r.type + ':' + sku)}">${r.type === 'question' ? 'Answer' : 'Choose and validate the code'}${ic('droite')}</button></div>`;
  const icone = { pret: r.type === 'echeance' ? 'horloge' : r.type === 'surcout' ? 'euro' : r.type === 'info' ? 'info' : 'check', a_verifier: 'alerte', bloque: 'stop', en_attente: 'agent' }[r.niveau];
  return `<div class="raison-l ${r.niveau}"><div class="ic">${ic(icone)}</div><div><b>${esc(r.texte)}</b>${detail ? `<small>${detail}</small>` : ''}${agir}</div></div>`;
}

// ---------- ligne de commande ----------
function lienDossier(p, paysDest) {
  return '/#/dossier?' + new URLSearchParams({ sku: p.sku, dest: paysDest });
}
function ligneHtml(id, ev) {
  const l = ev.lignes.find((x) => x.id === id);
  if (!l) return null;
  const p = S.lire().produits[l.sku] || { sku: l.sku, nom: l.produit }, e = l.etat;
  const raisons = [...e.raisons].sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a.niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b.niveau));
  return {
    fil: `Orders ${ic('droite')} <b>${esc(l.commande)}</b>`,
    corps: `<div style="display:flex;gap:8px;align-items:center;margin-top:6px">${etat(e.niveau, l.expedition === 'expediee' ? 'Shipped' : null)}${l.simulee ? '<span class="tag sim">Simulated order</span>' : ''}</div>
      <h2>${esc(p.nom)}</h2>
      <div class="muted" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${pays(l.pays)}<span>·</span><span>${esc(l.client || 'customer not provided')}</span>${l.date ? `<span>·</span><span>${esc(l.date.slice(0, 16))}</span>` : ''}</div>
      <h4>Why this status</h4><div class="raisons">${raisons.map((r) => raisonHtml(r, l.sku)).join('')}</div>
      <h4>Order line</h4>
      <dl class="kv"><dt>Product</dt><dd><button class="btn texte petit" style="padding:0;height:auto" data-ouvrir="produit|${esc(l.sku)}">${esc(p.nom)} <span class="mono faint">${esc(l.sku)}</span></button></dd>
        <dt>Quantity</dt><dd>${l.quantite} × ${argent(l.prixUnitaire, l.devise, true)} = <b>${argent(e.valeur, l.devise, true)}</b></dd>
        <dt>Code selected</dt><dd>${e.code ? `<span class="code ${e.provisoire ? 'provisoire' : ''}">${esc(fmtCode(e.code))}</span> ${e.provisoire ? '<span class="muted">proposed, not validated</span>' : '<span class="muted">validated</span>'}` : '<span class="muted">none yet</span>'}</dd>
        <dt>Route</dt><dd>${esc(nomPays(l.origine))} → ${esc(nomPays(l.pays))}</dd>
        ${e.surcout ? `<dt>Extra costs identified</dt><dd><b>${argent(e.surcout, l.devise, true)}</b></dd>` : ''}
        ${e.evitable ? `<dt>Avoidable</dt><dd><b>${argent(e.evitable, l.devise, true)}</b> by shipping before the deadline</dd>` : ''}</dl>
      <div style="display:flex;gap:8px;margin-top:22px;flex-wrap:wrap">
        ${l.expedition === 'expediee' ? `<span class="muted">Shipped ${esc(l.expedieeLe ? dateHeure(l.expedieeLe) : '')}</span>` : `<button class="btn noir" data-expedier="${esc(l.id)}" ${e.niveau !== 'pret' ? 'disabled title="Only ready lines ship"' : ''}>${ic('camion')}Mark as shipped</button>`}
        <a class="btn blanc" href="${esc(lienDossier(p, l.pays))}">${ic('dossier')}Open the classification file</a>
      </div>`,
  };
}

// ---------- produit ----------
function produitHtml(sku, ev) {
  const s = S.lire(), p = s.produits[sku];
  if (!p) return null;
  const cl = s.classifications[sku], v = s.validations[sku], q = ev.parProduit[sku];
  const lignes = ev.lignes.filter((l) => l.sku === sku && l.expedition !== 'expediee');
  const parPays = {};
  for (const l of lignes) { const x = (parPays[l.pays] ||= { niveau: 'pret', n: 0, l }); x.n++; if (['pret', 'en_attente', 'a_verifier', 'bloque'].indexOf(l.etat.niveau) > ['pret', 'en_attente', 'a_verifier', 'bloque'].indexOf(x.niveau)) { x.niveau = l.etat.niveau; x.l = l; } }
  const code = v ? v.hs6 : cl && cl.code;
  const candidats = (cl && cl.candidats) || [];
  const journal = s.journal.filter((j) => j.sku === sku).slice(0, 8);
  return {
    fil: `Products ${ic('droite')} <b class="mono">${esc(sku)}</b>`,
    corps: `<div style="display:flex;gap:12px;align-items:center;margin-top:8px">${vignette(p, 'grande')}<div class="muted" style="font-size:13px">${esc(p.description)}<br>Origin: ${esc(nomPays(p.origine))}</div></div>
      <h2>${esc(p.nom)}</h2>
      <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-top:12px">
        ${code ? `<span class="grand-code">${esc(fmtCode(code))}</span>` : cl && cl.enCours ? '<span class="agent"><span class="rond"></span>Classification in progress</span>' : '<span class="muted">No code</span>'}
        ${v ? `<span class="tag" style="background:var(--ok-bg);color:var(--ok)">${ic('check')}Validated by ${esc(v.par)}</span>` : cl && cl.code ? '<span class="tag" style="background:var(--warn-bg);color:var(--warn)">Proposed, to validate</span>' : ''}
      </div>
      ${cl && cl.titre ? `<p class="muted" style="margin-top:8px;font-size:13px">${esc(cl.titre)}</p>` : ''}
      ${cl && !cl.enCours ? `<p class="faint" style="margin-top:6px;font-size:12px">${esc(sourceClassif(cl))}${cl.erreur ? ' · ' + esc(cl.erreur) : ''}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        ${!v && cl && (cl.statut === 'classified' || cl.statut === 'ambiguous' || cl.statut === 'needs_review') ? `<button class="btn noir petit" data-aller="#/questions?item=${encodeURIComponent('validation:' + sku)}">Choose and validate the code${ic('droite')}</button>` : ''}
        ${cl && cl.statut === 'needs_information' && !v ? `<button class="btn noir petit" data-aller="#/questions?item=${encodeURIComponent('question:' + sku)}">Answer the question${ic('droite')}</button>` : ''}
        ${v ? `<button class="btn texte petit" data-devalider="${esc(sku)}">${ic('annuler')}Remove the validation</button>` : ''}
        <a class="btn blanc petit" href="${esc(lienDossier(p, Object.keys(parPays)[0] || 'FR'))}">${ic('dossier')}Full file</a>
      </div>
      <h4>By destination ${q ? '· ' + pluriel(q.lignes, 'line to ship', 'lines to ship') : ''}</h4>
      <div class="raisons">${Object.entries(parPays).sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a[1].niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b[1].niveau)).map(([c, x]) => `<button class="raison-l ${x.niveau}" style="text-align:left;width:100%" data-ouvrir="ligne|${esc(x.l.id)}"><div class="ic">${ic({ pret: 'check', a_verifier: 'alerte', bloque: 'stop', en_attente: 'agent' }[x.niveau])}</div><div><b>${esc(nomPays(c))} · ${x.n} line${x.n > 1 ? 's' : ''}</b><small>${esc(x.l.etat.principale.texte)}</small></div></button>`).join('') || '<p class="muted">No lines to ship.</p>'}</div>
      ${candidats.length ? `<h4>Candidates returned by the engine</h4><div class="raisons">${candidats.map((c) => `<div class="raison-l ${c.ecarte ? '' : 'pret'}" style="${c.ecarte ? 'opacity:.7' : ''}"><div class="ic">${ic(c.ecarte ? 'fermer' : 'check')}</div><div><b><span class="code">${esc(fmtCode(c.code))}</span>${c.confiance != null ? ` <span class="faint mono" style="font-size:12px">confidence ${String(c.confiance)}</span>` : ''}</b><small>${esc(c.titre)}${c.ecarte ? '<br>Set aside: ' + esc(c.ecarte) : c.justification ? '<br>' + esc(c.justification) : ''}</small></div></div>`).join('')}</div>` : ''}
      ${journal.length ? `<h4>Log</h4><div class="journal">${journal.map((j) => `<div><span>${esc(j.quoi)}<small>${esc(j.par)} · ${esc(dateHeure(j.le))}</small></span></div>`).join('')}</div>` : ''}`,
  };
}

// ---------- pays ----------
function paysHtml(code, ev) {
  const x = ev.parPays[code];
  if (!x) return null;
  const lignes = ev.lignes.filter((l) => l.pays === code && l.expedition !== 'expediee').sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a.etat.niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b.etat.niveau));
  const R = S.regles().filter((r) => dansZone(code, r.juridictions) && phase(r, Date.now()) !== 'expiree');
  return {
    fil: `Destinations ${ic('droite')} <b>${esc(nomPays(code))}</b>`,
    corps: `<div style="margin-top:6px">${etat(x.niveau, x.niveau === 'pret' ? 'All ready' : NIVEAU[x.niveau].long)}</div>
      <h2 style="display:flex;align-items:center;gap:12px">${drapeau(code, 'grand')}${esc(nomPays(code))}</h2>
      <div class="repartition" style="grid-template-columns:repeat(3,1fr);margin-top:14px">${['pret', 'a_verifier', 'bloque'].map((n) => `<div><span class="lib"><i class="c-${n}"></i>${NIVEAU[n].long}</span><span class="val"><span data-compte="${x.compte[n]}">${x.compte[n]}</span></span></div>`).join('')}</div>
      ${x.surcout || x.evitable ? `<p class="muted">Extra costs identified: <b style="color:var(--ink)">${argent(x.surcout)}</b>${x.evitable ? ` · avoidable before the deadline: <b style="color:var(--ink)">${argent(x.evitable)}</b>` : ''}</p>` : ''}
      <h4>Lines to ship</h4>
      <div class="raisons">${lignes.map((l) => `<button class="raison-l ${l.etat.niveau}" style="text-align:left;width:100%" data-ouvrir="ligne|${esc(l.id)}"><div class="ic">${ic({ pret: 'check', a_verifier: 'alerte', bloque: 'stop', en_attente: 'agent' }[l.etat.niveau])}</div><div><b><span class="mono" style="font-weight:500">${esc(l.commande)}</span> · ${esc((S.lire().produits[l.sku] || {}).nom || l.produit)}</b><small>${esc(l.etat.principale.texte)}</small></div></button>`).join('')}</div>
      <h4>Rules tracked for this country · ${R.length}</h4>
      <div class="raisons">${R.map((r) => `<div class="raison-l"><div class="ic">${ic(r.nature === 'simulation' ? 'eclair' : 'balance')}</div><div><b>${esc(r.titre)}</b><small>${r.nature === 'simulation' ? '<span class="tag sim">Simulation</span> ' : ''}${esc(zones(r.juridictions))} · ${phase(r, Date.now()) === 'a_venir' ? 'from ' + esc(dateHeure(r.debut)) : 'in force since ' + esc(jour(r.debut))}${r.source.url ? ` · <a href="${urlSure(r.source.url)}" target="_blank" rel="noopener">official text</a>` : ''}</small></div></div>`).join('')}</div>
      <div style="margin-top:20px"><button class="btn blanc" data-aller="#/commandes?pays=${esc(code)}">View orders to this country${ic('droite')}</button></div>`,
  };
}
