// Requirements engine: pure functions shared by the page and the tests.
// The rules are data (public/data/exigences.json); this file only executes them.
//
// data = { criteres:[{id,question,type:'bool'|'enum',valeurs?}], roles:[{id,libelle,si,pourquoi,base}],
//          exigences:[{id,titre,acte,applicable_si,pourquoi,base,obligations:[{id,roles:[..],texte,resume,qui_agit,preuves:[{id,libelle,type,reperes_etiquette?}]}]}] }
// condition = { tous:[{critere,parmi:[values]}], aucun:[{critere,parmi:[values]}] }

const connu = (v) => v !== undefined && v !== null && v !== '';

// 'oui' | 'non' | 'inconnu', with the criteria that are still missing.
export function tester(cond, valeurs) {
  const manque = new Set();
  let faux = false;
  for (const c of (cond && cond.tous) || []) {
    const v = valeurs[c.critere];
    if (!connu(v)) manque.add(c.critere); else if (!c.parmi.includes(v)) faux = true;
  }
  for (const c of (cond && cond.aucun) || []) {
    const v = valeurs[c.critere];
    if (!connu(v)) manque.add(c.critere); else if (c.parmi.includes(v)) faux = true;
  }
  if (faux) return { etat: 'non', manque: [] };          // one known condition already fails: no need to ask more
  if (manque.size) return { etat: 'inconnu', manque: [...manque] };
  return { etat: 'oui', manque: [] };
}

// The legal role of the seller: the first role whose condition holds.
export function role(data, valeurs) {
  const manque = new Set();
  for (const r of data.roles || []) {
    const t = tester(r.si, valeurs);
    if (t.etat === 'oui') return { etat: 'etabli', role: r.id, manque: [] };
    if (t.etat === 'inconnu') { t.manque.forEach((m) => manque.add(m)); return { etat: 'a_determiner', role: null, manque: [...manque] }; }
  }
  return { etat: 'aucun', role: null, manque: [] };
}

// A marking is "seen on the label" when one of its markers appears as a whole token in a transcribed line.
export function vuSurEtiquette(preuve, lignes) {
  const reperes = preuve.reperes_etiquette || [];
  for (const l of lignes || []) for (const r of reperes) {
    const re = new RegExp('(^|[^A-Za-z0-9])' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z0-9])', 'i');
    if (re.test(l)) return l;
  }
  return null;
}

// Turns the rules into work: for each requirement, why it applies, what evidence it calls for,
// what the file already holds, what is missing and who must act.
export function evaluerExigences(data, { valeurs = {}, etiquette = [], declarees = [] } = {}) {
  const R = role(data, valeurs);
  const lignes = (data.exigences || []).map((e) => {
    const t = tester(e.applicable_si, valeurs);
    if (t.etat === 'non') return { id: e.id, etat: 'non_applicable', manque: [], obligations: [] };
    if (t.etat === 'inconnu') return { id: e.id, etat: 'a_determiner', manque: t.manque, obligations: [] };
    const obligations = (e.obligations || []).filter((o) => R.role && (o.roles || []).includes(R.role)).map((o) => ({
      id: o.id,
      preuves: (o.preuves || []).map((p) => {
        const ligne = p.type === 'marquage' ? vuSurEtiquette(p, etiquette) : null;
        return { id: p.id, etat: ligne ? 'vu_sur_etiquette' : declarees.includes(p.id) ? 'declaree' : 'manquante', ligne };
      }),
    }));
    return { id: e.id, etat: 'applicable', manque: [], obligations };
  });
  const preuves = lignes.flatMap((l) => l.obligations.flatMap((o) => o.preuves));
  const uniques = (etat) => new Set(preuves.filter((p) => p.etat === etat).map((p) => p.id)).size;
  return {
    role: R, lignes,
    questions: [...new Set([...R.manque, ...lignes.flatMap((l) => l.manque)])],
    bilan: { applicables: lignes.filter((l) => l.etat === 'applicable').length, a_determiner: lignes.filter((l) => l.etat === 'a_determiner').length, non_applicables: lignes.filter((l) => l.etat === 'non_applicable').length,
      preuves_manquantes: uniques('manquante'), preuves_declarees: uniques('declaree'), marquages_vus: uniques('vu_sur_etiquette') },
  };
}

// Structural defects of the data file: empty list when it can be executed.
export function verifierExigences(data, textes = null) {
  const pb = [], C = new Set((data.criteres || []).map((c) => c.id)), T = textes ? new Set(textes.map((t) => t.id)) : null, ids = new Set();
  const cond = (ou, c) => { for (const k of ['tous', 'aucun']) for (const x of (c && c[k]) || []) { if (!C.has(x.critere)) pb.push(`${ou}: unknown criterion "${x.critere}"`); if (!Array.isArray(x.parmi) || !x.parmi.length) pb.push(`${ou}: empty "parmi" for ${x.critere}`); } };
  const base = (ou, b) => { if (!(b || []).length) pb.push(`${ou}: no legal basis`); if (T) for (const id of b || []) if (!T.has(id)) pb.push(`${ou}: unknown text "${id}"`); };
  const R = new Set((data.roles || []).map((r) => r.id));
  for (const r of data.roles || []) { cond('role ' + r.id, r.si); base('role ' + r.id, r.base); }
  for (const e of data.exigences || []) {
    if (ids.has(e.id)) pb.push(`duplicate id ${e.id}`); ids.add(e.id);
    cond(e.id, e.applicable_si); base(e.id, e.base);
    if (!(e.obligations || []).length) pb.push(`${e.id}: no obligation`);
    for (const o of e.obligations || []) {
      if (!(o.roles || []).length) pb.push(`${o.id}: no role`);
      for (const x of o.roles || []) if (!R.has(x)) pb.push(`${o.id}: unknown role "${x}"`);
      if (T && !T.has(o.texte)) pb.push(`${o.id}: unknown text "${o.texte}"`);
      if (!(o.preuves || []).length) pb.push(`${o.id}: no evidence expected`);
      for (const p of o.preuves || []) if (!['document', 'marquage', 'information'].includes(p.type)) pb.push(`${p.id}: unknown evidence type`);
    }
  }
  return pb;
}
