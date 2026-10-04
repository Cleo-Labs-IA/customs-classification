// Pure lifecycle rules. Browser snapshots are not a shared product registry.
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export function scopeKey(value) {
  if (Array.isArray(value)) return '[' + value.map(scopeKey).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + scopeKey(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export function createIdentity({ id, sku = '', gtin = '', manufacturer = '', model = '', configuration = '', confirmed = false }) {
  if (!id) throw new Error('A stable identity ID is required.');
  return freeze({ id, sku, gtin, manufacturer, model, configuration, confirmed: Boolean(confirmed) });
}
export function createVersion({ previous = null, identityId = previous?.identityId, scope, id, now = new Date().toISOString() }) {
  if (!identityId || !id || !scope) throw new Error('Identity, version ID and scope are required.');
  return freeze({ id, identityId, version: (previous?.version || 0) + 1, predecessorId: previous?.id || null,
    createdAt: now, scope: clone(scope), scopeKey: scopeKey(scope), classificationId: null, approval: null });
}
export function acknowledgeApproval(version, response, { classificationId, code }) {
  const d = response?.data, r = d?.review;
  if (!classificationId || !r?.id || d.classification_id !== classificationId || d.review_status !== 'approved' || r.decision !== 'approved' || d.approved_code !== code || r.approved_code !== code || !r.reviewer || !r.created_at || !Number.isInteger(r.version) || r.version < 1 || d.review_version !== r.version)
    throw new Error('The server did not acknowledge this classification, code and approval version. Refresh the review history before trying again.');
  return freeze({ ...clone(version), classificationId, approval: { reviewId: r.id, version: r.version, reviewer: r.reviewer, code, createdAt: r.created_at, scopeKey: version.scopeKey } });
}
export function selectedCode(decision, candidates = [], arbitration = null) {
  if (!decision?.code) return { code: null, system: null };
  const code = decision.origine === 'arbitrage' ? String(arbitration?.code || decision.code).replace(/\D/g, '') : decision.code;
  const candidate = candidates.find(c => !c.set_aside_reason && (decision.origine === 'arbitrage' ? String(c.code) === code : String(c.code).startsWith(code)));
  return candidate ? { code: String(candidate.code), system: candidate.system } : { code, system: 'hs6' };
}
export function publishEligibility({ version, currentScope, identityConfirmed, system, validation, blockers = [], reviewRequired = false }) {
  const reasons = [...blockers], a = version?.approval, s = version?.scope;
  if (!identityConfirmed) reasons.push('Confirm the physical product identity.');
  if (!a || !version.classificationId) reasons.push('An acknowledged API approval is required.');
  if (!version || version.scopeKey !== scopeKey(currentScope) || (a && a.scopeKey !== version.scopeKey)) reasons.push('The current product, facts or route differ from the approved version.');
  if (reviewRequired) reasons.push('A relevant change needs a new review.');
  if (!a || !/^\d{8,12}$/.test(a.code) || !system || system === 'hs6') reasons.push('A complete national tariff code is required; HS6 is pre-classification only.');
  if (!validation || validation.exists !== true || validation.status !== 'valid' || validation.code !== a?.code || validation.country !== s?.destination || validation.system !== system || validation.as_of !== s?.effectiveDate) reasons.push('Check the exact code for this destination and effective date.');
  return { eligible: reasons.length === 0, reasons };
}
