// Fixed-path server adapter. Ownership and review locking are enforced upstream
// against the server's account key, never against a browser-supplied account ID.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERS = {
  history: ['item_id', 'status', 'review_status', 'created_after', 'created_before', 'cursor', 'limit'],
  reviews: ['cursor', 'limit'],
  dossier: ['format'],
  validate: ['code', 'country', 'system', 'as_of'],
  changes: ['since', 'country', 'system', 'cursor', 'limit'],
};

export class CustomsApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const badInput = message => { throw new CustomsApiError(400, message); };
function classificationPath(id, suffix) {
  if (!UUID.test(String(id))) badInput('A valid classification ID is required.');
  return `/v2/customs/classifications/${id}/${suffix}`;
}
function query(type, input = new URLSearchParams()) {
  const params = new URLSearchParams(input), seen = new Set();
  for (const [name, value] of params) {
    if (!FILTERS[type].includes(name) || seen.has(name)) badInput(`Unsupported or repeated parameter: ${name}`);
    if (!value || value.length > 2000) badInput(`Invalid parameter: ${name}`);
    seen.add(name);
  }
  if (type === 'validate' && !params.has('code')) badInput('A customs code is required.');
  if (type === 'changes' && !params.has('since')) badInput('A starting date is required.');
  if (type === 'dossier' && params.has('format') && !['json', 'pdf'].includes(params.get('format'))) badInput('Dossier format must be json or pdf.');
  if (params.has('limit') && !/^(?:[1-9]\d?|100)$/.test(params.get('limit'))) badInput('Limit must be between 1 and 100.');
  return params.toString() ? '?' + params.toString() : '';
}
function reviewBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) badInput('A review object is required.');
  const allowed = ['decision', 'reviewer', 'comment', 'approved_code', 'expected_version'];
  for (const field of Object.keys(body)) if (!allowed.includes(field)) badInput(`Unsupported review field: ${field}`);
  if (!['approved', 'rejected', 'changes_requested'].includes(body.decision)) badInput('Choose a review decision.');
  if (typeof body.reviewer !== 'string' || !body.reviewer.trim() || body.reviewer.trim().length > 200) badInput('Reviewer name is required (maximum 200 characters).');
  if (body.comment !== undefined && (typeof body.comment !== 'string' || body.comment.length > 2000)) badInput('Review comment must be at most 2000 characters.');
  if (body.approved_code !== undefined && (typeof body.approved_code !== 'string' || !/^[\d.\s]{4,20}$/.test(body.approved_code) || body.approved_code.replace(/\D/g, '').length < 4)) badInput('Invalid approved code.');
  // The upstream field is optional; this UI adapter always requires it to avoid
  // overwriting a review that changed since the user opened the decision.
  if (!Number.isSafeInteger(body.expected_version) || body.expected_version < 0) badInput('The current review version is required. Refresh review history first.');
  return { ...body, reviewer: body.reviewer.trim() };
}

export function createCustomsApi({ baseUrl, key, fetchImpl = fetch }) {
  const base = String(baseUrl).replace(/\/$/, '');
  async function request(path, { method = 'GET', body, pdf = false } = {}) {
    if (!key) throw new CustomsApiError(503, 'Legal API access is not configured.');
    const uncertain = 'The review response was interrupted. Check review history before submitting again.';
    let response;
    try {
      response = await fetchImpl(base + path, {
        method, redirect: 'error', signal: AbortSignal.timeout(110_000),
        headers: { Authorization: `Bearer ${key}`, Accept: pdf ? 'application/pdf' : 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const contentType = response.headers.get('content-type') || 'application/json';
      const requestId = response.headers.get('x-request-id');
      if (pdf && response.ok && contentType.includes('application/pdf')) {
        return { status: response.status, body: Buffer.from(await response.arrayBuffer()), contentType: 'application/pdf', requestId };
      }
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); }
      catch { throw new CustomsApiError(502, method === 'POST' ? uncertain : 'The Legal API returned an unreadable response.'); }
      return { status: response.status, body: data, contentType: 'application/json; charset=utf-8', requestId };
    } catch (error) {
      if (error instanceof CustomsApiError) throw error;
      throw new CustomsApiError(502, method === 'POST' ? uncertain : 'The Legal API could not be reached. Your draft is preserved; try again.');
    }
  }
  return {
    history: async params => request('/v2/customs/classifications' + query('history', params)),
    reviews: async (id, params) => request(classificationPath(id, 'reviews') + query('reviews', params)),
    review: async (id, body) => request(classificationPath(id, 'review'), { method: 'POST', body: reviewBody(body) }),
    dossier: async (id, params = new URLSearchParams()) => request(classificationPath(id, 'dossier') + query('dossier', params), { pdf: new URLSearchParams(params).get('format') === 'pdf' }),
    validate: async params => request('/v2/customs/codes/validate' + query('validate', params)),
    changes: async params => request('/v2/customs/codes/changes' + query('changes', params)),
  };
}
