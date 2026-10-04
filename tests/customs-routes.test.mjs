import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.CLEO_API_KEY = 'route-test-key';
process.env.APP_CODE = 'route-test-access';
process.env.CLEO_BASE_URL = 'https://upstream.example.test';
const { handle } = await import('../app.mjs');
const ID = '12e892bc-1664-4e41-a8f2-d73f7b938084';

async function call(url, { method = 'GET', body, access = 'route-test-access' } = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  Object.assign(req, { url, method, headers: { 'x-app-code': access } });
  let status, headers, data;
  await handle(req, { writeHead(s, h) { status = s; headers = h; }, end(b) { data = b; } });
  return { status, headers, body: headers['Content-Type'].includes('application/json') ? JSON.parse(data) : data };
}

test('all new routes require the existing access code before contacting the API', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('must not run'); });
  const routes = ['/api/classifications', `/api/classifications/${ID}/reviews`, `/api/classifications/${ID}/dossier?format=pdf`, '/api/codes/validate?code=850440', '/api/codes/changes?since=2026-10-01'];
  for (const path of routes) assert.equal((await call(path, { access: '' })).status, 401);
  assert.equal((await call(`/api/classifications/${ID}/review`, { method: 'POST', access: '', body: {} })).status, 401);
  assert.equal(calls, 0);
});

test('authenticated history passes query filters, account auth and structured results', async t => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { seen.push({ url, init }); return new Response(JSON.stringify({ data: { items: [{ classification_id: ID }], next_cursor: null } }), { headers: { 'x-request-id': 'history-request' } }); });
  const r = await call('/api/classifications?item_id=TEST-SKU&limit=10');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.items[0].classification_id, ID);
  assert.equal(seen[0].url, 'https://upstream.example.test/v2/customs/classifications?item_id=TEST-SKU&limit=10');
  assert.equal(seen[0].init.headers.Authorization, 'Bearer route-test-key');
  assert.equal(r.headers['Cache-Control'], 'no-store');
});

test('review error and PDF content reach callers with their real HTTP type/status', async t => {
  t.mock.method(globalThis, 'fetch', async url => String(url).includes('/review')
    ? new Response(JSON.stringify({ error: { code: 'review_version_conflict' } }), { status: 409 })
    : new Response(Buffer.from('%PDF-test'), { headers: { 'content-type': 'application/pdf' } }));
  const review = await call(`/api/classifications/${ID}/review`, { method: 'POST', body: { decision: 'approved', reviewer: 'Test', expected_version: 1 } });
  assert.equal(review.status, 409);
  assert.equal(review.body.error.code, 'review_version_conflict');
  const pdf = await call(`/api/classifications/${ID}/dossier?format=pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers['Content-Type'], 'application/pdf');
  assert.equal(pdf.body.toString(), '%PDF-test');
});

test('invalid input and network failure remain explicit failures without credential details', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('route-test-key'); });
  assert.equal((await call('/api/classifications?user_id=somebody-else')).status, 400);
  const r = await call(`/api/classifications/${ID}/review`, { method: 'POST', body: { decision: 'approved', reviewer: 'Test', expected_version: 0 } });
  assert.equal(r.status, 502);
  assert.match(r.body.error, /check.*history/i);
  assert.ok(!JSON.stringify(r).includes('route-test-key'));
});

test('the primary classify envelope preserves persisted IDs and upstream quota status', async t => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (_url, init) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ error: { code: 'free_quota_exhausted' } }), { status: 402 }); });
  const r = await call('/api/classify', { method: 'POST', body: { item_id: 'TEST-SKU', country: 'FR', description: 'Fixture', persist: true, as_of: '2026-10-04' } });
  assert.equal(r.status, 200); // Existing envelope contract, upstream status is r.body.http.
  assert.equal(r.body.http, 402);
  assert.equal(sent.persist, true);
  assert.equal(sent.as_of, '2026-10-04');
  assert.equal(r.body.body.error.code, 'free_quota_exhausted');
});
