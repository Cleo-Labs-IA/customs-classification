// Tests de l'applicabilité. Les textes, les réponses « du modèle » et les verdicts
// attendus sont écrits à la main ici : l'oracle ne vient pas du module.
// Le test en direct (réseau + Bedrock) est sauté sans clé ni accès ; il écrit ses
// sorties dans le fichier nommé par APPLICABILITE_SORTIE quand il est fourni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KEY } from '../app.mjs';
import * as mod from '../lib/applicabilite.mjs';
const { applicabilite, decider, verifierElements, lireDecisionUK, statutUS } = mod;

const TEXTE = 'The merchandise under consideration is a power supply adapter for use with automatic data processing machines.\nThe adapter has a maximum output of 65 Watts and is packaged with a North American and European plug.\nThe power supply adapter is an external type.';
const CHARGEUR = { description: 'External power supply adapter for laptops, 65 W output, sold with two plugs.', fiche_technique: 'Output: 20 V DC, 65 W. Housing: polycarbonate.', caracteristiques: { function: 'power conversion' } };
const PELUCHE = { description: 'Plush toy bear, polyester filling, for children over 3 years.', fiche_technique: '', caracteristiques: {} };
const DEC = { ruling_id: 'N000001', source: 'US_CBP_CROSS', url: 'https://rulings.cbp.gov/ruling/N000001', official_code: '8504.40.7007', ruling_date: '2019-06-11' };
const SRC = { description: CHARGEUR.description, fiche_technique: CHARGEUR.fiche_technique, 'caracteristique:function': 'power conversion' };

// Faux réseau : texte sur /api/ruling, statut sur /api/search.
const reseau = ({ texte = TEXTE, numero = 'N000001', revokedBy = [], modifiedBy = [], operationallyRevoked = false, statutHttp = 200, rechercheHttp = 200, rulings } = {}) => async (url) => {
  const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body, text: async () => JSON.stringify(body) });
  if (String(url).includes('/api/search')) return json(rechercheHttp, { rulings: rulings || [{ rulingNumber: 'N000001', revokedBy, modifiedBy, operationallyRevoked }] });
  return json(statutHttp, { text: texte, rulingNumber: numero });
};
const modele = (reponse) => async () => reponse;
const commun = { aspect: 'fonction', produit: { source: 'description', citation: 'External power supply adapter' }, decision: { citation: 'power supply adapter for use with automatic data processing machines' } };
const unCommun = modele({ points_communs: [commun], differences: [] });
const vite = { pauseMs: 1 };

// Page britannique : le numéro figure dans le titre, les champs dans une liste.
const pageUK = ({ numero = '600000001', fin = '01 Sep 2027', description = 'Multiport hub, 3 USB ports &amp; SD card reader.  Retail packaging.' } = {}) => `<html><head><title>Information for ruling ${numero} - Search for Advance Tariff Rulings - GOV.UK</title></head><body>
  <h1 class="govuk-heading-xl">
    Information for ruling ${numero}
  </h1><dl><div><dt class="k"> Start date </dt><dd class="v"> 02 Sep 2024 </dd></div>${fin === null ? '' : `<div><dt>Expiry date</dt><dd>${fin}</dd></div>`}
    <div><dt>Commodity code</dt><dd><a href="#"><span class="commodity-code">8471800000</span> <span class="no-print">(opens in new tab)</span></a></dd></div>
    <div><dt>Description</dt><dd> ${description} </dd></div>
    <div><dt>Keywords</dt><dd><ul><li><span>COMPUTER HUBS</span></li><li><span>WITH USB SLOT</span></li></ul></dd></div>
    <div><dt>Justification</dt><dd>GIR 1 has been used.\nGIR 6 has been used.</dd></div></dl></body></html>`;
const servirUK = (html) => async () => ({ status: 200, ok: true, text: async () => html });
const DEC_UK = { ruling_id: 'UK600000001', source: 'UK_HMRC_ATAR', url: 'https://www.tax.service.gov.uk/search-for-advance-tariff-rulings/ruling/600000001', official_code: '8471800000', ruling_date: '2024-09-02' };
const HUB = { description: 'USB hub with card reader', fiche_technique: '', caracteristiques: {} };
const communUK = modele({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'USB hub' }, decision: { citation: 'Multiport hub' } }], differences: [] });

test('decider : la table des verdicts, écrite à la main', () => {
  const pc = [{ aspect: 'Fonction' }], nonDec = [{ decisive: false }], dec = [{ decisive: true }];
  const v = (x) => decider({ revoquee: false, modifiee: false, meme_juridiction: true, ...x }).verdict;
  assert.equal(v({ points_communs: [], differences: [] }), 'non_verifiable');
  assert.equal(v({ points_communs: [], differences: nonDec }), 'non_verifiable');
  assert.equal(v({ points_communs: pc, differences: [] }), 'applicable');
  assert.equal(v({ points_communs: pc, differences: nonDec }), 'partiellement');
  assert.equal(v({ points_communs: pc, differences: [...nonDec, ...dec] }), 'non_applicable');
  assert.equal(v({ points_communs: [], differences: dec }), 'non_applicable');
});

test('decider : révoquée, modifiée, expirée ou statut inconnu ne sort jamais « applicable »', () => {
  const base = { points_communs: [{ aspect: 'Fonction' }], differences: [], meme_juridiction: true, modifiee: false };
  assert.equal(decider({ ...base, revoquee: true }).verdict, 'partiellement');
  assert.match(decider({ ...base, revoquee: true }).motif, /révoquée/);
  assert.equal(decider({ ...base, revoquee: false, modifiee: true }).verdict, 'partiellement');
  assert.equal(decider({ ...base, revoquee: false, expiree: true }).verdict, 'partiellement');
  assert.equal(decider({ ...base, revoquee: false }).verdict, 'applicable');
  // Défaut 2 : révocation inconnue.
  assert.equal(decider({ ...base, revoquee: null }).verdict, 'partiellement');
  assert.match(decider({ ...base, revoquee: null }).motif, /ne permet pas de savoir/);
  // Défaut 11 : modification inconnue.
  assert.equal(decider({ ...base, revoquee: false, modifiee: null }).verdict, 'partiellement');
  // Défaut 3 : une date de fin attendue mais illisible.
  assert.equal(decider({ ...base, revoquee: false, fin_attendue: true, expiree: null }).verdict, 'partiellement');
  assert.match(decider({ ...base, revoquee: false, fin_attendue: true, expiree: null }).motif, /fin de validité/);
  assert.equal(decider({ ...base, revoquee: false, fin_attendue: true, expiree: false }).verdict, 'applicable');
  // Aucun point commun sur la fonction : pas « applicable ».
  assert.equal(decider({ ...base, revoquee: false, points_communs: [{ aspect: 'Matière' }] }).verdict, 'partiellement');
  assert.match(decider({ ...base, revoquee: false, meme_juridiction: false, nom_source: 'douane américaine (CBP)' }).motif, /n'est pas la douane du pays de destination/);
});

test('verifierElements : une citation inexacte est jetée et comptée', () => {
  const r = verifierElements({
    points_communs: [
      commun,
      { aspect: 'fonction', produit: { source: 'description', citation: 'External power adapter' }, decision: { citation: 'power supply adapter' } }, // côté produit inventé
      { aspect: 'fonction', produit: { source: 'description', citation: '65 W output' }, decision: { citation: 'maximum output of 65 W, external' } }, // côté décision inventé
      { aspect: 'fonction', produit: { source: 'notice', citation: '65 W output' }, decision: { citation: '65 Watts' } }, // pièce inexistante
      { aspect: 'couleur', produit: { source: 'description', citation: '65 W output' }, decision: { citation: '65 Watts' } }, // hors critères
      { aspect: 'alimentation_donnees', produit: { source: 'caracteristique:function', citation: 'power conversion' }, decision: { citation: '65 Watts' } },
    ],
    differences: [
      { aspect: 'presentation', produit: null, decision: { citation: 'packaged with a North American and European plug' }, decisive: true, pourquoi_ca_compte: 'Le conditionnement compte.' },
      { aspect: 'matiere', produit: { source: 'fiche_technique', citation: 'Housing: steel' }, decision: { citation: 'external type' }, decisive: true, pourquoi_ca_compte: 'x' },
      { aspect: 'fonction', produit: { source: 'fiche_technique', citation: 'Output: 20 V DC' }, decision: { citation: 'external type' }, decisive: false, pourquoi_ca_compte: 'Relève du 8504.40 selon la décision.' },
    ],
  }, SRC, TEXTE);
  assert.equal(r.points_communs.length, 2);
  assert.equal(r.rejetes, 4);
  assert.equal(r.hors_criteres, 1);
  assert.equal(r.differences.length, 2);
  assert.equal(r.differences[0].produit, null);
  assert.equal(r.differences[0].decisive, false, 'un silence des pièces n\'est jamais décisif');
  assert.equal(r.differences[0].pourquoi_ca_compte, 'Le conditionnement compte.');
  assert.equal(r.differences[1].pourquoi_ca_compte, '', 'une explication qui porte un code tarifaire est retirée');
  assert.equal(r.points_communs[0].decision.citation, 'power supply adapter for use with automatic data processing machines');
});

test('défaut 1 : une citation de deux lettres, coupée dans un mot ou prise dans une négation ne prouve rien', async () => {
  // (a) « to » trouvé dans « toy » et dans « automatic ».
  const to = modele({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'to' }, decision: { citation: 'to' } }], differences: [] });
  const a = await applicabilite({ produit: PELUCHE, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: to });
  assert.equal(a.verdict, 'non_verifiable');
  assert.deepEqual([a.points_communs.length, a.rejetes], [0, 1]);
  // Coupée au milieu d'un mot, même longue.
  const coupe = verifierElements({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'ower supply adapt' }, decision: { citation: 'ower supply adapt' } }], differences: [] }, SRC, TEXTE);
  assert.deepEqual([coupe.points_communs.length, coupe.rejetes], [0, 1]);
  // Un seul mot, ou des mots vides seulement.
  const vide = verifierElements({ points_communs: [
    { aspect: 'fonction', produit: { source: 'description', citation: 'adapter' }, decision: { citation: 'adapter' } },
    { aspect: 'fonction', produit: { source: 'description', citation: 'for' }, decision: { citation: 'is a' } },
  ], differences: [] }, SRC, TEXTE);
  assert.deepEqual([vide.points_communs.length, vide.rejetes], [0, 2]);
  // (b) le produit dit qu'il n'est PAS ce que la décision décrit.
  const cable = { description: 'USB cable. This product is not a power supply adapter.', fiche_technique: '', caracteristiques: {} };
  const nie = modele({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'power supply adapter' }, decision: { citation: 'power supply adapter' } }], differences: [] });
  const b = await applicabilite({ produit: cable, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: nie });
  assert.equal(b.verdict, 'non_verifiable');
  assert.deepEqual([b.points_communs.length, b.rejetes], [0, 1]);
  // Un fait déclaré se cite en entier, pas par morceau.
  const fait = verifierElements({ points_communs: [{ aspect: 'fonction', produit: { source: 'caracteristique:function', citation: 'power' }, decision: { citation: 'power supply adapter' } }], differences: [] }, SRC, TEXTE);
  assert.deepEqual([fait.points_communs.length, fait.rejetes], [0, 1]);
});

test('défaut 14 : la citation rendue est celle du modèle, au caractère près, casse comprise', () => {
  const casse = verifierElements({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'External power supply adapter' }, decision: { citation: 'POWER SUPPLY ADAPTER' } }], differences: [] }, SRC, TEXTE);
  assert.deepEqual([casse.points_communs.length, casse.rejetes], [0, 1]);
  const turc = verifierElements({ points_communs: [{ aspect: 'fonction', produit: { source: 'description', citation: 'external POWER supply' }, decision: { citation: 'power supply adapter' } }], differences: [] }, { description: 'İİİ External power supply' }, TEXTE);
  assert.deepEqual([turc.points_communs.length, turc.rejetes], [0, 1]);
});

test('défaut 5 : une explication qui porte un chiffre ou une balise est retirée', () => {
  const dif = (pourquoi) => ({ aspect: 'alimentation_donnees', produit: { source: 'description', citation: '65 W output' }, decision: { citation: 'maximum output of 65 Watts' }, decisive: false, pourquoi_ca_compte: pourquoi });
  const phrases = ['Relève de la position 8504.', 'Classé au 85.04 et non au 95.03.', 'Code 85 04 40 70.', 'Chapitre 95 <img src=x onerror=alert(1)>', 'Autre <b>marchandise</b>.', 'La puissance de sortie oriente le classement.'];
  const decisions = ['maximum output of 65 Watts', 'output of 65 Watts', 'of 65 Watts', '65 Watts', 'has a maximum output of 65 Watts', 'a maximum output of 65 Watts'];
  const r = verifierElements({ points_communs: [], differences: phrases.map((p, i) => ({ ...dif(p), decision: { citation: decisions[i] } })) }, SRC, TEXTE);
  assert.deepEqual(r.differences.map((d) => d.pourquoi_ca_compte), ['', '', '', '', '', 'La puissance de sortie oriente le classement.']);
  assert.equal(r.explications_retirees, 5);
});

test('défaut 8 : doublons retirés et comptés, plafond de six appliqué par le code', async () => {
  const r = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: modele({ points_communs: Array.from({ length: 40 }, () => ({ aspect: 'fonction', produit: { source: 'description', citation: 'External power supply adapter' }, decision: { citation: 'power supply adapter' } })), differences: [] }) });
  assert.equal(r.points_communs.length, 1);
  assert.equal(r.doublons, 39);
  assert.match(r.motif, /^1 point commun vérifié,/);
  const huit = ['External power supply adapter', 'power supply adapter for laptops', 'External power supply', 'supply adapter for laptops', 'power supply adapter', 'adapter for laptops', 'External power', 'supply adapter'];
  const v = verifierElements({ points_communs: huit.map((c) => ({ aspect: 'fonction', produit: { source: 'description', citation: c }, decision: { citation: 'power supply adapter' } })), differences: [] }, SRC, TEXTE);
  assert.deepEqual([v.points_communs.length, v.au_dela_du_plafond, v.doublons, v.rejetes], [6, 2, 0, 0]);
});

test('bout en bout hors ligne : chargeur proche = applicable, décision d\'une autre juridiction signalée', async () => {
  const r = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: unCommun });
  assert.equal(r.verdict, 'applicable');
  assert.equal(r.meme_juridiction, true);
  assert.deepEqual([r.decision.id, r.decision.juridiction, r.decision.revoquee, r.decision.texte_disponible, r.decision.code], ['N000001', 'US', false, true, '8504.40.7007']);
  assert.equal(typeof r.secondes, 'number');
  const fr = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'FR' }, { fetchImpl: reseau(), converseImpl: unCommun });
  assert.equal(fr.meme_juridiction, false);
  assert.match(fr.motif, /n'est pas la douane du pays de destination/);
});

test('défaut 4 : destination absente ou écrite autrement, aucune affirmation fausse', async () => {
  const run = (destination) => applicabilite({ produit: CHARGEUR, decision: DEC, destination }, { fetchImpl: reseau(), converseImpl: unCommun });
  for (const d of [undefined, null, '', 'Atlantide']) {
    const r = await run(d);
    assert.equal(r.meme_juridiction, null, String(d));
    assert.doesNotMatch(r.motif, /n'est pas la douane du pays de destination/);
    assert.match(r.motif, /Pays de destination non indiqué ou non reconnu/);
  }
  for (const d of ['USA', 'usa', ' us ', 'United States', 'États-Unis', 'Etats-Unis']) {
    const r = await run(d);
    assert.equal(r.meme_juridiction, true, d);
    assert.doesNotMatch(r.motif, /douane du pays de destination|non reconnu/);
  }
});

test('témoin négatif : une décision sur un produit sans rapport ne sort pas « applicable »', async () => {
  // Modèle honnête : aucune citation commune possible, une différence décisive citée des deux côtés.
  const honnete = modele({ points_communs: [], differences: [{ aspect: 'fonction', produit: { source: 'description', citation: 'Plush toy bear' }, decision: { citation: 'power supply adapter' }, decisive: true, pourquoi_ca_compte: 'Un jouet et une alimentation électrique ne sont pas la même marchandise.' }] });
  const a = await applicabilite({ produit: PELUCHE, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: honnete });
  assert.equal(a.verdict, 'non_applicable');
  // Modèle complaisant : il affirme des points communs avec des citations que la peluche ne contient pas.
  const complaisant = modele({ points_communs: [commun, { aspect: 'presentation', produit: { source: 'description', citation: 'sold with two plugs' }, decision: { citation: 'packaged with a North American and European plug' } }], differences: [] });
  const b = await applicabilite({ produit: PELUCHE, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: complaisant });
  assert.equal(b.verdict, 'non_verifiable');
  assert.equal(b.rejetes, 2);
  assert.equal(b.points_communs.length, 0);
  // Modèle qui renvoie un verdict tout fait : il est ignoré.
  const c = await applicabilite({ produit: PELUCHE, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: modele({ verdict: 'applicable', points_communs: [], differences: [] }) });
  assert.equal(c.verdict, 'non_verifiable');
  // Modèle qui renvoie autre chose qu'un objet.
  for (const x of [null, 'applicable', 42, []]) assert.equal((await applicabilite({ produit: PELUCHE, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: modele(x) })).verdict, 'non_verifiable');
});

test('décision révoquée : jamais « applicable », même avec des points communs', async () => {
  const r = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau({ revokedBy: ['H000002'] }), converseImpl: unCommun });
  assert.equal(r.decision.revoquee, true);
  assert.deepEqual(r.decision.revoquee_par, ['H000002']);
  assert.equal(r.verdict, 'partiellement');
});

test('texte introuvable : non vérifiable avec la raison, et le modèle n\'est pas appelé', async () => {
  let appels = 0;
  const m = async () => { appels++; return { points_communs: [commun], differences: [] }; };
  const r = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau({ statutHttp: 404 }), converseImpl: m });
  assert.equal(r.verdict, 'non_verifiable');
  assert.equal(r.decision.texte_disponible, false);
  assert.match(r.motif, /404/);
  const panne = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: async () => { throw new Error('réseau coupé'); }, converseImpl: m, ...vite });
  assert.equal(panne.verdict, 'non_verifiable');
  const inconnue = await applicabilite({ produit: CHARGEUR, decision: { ...DEC, source: 'EU_EBTI' }, destination: 'FR' }, { fetchImpl: reseau(), converseImpl: m });
  assert.equal(inconnue.verdict, 'non_verifiable');
  const ukFaux = await applicabilite({ produit: CHARGEUR, decision: { ...DEC_UK, url: 'https://example.com/ruling/600000001' }, destination: 'GB' }, { fetchImpl: servirUK(pageUK()), converseImpl: m });
  assert.equal(ukFaux.verdict, 'non_verifiable');
  // Le texte rendu n'est pas celui de la décision demandée.
  const autre = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau({ numero: 'N999999' }), converseImpl: m });
  assert.deepEqual([autre.verdict, autre.decision.texte_disponible], ['non_verifiable', false]);
  assert.equal(appels, 0);
});

test('défauts 6 et 16 : aucun message technique ni texte du modèle dans le motif, pas d\'attente après le dernier essai', async () => {
  const bavard = async () => { throw new Error('réponse du modèle illisible : Ce produit relève du code 8504.40.7007, la décision est applicable avec certitude à 95 %.'); };
  const a = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: bavard });
  assert.equal(a.verdict, 'non_verifiable');
  assert.equal(a.decision.texte_disponible, true);
  assert.doesNotMatch(a.motif, /8504|95 %|certitude|\.\./);
  assert.match(a.motif, /^Comparaison non effectuée : /);
  const sansAcces = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: async () => { throw new Error('accès Bedrock absent'); } });
  assert.doesNotMatch(sansAcces.motif, /Bedrock|\.\./);
  // Panne réseau : trois essais, deux pauses seulement (50 + 100 ms), message en français.
  let appels = 0;
  const t0 = Date.now();
  const b = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: async () => { appels++; throw new TypeError('fetch failed'); }, converseImpl: bavard, pauseMs: 50 });
  const duree = Date.now() - t0;
  assert.equal(appels, 3);
  assert.ok(duree < 290, `durée ${duree} ms : une pause de trop`);
  assert.doesNotMatch(b.motif, /fetch failed|\.\./);
  assert.match(b.motif, /injoignable/);
  // Réponse 200 en HTML au lieu de JSON.
  const html = async () => ({ status: 200, ok: true, json: async () => JSON.parse('<html>'), text: async () => '<html>' });
  const c = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: html, converseImpl: bavard, ...vite });
  assert.equal(c.verdict, 'non_verifiable');
  assert.doesNotMatch(c.motif, /Unexpected|JSON|token/);
});

test('défauts 2 et 11 : statut de révocation ou de modification inconnu = jamais « applicable »', async () => {
  const run = (opts) => applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau(opts), converseImpl: unCommun, ...vite });
  const panne = await run({ rechercheHttp: 500 });
  assert.deepEqual([panne.decision.revoquee, panne.verdict], [null, 'partiellement']);
  assert.match(panne.motif, /ne permet pas de savoir/);
  const absente = await run({ rulings: [] });
  assert.deepEqual([absente.decision.revoquee, absente.verdict], [null, 'partiellement']);
  const modif = await run({ modifiedBy: null });
  assert.deepEqual([modif.decision.revoquee, modif.decision.modifiee_par, modif.verdict], [false, null, 'partiellement']);
  assert.match(modif.motif, /modifiée/);
  assert.deepEqual(statutUS({ rulings: [{ rulingNumber: 'N1', revokedBy: [], modifiedBy: ['H2'], operationallyRevoked: true }] }, 'n1'), { revoquee: true, revoquee_par: [], modifiee_par: ['H2'] });
  assert.equal(statutUS({ rulings: [{ rulingNumber: 'N1', revokedBy: null, operationallyRevoked: false }] }, 'N1').revoquee, null);
  assert.equal(statutUS({ rulings: [] }, 'N1').revoquee, null);
  assert.equal(statutUS({ rulings: [{ rulingNumber: 'N1', revokedBy: [], modifiedBy: null, operationallyRevoked: false }] }, 'N1').modifiee_par, null);
});

test('défaut 12 : l\'identifiant est nettoyé et mis en majuscules avant l\'appel', async () => {
  const vus = [];
  const f = reseau();
  const r = await applicabilite({ produit: CHARGEUR, decision: { ...DEC, ruling_id: ' n000001 ' }, destination: 'US' }, { fetchImpl: (u, o) => { vus.push(String(u)); return f(u, o); }, converseImpl: unCommun });
  assert.equal(r.decision.id, 'N000001');
  assert.equal(r.verdict, 'applicable');
  assert.ok(vus.every((u) => u.includes('N000001') && !u.includes('n000001') && !u.includes('%20')), vus.join(' '));
  const illisible = await applicabilite({ produit: CHARGEUR, decision: { ...DEC, ruling_id: '../admin?x=1' }, destination: 'US' }, { fetchImpl: reseau(), converseImpl: unCommun });
  assert.deepEqual([illisible.verdict, illisible.decision.id], ['non_verifiable', '']);
});

test('défauts 9 et 10 : entrées mal typées ou valeurs manquantes = « non_verifiable » motivé, sans exception', async () => {
  let appels = 0;
  const m = async () => { appels++; return { points_communs: [{ aspect: 'matiere', produit: { source: 'caracteristique:matiere', citation: 'null' }, decision: { citation: 'null' } }], differences: [] }; };
  const o = { fetchImpl: reseau({ texte: TEXTE + '\nThe value is null and void.' }), converseImpl: m };
  for (const args of [undefined, null, {}, { produit: CHARGEUR, decision: null, destination: 'US' }, { produit: CHARGEUR, decision: 'N000001', destination: 'US' }, { produit: null, decision: DEC, destination: 'US' }, { produit: 'chargeur', decision: DEC, destination: 'US' },
    { produit: { description: '', caracteristiques: { poids: undefined } }, decision: DEC, destination: 'US' }, { produit: { description: '', caracteristiques: { matiere: null } }, decision: DEC, destination: 'US' },
    { produit: { description: 42, fiche_technique: {}, caracteristiques: 'x' }, decision: DEC, destination: 'US' }, { produit: { description: '  ', caracteristiques: [null, ''] }, decision: DEC, destination: 'US' }]) {
    const r = await applicabilite(args, o);
    assert.equal(r.verdict, 'non_verifiable', JSON.stringify(args));
    assert.ok(r.motif.length > 20);
  }
  assert.equal(appels, 0, 'sans pièce, le modèle n\'est pas appelé');
  // Une valeur déclarée non textuelle reste citable telle qu'écrite.
  const nb = await applicabilite({ produit: { description: '', caracteristiques: { power_w: 65, vide: null } }, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: modele({ points_communs: [{ aspect: 'alimentation_donnees', produit: { source: 'caracteristique:power_w', citation: '65' }, decision: { citation: '65 Watts' } }], differences: [] }) });
  assert.equal(nb.points_communs.length, 1);
});

test('défaut 13 : champs repris de l\'entrée contrôlés, adresse recalculée, texte brut à échapper', async () => {
  const r = await applicabilite({ produit: CHARGEUR, decision: { ...DEC, url: 'javascript:alert(document.cookie)', official_code: '<b>9999</b>', ruling_date: '"><script>' }, destination: 'US' }, { fetchImpl: reseau(), converseImpl: unCommun });
  assert.deepEqual([r.decision.url, r.decision.code, r.decision.date], ['https://rulings.cbp.gov/ruling/N000001', null, null]);
  const ok = await applicabilite({ produit: CHARGEUR, decision: { ...DEC, ruling_date: '2019-06-11T00:00:00' }, destination: 'US' }, { fetchImpl: reseau(), converseImpl: unCommun });
  assert.deepEqual([ok.decision.code, ok.decision.date], ['8504.40.7007', '2019-06-11']);
  // Le texte d'une page reste du texte : ce que la page affiche, sans balise active une fois échappé.
  const lu = lireDecisionUK(pageUK({ description: 'Hub &lt;img src=x onerror=alert(1)&gt; device' }));
  assert.match(lu.texte, /^Description: Hub <img src=x onerror=alert\(1\)> device/);
  assert.equal(mod.echapper('Hub <img src=x onerror=alert(1)> "device" & co'), 'Hub &lt;img src=x onerror=alert(1)&gt; &quot;device&quot; &amp; co');
});

test('page britannique : description, mots-clés et justification extraits', async () => {
  const lu = lireDecisionUK(pageUK());
  assert.equal(lu.texte, 'Description: Multiport hub, 3 USB ports & SD card reader. Retail packaging.\nKeywords: COMPUTER HUBS, WITH USB SLOT\nJustification: GIR 1 has been used.\nGIR 6 has been used.');
  assert.equal(lu.fin, '01 Sep 2027');
  assert.equal(lu.numero, '600000001');
  assert.equal(lireDecisionUK('<html><body>Page not found</body></html>'), null);
  const valide = await applicabilite({ produit: HUB, decision: DEC_UK, destination: 'UK' }, { fetchImpl: servirUK(pageUK()), converseImpl: communUK, aujourdhui: '2026-10-04' });
  // Défaut 2 : la page britannique ne dit rien d'une révocation, donc pas « applicable ».
  assert.deepEqual([valide.meme_juridiction, valide.decision.revoquee, valide.decision.expiree, valide.decision.date_fin, valide.verdict], [true, null, false, '2027-09-01', 'partiellement']);
  assert.equal(valide.points_communs.length, 1);
  assert.match(valide.motif, /ne permet pas de savoir/);
  const expiree = await applicabilite({ produit: HUB, decision: DEC_UK, destination: 'GB' }, { fetchImpl: servirUK(pageUK()), converseImpl: communUK, aujourdhui: '2027-09-02' });
  assert.deepEqual([expiree.decision.expiree, expiree.verdict], [true, 'partiellement']);
  assert.match(expiree.motif, /dépassé sa date de fin de validité/);
});

test('défauts 3 et 15 : date de fin britannique absente ou ambiguë = inconnue, dite dans le motif', async () => {
  const run = (fin) => applicabilite({ produit: HUB, decision: DEC_UK, destination: 'GB' }, { fetchImpl: servirUK(pageUK({ fin })), converseImpl: communUK, aujourdhui: '2026-10-04' });
  const absente = await run(null);
  assert.deepEqual([absente.decision.date_fin, absente.decision.expiree, absente.verdict], [null, null, 'partiellement']);
  assert.match(absente.motif, /fin de validité .*n'a pas pu être lue/);
  // « 01/09/2020 » : 1er septembre ou 9 janvier ? Aucune des deux n'est affichée.
  const ambigue = await run('01/09/2020');
  assert.deepEqual([ambigue.decision.date_fin, ambigue.decision.expiree], [null, null]);
  assert.match(ambigue.motif, /fin de validité .*n'a pas pu être lue/);
  assert.equal((await run('31 Feb 2027')).decision.date_fin, null);
  assert.equal((await run('1 September 2027')).decision.date_fin, '2027-09-01');
});

test('défaut 7 : une page britannique qui n\'est pas celle de l\'identifiant est refusée', async () => {
  let appels = 0;
  const m = async () => { appels++; return { points_communs: [], differences: [] }; };
  const run = (decision, html = pageUK()) => applicabilite({ produit: HUB, decision, destination: 'GB' }, { fetchImpl: servirUK(html), converseImpl: m });
  const ailleurs = await run({ ruling_id: 'UK999999999', source: 'UK_HMRC_ATAR', url: 'https://www.tax.service.gov.uk/n-importe/quelle/page?x=1' });
  assert.deepEqual([ailleurs.verdict, ailleurs.decision.texte_disponible], ['non_verifiable', false]);
  assert.match(ailleurs.motif, /ne correspond pas/);
  // Bonne adresse pour un autre numéro que l'identifiant.
  const croise = await run({ ...DEC_UK, ruling_id: 'UK999999999' });
  assert.equal(croise.verdict, 'non_verifiable');
  // Adresse cohérente, mais la page rendue porte un autre numéro.
  const autrePage = await run(DEC_UK, pageUK({ numero: '600000002' }));
  assert.deepEqual([autrePage.verdict, autrePage.decision.texte_disponible], ['non_verifiable', false]);
  assert.equal(appels, 0);
  // Sans adresse fournie, elle est construite à partir de l'identifiant.
  const vus = [];
  const sans = await applicabilite({ produit: HUB, decision: { ...DEC_UK, url: undefined }, destination: 'GB' }, { fetchImpl: (u) => { vus.push(String(u)); return servirUK(pageUK())(); }, converseImpl: communUK, aujourdhui: '2026-10-04' });
  assert.deepEqual(vus, ['https://www.tax.service.gov.uk/search-for-advance-tariff-rulings/ruling/600000001']);
  assert.deepEqual([sans.decision.url, sans.decision.texte_disponible], [vus[0], true]);
});

test('défaut 17 : une pièce ou une décision trop longue est refusée, pas envoyée au modèle', async () => {
  let appels = 0;
  const m = async () => { appels++; return { points_communs: [commun], differences: [] }; };
  const gros = 'word '.repeat(400_000);
  const a = await applicabilite({ produit: { ...CHARGEUR, description: gros }, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: m });
  assert.equal(a.verdict, 'non_verifiable');
  assert.match(a.motif, /trop longue/);
  const b = await applicabilite({ produit: CHARGEUR, decision: DEC, destination: 'US' }, { fetchImpl: reseau({ texte: gros }), converseImpl: m });
  assert.equal(b.verdict, 'non_verifiable');
  assert.match(b.motif, /trop long/);
  const c = await applicabilite({ produit: { description: 'x', caracteristiques: Object.fromEntries(Array.from({ length: 500 }, (_, i) => ['k' + i, 'valeur ' + i])) }, decision: DEC, destination: 'US' }, { fetchImpl: reseau(), converseImpl: m });
  assert.equal(c.verdict, 'non_verifiable');
  assert.equal(appels, 0);
});

test('aucun tiret cadratin dans les textes du module', () => {
  const src = readFileSync(new URL('../lib/applicabilite.mjs', import.meta.url), 'utf8');
  assert.equal(src.includes('—'), false);
});

// ---- En direct : vraie décision N304568, vrai modèle.
const aws = Boolean(process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) || existsSync(path.join(os.homedir(), '.aws', 'credentials'))
  || /^(BEDROCK|AWS)_ACCESS_KEY_ID=/m.test(existsSync(new URL('../.env', import.meta.url)) ? readFileSync(new URL('../.env', import.meta.url), 'utf8') : '');
test('en direct : N304568 face à un chargeur USB-C, puis face à une peluche', { skip: (process.env.APPLICABILITE_HORS_LIGNE && 'hors ligne demandé') || (!(KEY && aws) && 'pas de clé ou pas d\'accès Bedrock') }, async () => {
  const d = { ruling_id: 'N304568', source: 'US_CBP_CROSS', url: 'https://rulings.cbp.gov/ruling/N304568', official_code: '8504.40.7007', ruling_date: '2019-06-11' };
  const chargeur = { description: 'USB-C power adapter for laptops, external wall charger, 65 W maximum output, 20 V DC, sold in retail box with a detachable USB-C cable.', fiche_technique: '', caracteristiques: {} };
  const peluche = { description: 'Plush toy bear, 30 cm, polyester fabric and polyester fibre filling, for children from 3 years, no battery and no electronic component.', fiche_technique: '', caracteristiques: {} };
  const a = await applicabilite({ produit: chargeur, decision: d, destination: 'US' });
  const b = await applicabilite({ produit: peluche, decision: d, destination: 'US' });
  // Identifiant en minuscules avec une espace : la décision existe, elle doit être lue (défaut 12).
  const c = await applicabilite({ produit: peluche, decision: { ...d, ruling_id: 'n304568 ' }, destination: 'US' }, { converseImpl: async () => ({ points_communs: [], differences: [] }) });
  if (process.env.APPLICABILITE_SORTIE) writeFileSync(process.env.APPLICABILITE_SORTIE, JSON.stringify({ date: new Date().toISOString(), chargeur: { produit: chargeur, resultat: a }, peluche: { produit: peluche, resultat: b } }, null, 2));
  assert.equal(c.decision.texte_disponible, true);
  assert.equal(c.decision.revoquee, false);
  assert.equal(a.decision.texte_disponible, true);
  assert.equal(a.decision.revoquee, false);
  assert.ok(a.points_communs.length >= 1, 'au moins un point commun vérifié pour le chargeur');
  assert.ok(['applicable', 'partiellement'].includes(a.verdict), 'chargeur : ' + a.verdict);
  assert.ok(['non_applicable', 'non_verifiable'].includes(b.verdict), 'peluche : ' + b.verdict);
  // Chaque citation rendue existe mot pour mot dans la pièce du produit.
  for (const [r, p] of [[a, chargeur], [b, peluche]]) for (const x of [...r.points_communs, ...r.differences]) if (x.produit) assert.ok(p.description.includes(x.produit.citation));
});
