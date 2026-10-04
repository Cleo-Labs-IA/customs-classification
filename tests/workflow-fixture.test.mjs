import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createFixtureUpstream, FIXTURE_DESCRIPTION, FIXTURE_DATASHEET } from './fixtures/customs-upstream.mjs';

function client(handler) {
  return async (url, body) => {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    Object.assign(req, { url, method: body ? 'POST' : 'GET' });
    let status, headers, raw;
    await handler(req, { writeHead(s, h) { status = s; headers = h; }, end(value) { raw = value; } });
    return { status, headers, body: headers['Content-Type'].includes('json') ? JSON.parse(raw) : raw };
  };
}

test('preview fixture supports actual persistence/review/history/dossier progression in memory', async () => {
  const request = client(createFixtureUpstream());
  const result = await request('/v2/customs/classifications', { item_id: 'SMOKE', description: FIXTURE_DESCRIPTION, country: 'FR', as_of: '2026-10-04', persist: true });
  assert.equal(result.status, 200);
  assert.match(result.body.data.advisory_disclaimer, /synthetic data/);
  const id = result.body.data.classification_id;
  assert.match(id, /^[a-f0-9-]{36}$/);
  const review = await request(`/v2/customs/classifications/${id}/review`, { decision: 'approved', reviewer: 'Fixture reviewer', approved_code: '85044090', expected_version: 0 });
  assert.equal(review.status, 201);
  const history = await request('/v2/customs/classifications?item_id=SMOKE');
  assert.equal(history.body.data.items[0].approved_code, '85044090');
  const reviews = await request(`/v2/customs/classifications/${id}/reviews`);
  assert.equal(reviews.body.data.reviews[0].version, 1);
  const pdf = await request(`/v2/customs/classifications/${id}/dossier?format=pdf`);
  assert.match(pdf.body.toString(), /^%PDF-1\.4/);
  assert.match(pdf.body.toString(), /Fixture preview/);
});

test('preview error scenarios fail explicitly and never record an approval', async () => {
  const request = client(createFixtureUpstream());
  const quota = await request('/v2/customs/classifications', { description: '[quota]', country: 'FR', persist: true });
  assert.equal(quota.status, 402);
  const r = await request('/v2/customs/classifications', { item_id: 'BLOCKED', description: '[question]', country: 'FR', persist: true });
  assert.equal(r.body.data.status, 'needs_information');
  const id = r.body.data.classification_id;
  const rejected = await request(`/v2/customs/classifications/${id}/review`, { decision: 'approved', reviewer: 'Fixture reviewer', expected_version: 0 });
  assert.equal(rejected.status, 409);
  const review = await request(`/v2/customs/classifications/${id}/reviews`);
  assert.deepEqual(review.body.data.reviews, []);
  assert.ok(FIXTURE_DATASHEET.includes('No battery'));
});
