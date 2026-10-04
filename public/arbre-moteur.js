// Moteur de l'arbre d'interprétation : fonctions pures, partagées par la page
// (arbre.html) et par les tests (node --test). L'arbre est une donnée ; le
// modifier change le résultat sans toucher à ce fichier.
//
// arbre = { criteres:[{id,libelle,question,type:'bool'|'enum',valeurs?}], racine, noeuds:{ id: noeud } }
// noeud question = { type:'question', critere, pourquoi, base:[id de texte], branches:{ valeur: id de noeud } }
//   (critère booléen : branches 'oui' et 'non')
// noeud code     = { type:'code', code:'850440', libelle, motif, base:[...] }
// noeud hors     = { type:'hors_perimetre', motif }

export const cle = (v) => (v === true ? 'oui' : v === false ? 'non' : v == null ? null : String(v));

// Défauts de structure : renvoie la liste des problèmes, vide si l'arbre est jouable.
export function verifier(arbre) {
  const pb = [], N = arbre.noeuds || {}, C = Object.fromEntries((arbre.criteres || []).map((c) => [c.id, c]));
  if (!N[arbre.racine]) pb.push('racine absente : ' + arbre.racine);
  for (const [id, n] of Object.entries(N)) {
    if (n.type === 'question') {
      const c = C[n.critere];
      if (!c) { pb.push(`${id} : critère inconnu « ${n.critere} »`); continue; }
      const attendues = c.type === 'bool' ? ['oui', 'non'] : (c.valeurs || []).map((x) => x.v);
      for (const v of attendues) if (!(v in (n.branches || {}))) pb.push(`${id} : aucune branche pour « ${v} »`);
      for (const [v, cible] of Object.entries(n.branches || {})) {
        if (!attendues.includes(v)) pb.push(`${id} : branche « ${v} » hors des valeurs du critère`);
        if (!N[cible]) pb.push(`${id} : la branche « ${v} » mène à un nœud absent (${cible})`);
      }
    } else if (n.type === 'code') {
      if (!/^\d{6}$/.test(String(n.code || ''))) pb.push(`${id} : code à 6 chiffres attendu`);
    } else if (n.type !== 'hors_perimetre') pb.push(`${id} : type inconnu`);
  }
  // un cycle rendrait l'évaluation infinie
  const vu = new Set(), pile = new Set();
  const dfs = (id) => {
    if (pile.has(id)) { pb.push('cycle passant par ' + id); return; }
    if (vu.has(id) || !N[id]) return;
    vu.add(id); pile.add(id);
    if (N[id].type === 'question') for (const c of Object.values(N[id].branches || {})) dfs(c);
    pile.delete(id);
  };
  dfs(arbre.racine);
  for (const id of Object.keys(N)) if (!vu.has(id)) pb.push(`${id} : nœud jamais atteint`);
  return pb;
}

// Codes atteignables sous un nœud (pour dire ce qu'une information manquante départage).
export function issues(arbre, id, vu = new Set()) {
  const n = arbre.noeuds[id];
  if (!n || vu.has(id)) return [];
  vu.add(id);
  if (n.type === 'code') return [n.code];
  if (n.type === 'hors_perimetre') return ['hors périmètre'];
  return [...new Set(Object.values(n.branches).flatMap((c) => issues(arbre, c, vu)))];
}

// Parcourt l'arbre avec les valeurs connues. S'arrête sur la première information manquante.
export function evaluer(arbre, valeurs) {
  const chemin = [];
  let id = arbre.racine;
  for (let garde = 0; garde < 200; garde++) {
    const n = arbre.noeuds[id];
    if (!n) return { statut: 'erreur', message: 'nœud absent : ' + id, chemin };
    if (n.type === 'code') return { statut: 'code', code: n.code, noeud: id, chemin };
    if (n.type === 'hors_perimetre') return { statut: 'hors_perimetre', noeud: id, chemin };
    const v = cle(valeurs[n.critere]);
    if (v == null || !(v in n.branches)) {
      return { statut: 'information_manquante', noeud: id, critere: n.critere, chemin,
        options: Object.fromEntries(Object.entries(n.branches).map(([k, c]) => [k, issues(arbre, c)])) };
    }
    chemin.push({ noeud: id, critere: n.critere, valeur: v });
    id = n.branches[v];
  }
  return { statut: 'erreur', message: 'parcours trop long', chemin };
}

// Rejoue l'arbre sur les décisions officielles : combien il en reproduit au niveau 6 chiffres.
export function rejouer(arbre, decisions) {
  const lignes = decisions.map((d) => {
    const valeurs = Object.fromEntries(Object.entries(d.criteres || {}).map(([k, x]) => [k, x.valeur]));
    const r = evaluer(arbre, valeurs);
    const verdict = r.statut === 'code' ? (r.code === d.hs6 ? 'reproduit' : 'contredit') : r.statut === 'information_manquante' ? 'non_tranche' : 'hors_perimetre';
    return { id: d.id, hs6: d.hs6, obtenu: r.statut === 'code' ? r.code : null, verdict, r };
  });
  const n = (v) => lignes.filter((l) => l.verdict === v).length;
  return { lignes, total: lignes.length, reproduit: n('reproduit'), contredit: n('contredit'), non_tranche: n('non_tranche'), hors_perimetre: n('hors_perimetre') };
}

// Le « code derrière » : la même règle écrite comme une fonction lisible, régénérée à chaque modification.
export function versCode(arbre) {
  const C = Object.fromEntries(arbre.criteres.map((c) => [c.id, c]));
  const out = ['// Généré depuis l\'arbre. Ne pas modifier ici : modifier l\'arbre.', 'function classer(produit) {'];
  const rendu = (id, ind, vu) => {
    const n = arbre.noeuds[id], p = '  '.repeat(ind);
    if (!n) return out.push(`${p}throw new Error('nœud absent : ${id}');`);
    if (n.type === 'code') return out.push(`${p}return '${n.code}'; // ${n.libelle || ''}`.trimEnd());
    if (n.type === 'hors_perimetre') return out.push(`${p}return HORS_PERIMETRE; // ${n.motif || ''}`.trimEnd());
    if (vu.includes(id)) return out.push(`${p}// cycle vers ${id}`);
    const c = C[n.critere] || { libelle: n.critere, type: 'bool' };
    out.push(`${p}// ${c.libelle}${(n.base || []).length ? '  [' + n.base.join(', ') + ']' : ''}`);
    out.push(`${p}if (produit.${n.critere} == null) return demander('${n.critere}');`);
    const br = Object.entries(n.branches);
    br.forEach(([v, cible], i) => {
      const test = c.type === 'bool' ? (v === 'oui' ? `produit.${n.critere} === true` : `produit.${n.critere} === false`) : `produit.${n.critere} === '${v}'`;
      out.push(`${p}${i ? '} else ' : ''}if (${test}) {`);
      rendu(cible, ind + 1, [...vu, id]);
    });
    out.push(`${p}}`);
  };
  rendu(arbre.racine, 1, []);
  out.push('}');
  return out.join('\n');
}
