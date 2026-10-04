// Vue d'ensemble d'un produit : ce que dit l'étiquette, le code et pourquoi, la validation
// signée, les preuves par marché et les commandes en attente. Tout le parcours humain
// d'un produit tient sur cet écran ; le détail est dans les autres onglets.
import { esc, ic, etat, drapeau, nomPays, pluriel, toast, NIVEAU } from '../ui.js';
import { fmtCode, dansZone, cleAttestation } from '../conformite.js';
import { evaluer } from '../../arbre-moteur.js';
import { regle } from '../regle.js';
import { reponseTxt } from '../graphe-arbre.js';
import * as S from '../store.js';
import { enteteProduit, etatProduit, premierProduit } from './produit-entete.js';

export const titre = 'Products';
let sku = null, R = null, toutesLignes = false, rerendreLocal = () => {};
regle().then((r) => { R = r; rerendreLocal(); });
const MARCHES = { EU: 'European Union', GB: 'United Kingdom', CH: 'Switzerland', US: 'United States', CA: 'Canada', MX: 'Mexico', JP: 'Japan', KR: 'South Korea', AU: 'Australia', NZ: 'New Zealand', TW: 'Taiwan' };
const nomMarche = (m) => MARCHES[m] || nomPays(m);

export function entrer(params) { sku = params.get('sku') || sku; toutesLignes = false; }

function etiquetteCarte(p) {
  const lignes = p.etiquette || [], vues = toutesLignes ? lignes : lignes.slice(0, 7);
  return `<div class="carte etiquette-carte">
    ${p.image ? `<div class="etiquette-photo"><img src="${esc(p.image)}" alt="Photographed label of ${esc(p.nom)}"><span class="tag">${ic('fichier')}Photo ${esc(p.photo || '')}</span></div>` : ''}
    <div class="carte-corps">
      <span class="eyebrow">Read on the label</span>
      <ul class="lignes-lues">${vues.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      ${lignes.length > 7 ? `<button class="lien-detail" data-toutes>${toutesLignes ? 'Show fewer lines' : `Show all ${lignes.length} lines`}</button>` : ''}
      ${(p.marques_vues || []).length ? `<span class="eyebrow" style="margin-top:18px;display:block">Marks seen · ${p.marques_vues.length}</span><div class="marques">${p.marques_vues.map((m) => `<span class="tag contour">${esc(m)}</span>`).join('')}</div>` : ''}
      ${(p.a_confirmer || []).length ? `<span class="eyebrow" style="margin-top:18px;display:block">A photo cannot establish</span><ul class="a-confirmer">${p.a_confirmer.map((x) => `<li>${ic('alerte')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
    </div></div>`;
}

function codeCarte(p, e) {
  const s = S.lire(), v = s.validations[p.sku], d = S.decisions()[p.sku], cl = s.classifications[p.sku];
  const res = R && p.criteres ? evaluer(R.arbre, Object.fromEntries(Object.entries(p.criteres).map(([k, x]) => [k, x.valeur]))) : null;
  const C = R ? Object.fromEntries(R.arbre.criteres.map((c) => [c.id, c])) : {}, noeud = res && res.statut === 'code' ? R.arbre.noeuds[res.noeud] : null;
  const pourquoi = res ? res.chemin.map((x) => `<li><span>${esc((C[x.critere] || {}).libelle || x.critere)}</span><b>${esc(String(reponseTxt(C[x.critere], x.valeur)).split(':')[0])}</b><small>${p.criteres[x.critere] && p.criteres[x.critere].kind === 'reponse' ? 'stated by the seller' : 'read on the label'}</small></li>`).join('') : '';
  const origine = v ? `Validated by <b>${esc(v.par)}</b> on ${esc(new Date(v.le).toLocaleDateString('en-GB'))}${v.motif ? ` · ${esc(v.motif)}` : ''}.`
    : d && d.origine === 'convergence' ? `The engine (${cl && cl.source === 'direct' ? 'live call' : 'recorded call'} to the Cleo Legal API) and the encoded rule both conclude <b class="code">${esc(fmtCode(d.code))}</b>. A declarant still has to sign.`
      : d && d.besoinArbitrage ? esc(d.motif) : 'The engine has not settled on a code yet.';
  const recent = v && Date.now() - Date.parse(v.le) < 4000;
  const signer = v ? `<div class="valide-bande">${ic('check')}<span>Signed and timestamped. Orders now use this code.</span><button class="btn texte petit" data-devalider>${ic('annuler')}Undo</button></div>`
    : e.code ? `<form class="signature" data-form="valider"><div class="champs2"><div class="champ"><label for="p-qui">Signed by</label><input class="saisie" id="p-qui" required value="${esc(s.qui)}"></div><div class="champ"><label for="p-motif">Reason <span class="faint">optional</span></label><input class="saisie" id="p-motif" maxlength="160" placeholder="e.g. external power supply, heading 8504"></div></div><button class="btn noir" type="submit">${ic('check')}Validate ${esc(fmtCode(e.code))} and sign</button></form>` : '';
  return `<div class="carte proposition code-carte">${v ? `<div class="tampon-valide ${recent ? 'neuf' : ''}"><span>Validated</span><small>${esc(v.par)} · ${esc(new Date(v.le).toLocaleDateString('en-GB'))}</small></div>` : ''}<div class="carte-corps">
    <div class="prop-tete"><span class="eyebrow">Customs code · HS, six digits</span>${etat(e.niveau, e.texte)}</div>
    ${e.code ? `<div class="grand-code">${esc(fmtCode(e.code))}</div>${noeud ? `<p class="muted">${esc(noeud.libelle || '')}</p>` : ''}` : '<h3>No code yet</h3>'}
    <p class="origine">${origine}</p>
    ${pourquoi ? `<ol class="pourquoi-liste">${pourquoi}</ol>` : ''}
    <a class="lien-detail" href="#/arbre?sku=${encodeURIComponent(p.sku)}">${ic('arbre')}See the reasoning as a graph, with the official texts</a>
    ${signer}</div></div>`;
}

function marchesCarte(p, e, ev) {
  const s = S.lire();
  const regles = e.code ? S.regles().filter((r) => r.effet.type === 'exigence' && (r.sh || []).some((c) => String(e.code).startsWith(c))) : [];
  const lignes = ev.lignes.filter((l) => l.sku === p.sku && l.expedition !== 'expediee');
  const rangs = regles.map((r) => {
    const m = r.marche || r.juridictions[0], n = lignes.filter((l) => dansZone(l.pays, r.juridictions)).length, a = s.attestations[cleAttestation(p.sku, r.id)];
    const choix = a ? `${etat(a.reponse ? 'pret' : 'bloque', a.reponse ? 'Evidence held' : 'Evidence missing')}<button class="icobtn petit" data-retirer="${esc(r.id)}" title="Undo the answer">${ic('annuler')}</button>`
      : `<span class="seg"><button data-attester="${esc(r.id)}|1">${ic('check')}Yes</button><button data-attester="${esc(r.id)}|0">No</button></span>`;
    return `<div class="marche-l"><span class="pays">${drapeau(m === 'EU' ? 'EU' : m)}<b>${esc(nomMarche(m))}</b></span>
      <a class="faint" href="#/monde?sku=${encodeURIComponent(p.sku)}&marche=${esc(m)}">${pluriel((r.exigences || []).length || 1, 'requirement', 'requirements')} ${ic('droite')}</a>
      <span class="faint">${n ? pluriel(n, 'order', 'orders') : 'no order'}</span><span class="choix">${choix}</span></div>`;
  }).join('');
  return `<div class="carte"><div class="carte-tete"><h3>Evidence per market</h3><span class="muted">${regles.length} markets</span></div>
    <p class="carte-sous">${e.code ? 'For each market, the requirements were checked word for word against the official text. Do you hold the evidence (test report, certificate, marking, registration)? An answer is signed and every order to that market follows it.' : 'Requirements apply once the product has a code.'}</p>
    <div class="carte-corps marches-liste">${rangs || '<p class="muted">No verified requirement for this code.</p>'}</div></div>`;
}

function commandesCarte(p, ev) {
  const lignes = ev.lignes.filter((l) => l.sku === p.sku && l.expedition !== 'expediee');
  const c = { pret: 0, a_verifier: 0, bloque: 0, en_attente: 0 };
  for (const l of lignes) c[l.etat.niveau]++;
  const pays = new Set(lignes.map((l) => l.pays)).size;
  return `<div class="carte"><div class="carte-tete"><h3>Orders waiting</h3><a class="btn texte petit" href="#/commandes?produit=${encodeURIComponent(p.sku)}">All orders ${ic('droite')}</a></div><div class="carte-corps">
    <div class="mini-repartition">${['pret', 'a_verifier', 'bloque'].map((n) => `<a href="#/commandes?produit=${encodeURIComponent(p.sku)}&niveau=${n}"><span class="lib"><i class="c-${n}"></i>${NIVEAU[n].long}</span><b data-compte="${c[n]}" data-cle="p-${esc(p.sku)}-${n}">${c[n]}</b></a>`).join('')}</div>
    <p class="faint" style="font-size:12.5px;margin-top:10px">${pluriel(lignes.length, 'line', 'lines')} to ship to ${pluriel(pays, 'country', 'countries')}. Only ready lines ship.</p></div></div>`;
}

export function rendre() {
  const s = S.lire();
  if (!sku || !s.produits[sku]) sku = premierProduit();
  const p = sku && s.produits[sku];
  if (!p) return '<div class="page"><div class="agent"><span class="rond"></span><span class="txt">Loading the store</span></div></div>';
  const e = etatProduit(sku), ev = S.evaluation();
  return `<div class="page entre">${enteteProduit(sku, 'produit')}
    <div class="produit-grille">${etiquetteCarte(p)}<div class="col">${codeCarte(p, e)}${marchesCarte(p, e, ev)}${commandesCarte(p, ev)}</div></div>
    <p class="faint" style="font-size:12.5px;max-width:860px;margin-top:16px">The encoded rule is drafted by AI from the official texts it cites and is not reviewed by a customs declarant. Nothing here states that a product is compliant: the evidence answers are the seller's.</p>
  </div>`;
}

export function brancher(racine, rerendre) {
  rerendreLocal = rerendre;
  racine.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, code = etatProduit(sku).code;
    if (f.dataset.form !== 'valider' || !code) return;
    const qui = f.querySelector('#p-qui').value.trim();
    if (qui && qui !== S.lire().qui) S.nommer(qui);
    S.valider(sku, code, f.querySelector('#p-motif').value.trim());
    toast({ titre: `${fmtCode(code)} validated`, texte: 'Signed and timestamped. Every order of this product now uses this code.', niveau: 'pret', icone: 'check' });
  });
  racine.addEventListener('click', (e) => {
    const b = (sel) => e.target.closest(sel);
    if (b('[data-toutes]')) { toutesLignes = !toutesLignes; return rerendre(); }
    if (b('[data-devalider]')) return S.retirerValidation(sku);
    if (b('[data-retirer]')) return S.retirerAttestation(sku, b('[data-retirer]').dataset.retirer);
    const a = b('[data-attester]');
    if (a) { const [id, v] = a.dataset.attester.split('|'); S.attester(sku, id, v === '1'); toast({ titre: v === '1' ? 'Evidence held' : 'Evidence missing', texte: v === '1' ? 'Orders to this market move on.' : 'Orders to this market are blocked until the evidence is there.', niveau: v === '1' ? 'pret' : 'bloque', icone: v === '1' ? 'check' : 'stop' }); }
  });
}
