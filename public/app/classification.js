// Réponse de POST /v2/customs/classifications ramenée à ce dont le cockpit a besoin.
// Chaque champ est recopié de la réponse ; rien n'est complété.
const titre = (c) => (c && c.title && (c.title.en || c.title.fr)) || '';

export function normaliserClassification(data, meta = {}) {
  if (!data || typeof data !== 'object') return { erreur: 'empty response', ...meta };
  const cands = Array.isArray(data.candidates) ? data.candidates : [];
  const top = cands.find((c) => !c.set_aside_reason) || null;
  const ecartes = (Array.isArray(data.alternatives_set_aside) ? data.alternatives_set_aside : []).filter((a) => !cands.some((c) => c.code === a.code));
  return {
    statut: data.status || null,
    code: top ? String(top.code) : null,
    systeme: top ? top.system || null : null,
    titre: titre(top),
    confiance: top && typeof top.confidence === 'number' ? top.confidence : null,
    justification: (top && top.rationale) || '',
    candidats: [...cands.map((c) => ({ code: String(c.code), titre: titre(c), confiance: typeof c.confidence === 'number' ? c.confidence : null, ecarte: c.set_aside_reason || null, justification: c.rationale || '' })),
      ...ecartes.map((a) => ({ code: String(a.code), titre: '', confiance: null, ecarte: a.set_aside_reason || 'set aside', justification: '' }))],
    questions: (Array.isArray(data.questions) ? data.questions : []).map((q) => ({ fait: q.fact, question: q.question, pourquoi: q.why || '' })),
    precedents: ((data.provenance && data.provenance.precedents) || []).map((p) => ({ id: p.ruling_id, code: p.official_code, date: p.ruling_date, url: p.url, similarite: p.similarity })),
    couverture: (data.coverage && data.coverage.hint) || '',
    avertissement: data.advisory_disclaimer || '',
    ...meta,
  };
}

// Réponse enregistrée pour exactement les mêmes pièces (description et faits), ou null.
// Sert hors ligne : on ne rejoue jamais une réponse obtenue pour d'autres pièces.
const norme = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const trie = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));
export function reponseEnregistree(liste, { description, faits = {} }) {
  return (liste || []).find((r) => norme(r.envoye.description) === norme(description) && trie(r.envoye.facts) === trie(faits)) || null;
}
