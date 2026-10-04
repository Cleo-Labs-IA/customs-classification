// One decision for the file. The engine (Cleo API) and the encoded rule are two
// readings of the same product; this module says which code is retained, why,
// and what still blocks validation. Pure function, shared by the page and the tests.
//
// entree = { conflits, moteur: { statut, code, questions }, regle: { statut, code } | null,
//            arbitrage: { code, raison, qui } | null, niveauRequis: 'hs6' | 'national', niveauObtenu: 'hs6' | 'national' | null }

const hs6 = (c) => (c ? String(c).replace(/\D/g, '').slice(0, 6) : null);
export const arbitrageValide = (a) => Boolean(a && /^\d{6}$/.test(hs6(a.code) || '') && String(a.raison || '').trim().length >= 20 && String(a.qui || '').trim().length >= 2);

export function decider({ conflits = 0, moteur = {}, regle = null, arbitrage = null, niveauRequis = 'hs6', niveauObtenu = null } = {}) {
  const blocages = [], m = hs6(moteur.code), r = regle && regle.statut === 'code' ? hs6(regle.code) : null;
  const add = (id, message) => blocages.push({ id, message });
  if (conflits > 0) add('contradiction', `${conflits} contradiction${conflits === 1 ? '' : 's'} between the documents must be resolved.`);
  if ((moteur.questions || 0) > 0) add('question_moteur', 'A question from the classification engine is still open.');
  if (regle && regle.statut === 'information_manquante') add('question_regle', 'The encoded rule is waiting for a fact it needs.');

  // which code is on the table, and where it comes from
  let code = null, origine = null, besoinArbitrage = false, motif = null;
  if (m && r && m === r) { code = m; origine = 'convergence'; }
  else if (m && r) { besoinArbitrage = true; motif = `The engine proposes ${m} and the encoded rule concludes ${r}.`; }
  else if (r && !m) { besoinArbitrage = true; motif = `The encoded rule concludes ${r} and the engine retained no code.`; }
  else if (m && !r) {
    const couvert = regle && regle.statut !== 'hors_perimetre';
    if (couvert) { /* rule still open: the engine code is provisional, the open question already blocks */ code = m; origine = 'moteur'; }
    else if (moteur.statut === 'classified' || moteur.statut === 'needs_review') { code = m; origine = 'moteur'; }
    else { besoinArbitrage = true; motif = `The engine alone proposes ${m} without settling on it, and no encoded rule covers this product.`; }
  } else add('aucun_code', 'No code is proposed by the engine or by the encoded rule.');

  if (besoinArbitrage) {
    if (arbitrageValide(arbitrage)) { code = hs6(arbitrage.code); origine = 'arbitrage'; besoinArbitrage = false; }
    else add('arbitrage', motif + ' A declarant must retain one code, give the reason and sign.');
  }
  if (niveauRequis === 'national' && niveauObtenu !== 'national') add('niveau_national', 'A national tariff line is required and only the six-digit level is established.');

  const peutValider = blocages.length === 0 && Boolean(code);
  return { code, origine, blocages, besoinArbitrage, motif, peutValider, etat: peutValider ? 'pret' : blocages.some((b) => b.id === 'arbitrage' || b.id === 'contradiction') ? 'incoherent' : 'incomplet', codes: { moteur: m, regle: r } };
}
