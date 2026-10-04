// Vue d'ensemble : la répartition des lignes à expédier, la carte, les échéances qui
// tombent, et ce qu'une personne doit trancher en premier.
import { esc, ic, etat, pays, argent, nombre, pluriel, rebours, dateHeure, ilYA, nomPays, NIVEAU, vignette } from '../ui.js';
import { carteHtml, brancherCarte } from './carte.js';
import { ouvrir } from './tiroirs.js';
import * as S from '../store.js';
import * as E from '../dossier/etat.js';
import { estImage } from '../dossier/photo.js';

export const titre = "Vue d'ensemble";

// Dès la première vue : classer un produit à partir d'une image, d'une adresse ou d'un texte.
function depotRapide() {
  return `<form class="carte depot-rapide" id="depot-rapide" data-form="rapide">
    <span class="depot-ic">${ic('agent')}</span>
    <div class="depot-texte"><b>Classer un produit</b><span>Déposez une photo, une étiquette ou un pictogramme, ou collez l'adresse d'une fiche produit.</span></div>
    <div class="depot-champ"><input id="rapide" placeholder="https://… ou une description" autocomplete="off" aria-label="Adresse d'une fiche produit ou description">
      <label class="btn blanc petit" title="Choisir une image">${ic('fichier')}<span>Image</span><input type="file" accept="image/*,.heic,.heif" class="sr" id="rapide-photo"></label>
      <button class="btn noir petit" type="submit">Classer${ic('droite')}</button></div>
  </form>`;
}
function vers(entree) { E.preparer(entree); location.hash = '#/dossier'; }

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
    ['Importer', "Un export CSV de Shopify ou d'Etsy. Chaque ligne devient un produit et un pays de livraison."],
    ['Classer', "L'agent interroge la Cleo Legal API, produit par produit. Ce qu'il ne peut pas trancher devient une question."],
    ['Vérifier', 'Les règles de chaque pays s\'appliquent au code retenu. Chaque raison cite son texte officiel.'],
  ];
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Conformité des envois</h1><p>Chaque commande, vérifiée pour son pays avant de partir.</p></div></div>
    ${depotRapide()}
    <div class="carte" style="overflow:hidden">
      <div class="accueil-vide"><div><span class="eyebrow">Aucune commande</span><h3 style="margin-top:12px">Importez les commandes d'une boutique. <span>Stamped classe chaque produit et vérifie chaque envoi.</span></h3>
        <p>Le même produit part vers dix pays, chacun avec ses codes, ses marquages, ses certificats et ses droits. Chaque statut affiché renvoie à la règle qui le fonde.</p>
        <div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap"><button class="btn noir" data-action="demo">${ic('lecture')}Charger la boutique de démonstration</button><button class="btn blanc" data-action="importer">${ic('import')}Importer un export</button></div></div>${ILLU}</div>
      <div class="etapes-vides">${etapes.map(([t, p], n) => `<div><span class="eyebrow">0${n + 1}</span><b>${t}</b><p>${p}</p></div>`).join('')}</div>
    </div>
  </div>`;
}

function repartition(t, ev) {
  const cellule = (n, sous) => `<button data-bouge data-aller="#/commandes?niveau=${n}"><span class="lib"><i class="c-${n}"></i>${NIVEAU[n].long}</span><span class="val"><span data-compte="${t.compte[n]}" data-cle="rep-${n}">${nombre(t.compte[n])}</span><small data-compte="${t.lignes ? Math.round((t.compte[n] / t.lignes) * 100) : 0}" data-cle="pct-${n}" data-format="pct">${t.lignes ? Math.round((t.compte[n] / t.lignes) * 100) : 0} %</small></span><span class="sous">${sous}</span></button>`;
  const pays = (n) => Object.entries(ev.parPays).filter(([, x]) => x.compte[n]).map(([c]) => c);
  const sous = (n) => { const p = pays(n); return p.length ? esc(p.slice(0, 4).map(nomPays).join(', ') + (p.length > 4 ? '…' : '')) : '—'; };
  return `<div class="repartition">${cellule('pret', sous('pret'))}${cellule('a_verifier', sous('a_verifier'))}${cellule('bloque', sous('bloque'))}${cellule('en_attente', t.compte.en_attente ? 'l\'agent classe les produits' : 'aucune en attente')}
    <div data-bouge><span class="lib">${ic('euro')}Surcoûts identifiés</span><span class="val"><span data-compte="${t.surcout}" data-cle="surcout" data-format="argent">${argent(t.surcout)}</span></span><span class="sous">${t.evitable ? `<b style="color:var(--ink)" data-compte="${t.evitable}" data-cle="evitable" data-format="argent">${argent(t.evitable)}</b> évitables avant échéance` : 'droits fixes et hausses en vigueur'}</span></div></div>
    <div class="barre">${['pret', 'en_attente', 'a_verifier', 'bloque'].map((n) => `<i class="c-${n}" style="flex-grow:${t.compte[n]}"></i>`).join('')}</div>`;
}

function echeancesHtml(ev) {
  return ev.echeances.map((e) => {
    const R = S.regles().find((r) => r.id === e.regle) || {};
    return `<div class="compte-a-rebours"><div class="k">${R.nature === 'simulation' ? '<span class="tag sim">Simulation</span>' : ''}${ic('horloge')}Entrée en vigueur ${esc(dateHeure(e.debut))}${R.heureLocale ? ' · ' + esc(R.heureLocale) : ''}</div>
      <h3>${esc(e.titre)}</h3>
      <div class="horloge" data-rebours="${esc(e.debut)}">${rebours(Date.parse(e.debut) - Date.now())}<small>avant l'échéance</small></div>
      <p><b><span data-compte="${e.commandes}" data-cle="ech-c-${esc(e.regle)}">${e.commandes}</span> commande${e.commandes > 1 ? 's' : ''}</b> concernée${e.commandes > 1 ? 's' : ''}, <b data-compte="${e.evitable}" data-cle="ech-e-${esc(e.regle)}" data-format="argent">${argent(e.evitable)}</b> de droits évitables si elles partent avant.</p>
      <div class="actions"><button class="btn blanc petit" data-aller="#/commandes?echeance=${esc(e.regle)}">${ic('camion')}Voir et expédier</button><button class="btn texte petit" data-aller="#/veille">La règle</button></div></div>`;
  }).join('');
}

function fluxHtml(s) {
  const enCours = Object.values(s.classifications).filter((c) => c.enCours).length;
  const agent = enCours ? `<div class="agent"><span class="rond"></span><span class="txt">L'agent classe ${pluriel(enCours, 'produit', 'produits')}${S.fixes().mode === 'direct' ? ' sur la Cleo Legal API' : ''}</span></div>` : '';
  const evts = s.journal.slice(0, 7).map((j) => `<div class="evt"><span class="ic">${ic(j.quoi.startsWith('Simulation') ? 'eclair' : j.quoi.startsWith('Import') ? 'import' : j.quoi.startsWith('Code') ? 'check' : 'questions')}</span><div><b>${esc(j.quoi)}</b><span>${esc(j.par)} · <span data-ilya="${esc(j.le)}">${esc(ilYA(j.le))}</span>${j.sku ? ' · ' + esc(j.sku) : ''}</span></div></div>`).join('');
  return `${agent}<div class="carte"><div class="carte-tete"><h3>Journal</h3><span class="muted">signé, horodaté</span></div><div class="carte-corps flux" id="flux">${evts || '<p class="muted">Rien encore.</p>'}</div></div>`;
}

function prioritesHtml(items, s) {
  if (!items.length) return '<div class="vide" style="padding:28px">' + ic('check') + '<span>Rien à trancher. Toutes les questions ont une réponse.</span></div>';
  const libelle = { question: 'Question du moteur', validation: 'Code à valider', exigence: 'Pièce ou condition' };
  return items.slice(0, 5).map((it) => {
    const p = s.produits[it.sku] || { nom: it.sku };
    return `<button class="item" data-aller="#/questions?item=${encodeURIComponent(it.cle)}">${vignette({ ...p, sku: it.sku }, 'moyenne')}<div><b>${esc(p.nom)}</b><small>${libelle[it.type]} · ${esc(it.texte)}</small></div><div class="impact"><b>${it.commandes}</b><br>commande${it.commandes > 1 ? 's' : ''}</div></button>`;
  }).join('');
}

function destinationsHtml(ev) {
  const rangs = Object.entries(ev.parPays).sort((a, b) => ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(a[1].niveau) - ['bloque', 'a_verifier', 'en_attente', 'pret'].indexOf(b[1].niveau) || b[1].lignes - a[1].lignes);
  return `<table class="t"><thead><tr><th>Destination</th><th class="num">Lignes</th><th>État</th><th class="num">Surcoûts</th></tr></thead><tbody>${rangs.map(([c, x]) => `<tr data-pays="${c}"><td>${pays(c)}</td><td class="num">${x.lignes}</td><td>${etat(x.niveau, x.niveau === 'pret' ? 'Tout est prêt' : `${x.compte[x.niveau]} ${NIVEAU[x.niveau].court.toLowerCase()}${x.compte[x.niveau] > 1 && x.niveau !== 'en_attente' ? 's' : ''}`)}</td><td class="num">${x.surcout ? argent(x.surcout) : '<span class="faint">—</span>'}</td></tr>`).join('')}</tbody></table>`;
}

export function rendre() {
  const s = S.lire();
  if (!s.lignes.length) return accueilVide();
  const ev = S.evaluation(), t = ev.totaux, items = S.aFaire();
  const nbPays = Object.keys(ev.parPays).length;
  return `<div class="page entre">
    <div class="titre"><div class="bloc"><h1>Conformité des envois</h1><p><span data-compte="${t.lignes}" data-cle="lignes">${t.lignes}</span> ligne${t.lignes > 1 ? 's' : ''} à expédier vers ${pluriel(nbPays, 'pays', 'pays')} · ${esc(s.boutique.nom)} (${esc(s.boutique.plateforme)}) · synchronisée <span data-ilya="${esc(s.boutique.synchroLe)}">${esc(ilYA(s.boutique.synchroLe))}</span></p></div></div>
    ${depotRapide()}
    ${repartition(t, ev)}
    <div class="grille">
      <div class="carte"><div class="carte-tete"><h2>Carte des envois</h2><span class="muted">${ic('globe', 'faint')} cliquez un pays</span></div>${carteHtml(ev)}</div>
      <div class="alertes">${echeancesHtml(ev)}${fluxHtml(s)}</div>
    </div>
    <div class="grille2">
      <div class="carte"><div class="carte-tete"><h2>À trancher en priorité</h2><button class="btn texte petit" data-aller="#/questions">${pluriel(items.length, 'question', 'questions')}${ic('droite')}</button></div><div class="carte-corps items" style="padding-top:8px">${prioritesHtml(items, s)}</div></div>
      <div class="carte"><div class="carte-tete"><h2>Par destination</h2></div><div class="carte-corps" style="padding:12px 0 4px"><div class="dest-table">${destinationsHtml(ev)}</div></div></div>
    </div>
  </div>`;
}

function brancherDepot(racine) {
  const f = racine.querySelector('#depot-rapide');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = f.querySelector('#rapide').value.trim();
    if (v) vers(/^https?:\/\//i.test(v) ? { adresse: v } : { texte: v });
    else f.querySelector('#rapide').focus();
  });
  f.querySelector('#rapide-photo').addEventListener('change', (e) => { if (e.target.files[0]) vers({ fichier: e.target.files[0] }); });
  f.addEventListener('dragover', (e) => { e.preventDefault(); f.classList.add('survol'); });
  f.addEventListener('dragleave', () => f.classList.remove('survol'));
  f.addEventListener('drop', (e) => {
    e.preventDefault(); f.classList.remove('survol');
    const img = [...e.dataTransfer.files].find(estImage);
    if (img) return vers({ fichier: img });
    const lien = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').trim().split('\n')[0];
    if (lien) vers(/^https?:\/\//i.test(lien) ? { adresse: lien } : { texte: lien });
  });
}

export function brancher(racine) {
  brancherDepot(racine);
  const ev = S.lire().lignes.length ? S.evaluation() : null;
  if (ev) brancherCarte(racine, ev, (c) => ouvrir('pays', c));
  racine.querySelectorAll('tr[data-pays]').forEach((tr) => tr.addEventListener('click', () => ouvrir('pays', tr.dataset.pays)));
}
