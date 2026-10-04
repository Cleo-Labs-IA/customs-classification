// Carte des envois : chaque destination prend la couleur de sa ligne la plus grave ; un
// arc relie le pays d'origine à la destination. Fond de carte pré-projeté (Natural Earth
// 1/110 m, public/data/monde.json), sans bibliothèque.
import { esc, nomPays, NIVEAU, pluriel, drapeau } from '../ui.js';
import { pire } from '../conformite.js';

let MONDE = null;
const chargement = fetch('/data/monde.json').then((r) => r.json()).then((m) => { MONDE = m; return m; }).catch(() => null);
export const carteChargee = () => chargement;

// Routes origine → destination à partir des lignes encore à expédier.
function routes(lignes) {
  const out = {};
  for (const l of lignes) {
    if (l.expedition === 'expediee') continue;
    const k = `${l.origine}>${l.pays}`;
    const r = (out[k] ||= { o: l.origine, d: l.pays, niveau: 'pret' });
    r.niveau = pire(r.niveau, l.etat.niveau);
  }
  return Object.values(out);
}

function arc(a, b) {
  const [x1, y1] = a, [x2, y2] = b, dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
  const lev = Math.min(90, dist * 0.32), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - lev;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}

// L'Europe est trop serrée à cette échelle : ses destinations passent dans un encart
// agrandi, posé sur le Pacifique ; la carte principale garde un cadre à sa place.
const EUROPE = { x: 450, y: 66, l: 96, h: 90 }, ENCART = { x: 12, y: 250, l: 208, h: 195 };
const enEurope = ([x, y]) => x >= EUROPE.x && x <= EUROPE.x + EUROPE.l && y >= EUROPE.y && y <= EUROPE.y + EUROPE.h;

function pinHtml(c, x, [cx, cy], k = 1, i = 0) {
  const r = (8 + Math.min(5, x.lignes * 0.45)) / k;
  return `<g class="pin ${x.niveau}" data-pays="${c}" transform="translate(${cx},${cy})"><g class="pop" style="--i:${i}">${x.niveau === 'bloque' ? `<circle class="halo" r="${r}"/>` : ''}<circle class="fond" r="${r}" vector-effect="non-scaling-stroke"/><text style="font-size:${8.5 / k}px">${x.lignes}</text></g></g>`;
}

export function carteHtml(evaluation) {
  if (!MONDE) return '<div class="vide" style="height:340px"><div class="agent"><span class="rond"></span>Chargement de la carte</div></div>';
  const par = evaluation.parPays, centre = Object.fromEntries(MONDE.pays.map((p) => [p.id, p.c]));
  const origines = new Set(evaluation.lignes.map((l) => l.origine));
  const terres = MONDE.pays.filter((p) => p.d).map((p) => {
    const n = par[p.id] ? par[p.id].niveau : null, cls = n ? `dest ${n}` : origines.has(p.id) ? 'origine' : '';
    return `<path class="terre ${cls}" d="${p.d}"${n ? ` data-pays="${p.id}"` : ''} vector-effect="non-scaling-stroke"><title>${esc(nomPays(p.id) || p.nom)}</title></path>`;
  }).join('');
  const arcs = routes(evaluation.lignes).filter((r) => centre[r.o] && centre[r.d]).map((r) => `<path class="arc ${r.niveau}" d="${arc(centre[r.o], centre[r.d])}" vector-effect="non-scaling-stroke"/>`).join('');
  const dests = Object.entries(par).filter(([c]) => centre[c]).sort((a, b) => (a[1].niveau === 'bloque') - (b[1].niveau === 'bloque'));
  const loin = dests.filter(([c]) => !enEurope(centre[c])), proches = dests.filter(([c]) => enEurope(centre[c]));
  const orig = [...origines].filter((o) => centre[o]).map((o) => `<g class="orig" transform="translate(${centre[o][0]},${centre[o][1]})"><circle r="3.2"/><text x="6" y="3">${esc(nomPays(o))}</text></g>`).join('');
  const k = ENCART.l / EUROPE.l;
  const encart = proches.length ? `<rect class="cadre-europe" x="${EUROPE.x}" y="${EUROPE.y}" width="${EUROPE.l}" height="${EUROPE.h}" rx="6"/>
    <g class="encart"><rect class="fond-encart" x="${ENCART.x}" y="${ENCART.y}" width="${ENCART.l}" height="${ENCART.h}" rx="12"/>
    <svg x="${ENCART.x}" y="${ENCART.y}" width="${ENCART.l}" height="${ENCART.h}" viewBox="${EUROPE.x} ${EUROPE.y} ${EUROPE.l} ${EUROPE.h}">${terres}${arcs}${proches.map(([c, x], i) => pinHtml(c, x, centre[c], k, loin.length + i)).join('')}</svg>
    <text class="titre-encart" x="${ENCART.x + 12}" y="${ENCART.y + 18}">Europe</text></g>` : '';
  return `<div class="monde" id="monde"><svg viewBox="0 0 ${MONDE.largeur} ${MONDE.hauteur}" role="img" aria-label="Carte des destinations et de leur état de conformité">${terres}${arcs}${orig}${loin.map(([c, x], i) => pinHtml(c, x, centre[c], 1, i)).join('')}${encart}</svg><div class="bulle-info" id="bulle"></div></div>
    <div class="legende"><span><i class="c-pret"></i>Prêtes</span><span><i class="c-a_verifier"></i>À vérifier</span><span><i class="c-bloque"></i>Bloquées</span><span><i class="c-en_attente"></i>En cours</span><span style="margin-left:auto" class="faint">Le chiffre : lignes à expédier</span></div>`;
}

// Infobulle et clic sur un pays.
export function brancherCarte(racine, evaluation, surPays) {
  const monde = racine.querySelector('#monde'), bulle = racine.querySelector('#bulle');
  if (!monde) return;
  monde.addEventListener('mousemove', (e) => {
    const cible = e.target.closest('[data-pays]');
    if (!cible) { bulle.classList.remove('vu'); return; }
    const c = cible.dataset.pays, x = evaluation.parPays[c], box = monde.getBoundingClientRect();
    const det = ['bloque', 'a_verifier', 'en_attente', 'pret'].filter((n) => x.compte[n]).map((n) => `${x.compte[n]} ${NIVEAU[n].court.toLowerCase()}`).join(' · ');
    bulle.innerHTML = `${drapeau(c)} <b>${esc(nomPays(c))}</b> · ${pluriel(x.lignes, 'ligne', 'lignes')}<br><span style="opacity:.75">${esc(det)}</span>`;
    bulle.style.left = e.clientX - box.left + 'px';
    bulle.style.top = e.clientY - box.top + 'px';
    bulle.classList.add('vu');
  });
  monde.addEventListener('mouseleave', () => bulle.classList.remove('vu'));
  monde.addEventListener('click', (e) => { const c = e.target.closest('[data-pays]'); if (c) surPays(c.dataset.pays); });
}
