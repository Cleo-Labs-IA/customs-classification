// Synthetic integration fixture. No model calls, legal conclusions or production
// persistence. Use only from tests or scripts/workflow-preview.mjs.
import { randomUUID } from 'node:crypto';

export const FIXTURE_DESCRIPTION = 'External 65 W USB-C power adapter for a laptop';
export const FIXTURE_DATASHEET = 'Converts 100-240 V AC to 20 V DC. Powers a laptop through USB-C. No battery, no generator and no mains socket outlets. Polycarbonate housing. Maximum output 65 W.';
export const FIXTURE_CRITERIA = {
  fonction_principale: { valeur: 'alimenter', source: 'fiche_technique', citation: 'Powers a laptop through USB-C.' },
  genere_electricite: { valeur: false, source: 'fiche_technique', citation: 'No battery, no generator and no mains socket outlets.' },
  batterie_integree: { valeur: 'aucune', source: 'fiche_technique', citation: 'No battery, no generator and no mains socket outlets.' },
  convertit_courant: { valeur: 'convertisseur', source: 'fiche_technique', citation: 'Converts 100-240 V AC to 20 V DC.' },
  prises_secteur_sortie: { valeur: false, source: 'fiche_technique', citation: 'No battery, no generator and no mains socket outlets.' },
};

export async function readBody(req) {
  const parts = []; let size = 0;
  for await (const part of req) { size += part.length; if (size > 6_000_000) throw new Error('Fixture request too large'); parts.push(part); }
  return JSON.parse(Buffer.concat(parts).toString() || '{}');
}
export function fixtureJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Request-ID': 'fixture-' + randomUUID() });
  res.end(JSON.stringify(body));
}
function pdf() {
  const text = 'BT /F1 18 Tf 40 760 Td (Fixture preview - synthetic dossier) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  let out = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((o, i) => { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x => String(x).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

export function createFixtureUpstream() {
  const records = new Map();
  const summary = r => ({ classification_id: r.id, item_id: r.request.item_id, status: r.data.status, country: r.request.country, system: r.data.candidates[0]?.system, retained_code: r.data.candidates[0]?.code, created_at: r.created_at, review_status: r.review_status, approved_code: r.approved_code, approved_at: r.approved_at, review_version: r.reviews.length, links: { dossier: `/v2/customs/classifications/${r.id}/dossier`, reviews: `/v2/customs/classifications/${r.id}/reviews` } });
  return async (req, res) => {
    try {
      const u = new URL(req.url, 'http://fixture');
      if (req.method === 'POST' && u.pathname === '/v2/customs/classifications') {
        const body = await readBody(req), description = String(body.description || '');
        if (description.includes('[quota]')) return fixtureJson(res, 402, { error: { code: 'free_quota_exhausted', message: 'Synthetic quota error. Remove [quota] to continue the fixture.' } });
        const needs = description.includes('[question]') && !body.facts?.function;
        const unsupported = description.includes('[unsupported]');
        const hs6 = body.system === 'hs6' || description.includes('[hs6]');
        const candidate = { id: 'fixture-candidate', code: hs6 ? '850440' : '85044090', system: hs6 ? 'hs6' : 'cn8', country: hs6 ? null : body.country, hs6_parent: '850440', chapter: 85, title: { en: 'Synthetic test candidate: static converter' }, confidence: null, rationale: 'Synthetic response used to verify the interface. This is not a legal classification.', source_version: 'fixture-catalog-2026', evidence: [], gri: [], set_aside_reason: null };
        const id = randomUUID();
        const data = { item_id: body.item_id, status: unsupported ? 'unsupported_jurisdiction' : needs ? 'needs_information' : 'needs_review', query_facts: body.facts || {}, missing_attributes: needs ? ['function'] : [], questions: needs ? [{ fact: 'function', question: 'What does the product do?', why: 'Synthetic missing-fact branch.', discriminates: ['850440', '853669'] }] : [], candidates: unsupported ? [] : [candidate], dataset_version: 'fixture-catalog-2026', coverage: { level: unsupported ? 'none' : hs6 ? 'hs6_only' : 'national', national_systems: hs6 || unsupported ? [] : ['cn8'], hint: 'Synthetic coverage for interaction testing only.' }, provenance: { question_config_version: 'fixture', families: [], precedents: [], acceptance_checks: [] }, advisory_disclaimer: 'Fixture preview: synthetic data, not a live classification.' };
        if (body.persist === true) { data.classification_id = id; records.set(id, { id, request: body, data, created_at: new Date().toISOString(), review_status: 'unreviewed', approved_code: null, approved_at: null, reviews: [] }); }
        return fixtureJson(res, 200, { data, advisory_disclaimer: data.advisory_disclaimer });
      }
      if (req.method === 'GET' && u.pathname === '/v2/customs/classifications') {
        const all = [...records.values()].reverse().filter(r => !u.searchParams.has('item_id') || r.request.item_id === u.searchParams.get('item_id'));
        const offset = Number(u.searchParams.get('cursor') || 0), limit = Number(u.searchParams.get('limit') || 20);
        return fixtureJson(res, 200, { data: { items: all.slice(offset, offset + limit).map(summary), next_cursor: offset + limit < all.length ? String(offset + limit) : null } });
      }
      const match = u.pathname.match(/^\/v2\/customs\/classifications\/([^/]+)\/(review|reviews|dossier)$/);
      if (match) {
        const r = records.get(match[1]);
        if (!r) return fixtureJson(res, 404, { error: { code: 'not_found', message: 'Fixture record not found. Preview data resets on server restart.' } });
        if (req.method === 'POST' && match[2] === 'review') {
          const b = await readBody(req);
          if (/fail/i.test(b.reviewer)) return fixtureJson(res, 503, { error: { code: 'fixture_failure', message: 'Synthetic review error. Use another reviewer name to retry.' } });
          if (/conflict/i.test(b.reviewer) || b.expected_version !== r.reviews.length) return fixtureJson(res, 409, { error: { code: 'review_version_conflict', message: 'Synthetic review conflict. Refresh review history.' } });
          if (r.review_status === 'approved' && b.decision !== 'changes_requested') return fixtureJson(res, 409, { error: { code: 'review_locked', message: 'Request changes before re-approving this record.' } });
          if (b.decision === 'approved' && ['needs_information', 'unsupported_jurisdiction'].includes(r.data.status)) return fixtureJson(res, 409, { error: { code: 'review_blocked', message: 'Resolve the classification before approval.' } });
          if (b.decision === 'approved' && r.request.system !== 'hs6' && String(b.approved_code || '').replace(/[\s.]/g, '').length <= 6) return fixtureJson(res, 409, { error: { code: 'national_line_required', message: 'This fixture national request requires a national code.' } });
          const review = { id: randomUUID(), ...b, version: r.reviews.length + 1, created_at: new Date().toISOString() };
          r.reviews.push(review); r.review_status = b.decision; r.approved_code = b.decision === 'approved' ? b.approved_code : null; r.approved_at = b.decision === 'approved' ? review.created_at : null;
          return fixtureJson(res, 201, { data: { classification_id: r.id, review, review_status: r.review_status, approved_code: r.approved_code, approved_at: r.approved_at, review_version: review.version } });
        }
        if (match[2] === 'reviews') {
          const after = Number(u.searchParams.get('cursor') || 0), limit = Number(u.searchParams.get('limit') || 50);
          const remaining = r.reviews.filter(review => review.version > after), page = remaining.slice(0, limit);
          return fixtureJson(res, 200, { data: { classification_id: r.id, reviews: page, next_cursor: remaining.length > page.length ? page.at(-1).version : null } });
        }
        if (match[2] === 'dossier') {
          if (u.searchParams.get('format') === 'pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' }); return res.end(pdf()); }
          return fixtureJson(res, 200, { data: { classification_id: r.id, dossier_source: 'fixture_snapshot', item_id: r.request.item_id, description: r.request.description, country: r.request.country, system: r.data.candidates[0]?.system, as_of: r.request.as_of, created_at: r.created_at, query_facts: r.data.query_facts, dataset_versions: ['fixture-catalog-2026'], sources_and_licences: [], item: { status: r.data.status, retained_candidate: r.data.candidates[0], questions: r.data.questions }, review: { status: r.review_status, approved_code: r.approved_code, version: r.reviews.length, latest_review: r.reviews.at(-1) || null }, advisory_disclaimer: r.data.advisory_disclaimer } });
        }
      }
      if (u.pathname === '/v2/customs/codes/validate') return fixtureJson(res, 200, { data: { code: u.searchParams.get('code'), country: u.searchParams.get('country'), system: u.searchParams.get('system'), status: 'valid', exists: true, dataset_version: 'fixture-catalog-2026', hint: 'Synthetic validity check only.' } });
      if (u.pathname === '/v2/customs/codes/changes') return fixtureJson(res, 200, { data: [], has_more: false, next_cursor: null, tracked: u.searchParams.get('system') === 'cn8', hint: 'Synthetic on-demand change check; no continuous monitoring.' });
      fixtureJson(res, 404, { error: { code: 'fixture_route_missing', message: 'Not available in this fixture preview.' } });
    } catch { fixtureJson(res, 400, { error: { code: 'fixture_invalid_request', message: 'Invalid fixture request.' } }); }
  };
}
