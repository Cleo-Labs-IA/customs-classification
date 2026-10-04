// Engine tests on a hand-written toy rule set: the oracle does not come from the engine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { tester, role, vuSurEtiquette, evaluerExigences, verifierExigences } from '../public/exigences-moteur.js';

const D = {
  criteres: [{ id: 'secteur', type: 'bool' }, { id: 'marque', type: 'enum', valeurs: [{ v: 'propre' }, { v: 'origine' }] }, { id: 'radio', type: 'bool' }],
  roles: [{ id: 'fabricant', si: { tous: [{ critere: 'marque', parmi: ['propre'] }] }, base: ['t1'] }, { id: 'importateur', si: { tous: [{ critere: 'marque', parmi: ['origine'] }] }, base: ['t1'] }],
  exigences: [
    { id: 'bt', applicable_si: { tous: [{ critere: 'secteur', parmi: [true] }], aucun: [{ critere: 'radio', parmi: [true] }] }, base: ['t1'], obligations: [
      { id: 'bt-doc', roles: ['fabricant'], texte: 't1', preuves: [{ id: 'doc', type: 'document' }, { id: 'ce', type: 'marquage', reperes_etiquette: ['CE'] }] },
      { id: 'bt-imp', roles: ['importateur'], texte: 't1', preuves: [{ id: 'copie', type: 'document' }] }] },
  ],
};

test('condition: known failure wins over unknown, unknown lists what is missing', () => {
  assert.deepEqual(tester(D.exigences[0].applicable_si, { secteur: false }), { etat: 'non', manque: [] });
  assert.deepEqual(tester(D.exigences[0].applicable_si, { secteur: true }), { etat: 'inconnu', manque: ['radio'] });
  assert.equal(tester(D.exigences[0].applicable_si, { secteur: true, radio: false }).etat, 'oui');
  assert.equal(tester(D.exigences[0].applicable_si, { secteur: true, radio: true }).etat, 'non');
});
test('role follows the commercial answer; unknown answer asks for it', () => {
  assert.equal(role(D, { marque: 'propre' }).role, 'fabricant');
  assert.equal(role(D, { marque: 'origine' }).role, 'importateur');
  assert.deepEqual(role(D, {}), { etat: 'a_determiner', role: null, manque: ['marque'] });
});
test('a marking is seen only as a whole token', () => {
  const p = { reperes_etiquette: ['CE'] };
  assert.equal(vuSurEtiquette(p, ['NOM', 'CE', 'UL Listed']), 'CE');
  assert.equal(vuSurEtiquette(p, ['ICES-003', 'SERVICE']), null); // negative control: "CE" inside a word
});
test('work list: evidence seen, declared, missing; obligations of the role only', () => {
  const r = evaluerExigences(D, { valeurs: { secteur: true, radio: false, marque: 'propre' }, etiquette: ['CE'], declarees: [] });
  assert.equal(r.lignes[0].etat, 'applicable');
  assert.deepEqual(r.lignes[0].obligations.map((o) => o.id), ['bt-doc']);
  assert.deepEqual(r.lignes[0].obligations[0].preuves.map((p) => p.etat), ['manquante', 'vu_sur_etiquette']);
  assert.deepEqual([r.bilan.preuves_manquantes, r.bilan.marquages_vus], [1, 1]);
  const d = evaluerExigences(D, { valeurs: { secteur: true, radio: false, marque: 'propre' }, declarees: ['doc'] });
  assert.deepEqual(d.lignes[0].obligations[0].preuves.map((p) => p.etat), ['declaree', 'manquante']);
  const i = evaluerExigences(D, { valeurs: { secteur: true, radio: false, marque: 'origine' } });
  assert.deepEqual(i.lignes[0].obligations.map((o) => o.id), ['bt-imp']);
});
test('unknown facts become questions, never a silent "not applicable"', () => {
  const r = evaluerExigences(D, { valeurs: {} });
  assert.equal(r.lignes[0].etat, 'a_determiner');
  assert.deepEqual(r.questions.sort(), ['marque', 'radio', 'secteur']);
  assert.equal(evaluerExigences(D, { valeurs: { secteur: false } }).lignes[0].etat, 'non_applicable');
});
test('structure check: sound file, then defects', () => {
  assert.deepEqual(verifierExigences(D, [{ id: 't1' }]), []);
  const B = structuredClone(D); B.exigences[0].applicable_si.tous[0].critere = 'x'; B.exigences[0].obligations[0].roles = ['zz']; B.exigences[0].obligations[1].texte = 't9';
  const pb = verifierExigences(B, [{ id: 't1' }]).join(' | ');
  assert.match(pb, /unknown criterion "x"/); assert.match(pb, /unknown role "zz"/); assert.match(pb, /unknown text "t9"/);
});
