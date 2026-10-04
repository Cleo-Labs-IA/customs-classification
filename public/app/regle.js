// La règle encodée (arbre d'interprétation) et ses textes, chargés une fois pour tout
// l'écran. La version de référence sert au dossier ; une version modifiée et signée dans
// l'arbre reste une version de travail, gardée dans ce navigateur.
const json = (f) => fetch('/data/' + f).then((r) => { if (!r.ok) throw new Error(f + ' missing'); return r.json(); });
let base = null, decisions = null;

export async function regle() {
  if (!base) base = Promise.all([json('arbre.json'), json('textes.json')]).then(([arbre, textes]) => ({ arbre, textes, T: Object.fromEntries(textes.map((t) => [t.id, t])) })).catch(() => null);
  return base;
}
export async function decisionsOfficielles() {
  if (!decisions) decisions = json('decisions.json').catch(() => []);
  return decisions;
}

const CLE = 'arbre_modifie';
const taille = (a) => JSON.stringify(a).length;
export function versionDeTravail(reference) {
  try {
    const s = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (s && s.ref === taille(reference)) return { arbre: s.arbre, journal: s.journal || [] };
  } catch { /* version de travail illisible : on repart de la référence */ }
  return { arbre: structuredClone(reference), journal: [] };
}
export function garderVersion(reference, arbre, journal) {
  try { localStorage.setItem(CLE, JSON.stringify({ ref: taille(reference), arbre, journal })); } catch { /* non gardée */ }
}
