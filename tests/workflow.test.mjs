import test from 'node:test';
import assert from 'node:assert/strict';
const model = await import('../public/workflow.js').catch(() => ({}));
const fn = name => model[name] || (() => assert.fail(`Missing workflow behavior: ${name}`));
const identity = fn('createIdentity'), version = fn('createVersion'), scopeKey = fn('scopeKey');
const acknowledge = fn('acknowledgeApproval'), eligible = fn('publishEligibility'), selectedCode = fn('selectedCode');
const validateCodeResponse = fn('validateCodeResponse'), collectReviews = fn('collectReviews');
const approvalStillCurrent = fn('approvalStillCurrent'), uncertainClassification = fn('uncertainClassification');
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
  assert.deepEqual(selectedCode({ code: '847180', origine: 'convergence' }, candidates, null, 'national'), { code: '8471800000', system: 'taric' });
  assert.deepEqual(selectedCode({ code: '847180', origine: 'arbitrage' }, candidates, { code: '847180' }, 'national'), { code: '847180', system: 'hs6' });
  assert.deepEqual(selectedCode({ code: '851762', origine: 'arbitrage' }, candidates, { code: '8517620000' }, 'national'), { code: '8517620000', system: 'taric' });
});
test('the selected approval level governs the actual submitted code even with a national candidate', () => {
  const decision = { code: '850440', origine: 'convergence' }, candidates = [{ code: '85044090', system: 'cn8' }];
  assert.deepEqual(selectedCode(decision, candidates, null, 'hs6'), { code: '850440', system: 'hs6' });
  assert.deepEqual(selectedCode(decision, candidates, null, 'national'), { code: '85044090', system: 'cn8' });
  assert.deepEqual(selectedCode({ ...decision, origine: 'arbitrage' }, candidates, { code: '85044090' }, 'hs6'), { code: '850440', system: 'hs6' });
});
test('mismatched upstream code validation cannot be rewritten into a valid export check', () => {
  const request = { code: '8471800000', country: 'FR', system: 'taric', as_of: scope.effectiveDate };
  const data = { code: request.code, country: request.country, system: request.system, exists: true, status: 'valid' };
  const result = validateCodeResponse(request, { data }, '2026-10-04T11:00:00Z');
  assert.deepEqual(result, { ...data, as_of: request.as_of, checkedAt: '2026-10-04T11:00:00Z' });
  const current = acknowledge(base(), ack, { classificationId: 'classification-1', code: request.code });
  for (const patch of [{ code: '8517620000' }, { country: 'GB' }, { system: 'cn8' }, { country: undefined }]) {
    let validation = null;
    assert.throws(() => { validation = validateCodeResponse(request, { data: { ...data, ...patch } }); }, /does not match/);
    assert.equal(eligible({ version: current, currentScope: scope, identityConfirmed: true, system: 'taric', validation }).eligible, false);
  }
});
test('review collection reads every oldest-first page before exposing current version', async () => {
  const calls = [];
  const data = await collectReviews(async cursor => {
    calls.push(cursor);
    return { data: cursor ? { reviews: [{ version: 3 }], next_cursor: null } : { reviews: [{ version: 1 }, { version: 2 }], next_cursor: 'page-2' } };
  });
  assert.deepEqual(calls, [null, 'page-2']);
  assert.equal(Math.max(...data.reviews.map(r => r.version)), 3);
  assert.equal(data.next_cursor, null);
});
test('failed or repeating review pages refuse to return a partial review history', async () => {
  await assert.rejects(() => collectReviews(async cursor => { if (cursor) throw new Error('offline'); return { data: { reviews: [{ version: 1 }], next_cursor: 'next' } }; }), /offline/);
  await assert.rejects(() => collectReviews(async () => ({ data: { reviews: [{ version: 1 }], next_cursor: 'same' } })), /cursor/);
});
test('export refuses a superseding shared review even when the browser still has an approval', () => {
  const current = acknowledge(base(), ack, { classificationId: 'classification-1', code: '8471800000' });
  const approved = ack.data.review;
  assert.equal(approvalStillCurrent(current, { reviews: [approved] }), true);
  for (const review of [{ ...approved, id: 'new', version: 2, decision: 'changes_requested' }, { ...approved, id: 'new', version: 2, decision: 'approved' }, { ...approved, approved_code: '8517620000' }]) assert.equal(approvalStillCurrent(current, { reviews: [approved, review] }), false);
  assert.equal(approvalStillCurrent(current, { reviews: [] }), false);
});
test('only uncertain persisted classification acknowledgements require history reconciliation', () => {
  assert.equal(uncertainClassification({ persist: true, sent: true, status: null }), true);
  assert.equal(uncertainClassification({ persist: true, sent: true, status: 503 }), true);
  assert.equal(uncertainClassification({ persist: true, sent: true, status: 200, readable: false }), true);
  assert.equal(uncertainClassification({ persist: true, sent: true, status: 429 }), false);
  assert.equal(uncertainClassification({ persist: false, sent: true, status: null }), false);
  assert.equal(uncertainClassification({ persist: true, sent: false, status: null }), false);
});
test('export needs current approval, a valid full national code and no unresolved review trigger', () => {
  const current = acknowledge(base(), ack, { classificationId: 'classification-1', code: '8471800000' });
  const check = { code: '8471800000', country: 'FR', system: 'taric', as_of: scope.effectiveDate, exists: true, status: 'valid' };
  const args = { version: current, currentScope: scope, identityConfirmed: true, system: 'taric', validation: check, blockers: [] };
  assert.equal(eligible(args).eligible, true);
  for (const patch of [{ version: base() }, { identityConfirmed: false }, { currentScope: { ...scope, origin: 'US' } }, { validation: { ...check, status: 'expired' } }, { validation: { ...check, as_of: '2025-01-01' } }, { validation: { ...check, exists: false } }, { blockers: ['Open question'] }, { reviewRequired: true }, { system: 'hs6' }]) assert.equal(eligible({ ...args, ...patch }).eligible, false);
});
