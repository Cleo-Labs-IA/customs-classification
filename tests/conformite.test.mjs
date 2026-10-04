import test from 'node:test';
import assert from 'node:assert/strict';
import { etatLigne, evaluer, aTraiter, consequence, regleCouvre, phase, dansZone, codeDuProduit, raisonClassification, cleAttestation } from '../public/app/conformite.js';

const MAINTENANT = Date.parse('2026-10-04T12:00:00Z');
const ligne = (x = {}) => ({ commande: '#1001', sku: 'PWR', quantite: 1, prixUnitaire: 40, devise: 'EUR', pays: 'JP', origine: 'CN', expedition: 'a_expedier', ...x });
const classe = (code, statut = 'classified', extra = {}) => ({ statut, code, candidats: [{ code, ecarte: null }], questions: [], ...extra });
const PSE = { id: 'jp-pse', titre: 'Marquage PSE', juridictions: ['JP'], sh: ['850760'], debut: '2019-02-01', effet: { type: 'exigence', question: 'Le produit porte-t-il le marquage PSE ?', si_non_texte: 'Sans PSE, vente interdite au Japon' } };
const GPSR = { id: 'ue-gpsr', titre: 'Opérateur responsable UE', juridictions: ['UE'], sh: ['*'], debut: '2024-12-13', effet: { type: 'exigence', question: 'Opérateur UE désigné ?' } };
const HAUSSE = { id: 'sim-us', titre: 'Hausse US', juridictions: ['US'], origines: ['CN'], sh: ['8507'], debut: '2026-10-05T04:00:00Z', effet: { type: 'droit_additionnel', points: 30, exemption_en_transit: true } };
const TROIS_EUROS = { id: 'ue-3eur', titre: '3 € par article', juridictions: ['UE'], origines_exclues: ['UE'], sh: ['*'], debut: '2026-07-01', effet: { type: 'taxe_fixe', montant: 3, devise: 'EUR', valeur_max: 150, libelle: 'Droit fixe sur les petits envois' } };

test('zones : un pays, l\'Union européenne, le monde entier', () => {
  assert.equal(dansZone('FR', ['UE']), true);
  assert.equal(dansZone('GB', ['UE']), false);
  assert.equal(dansZone('JP', ['*']), true);
  assert.equal(dansZone('JP', ['US', 'CA']), false);
});

test('une règle sur des codes ne couvre pas un produit sans code', () => {
  assert.equal(regleCouvre(PSE, { pays: 'JP', origine: 'CN', code: null }), false);
  assert.equal(regleCouvre(PSE, { pays: 'JP', origine: 'CN', code: '85076000' }), true);
  assert.equal(regleCouvre(PSE, { pays: 'FR', origine: 'CN', code: '850760' }), false);
  assert.equal(regleCouvre(GPSR, { pays: 'DE', origine: 'CN', code: null }), true);
});

test('origine filtrée : incluse ou exclue', () => {
  assert.equal(regleCouvre(HAUSSE, { pays: 'US', origine: 'VN', code: '850760' }), false);
  assert.equal(regleCouvre(TROIS_EUROS, { pays: 'FR', origine: 'DE', code: '850760' }), false);
  assert.equal(regleCouvre(TROIS_EUROS, { pays: 'FR', origine: 'CN', code: '850760' }), true);
});

test('phase : à venir, en vigueur, expirée', () => {
  assert.equal(phase(HAUSSE, MAINTENANT), 'a_venir');
  assert.equal(phase(PSE, MAINTENANT), 'en_vigueur');
  assert.equal(phase({ ...PSE, fin: '2026-01-01' }, MAINTENANT), 'expiree');
});

test('le code validé l\'emporte sur le code proposé', () => {
  assert.deepEqual(codeDuProduit(classe('850760'), { hs6: '850440', par: 'A' }), { code: '850440', provisoire: false });
  assert.deepEqual(codeDuProduit(classe('850760'), null), { code: '850760', provisoire: true });
  assert.deepEqual(codeDuProduit(null, null), { code: null, provisoire: true });
});

test('classification : chaque statut du moteur donne un niveau et un texte', () => {
  assert.equal(raisonClassification(null).niveau, 'en_attente');
  assert.equal(raisonClassification({ enCours: true }).niveau, 'en_attente');
  assert.equal(raisonClassification({ statut: 'needs_information', questions: [{ fait: 'function' }] }).texte, 'Information manquante : fonction du produit');
  assert.match(raisonClassification({ statut: 'ambiguous', candidats: [{ code: '851762' }, { code: '851769' }, { code: '847330', ecarte: 'non' }] }).texte, /8517\.62, 8517\.69$/);
  assert.equal(raisonClassification(classe('850760')).type, 'validation');
  assert.equal(raisonClassification(classe('850760'), { hs6: '850760', par: 'Naomie' }).niveau, 'pret');
  assert.equal(raisonClassification({ erreur: 'HTTP 500' }).niveau, 'a_verifier');
});

test('exigence sans réponse : à vérifier ; oui : prête ; non : bloquée', () => {
  const ctx = { classification: classe('850760'), validation: { hs6: '850760', par: 'A' }, regles: [PSE], maintenant: MAINTENANT };
  assert.equal(etatLigne(ligne(), ctx).niveau, 'a_verifier');
  const oui = { [cleAttestation('PWR', 'jp-pse')]: { reponse: true } }, non = { [cleAttestation('PWR', 'jp-pse')]: { reponse: false } };
  assert.equal(etatLigne(ligne(), { ...ctx, attestations: oui }).niveau, 'pret');
  const b = etatLigne(ligne(), { ...ctx, attestations: non });
  assert.equal(b.niveau, 'bloque');
  assert.equal(b.principale.texte, 'Sans PSE, vente interdite au Japon');
});

test('une règle appliquée sur un code non validé est marquée provisoire', () => {
  const e = etatLigne(ligne(), { classification: classe('850760'), regles: [PSE], maintenant: MAINTENANT });
  assert.equal(e.raisons.find((r) => r.regle === 'jp-pse').sur_code_provisoire, true);
  const g = etatLigne(ligne({ pays: 'FR' }), { classification: classe('850760'), regles: [GPSR], maintenant: MAINTENANT });
  assert.equal(g.raisons.find((r) => r.regle === 'ue-gpsr').sur_code_provisoire, false);
});

test('hausse à venir : rien à payer aujourd\'hui, montant évitable si on expédie avant', () => {
  const ctx = { classification: classe('850760'), validation: { hs6: '850760', par: 'A' }, regles: [HAUSSE], maintenant: MAINTENANT };
  const e = etatLigne(ligne({ pays: 'US', quantite: 2, prixUnitaire: 50 }), ctx);
  assert.equal(e.niveau, 'pret');
  assert.equal(e.surcout, 0);
  assert.equal(e.evitable, 30);
  const apres = etatLigne(ligne({ pays: 'US', quantite: 2, prixUnitaire: 50 }), { ...ctx, maintenant: Date.parse('2026-10-05T05:00:00Z') });
  assert.equal(apres.surcout, 30);
  assert.equal(apres.evitable, 0);
});

test('une ligne déjà expédiée n\'est plus exposée à la hausse', () => {
  const ctx = { validation: { hs6: '850760', par: 'A' }, regles: [HAUSSE], maintenant: Date.parse('2026-10-05T05:00:00Z') };
  const e = etatLigne(ligne({ pays: 'US', expedition: 'expediee', expedieeLe: '2026-10-04T13:00:00Z' }), ctx);
  assert.equal(e.surcout, 0);
});

test('droit fixe par article seulement sous le seuil de valeur de l\'envoi', () => {
  const ctx = { validation: { hs6: '850760', par: 'A' }, regles: [TROIS_EUROS], maintenant: MAINTENANT };
  const r = evaluer([ligne({ pays: 'FR', commande: '#1', prixUnitaire: 40 }), ligne({ pays: 'FR', commande: '#2', prixUnitaire: 200 })], ctx);
  assert.equal(r.lignes[0].etat.surcout, 3);
  assert.equal(r.lignes[1].etat.surcout, 0);
  assert.equal(r.totaux.surcout, 3);
});

test('interdiction en vigueur : bloquée, et c\'est la raison principale', () => {
  const ban = { id: 'ban', titre: 'Suspension', juridictions: ['AU'], sh: ['8507'], debut: '2026-10-01', effet: { type: 'interdiction', texte: 'Import suspendu' } };
  const e = etatLigne(ligne({ pays: 'AU' }), { classification: classe('850760'), regles: [ban], maintenant: MAINTENANT });
  assert.equal(e.niveau, 'bloque');
  assert.equal(e.principale.type, 'interdiction');
});

test('évaluation d\'un portefeuille : totaux sur les lignes à expédier seulement', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2', pays: 'FR' }), ligne({ commande: '#3', expedition: 'expediee' })];
  const r = evaluer(lignes, { classifications: { PWR: classe('850760') }, validations: { PWR: { hs6: '850760', par: 'A' } }, attestations: { 'PWR|jp-pse': { reponse: false } }, regles: [PSE, GPSR], maintenant: MAINTENANT });
  assert.equal(r.totaux.lignes, 2);
  assert.deepEqual(r.totaux.compte, { pret: 0, en_attente: 0, a_verifier: 1, bloque: 1 });
  assert.equal(r.parPays.JP.niveau, 'bloque');
  assert.equal(r.parPays.FR.niveau, 'a_verifier');
  assert.equal(r.parProduit.PWR.parPays.JP, 'bloque');
});

test('échéances groupées par règle, avec commandes et montant évitable', () => {
  const lignes = [ligne({ commande: '#1', pays: 'US' }), ligne({ commande: '#1', pays: 'US', prixUnitaire: 60 }), ligne({ commande: '#2', pays: 'US' })];
  const r = evaluer(lignes, { validations: { PWR: { hs6: '850760', par: 'A' } }, regles: [HAUSSE], maintenant: MAINTENANT });
  assert.equal(r.echeances.length, 1);
  assert.equal(r.echeances[0].commandes, 2);
  assert.equal(r.echeances[0].lignes, 3);
  assert.equal(r.echeances[0].evitable, 42);
});

test('à traiter : une entrée par produit et par règle, classée par impact', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2' }), ligne({ commande: '#3', sku: 'DOCK', pays: 'FR' })];
  const ctx = { classifications: { PWR: classe('850760'), DOCK: { statut: 'needs_information', questions: [{ fait: 'function' }] } }, regles: [PSE], maintenant: MAINTENANT };
  const items = aTraiter(evaluer(lignes, ctx), ctx);
  assert.deepEqual(items.map((i) => i.cle), ['validation:PWR', 'exigence:PWR:jp-pse', 'question:DOCK']);
  assert.equal(items[0].commandes, 2);
  assert.deepEqual(items[0].pays, ['JP']);
});

test('conséquence d\'une réponse : lignes qui changent de niveau', () => {
  const lignes = [ligne({ commande: '#1' }), ligne({ commande: '#2' })];
  const ctx = { validations: { PWR: { hs6: '850760', par: 'A' } }, attestations: {}, regles: [PSE], maintenant: MAINTENANT };
  const non = consequence(lignes, ctx, (c) => ({ attestations: { ...c.attestations, 'PWR|jp-pse': { reponse: false } } }));
  assert.equal(non.changees, 2);
  assert.equal(non.vers.bloque, 2);
  assert.deepEqual(ctx.attestations, {}, 'le contexte d\'origine n\'est pas modifié');
});

test('tant que le moteur demande une information, aucune règle à codes ne s\'applique', () => {
  const cl = { statut: 'needs_information', code: '950300', candidats: [{ code: '950300' }], questions: [{ fait: 'use' }] };
  assert.deepEqual(codeDuProduit(cl, null), { code: null, provisoire: true });
  const e = etatLigne(ligne({ pays: 'JP' }), { classification: { ...cl, code: '850760' }, regles: [PSE], maintenant: MAINTENANT });
  assert.equal(e.raisons.some((r) => r.regle === 'jp-pse'), false);
});

test('« ambigu » avec un seul candidat retenu : le texte ne parle pas de plusieurs codes', () => {
  const r = raisonClassification({ statut: 'ambiguous', code: '851762', candidats: [{ code: '851762' }, { code: '851769', ecarte: 'résiduelle' }] });
  assert.equal(r.texte, 'Code 8517.62 proposé, jugé ambigu par le moteur');
});

test('ligne prête : la raison montrée en premier est le surcoût, pas le code validé', () => {
  const e = etatLigne(ligne({ pays: 'FR' }), { validation: { hs6: '850760', par: 'A' }, regles: [TROIS_EUROS], maintenant: MAINTENANT });
  assert.equal(e.niveau, 'pret');
  assert.equal(e.principale.type, 'surcout');
});
