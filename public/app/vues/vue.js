// Vue d'ensemble : la répartition des lignes à expédier, la carte, les échéances qui
// tombent, et ce qu'une personne doit trancher en premier.
import { esc, ic, etat, pays, argent, nombre, pluriel, rebours, dateHeure, ilYA, nomPays, NIVEAU, vignette } from '../ui.js';
import { carteHtml, brancherCarte } from './carte.js';
import { ouvrir } from './tiroirs.js';
import * as S from '../store.js';
import { enteteEnvois } from './envois-entete.js';
import { zoneNouveau, brancherZone } from '../depot.js';

export const titre = 'Shipments';

// Sans commandes : un état vide sobre, dans la page, avec les deux façons de commencer.
const ILLU = `<svg class="illu" viewBox="0 0 300 220" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="196" cy="104" r="62" stroke-opacity=".5"/><ellipse cx="196" cy="104" rx="26" ry="62" stroke-opacity=".35"/><path d="M134 104h124M144 72h104M144 136h104" stroke-opacity=".35"/>
  <path d="M70 150c40-70 90-96 126-46" stroke-dasharray="4 6" stroke-opacity=".6"/><circle cx="196" cy="104" r="5" fill="currentColor"/>
  <g transform="translate(34 130) rotate(-8)"><path d="M0 18 32 2l32 16v32L32 66 0 50z" fill="#fff"/><path d="m0 18 32 16 32-16M32 34v32"/><path d="m16 10 32 16" stroke-opacity=".5"/></g>
  <g transform="translate(222 26) rotate(10)"><path d="M0 10 18 1l18 9v18L18 37 0 28z" fill="#fff"/><path d="m0 10 18 9 18-9M18 19v18"/></g>
  <circle cx="122" cy="44" r="3" fill="currentColor" stroke="none" opacity=".35"/><circle cx="268" cy="168" r="3" fill="currentColor" stroke="none" opacity=".35"/>
</svg>`;
function accueilVide() {
  const etapes = [
    ['Import', 'A CSV export from Shopify or Etsy. Each line becomes a product and a delivery country.'],
    ['Classify', 'The agent queries the Cleo Legal API, product by product. What it cannot decide becomes a question.'],
    ['Check', "Each country's rules apply to the code selected. Each reason cites its official text."],
  ];
  return `<div class="page entre">
    ${enteteEnvois('envois', 'Every order, checked for its country before it leaves.')}
    ${zoneNouveau()}
    <div class="carte" style="overflow:hidden">
      <div class="accueil-vide"><div><span class="eyebrow">No orders</span><h3 style="margin-top:12px">Import a store's orders. <span>Stamped classifies each product and checks each shipment.</span></h3>
        <p>The same product ships to ten countries, each with its own codes, markings, certificates and duties. Each status shown links back to the rule behind it.</p>
        <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap"><button class="btn noir" data-action="demo">${ic('lecture')}Load the demo store</button><button class="btn blanc" data-action="importer">${ic('import')}Import an export</button></div></div>${ILLU}</div>
      <div class="etapes-vides">${etapes.map(([t, p], n) => `<div><span class="eyebrow">0${n + 1}</span><b>${t}</b><p>${p}</p></div>`).join('')}</div>
    </div>
  </div>`;
}

function repartition(t, ev) {
  const cellule = (n, sous) => `<button data-bouge data-aller="#/commandes?niveau=${n}"><span class="lib"><i class="c-${n}"></i>${NIVEAU[n].long}</span><span class="val"><span data-compte="${t.compte[n]}" data-cle="rep-${n}">${nombre(t.compte[n])}</span><small data-compte="${t.lignes ? Math.round((t.compte[n] / t.lignes) * 100) : 0}" data-cle="pct-${n}" data-format="pct">${t.lignes ? Math.round((t.compte[n] / t.lignes) * 100) : 0}%</small></span><span class="sous">${sous}</span></button>`;
  const pays = (n) => Object.entries(ev.parPays).filter(([, x]) => x.compte[n]).map(([c]) => c);
  const sous = (n) => { const p = pays(n); return p.length ? esc(p.slice(0, 4).map(nomPays).join(', ') + (p.length > 4 ? '…' : '')) : '-'; };
  return `<div class="repartition">${cellule('pret', sous('pret'))}${cellule('a_verifier', sous('a_verifier'))}${cellule('bloque', sous('bloque'))}${cellule('en_attente', t.compte.en_attente ? 'the agent is classifying the products' : 'none pending')}
    <div data-bouge><span class="lib">${ic('euro')}Extra costs identified</span><span class="val"><span data-compte="${t.surcout}" data-cle="surcout" data-format="argent">${argent(t.surcout)}</span></span><span class="sous">${t.evitable ? `<b style="color:var(--ink)" data-compte="${t.evitable}" data-cle="evitable" data-format="argent">${argent(t.evitable)}</b> avoidable before the deadline` : 'fixed duties and increases in force'}</span></div></div>
    <div class="barre">${['pret', 'en_attente', 'a_verifier', 'bloque'].map((n) => `<i class="c-${n}" style="flex-grow:${t.compte[n]}"></i>`).join('')}</div>`;
}

function echeancesHtml(ev) {
  return ev.echeances.map((e) => {
    const R = S.regles().find((r) => r.id === e.regle) || {};
    return `<div class="compte-a-rebours"><div class="k">${R.nature === 'simulation' ? '<span class="tag sim">Simulation</span>' : ''}${ic('horloge')}Takes effect ${esc(dateHeure(e.debut))}${R.heureLocale ? ' · ' + esc(R.heureLocale) : ''}</div>
      <h3>${esc(e.titre)}</h3>
      <div class="horloge" data-rebours="${esc(e.debut)}">${rebours(Date.parse(e.debut) - Date.now())}<small>before the deadline</small></div>
      <p><b><span data-compte="${e.commandes}" data-cle="ech-c-${esc(e.regle)}">${e.commandes}</span> order${e.commandes > 1 ? 's' : ''}</b> affected, <b data-compte="${e.evitable}" data-cle="ech-e-${esc(e.regle)}" data-format="argent">${argent(e.evitable)}</b> in duties avoidable if they ship before then.</p>
      <div class="actions"><button class="btn blanc petit" data-aller="#/commandes?echeance=${esc(e.regle)}">${ic('camion')}View and ship</button><button class="btn texte petit" data-aller="#/veille">The rule</button></div></div>`;
  }).join('');
}

function fluxHtml(s) {
  const enCours = Object.values(s.classifications).filter((c) => c.enCours).length;
  const agent = enCours ? `<div class="agent"><span class="rond"></span><span class="txt">The agent is classifying ${pluriel(enCours, 'product', 'products')}${S.fixes().mode === 'direct' ? ' on the Cleo Legal API' : ''}</span></div>` : '';
  const evts = s.journal.slice(0, 7).map((j) => `<div class="evt"><span class="ic">${ic(j.quoi.startsWith('Simulation') ? 'eclair' : j.quoi.startsWith('Import') ? 'import' : j.quoi.startsWith('Code') ? 'check' : 'questions')}</span><div><b>${esc(j.quoi)}</b><span>${esc(j.par)} · <span data-ilya="${esc(j.le)}">${esc(ilYA(j.le))}</span>${j.sku ? ' · ' + esc(j.sku) : ''}</span></div></div>`).join('');
  return `${agent}<div class="carte"><div class="carte-tete"><h3>Log</h3><span class="muted">signed, timestamped</span></div><div class="carte-corps flux" id="flux">${evts || '<p class="muted">Nothing yet.</p>'}</div></div>`;
}

function prioritesHtml(items, s) {
  if (!items.length) return '<div class="vide" style="padding:28px">' + ic('check') + '<span>Nothing to decide. Every question has an answer.</span></div>';
  const libelle = { question: 'Engine question', validation: 'Code to validate', exigence: 'Document or condition' };
  return items.slice(0, 5).map((it) => {
    const p = s.produits[it.sku] || { nom: it.sku };
    return `<button class="item" data-aller="#/questions?item=${encodeURIComponent(it.cle)}">${vignette({ ...p, sku: it.sku }, 'moyenne')}<div><b>${esc(p.nom)}</b><small>${libelle[it.type]} · ${esc(it.texte)}</small></div><div class="impact"><b>${it.commandes}</b><br>order${it.commandes > 1 ? 's' : ''}</div></button>`;
  }).join('');
}

function destinationsHtml(ev) {
  const rangs = Object.entries(ev.parPays).sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a[1].niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b[1].niveau) || b[1].lignes - a[1].lignes);
  return `<table class="t"><thead><tr><th>Destination</th><th class="num">Lines</th><th>Status</th><th class="num">Extra costs</th></tr></thead><tbody>${rangs.map(([c, x]) => `<tr data-pays="${c}"><td>${pays(c)}</td><td class="num">${x.lignes}</td><td>${etat(x.niveau, x.niveau === 'pret' ? 'All ready' : `${x.compte[x.niveau]} ${NIVEAU[x.niveau].court.toLowerCase()}`)}</td><td class="num">${x.surcout ? argent(x.surcout) : '<span class="faint">-</span>'}</td></tr>`).join('')}</tbody></table>`;
}

export function rendre() {
  const s = S.lire();
  if (!s.lignes.length) return accueilVide();
  const ev = S.evaluation(), t = ev.totaux, items = S.aFaire();
  const nbPays = Object.keys(ev.parPays).length;
  return `<div class="page entre">
    ${enteteEnvois('envois', `<span data-compte="${t.lignes}" data-cle="lignes">${t.lignes}</span> line${t.lignes > 1 ? 's' : ''} to ship to ${pluriel(nbPays, 'country', 'countries')} · ${esc(s.boutique.nom)} (${esc(s.boutique.plateforme)}) · synced <span data-ilya="${esc(s.boutique.synchroLe)}">${esc(ilYA(s.boutique.synchroLe))}</span>`)}
    ${zoneNouveau()}
    ${repartition(t, ev)}
    <div class="grille">
      <div class="carte"><div class="carte-tete"><h2>Shipment map</h2><span class="muted">${ic('globe', 'faint')} click a country</span></div>${carteHtml(ev)}</div>
      <div class="alertes">${echeancesHtml(ev)}${fluxHtml(s)}</div>
    </div>
    <div class="grille2">
      <div class="carte"><div class="carte-tete"><h2>To decide first</h2><button class="btn texte petit" data-aller="#/questions">${pluriel(items.length, 'question', 'questions')}${ic('droite')}</button></div><div class="carte-corps items" style="padding-top:8px">${prioritesHtml(items, s)}</div></div>
      <div class="carte"><div class="carte-tete"><h2>By destination</h2></div><div class="carte-corps" style="padding:12px 0 4px"><div class="dest-table">${destinationsHtml(ev)}</div></div></div>
    </div>
  </div>`;
}

export function brancher(racine) {
  brancherZone(racine);
  const ev = S.lire().lignes.length ? S.evaluation() : null;
  if (ev) brancherCarte(racine, ev, (c) => ouvrir('pays', c));
  racine.querySelectorAll('tr[data-pays]').forEach((tr) => tr.addEventListener('click', () => ouvrir('pays', tr.dataset.pays)));
}
