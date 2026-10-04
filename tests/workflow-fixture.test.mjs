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

test('fixture respects explicit HS6 scope and the upstream national-review guard', async () => {
  const request = client(createFixtureUpstream());
  const hs = await request('/v2/customs/classifications', { description: FIXTURE_DESCRIPTION, country: 'FR', system: 'hs6', persist: true });
  assert.equal(hs.body.data.candidates[0].system, 'hs6');
  const approved = await request(`/v2/customs/classifications/${hs.body.data.classification_id}/review`, { decision: 'approved', reviewer: 'Fixture reviewer', approved_code: '850440', expected_version: 0 });
  assert.equal(approved.status, 201);
  const national = await request('/v2/customs/classifications', { description: FIXTURE_DESCRIPTION, country: 'FR', persist: true });
  const rejected = await request(`/v2/customs/classifications/${national.body.data.classification_id}/review`, { decision: 'approved', reviewer: 'Fixture reviewer', approved_code: '850440', expected_version: 0 });
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.error.code, 'national_line_required');
});

test('fixture locks approvals, reopens only on changes_requested and paginates review versions', async () => {
  const request = client(createFixtureUpstream());
  const result = await request('/v2/customs/classifications', { description: FIXTURE_DESCRIPTION, country: 'FR', persist: true });
  const path = `/v2/customs/classifications/${result.body.data.classification_id}`;
  const approval = { decision: 'approved', reviewer: 'Fixture reviewer', approved_code: '85044090', expected_version: 0 };
  assert.equal((await request(path + '/review', approval)).status, 201);
  assert.equal((await request(path + '/review', { ...approval, expected_version: 1 })).body.error.code, 'review_locked');
  assert.equal((await request(path + '/review', { decision: 'changes_requested', reviewer: 'Fixture reviewer', expected_version: 1 })).status, 201);
  const first = (await request(path + '/reviews?limit=1')).body.data;
  assert.deepEqual(first.reviews.map(x => x.version), [1]);
  assert.equal(first.next_cursor, 1);
  const second = (await request(path + '/reviews?limit=1&cursor=1')).body.data;
  assert.deepEqual(second.reviews.map(x => x.version), [2]);
  assert.equal(second.next_cursor, null);
});
