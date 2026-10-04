import test from 'node:test';
import assert from 'node:assert/strict';
const model = await import('../public/workflow.js').catch(() => ({}));
const fn = name => model[name] || (() => assert.fail(`Missing workflow behavior: ${name}`));
const identity = fn('createIdentity'), version = fn('createVersion'), scopeKey = fn('scopeKey');
const acknowledge = fn('acknowledgeApproval'), eligible = fn('publishEligibility'), selectedCode = fn('selectedCode');
const scope = { product: { sku: 'DOCK', configuration: 'with Ethernet' }, facts: { function: { value: 'hub' } }, criteria: {}, origin: 'CN', destination: 'FR', effectiveDate: '2026-10-04', ruleVersion: 'rules-v1', requiredLevel: 'national' };
const base = () => version({ identityId: 'product-1', scope, id: 'draft-1', now: '2026-10-04T08:00:00Z' });
const ack = { data: { classification_id: 'classification-1', review_status: 'approved', approved_code: '8471800000', review_version: 1, review: { id: 'review-1', decision: 'approved', reviewer: 'Jane Doe', approved_code: '8471800000', version: 1, created_at: '2026-10-04T09:00:00Z' } } };

test('matching SKU never silently assigns the identity of another physical configuration', () => {
  const first = identity({ id: 'physical-1', sku: 'DOCK', configuration: 'with Ethernet' });
  const other = identity({ id: 'physical-2', sku: 'DOCK', configuration: 'without Ethernet' });
  assert.notEqual(first.id, other.id);
  assert.equal(first.confirmed, false);
  assert.equal(identity({ ...first, confirmed: true }).id, first.id);
});
test('draft versions are detached immutable snapshots with a predecessor, never an overwrite by SKU', () => {
  const input = structuredClone(scope), first = version({ identityId: 'product-1', scope: input, id: 'v1' });
  input.facts.function.value = 'charger';
  const next = version({ previous: first, scope: input, id: 'v2' });
  assert.equal(first.scope.facts.function.value, 'hub');
  assert.equal(next.predecessorId, 'v1');
  assert.equal(next.identityId, first.identityId);
  assert.equal(next.version, 2);
  assert.equal(Object.isFrozen(first.scope.facts.function), true);
});
test('product, facts, rule, origin, destination and date each invalidate approval and classification association', () => {
  const approved = acknowledge(base(), ack, { classificationId: 'classification-1', code: '8471800000' });
  for (const patch of [{ product: { sku: 'OTHER' } }, { facts: {} }, { criteria: { independent: true } }, { ruleVersion: 'v2' }, { origin: 'US' }, { destination: 'GB' }, { effectiveDate: '2026-10-05' }, { requiredLevel: 'hs6' }]) {
    const next = version({ previous: approved, scope: { ...scope, ...patch }, id: 'next' });
    assert.equal(next.approval, null); assert.equal(next.classificationId, null);
    assert.notEqual(next.scopeKey, approved.scopeKey);
    assert.equal(approved.approval.reviewId, 'review-1');
  }
});
test('scope equality ignores object key insertion order, not evidence content', () => {
  assert.equal(scopeKey({ a: 1, b: { c: 2, d: 3 } }), scopeKey({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(scopeKey(scope), scopeKey({ ...scope, facts: { function: { value: 'hub', origin: 'supplier correction' } } }));
});
test('approval requires actual matching upstream acknowledgement and retains the entire national code', () => {
  const approved = acknowledge(base(), ack, { classificationId: 'classification-1', code: '8471800000' });
  assert.equal(approved.approval.code, '8471800000');
  assert.equal(approved.classificationId, 'classification-1');
  for (const response of [{}, { data: { ...ack.data, review_status: 'rejected' } }, { data: { ...ack.data, classification_id: 'other' } }, { data: { ...ack.data, approved_code: '847180' } }, { data: { ...ack.data, review: null } }]) {
    assert.throws(() => acknowledge(base(), response, { classificationId: 'classification-1', code: '8471800000' }));
  }
});
test('a signed arbitration at HS6 does not inherit a national candidate code', () => {
  const candidates = [{ code: '8471800000', system: 'taric' }, { code: '8517620000', system: 'taric' }];
  assert.deepEqual(selectedCode({ code: '847180', origine: 'convergence' }, candidates), { code: '8471800000', system: 'taric' });
  assert.deepEqual(selectedCode({ code: '847180', origine: 'arbitrage' }, candidates, { code: '847180' }), { code: '847180', system: 'hs6' });
  assert.deepEqual(selectedCode({ code: '851762', origine: 'arbitrage' }, candidates, { code: '8517620000' }), { code: '8517620000', system: 'taric' });
});
test('export needs current approval, a valid full national code and no unresolved review trigger', () => {
  const current = acknowledge(base(), ack, { classificationId: 'classification-1', code: '8471800000' });
  const check = { code: '8471800000', country: 'FR', system: 'taric', as_of: scope.effectiveDate, exists: true, status: 'valid' };
  const args = { version: current, currentScope: scope, identityConfirmed: true, system: 'taric', validation: check, blockers: [] };
  assert.equal(eligible(args).eligible, true);
  for (const patch of [{ version: base() }, { identityConfirmed: false }, { currentScope: { ...scope, origin: 'US' } }, { validation: { ...check, status: 'expired' } }, { validation: { ...check, as_of: '2025-01-01' } }, { validation: { ...check, exists: false } }, { blockers: ['Open question'] }, { reviewRequired: true }, { system: 'hs6' }]) assert.equal(eligible({ ...args, ...patch }).eligible, false);
});
