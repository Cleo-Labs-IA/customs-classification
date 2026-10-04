// La règle encodée dessinée comme un graphe : de la racine (à gauche) aux codes (à droite).
// Le chemin que suit le produit est tracé ; à côté, la raison de chaque choix : la question,
// la réponse avec le passage qui l'établit, le texte officiel qui fait de cette réponse une
// conséquence. Pur rendu : la logique reste dans public/arbre-moteur.js.
import { esc, urlSure } from './ui.js';
import { fmtCode } from './conformite.js';

const LARG_Q = 172, LARG_F = 164, HAUT = 44, PAS_X = 232, PAS_Y = 54, MARGE = 14;
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
    const corps = n.type === 'code' ? `<b>${esc(fmtCode(n.code))}</b><small>${esc(court(n.libelle, 44))}</small>` : n.type === 'hors_perimetre' ? '<b>Out of scope</b><small>this tree does not decide</small>' : `<b>${esc((C[n.critere] || {}).libelle || n.critere)}</b>${n.suite ? `<small>${n.suite} more branches, not followed</small>` : ''}`;
    return `<button type="button" class="${cls}" data-n="${esc(id)}" style="left:${p.x}px;top:${p.y}px;width:${p.l}px;height:${HAUT}px" title="${esc(n.type === 'question' ? (C[n.critere] || {}).question || '' : n.type === 'code' ? n.libelle || '' : n.motif || '')}">${corps}</button>`;
  }).join('');
  return `<div class="ga-cadre"><div class="ga" style="width:${largeur}px;height:${hauteur}px"><svg width="${largeur}" height="${hauteur}" aria-hidden="true">${traits}</svg>${etiquettes}${noeuds}</div></div>
    <p class="ga-legende"><span class="l on"></span>path followed by this product<span class="l"></span>other branches of the rule<span class="p stop"></span>waiting for a fact<span class="p fin"></span>conclusion</p>`;
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
.ga-cadre { overflow: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--side); max-height: 720px; }
.ga { position: relative; }
.ga svg { position: absolute; inset: 0; }
.ga svg path { fill: none; stroke: var(--line-2); stroke-width: 1.2; }
.ga svg path.on { stroke: var(--ink); stroke-width: 2.6; }
.ga-n { position: absolute; display: flex; flex-direction: column; justify-content: center; gap: 1px; padding: 4px 10px; border: 1px solid var(--line-2); border-radius: 10px; background: var(--panel); font: inherit; font-size: 12px; line-height: 1.2; text-align: left; color: var(--ink-3); cursor: pointer; overflow: hidden; }
.ga-n b { font-weight: 550; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
details.repli > summary { cursor: pointer; list-style: none; }
details.repli > summary::-webkit-details-marker { display: none; }
details.repli > summary h3::before { content: '+ '; color: var(--ink-4); }
details.repli[open] > summary h3::before { content: '- '; }
details.repli > .carte { box-shadow: none; border-top: 1px solid var(--line); border-radius: 0; }
`;
if (typeof document !== 'undefined' && !document.getElementById('ga-css')) document.head.appendChild(Object.assign(document.createElement('style'), { id: 'ga-css', textContent: CSS }));
