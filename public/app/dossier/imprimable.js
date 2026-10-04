// Le dossier dans la forme qu'attend le rendu imprimable (public/dossier.js, dossierHtml).
import { premierRetenu, titre, PROVENANCE, libelleSource } from './logique.js';

const brTxt = (c, v) => (c && c.type === 'enum' ? ((c.valeurs || []).find((x) => x.v === v) || {}).libelle || v : v === 'oui' ? 'Oui' : 'Non');

function graphe(D, R, res) {
  if (!R || !res) return null;
  const C = Object.fromEntries(R.arbre.criteres.map((c) => [c.id, c]));
  return {
    version: (R.arbre.titre || '') + ' · ' + (R.arbre.nomenclature || ''), statut_version: 'de référence, rédigée par IA, non relue par un déclarant',
    resultat: { statut: res.statut, code: res.code || null },
    chemin: res.chemin.map((s) => { const n = R.arbre.noeuds[s.noeud], f = D.crit[s.critere]; return { question: C[s.critere].question, reponse: brTxt(C[s.critere], s.valeur), textes: (n.base || []).map((b) => R.T[b]).filter(Boolean).map((x) => ({ ref: x.ref, texte: x.texte, url: x.url })), citation: f.citation || '', source: f.kind === 'reponse' ? 'réponse du marchand, sans pièce' : libelleSource(f.source) }; }),
    blocage: res.statut === 'information_manquante' ? { question: C[res.critere].question, options: res.options } : null,
  };
}

export function versImprimable(D, R, res, travail, qui) {
  const t = D.tours[D.tours.length - 1], d = t.data, top = premierRetenu(d) || {};
  return {
    sku: D.produit.sku, destination: D.produit.dest, code: top.code, system: top.system, status_api: d.status, validated_by: qui, request_id: t.request_id,
    pieces: { description: D.produit.desc, fiche_technique: D.produit.ds, passages_declares_faux: D.barres },
    caracteristiques: Object.fromEntries(Object.entries(D.faits).map(([k, f]) => [k, { valeur: f.value, provenance: PROVENANCE[f.kind], detail: f.origin, passages: f.quotes || [] }])),
    tours: D.tours.map((x) => ({ cause: x.cause, statut: x.data.status, code_retenu: (premierRetenu(x.data) || {}).code || null, confiance: (premierRetenu(x.data) || {}).confidence ?? null, request_id: x.request_id, secondes: x.secondes, source: x.source })),
    preuves: (top.evidence || []).map((e) => ({ ref: e.ref, url: e.url, extrait: e.excerpt, version: e.source_version })),
    decisions_officielles_proches: ((d.provenance && d.provenance.precedents) || []).map((x) => { const a = D.applic[x.ruling_id]; return a && a !== 'encours' && !a.erreur ? { ...x, applicabilite: a } : x; }),
    obligations: D.oblig && D.oblig !== 'encours' && !D.oblig.erreur ? D.oblig : null,
    photo: D.produit.photo ? { fichier: D.produit.photo.nom, non_lu: D.produit.photo.illisible } : null,
    page_source: D.produit.page ? { adresse: D.produit.page.adresse, titre: D.produit.page.titre } : null,
    autres_destinations: D.autres.map((o) => ({ pays: o.country, statut: o.status || null, code: o.top ? o.top.code : null, nomenclature: o.top ? o.top.system : null, request_id: o.request_id || null, erreur: o.erreur || null })),
    epreuves: D.epreuves.map(({ brut, ...e }) => e),
    libelle: top.code ? titre(top) : '', version_nomenclature: top.source_version || null, niveau_hint: (d.coverage || {}).hint || null,
    alternatives: [...(d.candidates || []).filter((c) => c.set_aside_reason).map((c) => ({ code: c.code, libelle: titre(c), raison: c.set_aside_reason })), ...(d.alternatives_set_aside || []).map((a) => ({ code: a.code, libelle: '', raison: a.set_aside_reason }))].filter((a, i, tout) => tout.findIndex((x) => x.code === a.code) === i),
    questions_restantes: [...(t.repondu ? [] : (d.questions || []).map((q) => ({ question: q.question, pourquoi: q.why || '' }))), ...travail.map((x) => ({ question: x, pourquoi: '' }))],
    graphe: graphe(D, R, res),
    avertissement: d.advisory_disclaimer || '',
  };
}
