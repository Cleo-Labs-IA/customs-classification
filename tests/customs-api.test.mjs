import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomsApi } from '../lib/customs-api.mjs';

const ID = '12e892bc-1664-4e41-a8f2-d73f7b938084';
const KEY = 'test-private-server-key';
function setup(response = new Response(JSON.stringify({ data: { items: [] } }), { headers: { 'content-type': 'application/json', 'x-request-id': 'request-test' } })) {
  const calls = [];
  const api = createCustomsApi({ baseUrl: 'https://api.example.test', key: KEY, fetchImpl: async (url, init) => { calls.push({ url: String(url), init }); return response; } });
  return { api, calls };
}

test('account history encodes filters and sends the server credential only upstream', async () => {
  const { api, calls } = setup();
  const result = await api.history(new URLSearchParams({ item_id: 'DOCK & HUB/2', review_status: 'approved', limit: '20' }));
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/v2/customs/classifications');
  assert.equal(url.searchParams.get('item_id'), 'DOCK & HUB/2');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${KEY}`);
  assert.equal(calls[0].init.redirect, 'error');
  assert.deepEqual(result.body, { data: { items: [] } });
  assert.equal(result.requestId, 'request-test');
  assert.ok(!JSON.stringify(result).includes(KEY));
});

test('human review keeps the full national code and concurrency token', async () => {
  const { api, calls } = setup(new Response(JSON.stringify({ data: { review_status: 'approved', review_version: 4 } }), { status: 201 }));
  const body = { decision: 'approved', reviewer: 'Reviewer', comment: 'Evidence examined.', approved_code: '8504407007', expected_version: 3 };
  const result = await api.review(ID, body);
  assert.equal(calls[0].url, `https://api.example.test/v2/customs/classifications/${ID}/review`);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), body);
  assert.equal(result.status, 201);
});

test('upstream quota and review-conflict errors preserve HTTP status and error detail', async () => {
  for (const [status, code] of [[402, 'free_quota_exhausted'], [409, 'review_version_conflict']]) {
    const { api } = setup(new Response(JSON.stringify({ error: { code, message: code } }), { status }));
    const result = await api.review(ID, { decision: 'approved', reviewer: 'Reviewer', expected_version: 0 });
    assert.equal(result.status, status);
    assert.equal(result.body.error.code, code);
  }
});

test('PDF dossier preserves binary payload without converting it to JSON', async () => {
  const bytes = Buffer.from('%PDF-1.4\nfixture\n%%EOF');
  const { api, calls } = setup(new Response(bytes, { headers: { 'content-type': 'application/pdf' } }));
  const result = await api.dossier(ID, new URLSearchParams('format=pdf'));
  assert.equal(calls[0].url, `https://api.example.test/v2/customs/classifications/${ID}/dossier?format=pdf`);
  assert.equal(calls[0].init.headers.Accept, 'application/pdf');
  assert.deepEqual(result.body, bytes);
  assert.equal(result.contentType, 'application/pdf');
});

test('review history, validation and coverage use their exact contract paths', async () => {
  const { api, calls } = setup();
  await api.reviews(ID, new URLSearchParams('cursor=2&limit=10'));
  assert.equal(new URL(calls[0].url).pathname, `/v2/customs/classifications/${ID}/reviews`);
  const v = setup(); await v.api.validate(new URLSearchParams('code=850440&country=FR&system=hs6&as_of=2026-10-04'));
  assert.equal(new URL(v.calls[0].url).pathname, '/v2/customs/codes/validate');
  const c = setup(); await c.api.changes(new URLSearchParams('since=2026-10-01&country=FR&system=cn8'));
  assert.equal(new URL(c.calls[0].url).pathname, '/v2/customs/codes/changes');
});

test('invalid path IDs, unsupported or repeated filters and unversioned reviews never reach upstream', async () => {
  const { api, calls } = setup();
  const attempts = [
    () => api.dossier('../../webhooks'),
    () => api.history(new URLSearchParams('user_id=other-account')),
    () => api.history(new URLSearchParams('limit=1&limit=2')),
    () => api.review(ID, { decision: 'approved', reviewer: 'R', expected_version: 0, user_id: 'other' }),
    () => api.review(ID, { decision: 'approved', reviewer: '' , expected_version: 0 }),
    () => api.review(ID, { decision: 'approved', reviewer: 'R' }),
    () => api.review(ID, { decision: 'approved', reviewer: 'R', expected_version: -1 }),
    () => api.validate(new URLSearchParams()),
    () => api.changes(new URLSearchParams()),
  ];
  for (const attempt of attempts) await assert.rejects(attempt, e => e.status === 400);
  assert.equal(calls.length, 0);
});

test('an uncertain write is not retried and does not expose transport secrets', async () => {
  let calls = 0;
  const api = createCustomsApi({ baseUrl: 'https://api.example.test', key: KEY, fetchImpl: async () => { calls++; throw new Error(KEY); } });
  await assert.rejects(() => api.review(ID, { decision: 'approved', reviewer: 'R', expected_version: 0 }), e => e.status === 502 && /check.*history/i.test(e.message) && !e.message.includes(KEY));
  assert.equal(calls, 1);
});

test('non-JSON upstream response is a gateway error, never an approval', async () => {
  const { api } = setup(new Response('<html>error page</html>', { status: 200 }));
  await assert.rejects(() => api.review(ID, { decision: 'approved', reviewer: 'R', expected_version: 0 }), e => e.status === 502);
});
