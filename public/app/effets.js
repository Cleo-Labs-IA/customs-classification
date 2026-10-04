// Effets d'interface : compteurs qui roulent jusqu'à leur valeur, reflet qui suit le
// pointeur sur les cartes, transitions entre les pages. Tout s'efface si la personne
// a demandé moins d'animations.
const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const derniers = new Map();
const DUREE = 1100;
const sortie = (t) => 1 - Math.pow(1 - t, 4);

const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const FORMATS = {
  nombre: (n) => nf.format(Math.round(n)),
  argent: (n) => '€' + nf.format(Math.round(n)),
  pct: (n) => nf.format(Math.round(n)) + '%',
};

// Chaque élément [data-compte] roule de sa dernière valeur affichée (ou de zéro à
// l'arrivée sur la page) jusqu'à la nouvelle. Le texte final est déjà dans le HTML :
// sans script, la bonne valeur s'affiche.
export function compter(racine, { depuisZero = false } = {}) {
  racine.querySelectorAll('[data-compte]').forEach((el) => {
    const cible = Number(el.dataset.compte), cle = el.dataset.cle || null, fmt = FORMATS[el.dataset.format || 'nombre'];
    const depart = depuisZero || !cle || !derniers.has(cle) ? 0 : derniers.get(cle);
    if (cle) derniers.set(cle, cible);
    if (calme() || depart === cible || !Number.isFinite(cible)) { el.textContent = fmt(cible); return; }
    if (!depuisZero) el.closest('[data-bouge]')?.classList.add('bouge');
    const t0 = performance.now();
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / DUREE);
      el.textContent = fmt(depart + (cible - depart) * sortie(k));
      if (k < 1) requestAnimationFrame(pas);
      else setTimeout(() => el.closest('[data-bouge]')?.classList.remove('bouge'), 400);
    };
    requestAnimationFrame(pas);
  });
}

// Reflet doux qui suit le pointeur sur les surfaces marquées.
export function brancherReflet() {
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.carte, .repartition > *, .reponse, .src-import');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', e.clientX - r.left + 'px');
    c.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });
}

// Transition entre deux pages, quand le navigateur sait la faire.
export function transition(fn) {
  if (calme() || !document.startViewTransition || document.visibilityState !== 'visible' || !transition.deja) { transition.deja = true; return fn(); }
  // Une transition interrompue (navigation rapide, onglet masqué) n'est pas une erreur.
  const t = document.startViewTransition(fn);
  for (const p of [t.ready, t.finished, t.updateCallbackDone]) p.catch(() => {});
  return t;
}
