// Hand-written cases: the expected outcome is what a declarant would require, not what the module returns.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decider, arbitrageValide } from '../public/decision.js';

const ok = { statut: 'needs_review', code: '850440', questions: 0 };
const ids = (d) => d.blocages.map((b) => b.id);

test('engine and rule agree, nothing open: ready, one code', () => {
  const d = decider({ moteur: ok, regle: { statut: 'code', code: '850440' } });
  assert.deepEqual([d.peutValider, d.code, d.origine, d.etat], [true, '850440', 'convergence', 'pret']);
});
test('the charger case: engine proposes, rule still waits for a fact → validation blocked', () => {
  const d = decider({ moteur: ok, regle: { statut: 'information_manquante' } });
  assert.equal(d.peutValider, false); assert.deepEqual(ids(d), ['question_regle']); assert.equal(d.etat, 'incomplet');
});
test('the dock case: 8517.62 against 8471.80 → blocked until a signed arbitration', () => {
  const base = { moteur: { statut: 'ambiguous', code: '851762', questions: 0 }, regle: { statut: 'code', code: '847180' } };
  const d = decider(base);
  assert.equal(d.peutValider, false); assert.equal(d.code, null); assert.deepEqual(ids(d), ['arbitrage']); assert.equal(d.etat, 'incoherent');
  const a = decider({ ...base, arbitrage: { code: '847180', raison: 'Unit of an ADP machine under note 6 C, network port is ancillary.', qui: 'A. Declarant' } });
  assert.deepEqual([a.peutValider, a.code, a.origine], [true, '847180', 'arbitrage']);
});
test('an arbitration without a reason or a name does not unlock anything', () => {
  const base = { moteur: { statut: 'ambiguous', code: '851762' }, regle: { statut: 'code', code: '847180' } };
  for (const arbitrage of [{ code: '847180', raison: 'ok', qui: 'A. D.' }, { code: '847180', raison: 'A long enough reason for the file.', qui: '' }, { code: '8471', raison: 'A long enough reason for the file.', qui: 'A. D.' }]) {
    assert.equal(arbitrageValide(arbitrage), false); assert.equal(decider({ ...base, arbitrage }).peutValider, false);
  }
});
test('open engine question, unresolved contradiction: each blocks on its own', () => {
  assert.deepEqual(ids(decider({ moteur: { ...ok, questions: 2 }, regle: { statut: 'code', code: '850440' } })), ['question_moteur']);
  const c = decider({ conflits: 3, moteur: ok, regle: { statut: 'code', code: '850440' } });
  assert.deepEqual(ids(c), ['contradiction']); assert.equal(c.etat, 'incoherent');
});
test('product outside the rule: the engine alone can be validated only when it settled on a code', () => {
  assert.equal(decider({ moteur: ok, regle: { statut: 'hors_perimetre' } }).peutValider, true);
  assert.equal(decider({ moteur: ok, regle: null }).origine, 'moteur');
  const amb = decider({ moteur: { statut: 'ambiguous', code: '851762' }, regle: null });
  assert.equal(amb.peutValider, false); assert.deepEqual(ids(amb), ['arbitrage']);
});
test('no code anywhere, or rule alone: never ready without a person', () => {
  assert.deepEqual(ids(decider({ moteur: { statut: 'unsupported_jurisdiction', code: null }, regle: null })), ['aucun_code']);
  assert.deepEqual(ids(decider({ moteur: { statut: 'unsupported_jurisdiction', code: null }, regle: { statut: 'code', code: '850440' } })), ['arbitrage']);
});
test('national line required but only six digits established: blocked even when everything else agrees', () => {
  const d = decider({ moteur: ok, regle: { statut: 'code', code: '850440' }, niveauRequis: 'national', niveauObtenu: 'hs6' });
  assert.equal(d.peutValider, false); assert.deepEqual(ids(d), ['niveau_national']);
  assert.equal(decider({ moteur: ok, regle: { statut: 'code', code: '850440' }, niveauRequis: 'national', niveauObtenu: 'national' }).peutValider, true);
});
