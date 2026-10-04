import test from 'node:test';
import assert from 'node:assert/strict';
import { etatLigne, evaluer, aTraiter, consequence, regleCouvre, phase, dansZone, codeDuProduit, raisonClassification, cleAttestation } from '../public/app/conformite.js';

const MAINTENANT = Date.parse('2026-10-04T12:00:00Z');
const ligne = (x = {}) => ({ commande: '#1001', sku: 'PWR', quantite: 1, prixUnitaire: 40, devise: 'EUR', pays: 'JP', origine: 'CN', expedition: 'a_expedier', ...x });
const classe = (code, statut = 'classified', extra = {}) => ({ statut, code, candidats: [{ code, ecarte: null }], questions: [], ...extra });
const PSE = { id: 'jp-pse', titre: 'PSE marking', juridictions: ['JP'], sh: ['850760'], debut: '2019-02-01', effet: { type: 'exigence', question: 'Does the product bear the PSE marking?', si_non_texte: 'Without PSE, sale prohibited in Japan' } };
const GPSR = { id: 'ue-gpsr', titre: 'EU responsible operator', juridictions: ['UE'], sh: ['*'], debut: '2024-12-13', effet: { type: 'exigence', question: 'EU operator designated?' } };
const HAUSSE = { id: 'sim-us', titre: 'US increase', juridictions: ['US'], origines: ['CN'], sh: ['8507'], debut: '2026-10-05T04:00:00Z', effet: { type: 'droit_additionnel', points: 30, exemption_en_transit: true } };
const TROIS_EUROS = { id: 'ue-3eur', titre: '€3 per item', juridictions: ['UE'], origines_exclues: ['UE'], sh: ['*'], debut: '2026-07-01', effet: { type: 'taxe_fixe', montant: 3, devise: 'EUR', valeur_max: 150, libelle: 'Flat duty on small shipments' } };

test('zones: one country, the European Union, the whole world', () => {
  assert.equal(dansZone('FR', ['UE']), true);
  assert.equal(dansZone('GB', ['UE']), false);
  assert.equal(dansZone('JP', ['*']), true);
  assert.equal(dansZone('JP', ['US', 'CA']), false);
});

test('a rule on codes does not cover a product with no code', () => {
  assert.equal(regleCouvre(PSE, { pays: 'JP', origine: 'CN', code: null }), false);
  assert.equal(regleCouvre(PSE, { pays: 'JP', origine: 'CN', code: '85076000' }), true);
  assert.equal(regleCouvre(PSE, { pays: 'FR', origine: 'CN', code: '850760' }), false);
  assert.equal(regleCouvre(GPSR, { pays: 'DE', origine: 'CN', code: null }), true);
});

test('origin filter: included or excluded', () => {
  assert.equal(regleCouvre(HAUSSE, { pays: 'US', origine: 'VN', code: '850760' }), false);
  assert.equal(regleCouvre(TROIS_EUROS, { pays: 'FR', origine: 'DE', code: '850760' }), false);
  assert.equal(regleCouvre(TROIS_EUROS, { pays: 'FR', origine: 'CN', code: '850760' }), true);
});

test('phase: upcoming, in force, expired', () => {
  assert.equal(phase(HAUSSE, MAINTENANT), 'a_venir');
  assert.equal(phase(PSE, MAINTENANT), 'en_vigueur');
  assert.equal(phase({ ...PSE, fin: '2026-01-01' }, MAINTENANT), 'expiree');
});

test('the validated code wins over the proposed code', () => {
  assert.deepEqual(codeDuProduit(classe('850760'), { hs6: '850440', par: 'A' }), { code: '850440', provisoire: false });
  assert.deepEqual(codeDuProduit(classe('850760'), null), { code: '850760', provisoire: true });
  assert.deepEqual(codeDuProduit(null, null), { code: null, provisoire: true });
});

test('classification: each engine status gives a level and a text', () => {
  assert.equal(raisonClassification(null).niveau, 'en_attente');
  assert.equal(raisonClassification({ enCours: true }).niveau, 'en_attente');
  assert.equal(raisonClassification({ statut: 'needs_information', questions: [{ fait: 'function' }] }).texte, 'Missing information: product function');
  assert.match(raisonClassification({ statut: 'ambiguous', candidats: [{ code: '851762' }, { code: '851769' }, { code: '847330', ecarte: 'non' }] }).texte, /8517\.62, 8517\.69$/);
  assert.equal(raisonClassification(classe('850760')).type, 'validation');
  assert.equal(raisonClassification(classe('850760'), { hs6: '850760', par: 'Naomie' }).niveau, 'pret');
  assert.equal(raisonClassification({ erreur: 'HTTP 500' }).niveau, 'a_verifier');
});

test('requirement with no answer: to check; yes: ready; no: blocked', () => {
  const ctx = { classification: classe('850760'), validation: { hs6: '850760', par: 'A' }, regles: [PSE], maintenant: MAINTENANT };
  assert.equal(etatLigne(ligne(), ctx).niveau, 'a_verifier');
  const oui = { [cleAttestation('PWR', 'jp-pse')]: { reponse: true } }, non = { [cleAttestation('PWR', 'jp-pse')]: { reponse: false } };
  assert.equal(etatLigne(ligne(), { ...ctx, attestations: oui }).niveau, 'pret');
  const b = etatLigne(ligne(), { ...ctx, attestations: non });
  assert.equal(b.niveau, 'bloque');
  assert.equal(b.principale.texte, 'Without PSE, sale prohibited in Japan');
});

test('a rule applied on a code not yet validated is marked provisional', () => {
  const e = etatLigne(ligne(), { classification: classe('850760'), regles: [PSE], maintenant: MAINTENANT });
  assert.equal(e.raisons.find((r) => r.regle === 'jp-pse').sur_code_provisoire, true);
  const g = etatLigne(ligne({ pays: 'FR' }), { classification: classe('850760'), regles: [GPSR], maintenant: MAINTENANT });
  assert.equal(g.raisons.find((r) => r.regle === 'ue-gpsr').sur_code_provisoire, false);
});

test('upcoming increase: nothing to pay today, avoidable amount when shipping before', () => {
  const ctx = { classification: classe('850760'), validation: { hs6: '850760', par: 'A' }, regles: [HAUSSE], maintenant: MAINTENANT };
  const e = etatLigne(ligne({ pays: 'US', quantite: 2, prixUnitaire: 50 }), ctx);
  assert.equal(e.niveau, 'pret');
  assert.equal(e.surcout, 0);
  assert.equal(e.evitable, 30);
  const apres = etatLigne(ligne({ pays: 'US', quantite: 2, prixUnitaire: 50 }), { ...ctx, maintenant: Date.parse('2026-10-05T05:00:00Z') });
  assert.equal(apres.surcout, 30);
  assert.equal(apres.evitable, 0);
});

test('a line already shipped is no longer exposed to the increase', () => {
  const ctx = { validation: { hs6: '850760', par: 'A' }, regles: [HAUSSE], maintenant: Date.parse('2026-10-05T05:00:00Z') };
  const e = etatLigne(ligne({ pays: 'US', expedition: 'expediee', expedieeLe: '2026-10-04T13:00:00Z' }), ctx);
  assert.equal(e.surcout, 0);
});

test('flat duty per item only under the shipment value threshold', () => {
  const ctx = { validation: { hs6: '850760', par: 'A' }, regles: [TROIS_EUROS], maintenant: MAINTENANT };
  const r = evaluer([ligne({ pays: 'FR', commande: '#1', prixUnitaire: 40 }), ligne({ pays: 'FR', commande: '#2', prixUnitaire: 200 })], ctx);
  assert.equal(r.lignes[0].etat.surcout, 3);
  assert.equal(r.lignes[1].etat.surcout, 0);
  assert.equal(r.totaux.surcout, 3);
});

test('prohibition in force: blocked, and it is the main reason', () => {
  const ban = { id: 'ban', titre: 'Suspension', juridictions: ['AU'], sh: ['8507'], debut: '2026-10-01', effet: { type: 'interdiction', texte: 'Import suspended' } };
  const e = etatLigne(ligne({ pays: 'AU' }), { classification: classe('850760'), regles: [ban], maintenant: MAINTENANT });
  assert.equal(e.niveau, 'bloque');
  assert.equal(e.principale.type, 'interdiction');
});

test('portfolio evaluation: totals on the lines still to ship only', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2', pays: 'FR' }), ligne({ commande: '#3', expedition: 'expediee' })];
  const r = evaluer(lignes, { classifications: { PWR: classe('850760') }, validations: { PWR: { hs6: '850760', par: 'A' } }, attestations: { 'PWR|jp-pse': { reponse: false } }, regles: [PSE, GPSR], maintenant: MAINTENANT });
  assert.equal(r.totaux.lignes, 2);
  assert.deepEqual(r.totaux.compte, { pret: 0, en_attente: 0, a_verifier: 1, bloque: 1 });
  assert.equal(r.parPays.JP.niveau, 'bloque');
  assert.equal(r.parPays.FR.niveau, 'a_verifier');
  assert.equal(r.parProduit.PWR.parPays.JP, 'bloque');
});

test('deadlines grouped by rule, with orders and avoidable amount', () => {
  const lignes = [ligne({ commande: '#1', pays: 'US' }), ligne({ commande: '#1', pays: 'US', prixUnitaire: 60 }), ligne({ commande: '#2', pays: 'US' })];
  const r = evaluer(lignes, { validations: { PWR: { hs6: '850760', par: 'A' } }, regles: [HAUSSE], maintenant: MAINTENANT });
  assert.equal(r.echeances.length, 1);
  assert.equal(r.echeances[0].commandes, 2);
  assert.equal(r.echeances[0].lignes, 3);
  assert.equal(r.echeances[0].evitable, 42);
});

test('to handle: one entry per product and per rule, ranked by impact', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2' }), ligne({ commande: '#3', sku: 'DOCK', pays: 'FR' })];
  const ctx = { classifications: { PWR: classe('850760'), DOCK: { statut: 'needs_information', questions: [{ fait: 'function' }] } }, regles: [PSE], maintenant: MAINTENANT };
  const items = aTraiter(evaluer(lignes, ctx), ctx);
  assert.deepEqual(items.map((i) => i.cle), ['validation:PWR', 'exigence:PWR:jp-pse', 'question:DOCK']);
  assert.equal(items[0].commandes, 2);
  assert.deepEqual(items[0].pays, ['JP']);
});

test('consequence of an answer: lines that change level', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2' })];
  const ctx = { validations: { PWR: { hs6: '850760', par: 'A' } }, attestations: {}, regles: [PSE], maintenant: MAINTENANT };
  const non = consequence(lignes, ctx, (c) => ({ attestations: { ...c.attestations, 'PWR|jp-pse': { reponse: false } } }));
  assert.equal(non.changees, 2);
  assert.equal(non.vers.bloque, 2);
  assert.deepEqual(ctx.attestations, {}, 'the original context is not modified');
});

test('while the engine asks for information, no code-based rule applies', () => {
  const cl = { statut: 'needs_information', code: '950300', candidats: [{ code: '950300' }], questions: [{ fait: 'use' }] };
  assert.deepEqual(codeDuProduit(cl, null), { code: null, provisoire: true });
  const e = etatLigne(ligne({ pays: 'JP' }), { classification: { ...cl, code: '850760' }, regles: [PSE], maintenant: MAINTENANT });
  assert.equal(e.raisons.some((r) => r.regle === 'jp-pse'), false);
});

test('"ambiguous" with a single retained candidate: the text does not mention several codes', () => {
  const r = raisonClassification({ statut: 'ambiguous', code: '851762', candidats: [{ code: '851762' }, { code: '851769', ecarte: 'residual' }] });
  assert.equal(r.texte, 'Code 8517.62 proposed, judged ambiguous by the engine');
});

test('ready line: the reason shown first is the extra cost, not the validated code', () => {
  const e = etatLigne(ligne({ pays: 'FR' }), { validation: { hs6: '850760', par: 'A' }, regles: [TROIS_EUROS], maintenant: MAINTENANT });
  assert.equal(e.niveau, 'pret');
  assert.equal(e.principale.type, 'surcout');
});

test('an information rule with a value ceiling stays silent above the ceiling, and speaks at or below it', () => {
  const regle = { id: 'r', titre: 'T', juridictions: ['UE'], sh: ['*'], debut: '2026-07-01', effet: { type: 'info', valeur_max: 150, texte: 'small consignment' } };
  const ctx = { classification: { statut: 'classified', code: '850440' }, regles: [regle], maintenant: Date.parse('2026-10-04') };
  const ligne = (prix) => ({ sku: 'A', pays: 'FR', origine: 'CN', quantite: 1, prixUnitaire: prix, devise: 'EUR' });
  assert.ok(etatLigne(ligne(59), ctx).raisons.some((r) => r.regle === 'r'));
  assert.ok(etatLigne(ligne(150), ctx).raisons.some((r) => r.regle === 'r'));
  assert.ok(!etatLigne(ligne(749), ctx).raisons.some((r) => r.regle === 'r'));
});

test('décision du dossier : le code sur lequel moteur et règle s\'accordent s\'applique, à valider', () => {
  const cl = { statut: 'needs_information', code: '850440', candidats: [{ code: '850440' }], questions: [{ fait: 'function' }] };
  const decision = { code: '850440', origine: 'convergence' };
  assert.deepEqual(codeDuProduit(cl, null, decision), { code: '850440', provisoire: true });
  const r = raisonClassification(cl, null, decision);
  assert.equal(r.type, 'validation');
  assert.equal(r.niveau, 'a_verifier');
  assert.match(r.texte, /8504\.40/);
  const e = etatLigne(ligne({ pays: 'JP' }), { classification: cl, decision, regles: [{ ...PSE, sh: ['850440'] }], maintenant: MAINTENANT });
  assert.equal(e.code, '850440');
  assert.ok(e.raisons.some((x) => x.regle === 'jp-pse'), 'les exigences du pays s\'appliquent au code de la décision');
});

test('décision à arbitrer : pas de code, la raison dit pourquoi', () => {
  const decision = { code: null, besoinArbitrage: true, motif: 'The engine proposes 8517.62 and the encoded rule concludes 8471.80.' };
  const r = raisonClassification({ statut: 'ambiguous', code: '851762', candidats: [{ code: '851762' }] }, null, decision);
  assert.equal(r.type, 'validation');
  assert.match(r.texte, /8471\.80/);
  assert.deepEqual(codeDuProduit({ statut: 'ambiguous', code: '851762' }, null, decision), { code: null, provisoire: true });
});

test('la validation l\'emporte sur la décision', () => {
  assert.deepEqual(codeDuProduit(null, { hs6: '850440', par: 'A' }, { code: '850450' }), { code: '850440', provisoire: false });
});

test('évaluation : la décision de chaque produit est transmise à ses lignes', () => {
  const r = evaluer([ligne({ pays: 'JP' })], { classifications: { PWR: { statut: 'needs_information', code: '850760' } }, decisions: { PWR: { code: '850760', origine: 'convergence' } }, regles: [PSE], maintenant: MAINTENANT });
  assert.equal(r.lignes[0].etat.code, '850760');
});
