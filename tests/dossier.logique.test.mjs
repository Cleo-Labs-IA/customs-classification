import test from 'node:test';
import assert from 'node:assert/strict';
import { effectif, lireFait, valeurFait, verdictReformulation, verdictRetrait, verdictContradiction, travailRestant, instantane } from '../public/app/dossier/logique.js';

const rep = (status, code, extra = {}) => ({ status, candidates: code ? [{ code, system: 'hs6' }] : [], questions: [], ...extra });

test('texte effectif : les passages déclarés faux sont retirés, la ponctuation reste propre', () => {
  const barres = [{ source: 'description', quote: 'power only, no data ports' }];
  assert.equal(effectif('USB-C stand, power only, no data ports, aluminium.', 'description', barres), 'USB-C stand, aluminium.');
  assert.equal(effectif('USB-C stand, power only, no data ports', 'fiche_technique', barres), 'USB-C stand, power only, no data ports');
});

test('saisie d\'un fait : nombre positif, composition, texte vide refusé', () => {
  assert.equal(lireFait('power_w', '65,5'), 65.5);
  assert.equal(lireFait('power_w', '-3'), null);
  assert.deepEqual(lireFait('composition', 'plastics 70, metal 30%'), [{ material: 'plastics', percent: 70 }, { material: 'metal', percent: 30 }]);
  assert.equal(lireFait('use', '   '), null);
  assert.equal(valeurFait('dimensions', { length_mm: 100, width_mm: 50 }), 'length 100 mm × width 50 mm');
});

test('épreuves : verdicts mécaniques', () => {
  assert.equal(verdictReformulation(rep('ambiguous', '851762'), rep('ambiguous', '851762'))[0], 'pret');
  assert.equal(verdictReformulation(rep('ambiguous', '851762'), rep('classified', '847330'))[0], 'bloque');
  assert.equal(verdictRetrait(rep('ambiguous', '851762'), rep('needs_information', null, { questions: [{ fact: 'function' }] }), 'function')[0], 'pret');
  assert.equal(verdictRetrait(rep('ambiguous', '851762'), rep('ambiguous', '851762'), 'weight_g')[0], 'a_verifier');
  assert.equal(verdictRetrait(rep('ambiguous', '851762'), rep('classified', '847330'), 'function')[0], 'bloque');
  assert.equal(verdictContradiction(0)[0], 'bloque');
  assert.equal(instantane(rep('ambiguous', '851762')), '8517.62, plusieurs codes restent plausibles');
});

test('travail restant : question ouverte, divergence avec la règle, six chiffres, validation', () => {
  const arbre = { criteres: [{ id: 'c1', question: 'Q ?' }] };
  const out = travailRestant({ dernier: { data: rep('needs_information', '851762', { questions: [{ fact: 'function' }] }), repondu: null }, regle: { statut: 'code', code: '847330' }, arbre, crit: { c1: { kind: 'reponse' } }, faits: { use: { kind: 'main' } }, photo: { illisible: ['ligne 3'] }, valide: false, nomDestination: 'France' });
  assert.deepEqual(out, [
    'Répondre à la question du moteur : Fonction.',
    'Trancher la divergence entre le moteur (8517.62) et la règle encodée (8473.30).',
    'Documenter 1 réponse(s) donnée(s) sans pièce dans la règle encodée.',
    'Appuyer par une pièce : Usage.',
    'Relire sur le produit 1 élément(s) non lu(s) sur la photo.',
    "Établir le code national de France : la proposition s'arrête à six chiffres.",
    'Faire relire la règle encodée par un déclarant : elle est rédigée par IA.',
    'Faire valider la proposition par une personne habilitée.',
  ]);
});
