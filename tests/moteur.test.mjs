// Tests du moteur sur un arbre jouet écrit à la main : l'oracle ne vient pas du moteur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluer, verifier, rejouer, versCode, issues } from '../public/arbre-moteur.js';

const A = { criteres: [{ id: 'a', libelle: 'A', type: 'bool' }, { id: 'b', libelle: 'B', type: 'enum', valeurs: [{ v: 'x' }, { v: 'y' }] }], racine: 'q1',
  noeuds: { q1: { type: 'question', critere: 'a', branches: { oui: 'c1', non: 'q2' } }, q2: { type: 'question', critere: 'b', branches: { x: 'c2', y: 'h' } },
    c1: { type: 'code', code: '111111' }, c2: { type: 'code', code: '222222' }, h: { type: 'hors_perimetre', motif: 'm' } } };

test('parcours jusqu\'au code', () => {
  assert.equal(evaluer(A, { a: true }).code, '111111');
  assert.equal(evaluer(A, { a: false, b: 'x' }).code, '222222');
  assert.equal(evaluer(A, { a: false, b: 'y' }).statut, 'hors_perimetre');
});
test('information manquante : s\'arrête et dit ce que la réponse départage', () => {
  const r = evaluer(A, {});
  assert.equal(r.statut, 'information_manquante'); assert.equal(r.critere, 'a');
  assert.deepEqual(r.options, { oui: ['111111'], non: ['222222', 'hors périmètre'] });
  assert.equal(evaluer(A, { a: false }).critere, 'b');
  assert.equal(evaluer(A, { a: false, b: 'z' }).statut, 'information_manquante'); // valeur hors liste = inconnue
});
test('modifier l\'arbre change le résultat', () => {
  const B = structuredClone(A); B.noeuds.q1.branches.oui = 'c2';
  assert.equal(evaluer(B, { a: true }).code, '222222');
  assert.notEqual(versCode(A), versCode(B));
});
test('verifier : arbre sain puis défauts', () => {
  assert.deepEqual(verifier(A), []);
  const B = structuredClone(A); B.noeuds.q2.branches.y = 'absent'; delete B.noeuds.q1.branches.non;
  const pb = verifier(B).join(' | ');
  assert.match(pb, /nœud absent/); assert.match(pb, /aucune branche pour « non »/);
  const C = structuredClone(A); C.noeuds.q2.branches.y = 'q1';
  assert.match(verifier(C).join(' | '), /cycle/);
});
test('rejouer : compte reproduit, contredit, non tranché', () => {
  const D = [{ id: '1', hs6: '111111', criteres: { a: { valeur: true } } }, { id: '2', hs6: '111111', criteres: { a: { valeur: false }, b: { valeur: 'x' } } }, { id: '3', hs6: '222222', criteres: { a: { valeur: false } } }];
  const r = rejouer(A, D);
  assert.deepEqual([r.total, r.reproduit, r.contredit, r.non_tranche], [3, 1, 1, 1]);
  assert.deepEqual(issues(A, 'q2'), ['222222', 'hors périmètre']);
});
