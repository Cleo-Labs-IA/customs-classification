// La règle encodée dessinée comme un graphe : de la racine (à gauche) aux codes (à droite).
// Le chemin que suit le produit est tracé ; à côté, la raison de chaque choix : la question,
// la réponse avec le passage qui l'établit, le texte officiel qui fait de cette réponse une
// conséquence. Pur rendu : la logique reste dans public/arbre-moteur.js.
import { esc, urlSure, ic } from './ui.js';
import { issues } from '../arbre-moteur.js';
import { fmtCode } from './conformite.js';

const LARG_Q = 200, LARG_F = 190, HAUT = 54, PAS_X = 262, PAS_Y = 68, MARGE = 18;
const court = (s, n) => { const t = String(s || '').split(/[:(]/)[0].trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
export const reponseTxt = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === 'oui' || v === true ? 'Yes' : 'No');

// Position de chaque nœud : la colonne est la plus grande distance à la racine, la ligne suit
// l'ordre des feuilles ; un nœud atteint par plusieurs branches n'est dessiné qu'une fois.
export function disposer(arbre) {
  const N = arbre.noeuds, prof = {}, pile = new Set();
  const descendre = (id, d) => { if (!N[id] || pile.has(id)) return; prof[id] = Math.max(prof[id] ?? 0, d); pile.add(id); for (const c of Object.values(N[id].branches || {})) descendre(c, d + 1); pile.delete(id); };
  descendre(arbre.racine, 0);
  const y = {}, vus = new Set(); let rang = 0;
  const placer = (id) => {
    if (!N[id] || vus.has(id)) return y[id]; vus.add(id);
    const enfants = [...new Set(Object.values(N[id].branches || {}))].filter((c) => N[c] && !vus.has(c) && prof[c] === prof[id] + 1);
    const ys = enfants.map(placer).filter((v) => v != null);
    y[id] = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : rang++;
    return y[id];
  };
  placer(arbre.racine);
  for (const id of Object.keys(N)) if (y[id] == null && prof[id] != null) y[id] = rang++; // nœud partagé non encore posé
  const pos = Object.fromEntries(Object.keys(N).filter((id) => prof[id] != null).map((id) => [id, { x: MARGE + prof[id] * PAS_X, y: MARGE + y[id] * PAS_Y, l: N[id].type === 'question' ? LARG_Q : LARG_F }]));
  const largeur = Math.max(...Object.values(pos).map((p) => p.x + p.l)) + MARGE, hauteur = Math.max(...Object.values(pos).map((p) => p.y)) + HAUT + MARGE;
  return { pos, largeur, hauteur };
}

// Le chemin du produit seul : ses nœuds et, pour chacun, les issues qu'il n'a pas prises
// (sans leur suite). C'est la vue par défaut : on lit le choix et ce qui a été écarté.
export function elaguer(arbre, res) {
  const garde = new Set([...res.chemin.map((s) => s.noeud), res.noeud].filter(Boolean)), noeuds = {};
  for (const id of garde) if (arbre.noeuds[id]) noeuds[id] = arbre.noeuds[id];
  for (const id of garde) for (const c of Object.values((arbre.noeuds[id] || {}).branches || {})) if (!noeuds[c] && arbre.noeuds[c]) { const n = arbre.noeuds[c]; noeuds[c] = n.type === 'question' ? { ...n, branches: {}, suite: Object.keys(n.branches || {}).length } : n; }
  return { ...arbre, noeuds };
}

// Disposition de la vue « chemin » : le chemin suivi sur une ligne, de gauche à droite ; sous
// chaque étape, dans la colonne suivante, les issues que le produit n'a pas prises.
const L_C = 146, PX_C = 182, RY_C = 58, TETE_C = 18;
export function disposerChemin(arbre, res) {
  const N = arbre.noeuds, chemin = [...res.chemin.map((s) => s.noeud), res.noeud].filter((id, i, t) => id && N[id] && t.indexOf(id) === i), pos = {};
  chemin.forEach((id, i) => { pos[id] = { x: MARGE + i * PX_C, y: MARGE + TETE_C, l: L_C }; });
  const rangs = {};
  chemin.forEach((id, i) => { for (const c of new Set(Object.values(N[id].branches || {}))) { if (pos[c] || !N[c]) continue; rangs[i + 1] = (rangs[i + 1] || 0) + 1; pos[c] = { x: MARGE + (i + 1) * PX_C, y: MARGE + TETE_C + rangs[i + 1] * RY_C, l: L_C }; } });
  return { pos, largeur: Math.max(...Object.values(pos).map((p) => p.x + p.l)) + MARGE, hauteur: Math.max(...Object.values(pos).map((p) => p.y)) + HAUT + MARGE };
}

// options : res (résultat d'evaluer), sel (nœud sélectionné), modifie(id) → bool, entier (toute la règle)
export function grapheHtml(arbreComplet, { res = null, sel = null, modifie = () => false, entier = false } = {}) {
  const arbre = entier || !res ? arbreComplet : elaguer(arbreComplet, res);
  const vueChemin = arbre !== arbreComplet;
  const N = arbre.noeuds, C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c])), { pos, largeur, hauteur } = vueChemin ? disposerChemin(arbre, res) : disposer(arbre);
  const pris = new Map((res ? res.chemin : []).map((s) => [s.noeud, s.valeur]));
  const fin = res && (res.statut === 'code' || res.statut === 'hors_perimetre' || res.statut === 'information_manquante') ? res.noeud : null;
  const surChemin = (id) => pris.has(id) || id === fin;
  let traits = '', etiquettes = '';
  for (const [id, n] of Object.entries(N)) {
    if (!pos[id]) continue;
    for (const [v, cible] of Object.entries(n.branches || {})) {
      if (!pos[cible]) continue;
      const a = pos[id], b = pos[cible], x1 = a.x + a.l, y1 = a.y + HAUT / 2, x2 = b.x, y2 = b.y + HAUT / 2, m = (x1 + x2) / 2, on = pris.has(id) && String(pris.get(id)) === v;
      traits += `<path class="${on ? 'on' : ''}" d="M${x1} ${y1} C${m} ${y1} ${m} ${y2} ${x2} ${y2}"/>`;
      const lib = reponseTxt(C[n.critere], v);
      etiquettes += vueChemin ? `<span class="ga-br cap ${on ? 'on' : ''}" style="left:${b.x + 2}px;top:${b.y - 15}px;max-width:${b.l - 4}px" title="${esc(lib)}">${esc(court(lib, 26))}</span>`
        : `<span class="ga-br ${on ? 'on' : ''}" style="left:${x2 - 6}px;top:${y2 - 9}px" title="${esc(lib)}">${esc(court(lib, 24))}</span>`;
    }
  }
  const noeuds = Object.entries(N).filter(([id]) => pos[id]).map(([id, n]) => {
    const p = pos[id], cls = ['ga-n', n.type, surChemin(id) ? 'on' : '', id === fin ? 'fin' : '', res && res.statut === 'information_manquante' && id === fin ? 'stop' : '', sel === id ? 'sel' : '', modifie(id) ? 'mod' : ''].join(' ');
    const corps = n.type === 'code' ? `<b>${esc(fmtCode(n.code))}</b><small>${esc(court(n.libelle, 60))}</small>` : n.type === 'hors_perimetre' ? '<b>Out of scope</b><small>this tree does not decide</small>' : `<b>${esc((C[n.critere] || {}).libelle || n.critere)}</b>${n.suite ? `<small>${n.suite} more branches, not followed</small>` : ''}`;
    return `<button type="button" class="${cls}" data-n="${esc(id)}" style="left:${p.x}px;top:${p.y}px;width:${p.l}px;height:${HAUT}px" title="${esc(n.type === 'question' ? (C[n.critere] || {}).question || '' : n.type === 'code' ? n.libelle || '' : n.motif || '')}">${corps}</button>`;
  }).join('');
  const z = plein ? ajuste(largeur, hauteur) : 1;
  return `<div class="ga-cadre ${plein ? 'plein' : ''}"><button type="button" class="ga-plein-btn" data-ga-plein>${plein ? 'Close full screen' : 'Full screen'}</button><div class="ga" data-l="${largeur}" data-h="${hauteur}" style="width:${largeur}px;height:${hauteur}px;zoom:${z}"><svg width="${largeur}" height="${hauteur}" aria-hidden="true">${traits}</svg>${etiquettes}${noeuds}</div></div>
    <p class="ga-legende"><span class="l on"></span>path followed by this product<span class="l"></span>other branches of the rule<span class="p stop"></span>waiting for a fact<span class="p fin"></span>conclusion</p>`;
}

// Plein écran : le graphe occupe la fenêtre et se réduit pour tenir en entier. L'état est
// gardé ici pour survivre aux redessins de l'écran ; Échap ou le bouton referme.
let plein = false;
const ajuste = (l, h) => (typeof window === 'undefined' ? 1 : Math.min(1.6, (window.innerWidth - 48) / l, (window.innerHeight - 96) / h));
function basculer(etat) {
  plein = etat;
  for (const c of document.querySelectorAll('.ga-cadre')) {
    const g = c.querySelector('.ga'), b = c.querySelector('[data-ga-plein]');
    c.classList.toggle('plein', plein);
    if (g) g.style.zoom = plein ? ajuste(Number(g.dataset.l), Number(g.dataset.h)) : 1;
    if (b) b.textContent = plein ? 'Close full screen' : 'Full screen';
  }
  document.documentElement.classList.toggle('ga-plein-ouvert', plein);
}
if (typeof document !== 'undefined' && !document.documentElement.dataset.gaEcoute) {
  document.documentElement.dataset.gaEcoute = '1';
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-ga-plein]')) { e.stopPropagation(); basculer(!plein); } }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && plein) basculer(false); });
  window.addEventListener('resize', () => { if (plein) basculer(true); });
  window.addEventListener('hashchange', () => { if (plein) basculer(false); });
}

// Le chemin d'un produit, lu de haut en bas : à chaque étape la question, la réponse retenue
// avec ce qui l'établit, les autres réponses et où elles mèneraient, puis le texte officiel
// replié. La conclusion ferme le chemin. Remplace, pour un produit, le graphe et la liste.
const issueTxt = (arbre, cible) => {
  const x = issues(arbre, cible);
  if (!x.length) return '';
  if (x.length === 1) return /^\d{6}$/.test(x[0]) ? fmtCode(x[0]) : x[0];
  return `${x.length} codes`;
};
const loi = (n, T, titre) => {
  const textes = (n.base || []).map((b) => T[b]).filter(Boolean);
  if (!textes.length && !n.pourquoi && !n.motif) return '';
  return `<details class="pc-loi"><summary>${ic('balance')}<span>${titre}</span>${textes.length ? `<span class="pc-n">${textes.length}</span>` : ''}</summary>
    ${n.pourquoi ? `<p>${esc(n.pourquoi)}</p>` : ''}${textes.map((x) => `<blockquote><b>${esc(x.ref)}</b><br>${esc(x.texte)}<br><a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.source || 'Official text')}${ic('lien')}</a></blockquote>`).join('')}</details>`;
};
export function parcoursHtml(arbre, res, { faits = {}, T = {}, source = (x) => x } = {}) {
  if (!res) return '';
  const N = arbre.noeuds, C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
  const lus = Object.values(faits).filter((f) => f.kind !== 'reponse').length, declares = Object.values(faits).filter((f) => f.kind === 'reponse').length;
  const depart = `<li class="pc-depart"><span class="pc-puce">${ic('fichier')}</span><div class="pc-tete"><b>What the product documents establish</b><small>${lus} fact${lus === 1 ? '' : 's'} read on the label${declares ? `, ${declares} stated by the seller` : ''}</small></div></li>`;
  const etapes = res.chemin.map((st, i) => {
    const n = N[st.noeud], c = C[st.critere], f = faits[st.critere];
    const preuve = !f ? '<span class="pc-preuve main">set by hand in this screen</span>' : f.kind === 'reponse' ? '<span class="pc-preuve main">stated by the seller · no document</span>' : `<span class="pc-preuve"><q>${esc(f.citation)}</q> ${esc(source(f.source))}</span>`;
    const alt = Object.entries(n.branches || {}).filter(([v]) => v !== String(st.valeur));
    const autres = alt.map(([v, cible]) => `<li title="${esc(reponseTxt(c, v))}"><span>${esc(court(reponseTxt(c, v), 48))}</span><i>${esc(issueTxt(arbre, cible) || 'next question')}</i></li>`).join('');
    const choisi = reponseTxt(c, st.valeur);
    return `<li class="pc-etape" style="--i:${i}"><span class="pc-puce">${i + 1}</span><div class="pc-carte">
      <span class="eyebrow">${esc(c ? c.libelle : st.critere)}</span><p class="pc-q">${esc(c ? c.question : st.critere)}</p>
      <div class="pc-reponse"><span class="pc-choisi" title="${esc(choisi)}">${ic('check')}${esc(court(choisi, 44))}</span>${preuve}</div>
      <div class="pc-plus">${autres ? `<details class="pc-autres"><summary>${ic('arbre')}<span>${alt.length} other answer${alt.length === 1 ? '' : 's'}</span></summary><ul>${autres}</ul></details>` : ''}${loi(n, T, 'Legal basis')}</div></div></li>`;
  }).join('');
  let fin = '';
  if (res.statut === 'code') {
    const n = N[res.noeud];
    fin = `<li class="pc-fin ok" style="--i:${res.chemin.length}"><span class="pc-puce">${ic('check')}</span><div class="pc-carte"><span class="eyebrow">Conclusion of the rule</span><div class="pc-code">${esc(fmtCode(res.code))}</div><p class="pc-q">${esc(n.libelle || '')}</p>${n.motif ? `<p class="muted pc-motif">${esc(n.motif)}</p>` : ''}<div class="pc-plus">${loi({ base: n.base }, T, 'Legal basis of the code')}</div></div></li>`;
  } else if (res.statut === 'information_manquante') {
    const c = C[res.critere], n = N[res.noeud];
    fin = `<li class="pc-fin stop"><span class="pc-puce">?</span><div class="pc-carte"><span class="eyebrow">The rule stops here · a fact is missing</span><p class="pc-q">${esc(c ? c.question : res.critere)}</p><ul class="pc-options">${Object.entries(res.options || {}).map(([v, codes]) => `<li><span>${esc(court(reponseTxt(c, v), 48))}</span><i>${esc(codes.length === 1 ? (/^\d{6}$/.test(codes[0]) ? fmtCode(codes[0]) : codes[0]) : codes.length + ' codes')}</i></li>`).join('')}</ul><div class="pc-plus">${loi(n, T, 'Legal basis')}</div></div></li>`;
  } else if (res.statut === 'hors_perimetre') {
    fin = `<li class="pc-fin hors"><span class="pc-puce">×</span><div class="pc-carte"><span class="eyebrow">Outside this rule</span><p class="pc-q">${esc((N[res.noeud] || {}).motif || 'The rule does not cover this product.')}</p></div></li>`;
  }
  return `<ol class="pc-chemin">${depart}${etapes}${fin}</ol>`;
}

// Pourquoi ce code : chaque étape du chemin, avec le fait et le texte officiel.
// faits : { <critere>: { kind: 'pieces' | 'reponse', citation, source } } ; T : textes officiels par identifiant.
export function raisonsHtml(arbre, res, { faits = {}, T = {}, source = (s) => s } = {}) {
  if (!res) return '';
  const N = arbre.noeuds, C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
  const texte = (b) => { const x = T[b]; return x ? `<details class="ga-texte"><summary>${esc(x.ref)}</summary><blockquote>${esc(x.texte)}</blockquote><a href="${urlSure(x.url)}" target="_blank" rel="noopener">${esc(x.source || 'official text')}</a></details>` : ''; };
  const etapes = res.chemin.map((s, i) => {
    const n = N[s.noeud], c = C[s.critere], f = faits[s.critere];
    const preuve = !f ? '<span class="ga-sans">answer set by hand in this screen</span>' : f.kind === 'reponse' ? '<span class="ga-sans">stated by the seller, no document supports it</span>' : `<q>${esc(f.citation)}</q> <span class="faint">${esc(source(f.source))}</span>`;
    return `<li><span class="num">${i + 1}</span><div><p class="q">${esc(c ? c.question : s.critere)}</p><p class="r"><b>${esc(reponseTxt(c, s.valeur))}</b> ${preuve}</p><p class="w">${esc(n.pourquoi || '')}</p><div class="ga-textes">${(n.base || []).map(texte).join('')}</div></div></li>`;
  }).join('');
  let fin = '';
  if (res.statut === 'code') { const n = N[res.noeud]; fin = `<li class="fin"><span class="num">=</span><div><p class="q">Conclusion of the rule</p><p class="r"><b class="code">${esc(fmtCode(res.code))}</b> ${esc(n.libelle || '')}</p><p class="w">${esc(n.motif || '')}</p><div class="ga-textes">${(n.base || []).map(texte).join('')}</div></div></li>`; }
  else if (res.statut === 'information_manquante') { const c = C[res.critere], n = N[res.noeud]; fin = `<li class="stop"><span class="num">?</span><div><p class="q">${esc(c ? c.question : res.critere)}</p><p class="r"><b>Not established yet.</b> The rule stops here.</p><p class="w">${esc(n.pourquoi || '')}</p><p class="w">The answer decides between: ${Object.entries(res.options || {}).map(([v, codes]) => `<b>${esc(court(reponseTxt(c, v), 40))}</b> → ${codes.map((x) => esc(/^\d{6}$/.test(x) ? fmtCode(x) : x)).join(', ')}`).join(' · ')}</p><div class="ga-textes">${(n.base || []).map(texte).join('')}</div></div></li>`; }
  else if (res.statut === 'hors_perimetre') fin = `<li class="stop"><span class="num">×</span><div><p class="q">Outside the scope of this rule</p><p class="w">${esc((N[res.noeud] || {}).motif || '')}</p></div></li>`;
  return `<ol class="ga-raisons">${etapes}${fin}</ol>`;
}

export const CSS = `
.ga-cadre { overflow: auto; border: 1px solid var(--line); border-radius: var(--r); background: radial-gradient(circle at 1px 1px, rgba(19, 19, 18, .07) 1px, transparent 0) 0 0 / 18px 18px, var(--side); max-height: 640px; }
.ga { position: relative; }
.ga-cadre { position: relative; }
.ga-plein-btn { position: sticky; top: 8px; left: calc(100% - 132px); z-index: 3; float: right; margin: 8px 8px -40px 0; height: 30px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--panel); font: inherit; font-size: 12.5px; font-weight: 500; color: var(--ink-2); cursor: pointer; }
.ga-plein-btn:hover { border-color: var(--ink); color: var(--ink); }
.ga-cadre.plein { position: fixed; inset: 0; z-index: 1000; max-height: none; border-radius: 0; border: 0; padding: 56px 24px 24px; background: var(--side); }
.ga-cadre.plein .ga { margin: 0 auto; }
.ga-cadre.plein .ga-plein-btn { position: fixed; top: 14px; right: 18px; left: auto; float: none; margin: 0; height: 34px; background: var(--ink); color: #fff; border-color: var(--ink); }
html.ga-plein-ouvert { overflow: hidden; }
/* le plein écran passe devant la barre du haut, la barre latérale et les cartes voisines */
:has(.ga-cadre.plein):not(html):not(body) { z-index: 1000; }
.carte:has(.ga-cadre.plein), .carte-corps:has(.ga-cadre.plein), .page:has(.ga-cadre.plein), .vue:has(.ga-cadre.plein), .main:has(.ga-cadre.plein), .col:has(.ga-cadre.plein), .cols-dossier:has(.ga-cadre.plein) { position: relative; }
.page:has(.ga-cadre.plein) { animation: none; }
.ga svg { position: absolute; inset: 0; }
.ga svg path { fill: none; stroke: var(--line-2); stroke-width: 1.2; }
.ga svg path.on { stroke: var(--ink); stroke-width: 2.6; }
.ga-n { position: absolute; display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 6px 12px; border: 1px solid var(--line-2); border-radius: 12px; background: var(--panel); font: inherit; font-size: 12px; line-height: 1.25; text-align: left; color: var(--ink-3); cursor: pointer; overflow: hidden; transition: border-color var(--fast), box-shadow var(--fast); }
.ga-n b { font-weight: 550; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ga-n small { font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ga-n.code { border-radius: 999px; padding-left: 14px; }
.ga-n.code b { font-family: var(--mono); }
.ga-n.hors_perimetre { border-style: dashed; background: transparent; }
.ga-n.on { border-color: var(--ink); border-width: 2px; color: var(--ink); box-shadow: 0 6px 16px -10px rgba(0, 0, 0, .5); }
.ga-n.on b { color: var(--ink); }
.ga-n.on.fin.code { background: var(--ok-bg); border-color: var(--ok); }
.ga-n.on.fin.code b { color: var(--ok); }
.ga-n.on.stop { background: var(--warn-bg); border-color: var(--warn-dot); }
.ga-n.on.fin.hors_perimetre { background: var(--bad-bg); border-color: var(--bad-dot); border-style: solid; }
.ga-n.sel { outline: 3px solid var(--wait-dot); outline-offset: 2px; }
.ga-n.mod { border-left: 4px solid var(--warn-dot); }
.ga-n:hover { border-color: var(--ink); }
.ga-br { position: absolute; transform: translate(-100%, -100%); font-size: 10.5px; color: var(--ink-4); background: var(--side); padding: 0 4px; border-radius: 4px; white-space: nowrap; pointer-events: auto; }
.ga-br.on { color: var(--panel); background: var(--ink); font-weight: 550; }
.ga-br.cap { transform: none; overflow: hidden; text-overflow: ellipsis; background: transparent; padding: 0 2px; }
.ga-br.cap.on { background: var(--ink); padding: 0 5px; }
.ga-legende { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; font-size: 12px; color: var(--ink-3); margin: 8px 0 0; }
.ga-legende .l { display: inline-block; width: 22px; height: 0; border-top: 1.2px solid var(--line-2); margin-left: 10px; }
.ga-legende .l.on { border-top: 2.6px solid var(--ink); margin-left: 0; }
.ga-legende .p { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-left: 10px; border: 2px solid var(--warn-dot); background: var(--warn-bg); }
.ga-legende .p.fin { border-color: var(--ok); background: var(--ok-bg); }
.ga-raisons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.ga-raisons li { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; padding: 12px 0; border-top: 1px solid var(--line); }
.ga-raisons li:first-child { border-top: 0; padding-top: 0; }
.ga-raisons .num { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--ink); color: var(--panel); font-family: var(--mono); font-size: 11px; }
.ga-raisons li.fin .num { background: var(--ok); }
.ga-raisons li.stop .num { background: var(--warn-dot); }
.ga-raisons p { margin: 0; }
.ga-raisons .q { font-size: 12.5px; color: var(--ink-3); }
.ga-raisons .r { font-size: 14px; margin-top: 2px; }
.ga-raisons .r q { font-family: var(--mono); font-size: 12px; background: var(--sunk); border-radius: 5px; padding: 1px 6px; quotes: '"' '"'; }
.ga-raisons .w { font-size: 12.5px; color: var(--ink-3); margin-top: 6px; }
.ga-sans { font-size: 12px; color: var(--warn); background: var(--warn-bg); border-radius: 999px; padding: 1px 8px; }
.ga-textes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ga-texte { font-size: 12px; }
.ga-texte summary { cursor: pointer; list-style: none; border: 1px solid var(--line-2); border-radius: 999px; padding: 2px 10px; color: var(--ink-2); background: var(--panel); }
.ga-texte summary::-webkit-details-marker { display: none; }
.ga-texte[open] { flex-basis: 100%; }
.ga-texte[open] summary { background: var(--ink); color: var(--panel); border-color: var(--ink); display: inline-block; }
.ga-texte blockquote { margin: 8px 0 4px; padding: 8px 12px; border-left: 3px solid var(--ink); background: var(--sunk); border-radius: 0 8px 8px 0; font-size: 12.5px; color: var(--ink-2); }
.ga-texte a { color: var(--cleo); font-size: 12px; }
.pc-chemin { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; position: relative; }
.pc-chemin > li { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 14px; position: relative; padding-bottom: 14px; }
.pc-chemin > li::before { content: ""; position: absolute; left: 16px; top: 34px; bottom: 0; width: 2px; background: var(--ink); opacity: .85; }
.pc-chemin > li:last-child::before { display: none; }
.pc-chemin > li:last-child { padding-bottom: 0; }
.pc-puce { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: var(--ink); color: #fff; font-family: var(--mono); font-size: 12.5px; font-weight: 500; position: relative; z-index: 1; box-shadow: 0 0 0 4px var(--panel); }
.pc-puce svg { width: 15px; height: 15px; }
.pc-depart .pc-puce { background: var(--sunk); color: var(--ink-2); box-shadow: 0 0 0 4px var(--panel), inset 0 0 0 1px var(--line-2); }
.pc-tete { display: flex; flex-direction: column; justify-content: center; min-height: 34px; padding-bottom: 6px; }
.pc-tete b { font-weight: 600; }
.pc-tete small { color: var(--ink-3); font-size: 12.5px; }
.pc-carte { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; background: var(--panel); display: flex; flex-direction: column; gap: 8px; transition: border-color var(--fast), box-shadow var(--fast); }
.pc-carte:hover { border-color: var(--line-2); box-shadow: 0 8px 22px -16px rgba(0, 0, 0, .25); }
.entre .pc-chemin > li { animation: entre .5s var(--ease) both; animation-delay: calc(var(--i, 0) * 70ms + .1s); }
.pc-q { margin: 0; font-size: 15px; font-weight: 500; letter-spacing: -.01em; line-height: 1.35; }
.pc-reponse { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pc-choisi { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px 5px 9px; border-radius: 999px; background: var(--ink); color: #fff; font-weight: 550; font-size: 13px; }
.pc-choisi svg { width: 13px; height: 13px; }
.pc-preuve { font-size: 12.5px; color: var(--ink-3); }
.pc-preuve q { font-family: var(--mono); font-size: 11.5px; background: var(--sunk); border-radius: 6px; padding: 2px 7px; color: var(--ink-2); quotes: '"' '"'; }
.pc-preuve.main { color: var(--warn); background: var(--warn-bg); border-radius: 999px; padding: 2px 9px; }
.pc-plus { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: flex-start; padding-top: 4px; border-top: 1px dashed var(--line); margin-top: 2px; }
.pc-plus > details { flex: 0 1 auto; min-width: 0; }
.pc-plus > details[open] { flex-basis: 100%; }
.pc-autres summary { cursor: pointer; list-style: none; display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
.pc-autres summary::-webkit-details-marker { display: none; }
.pc-autres summary svg { width: 14px; height: 14px; color: var(--ink-3); }
.pc-autres summary:hover { color: var(--ink); }
.pc-autres ul, .pc-options { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; box-shadow: 0 0 0 1px var(--line); }
.pc-autres li, .pc-options li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 12px; font-size: 12.5px; color: var(--ink-3); border-top: 1px solid var(--line); background: var(--panel); }
.pc-autres li:first-child, .pc-options li:first-child { border-top: 0; }
.pc-autres li i, .pc-options li i { font-style: normal; font-family: var(--mono); font-size: 11.5px; color: var(--ink-2); white-space: nowrap; }
.pc-options { margin-top: 2px; }
.pc-n { font-family: var(--mono); font-size: 10.5px; padding: 1px 6px; border-radius: 999px; background: var(--sunk); color: var(--ink-3); }
.pc-loi summary { cursor: pointer; list-style: none; display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 500; color: var(--ink-2); }
.pc-loi summary::-webkit-details-marker { display: none; }
.pc-loi summary svg { width: 14px; height: 14px; color: var(--ink-3); }
.pc-loi summary:hover { color: var(--ink); }
.pc-loi[open] summary { margin-bottom: 6px; }
.pc-loi p { font-size: 13px; color: var(--ink-2); margin: 0 0 8px; }
.pc-loi blockquote { margin: 0 0 8px; padding: 10px 12px; border-left: 3px solid var(--ink); background: var(--sunk); border-radius: 0 10px 10px 0; font-size: 12.5px; color: var(--ink-2); }
.pc-loi blockquote a { color: var(--cleo); display: inline-flex; gap: 4px; align-items: center; margin-top: 4px; text-decoration: none; font-weight: 500; }
.pc-loi blockquote a svg { width: 12px; height: 12px; }
.pc-fin .pc-carte { border-width: 1.5px; }
.pc-fin.ok .pc-puce { background: var(--ok); }
.pc-fin.ok .pc-carte { border-color: var(--ok); background: linear-gradient(180deg, var(--ok-bg), var(--panel) 70%); }
.pc-fin.stop .pc-puce { background: var(--warn-dot); }
.pc-fin.stop .pc-carte { border-color: var(--warn-dot); background: var(--warn-bg); }
.pc-fin.hors .pc-puce { background: var(--bad-dot); }
.pc-code { font-family: var(--mono); font-size: 40px; font-weight: 500; letter-spacing: -.04em; line-height: 1; color: var(--ink); }
.pc-motif { font-size: 13px; margin: 0; }
details.repli > summary { cursor: pointer; list-style: none; }
details.repli > summary::-webkit-details-marker { display: none; }
details.repli > summary h3::before { content: '+ '; color: var(--ink-4); }
details.repli[open] > summary h3::before { content: '- '; }
details.repli > .carte { box-shadow: none; border-top: 1px solid var(--line); border-radius: 0; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ga-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'ga-css', textContent: CSS }));
