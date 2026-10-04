// Moteur de conformité des envois. Pour chaque ligne de commande : un niveau (prête,
// en attente, à vérifier, bloquée) et la liste des raisons, chacune rattachée à ce qui
// la fonde (la classification, une règle de la veille, une réponse donnée par une
// personne). Fonctions pures : mêmes entrées, même sortie, aucune horloge lue en dehors
// de `maintenant`. Partagé entre le navigateur et les tests (node --test).

export const UE = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '));
// Du moins grave au plus grave. Le niveau d'une ligne est celui de sa raison la plus grave.
export const NIVEAUX = ['pret', 'en_attente', 'a_verifier', 'bloque'];
const rang = (n) => NIVEAUX.indexOf(n);
export const pire = (a, b) => (rang(b) > rang(a) ? b : a);

const FAITS = { function: 'product function', use: 'intended use', material: 'material', power_w: 'power', voltage_v: 'voltage', weight_g: 'weight', composition: 'composition', dimensions: 'dimensions', audience: 'target audience', presentation: 'presentation' };
export const libelleFait = (f) => FAITS[f] || f;
export const fmtCode = (c) => { const s = String(c || ''); return s.length <= 6 ? s.replace(/^(\d{4})(\d{2})$/, '$1.$2') : s.replace(/^(\d{4})(\d{2})(.*)$/, '$1.$2.$3'); };
const arrondi = (x) => Math.round(x * 100) / 100;

export function dansZone(pays, zones = []) {
  return zones.some((z) => z === '*' || z === pays || (z === 'UE' && UE.has(pays)));
}
export const cleAttestation = (sku, regleId) => `${sku}|${regleId}`;

// Le code sur lequel les règles s'appliquent : le code validé par une personne, sinon
// le premier candidat retenu par le moteur, marqué provisoire.
export function codeDuProduit(classification, validation) {
  if (validation && validation.hs6) return { code: String(validation.hs6), provisoire: false };
  // Tant que le moteur demande une information, son premier candidat n'est qu'une piste.
  if (classification && classification.code && classification.statut !== 'needs_information') return { code: String(classification.code), provisoire: true };
  return { code: null, provisoire: true };
}

export function regleCouvre(regle, { pays, origine, code }) {
  if (!dansZone(pays, regle.juridictions)) return false;
  if (regle.origines && !dansZone(origine, regle.origines)) return false;
  if (regle.origines_exclues && dansZone(origine, regle.origines_exclues)) return false;
  const sh = regle.sh || ['*'];
  if (sh.includes('*')) return true;
  return Boolean(code) && sh.some((p) => String(code).startsWith(p));
}

export function phase(regle, maintenant) {
  const debut = Date.parse(regle.debut), fin = regle.fin ? Date.parse(regle.fin) : Infinity;
  if (maintenant < debut) return 'a_venir';
  return maintenant >= fin ? 'expiree' : 'en_vigueur';
}

// Ce que dit la classification du produit, ramené à une raison.
export function raisonClassification(cl, validation) {
  if (validation && validation.hs6) return { niveau: 'pret', type: 'code_valide', texte: `Code ${fmtCode(validation.hs6)} validated by ${validation.par}` };
  if (!cl) return { niveau: 'en_attente', type: 'classification', texte: 'Classification not done yet' };
  if (cl.enCours) return { niveau: 'en_attente', type: 'classification', texte: 'Classification in progress' };
  if (cl.erreur) return { niveau: 'a_verifier', type: 'classification', texte: 'Classification failed: ' + cl.erreur };
  const codes = (cl.candidats || []).filter((c) => !c.ecarte).map((c) => fmtCode(c.code));
  switch (cl.statut) {
    case 'needs_information': return { niveau: 'a_verifier', type: 'question', texte: 'Missing information: ' + ((cl.questions || []).map((q) => libelleFait(q.fait)).join(', ') || 'to be specified') };
    case 'ambiguous': return { niveau: 'a_verifier', type: 'validation', texte: codes.length > 1 ? 'Several codes remain plausible: ' + codes.join(', ') : `Code ${fmtCode(cl.code)} proposed, judged ambiguous by the engine` };
    case 'classified': case 'needs_review': return { niveau: 'a_verifier', type: 'validation', texte: `Code ${fmtCode(cl.code)} proposed, to validate` };
    case 'unsupported_jurisdiction': return { niveau: 'a_verifier', type: 'classification', texte: 'No code established by the engine' };
    default: return { niveau: 'a_verifier', type: 'classification', texte: 'Classification to redo (' + (cl.statut || 'unknown status') + ')' };
  }
}

// Une exigence (marquage, certificat, condition d'expédition) : remplie, refusée ou sans réponse.
function raisonExigence(regle, attestation, base) {
  const e = regle.effet;
  if (attestation && attestation.reponse === true) return { ...base, niveau: 'pret', type: 'exigence_remplie', texte: e.si_oui || 'Requirement met: ' + regle.titre };
  if (attestation && attestation.reponse === false) return { ...base, niveau: e.si_non || 'bloque', type: 'exigence_refusee', texte: e.si_non_texte || 'Requirement not met: ' + regle.titre };
  return { ...base, niveau: 'a_verifier', type: 'exigence', texte: e.question };
}

// Surcoût d'une règle sur une ligne, et ce qui reste évitable avant son entrée en vigueur.
function effetFinancier(regle, ph, ligne, valeur) {
  const e = regle.effet, expediee = ligne.expedition === 'expediee';
  if (e.type === 'taxe_fixe') {
    if (ph !== 'en_vigueur' || expediee) return null;
    if (e.valeur_max && !((ligne.valeurCommande ?? valeur) < e.valeur_max)) return null;
    return { surcout: e.montant, texte: `${e.libelle}: ${e.montant} ${e.devise || ''} per item`.trim() };
  }
  // Une ligne déjà expédiée n'est plus exposée : partie avant l'entrée en vigueur, elle
  // relève de la clause « marchandises en transit » ; partie après, son coût est acquis.
  if (expediee) return null;
  const montant = arrondi((valeur * e.points) / 100);
  if (ph === 'en_vigueur') return { surcout: montant, texte: `+${e.points} points of duty: ${montant} ${ligne.devise || ''}`.trim() };
  return { evitable: montant, texte: `+${e.points} points of duty when the measure takes effect: ${montant} ${ligne.devise || ''} avoidable by shipping before`.trim() };
}

function raisonRegle(regle, ph, ligne, valeur, ctx, provisoire) {
  const base = { regle: regle.id, sur_code_provisoire: provisoire && !(regle.sh || ['*']).includes('*') };
  const t = regle.effet.type;
  if (t === 'exigence') {
    if (ph === 'a_venir') return { ...base, niveau: 'pret', type: 'a_venir', texte: 'Upcoming: ' + regle.titre };
    return raisonExigence(regle, ctx.attestations[cleAttestation(ligne.sku, regle.id)], base);
  }
  if (t === 'interdiction') {
    if (ph === 'a_venir') return { ...base, niveau: 'pret', type: 'a_venir', texte: 'Upcoming: ' + regle.titre, echeance: regle.debut };
    return { ...base, niveau: 'bloque', type: 'interdiction', texte: regle.effet.texte || regle.titre };
  }
  if (t === 'droit_additionnel' || t === 'taxe_fixe') {
    const f = effetFinancier(regle, ph, ligne, valeur);
    if (!f) return null;
    return { ...base, niveau: 'pret', type: f.evitable ? 'echeance' : 'surcout', texte: f.texte, surcout: f.surcout || 0, evitable: f.evitable || 0, echeance: f.evitable ? regle.debut : undefined };
  }
  if (t === 'info' && ph === 'en_vigueur') return { ...base, niveau: 'pret', type: 'info', texte: regle.effet.texte || regle.titre };
  return null;
}

// État d'une ligne de commande.
// ctx : { classification, validation, attestations, regles, maintenant }
export function etatLigne(ligne, ctx) {
  const c = { attestations: {}, regles: [], ...ctx };
  const { code, provisoire } = codeDuProduit(c.classification, c.validation);
  const valeur = arrondi((ligne.quantite || 1) * (ligne.prixUnitaire || 0));
  const raisons = [raisonClassification(c.classification, c.validation)];
  for (const r of c.regles) {
    if (!regleCouvre(r, { pays: ligne.pays, origine: ligne.origine, code })) continue;
    const ph = phase(r, c.maintenant);
    if (ph === 'expiree') continue;
    const x = raisonRegle(r, ph, ligne, valeur, c, provisoire);
    if (x) raisons.push(x);
  }
  const niveau = raisons.reduce((n, r) => pire(n, r.niveau), 'pret');
  const surcout = arrondi(raisons.reduce((s, r) => s + (r.surcout || 0), 0));
  const evitable = arrondi(raisons.reduce((s, r) => s + (r.evitable || 0), 0));
  return { niveau, raisons, code, provisoire, valeur, surcout, evitable, principale: raisonPrincipale(raisons, niveau) };
}

// La raison à montrer en premier : la plus grave ; à niveau égal, celle qui demande un
// geste, puis celle qui coûte (échéance, surcoût), puis le reste.
const POIDS = { interdiction: 6, exigence_refusee: 5, question: 4, exigence: 3, validation: 3, classification: 2, echeance: 1, surcout: 0.8, a_venir: 0.6, exigence_remplie: 0.4, info: 0.3, code_valide: 0 };
export function raisonPrincipale(raisons, niveau) {
  const candidates = raisons.filter((r) => r.niveau === niveau);
  return candidates.sort((a, b) => (POIDS[b.type] || 0) - (POIDS[a.type] || 0))[0] || raisons[0];
}

// Valeur totale de chaque commande, recopiée sur ses lignes (seuils par envoi).
export function avecValeurCommande(lignes) {
  const tot = {};
  for (const l of lignes) tot[l.commande] = arrondi((tot[l.commande] || 0) + (l.quantite || 1) * (l.prixUnitaire || 0));
  return lignes.map((l) => ({ ...l, valeurCommande: tot[l.commande] }));
}

const compteVide = () => ({ pret: 0, en_attente: 0, a_verifier: 0, bloque: 0 });

// Évaluation d'un portefeuille de commandes.
// ctx : { classifications: {sku}, validations: {sku}, attestations, regles, maintenant }
export function evaluer(lignes, ctx) {
  const evaluees = avecValeurCommande(lignes).map((l) => ({ ...l, etat: etatLigne(l, { classification: (ctx.classifications || {})[l.sku], validation: (ctx.validations || {})[l.sku], attestations: ctx.attestations || {}, regles: ctx.regles || [], maintenant: ctx.maintenant }) }));
  const parPays = {}, parProduit = {}, totaux = { lignes: 0, compte: compteVide(), surcout: 0, evitable: 0, valeur: 0 };
  for (const l of evaluees) {
    if (l.expedition === 'expediee') continue;
    const n = l.etat.niveau;
    const p = (parPays[l.pays] ||= { niveau: 'pret', lignes: 0, compte: compteVide(), surcout: 0, evitable: 0, valeur: 0 });
    const q = (parProduit[l.sku] ||= { niveau: 'pret', lignes: 0, parPays: {} });
    for (const agg of [p, totaux]) { agg.lignes++; agg.compte[n]++; agg.surcout = arrondi(agg.surcout + l.etat.surcout); agg.evitable = arrondi(agg.evitable + l.etat.evitable); agg.valeur = arrondi(agg.valeur + l.etat.valeur); }
    p.niveau = pire(p.niveau, n);
    q.lignes++; q.niveau = pire(q.niveau, n); q.parPays[l.pays] = pire(q.parPays[l.pays] || 'pret', n);
  }
  return { lignes: evaluees, parPays, parProduit, totaux, echeances: echeances(evaluees, ctx.regles || []) };
}

// Échéances à venir : par règle, les lignes encore à expédier qu'elle touchera et le montant évitable.
function echeances(evaluees, regles) {
  const out = {};
  for (const l of evaluees) {
    if (l.expedition === 'expediee') continue;
    for (const r of l.etat.raisons) {
      if (!r.echeance) continue;
      const e = (out[r.regle] ||= { regle: r.regle, debut: r.echeance, lignes: 0, commandes: new Set(), evitable: 0 });
      e.lignes++; e.commandes.add(l.commande); e.evitable = arrondi(e.evitable + (r.evitable || 0));
    }
  }
  const titres = Object.fromEntries(regles.map((r) => [r.id, r.titre]));
  return Object.values(out).map((e) => ({ ...e, commandes: e.commandes.size, titre: titres[e.regle] || e.regle })).sort((a, b) => Date.parse(a.debut) - Date.parse(b.debut));
}

// Ce qu'une personne doit trancher, classé par impact : questions du moteur, codes à
// valider, exigences sans réponse. Une entrée par produit (et par règle pour les exigences).
export function aTraiter(evaluation, ctx) {
  const items = {};
  for (const l of evaluation.lignes) {
    if (l.expedition === 'expediee') continue;
    for (const r of l.etat.raisons) {
      if (!['question', 'validation', 'exigence'].includes(r.type)) continue;
      const cle = r.type === 'exigence' ? `exigence:${l.sku}:${r.regle}` : `${r.type}:${l.sku}`;
      const it = (items[cle] ||= { cle, type: r.type, sku: l.sku, regle: r.regle || null, texte: r.texte, lignes: 0, commandes: new Set(), pays: new Set(), valeur: 0, bloquees: 0 });
      it.lignes++; it.commandes.add(l.commande); it.pays.add(l.pays); it.valeur = arrondi(it.valeur + l.etat.valeur);
      if (l.etat.niveau === 'bloque') it.bloquees++;
    }
  }
  const ordre = { question: 0, validation: 1, exigence: 2 };
  return Object.values(items)
    .map((it) => ({ ...it, commandes: it.commandes.size, pays: [...it.pays].sort() }))
    .sort((a, b) => b.lignes - a.lignes || b.valeur - a.valeur || ordre[a.type] - ordre[b.type]);
}

// Avant / après une réponse hypothétique : combien de lignes à expédier changent de niveau.
export function consequence(lignes, ctx, modif) {
  const avant = evaluer(lignes, ctx), apres = evaluer(lignes, { ...ctx, ...modif(ctx) });
  const changees = apres.lignes.filter((l, i) => l.expedition !== 'expediee' && l.etat.niveau !== avant.lignes[i].etat.niveau);
  const vers = compteVide();
  for (const l of changees) vers[l.etat.niveau]++;
  return { changees: changees.length, vers, avant: avant.totaux.compte, apres: apres.totaux.compte };
}
