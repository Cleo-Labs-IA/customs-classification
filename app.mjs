// Cœur de l'app, partagé entre le serveur local (server.mjs) et l'hébergement
// (api/index.mjs) : relais vers la Cleo Legal API, lecture des pièces et des
// photos par Claude sur Bedrock. Les clés restent ici, jamais dans le navigateur.
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.CLEO_BASE_URL || 'https://api.legaldata.cleolabs.co').replace(/\/$/, '');
const BEDROCK_MODEL = process.env.BEDROCK_MODEL || 'global.anthropic.claude-sonnet-5-5';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';

// Réglages : variables d'environnement d'abord, sinon .env local, sinon (AWS) ~/.aws/credentials.
function dotenv(name) {
  const f = path.join(DIR, '.env');
  if (!existsSync(f)) return '';
  const line = readFileSync(f, 'utf8').split('\n').find((l) => l.startsWith(name + '='));
  return line ? line.slice(name.length + 1).trim() : '';
}
const setting = (name) => (process.env[name] || dotenv(name) || '').trim();
const KEY = setting('CLEO_API_KEY');
const APP_CODE = setting('APP_CODE');
function awsCreds() {
  const id = setting('BEDROCK_ACCESS_KEY_ID') || setting('AWS_ACCESS_KEY_ID'), secret = setting('BEDROCK_SECRET_ACCESS_KEY') || setting('AWS_SECRET_ACCESS_KEY');
  if (id && secret) return { id, secret };
  const f = path.join(os.homedir(), '.aws', 'credentials');
  if (!existsSync(f)) return null;
  const txt = readFileSync(f, 'utf8'), get = (k) => (txt.match(new RegExp('^' + k + '\\s*=\\s*(\\S+)', 'm')) || [])[1];
  return get('aws_access_key_id') ? { id: get('aws_access_key_id'), secret: get('aws_secret_access_key') } : null;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
async function readJson(req, max = 6_000_000) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw new Error('requête trop lourde'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// Appel Bedrock Converse signé à la main (SigV4), sans dépendance.
const hmac = (k, s) => crypto.createHmac('sha256', k).update(s).digest();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
async function converse({ system, content, maxTokens }) {
  const c = awsCreds();
  if (!c) throw new Error('accès Bedrock absent');
  const host = `bedrock-runtime.${BEDROCK_REGION}.amazonaws.com`, uri = `/model/${encodeURIComponent(BEDROCK_MODEL)}/converse`;
  const body = JSON.stringify({ system: [{ text: system }], messages: [{ role: 'user', content }], inferenceConfig: { maxTokens } });
  const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), day = now.slice(0, 8);
  const canon = `POST\n${uri.replace(/%/g, '%25')}\n\ncontent-type:application/json\nhost:${host}\nx-amz-date:${now}\n\ncontent-type;host;x-amz-date\n${sha(body)}`;
  const scope = `${day}/${BEDROCK_REGION}/bedrock/aws4_request`;
  const key = hmac(hmac(hmac(hmac('AWS4' + c.secret, day), BEDROCK_REGION), 'bedrock'), 'aws4_request');
  const sig = hmac(key, `AWS4-HMAC-SHA256\n${now}\n${scope}\n${sha(canon)}`).toString('hex');
  const r = await fetch(`https://${host}${uri}`, {
    method: 'POST', body, signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', 'X-Amz-Date': now, Authorization: `AWS4-HMAC-SHA256 Credential=${c.id}/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${sig}` },
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Bedrock ' + r.status + ' : ' + String(j.message || JSON.stringify(j)).slice(0, 200));
  const text = j.output.message.content.map((x) => x.text || '').join('');
  try { return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); }
  catch { throw new Error('réponse du modèle illisible : ' + text.slice(0, 200)); }
}

// Relaie un POST /v2/customs/classifications et rend la réponse telle quelle,
// avec le code HTTP, l'identifiant de requête et la durée mesurée.
async function classify(body) {
  const t0 = Date.now();
  const r = await fetch(`${API}/v2/customs/classifications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(110_000),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 600) }; }
  return { http: r.status, request_id: r.headers.get('x-request-id'), seconds: Math.round((Date.now() - t0) / 100) / 10, endpoint: `${API}/v2/customs/classifications`, sent: body, body: json };
}

// Lecture des pièces : le modèle relève les caractéristiques écrites dans la
// fiche technique et les contradictions entre les pièces. Chaque élément doit
// citer un passage ; on vérifie ici que le passage existe mot pour mot dans la
// pièce citée et on jette le reste. Rien n'est gardé sans passage vérifié.
const LIRE_SYSTEM = `You read product documents for a customs classification file. You never classify and never guess.
Sources you receive: "description" (commercial text), "fiche_technique" (datasheet text, may be empty), and "caracteristiques" (facts already declared, each with a key and a value).

Return ONLY a JSON object:
{"caracteristiques":[{"fact":"function|use|material|power_w|voltage_v|weight_g","value":"...","source":"fiche_technique","quotes":["verbatim passage", "..."]}],
 "contradictions":[{"sujet":"short French label","a":{"source":"description|fiche_technique|caracteristique:<key>","quote":"verbatim"},"b":{"source":"...","quote":"verbatim"},"pourquoi":"one French sentence"}]}

Rules:
- Characteristics come ONLY from "fiche_technique" (the description is already sent as text to the classifier); if the datasheet is empty, return no characteristic. A characteristic is kept only if the datasheet states it explicitly. "quotes" are 1 to 3 passages copied character for character from the named source, each under 200 characters. No paraphrase, no ellipsis.
- "function" = what the device does, as a short English phrase listing every stated function (data transfer, network, video output, power delivery, charging...). "use" = intended use or user. "material" = main material. power_w, voltage_v, weight_g = numbers only, in W, V, g.
- At most one entry per fact key.
- A contradiction is two statements that cannot both be true about the same product (for example "no data ports" against "Gigabit Ethernet"). A missing detail is not a contradiction. For a declared characteristic, source is "caracteristique:<key>" and quote is its value copied exactly.
- If nothing qualifies, return empty arrays.`;

function locate(source, quote) {
  if (typeof source !== 'string' || typeof quote !== 'string') return null;
  const q = quote.trim();
  if (q.length < 2) return null;
  let i = source.indexOf(q);
  if (i < 0) i = source.toLowerCase().indexOf(q.toLowerCase());
  return i < 0 ? null : source.slice(i, i + q.length);
}

async function lire({ description = '', fiche_technique = '', caracteristiques = {} }) {
  const t0 = Date.now();
  const facts = Object.fromEntries(Object.entries(caracteristiques).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const parsed = await converse({ system: LIRE_SYSTEM, content: [{ text: JSON.stringify({ description, fiche_technique, caracteristiques: facts }) }], maxTokens: 2500 });
  const sources = { description, fiche_technique };
  for (const [k, v] of Object.entries(facts)) sources[`caracteristique:${k}`] = v;
  let rejected = 0;
  const KEYS = ['function', 'use', 'material', 'power_w', 'voltage_v', 'weight_g'];
  const outFacts = [];
  for (const c of parsed.caracteristiques || []) {
    const quotes = (c.quotes || []).map((q) => locate(sources[c.source], q)).filter(Boolean);
    const numeric = c.fact && c.fact.endsWith('_w') || c.fact && c.fact.endsWith('_v') || c.fact && c.fact.endsWith('_g');
    const value = numeric ? Number(c.value) : String(c.value || '').trim().slice(0, 200);
    if (c.source !== 'fiche_technique' || !KEYS.includes(c.fact) || !quotes.length || quotes.length !== (c.quotes || []).length || (numeric ? !(value > 0) : !value)) { rejected++; continue; }
    outFacts.push({ fact: c.fact, value, source: c.source, quotes });
  }
  const outConf = [];
  for (const c of parsed.contradictions || []) {
    const a = c.a && locate(sources[c.a.source], c.a.quote), b = c.b && locate(sources[c.b.source], c.b.quote);
    if (!a || !b) { rejected++; continue; }
    outConf.push({ sujet: String(c.sujet || ''), pourquoi: String(c.pourquoi || ''), a: { source: c.a.source, quote: a }, b: { source: c.b.source, quote: b } });
  }
  return { caracteristiques: outFacts, contradictions: outConf, rejected, model: BEDROCK_MODEL, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

// Lecture d'une photo (JPEG préparé par le navigateur) : le modèle transcrit ce
// qui est imprimé sur l'appareil, ligne par ligne, et liste ce qu'il n'arrive
// pas à lire. La transcription devient une pièce, qu'une personne relit.
const PHOTO_SYSTEM = `You transcribe what is printed on a product or its rating label, for a customs file. The label may be rotated or partly hidden. You never classify and never complete a value you cannot read.
Return ONLY a JSON object:
{"lignes":["each printed line or marking, copied exactly as read"],
 "illisible":["short French note for each part of the label you cannot read with certainty"],
 "description":"a short English customs-style description of the product only (what it is and what the label says it does, e.g. its printed type, input and output ratings), using only what is printed or plainly visible; no surroundings, no colour, no brand guess, no model guess",
 "reference":"model or part reference exactly as printed, or empty string"}
Rules: copy characters as printed (units, symbols, punctuation). If a character is doubtful, leave the whole value out of "lignes" and describe it in "illisible". Certification logos are listed by their name (CE, UL Listed...) on their own line.`;

async function lirePhoto({ jpeg_base64 }) {
  if (typeof jpeg_base64 !== 'string' || jpeg_base64.length < 100) throw new Error('photo absente');
  const t0 = Date.now();
  const j = await converse({ system: PHOTO_SYSTEM, content: [{ image: { format: 'jpeg', source: { bytes: jpeg_base64 } } }, { text: 'Transcribe this product photo.' }], maxTokens: 4000 });
  return { lignes: (j.lignes || []).map(String), illisible: (j.illisible || []).map(String), description: String(j.description || ''), reference: String(j.reference || ''), model: BEDROCK_MODEL, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

// Lecture d'un dossier pour l'arbre d'interprétation : pour chaque critère de
// l'arbre, la valeur que les pièces établissent, avec le passage qui l'établit.
// Même règle que lire() : un passage introuvable mot pour mot est jeté, et un
// critère que les pièces ne tranchent pas reste sans valeur.
const CRIT_SYSTEM = `You read product documents for a customs file and fill a list of criteria. You never classify and never guess.
You receive "pieces" (description, fiche_technique, caracteristiques: declared facts as key/value) and "criteres" (id, question, type bool or enum with allowed values).
Return ONLY a JSON object: {"valeurs":[{"critere":"<id>","valeur":true|false|"<enum value>","source":"description|fiche_technique|caracteristique:<key>","citation":"verbatim passage"}]}
Rules: answer a criterion only when a passage states it explicitly or makes it certain (a listed Ethernet port makes "has a network port" true). "citation" is copied character for character from the named source, under 250 characters. For a declared fact, source is "caracteristique:<key>" and citation is its value copied exactly. If the documents do not settle a criterion, leave it out. A missing mention is NOT a "false": answer false only when the documents say so.`;
async function lireCriteres({ pieces = {}, criteres = [] }) {
  const t0 = Date.now();
  const description = String(pieces.description || ''), fiche_technique = String(pieces.fiche_technique || '');
  const facts = Object.fromEntries(Object.entries(pieces.caracteristiques || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const liste = criteres.map((c) => ({ id: c.id, question: c.question, type: c.type, valeurs: (c.valeurs || []).map((x) => x.v) }));
  const j = await converse({ system: CRIT_SYSTEM, content: [{ text: JSON.stringify({ pieces: { description, fiche_technique, caracteristiques: facts }, criteres: liste }) }], maxTokens: 3000 });
  const sources = { description, fiche_technique };
  for (const [k, v] of Object.entries(facts)) sources[`caracteristique:${k}`] = v;
  const byId = Object.fromEntries(liste.map((c) => [c.id, c]));
  const valeurs = {}; let rejected = 0;
  for (const x of j.valeurs || []) {
    const c = byId[x.critere], q = locate(sources[x.source], x.citation);
    const okType = c && (c.type === 'bool' ? typeof x.valeur === 'boolean' : c.valeurs.includes(x.valeur));
    if (!okType || !q) { rejected++; continue; }
    valeurs[x.critere] = { valeur: x.valeur, source: x.source, citation: q };
  }
  return { valeurs, rejected, model: BEDROCK_MODEL, seconds: Math.round((Date.now() - t0) / 100) / 10 };
}

function allowed(req) {
  if (!APP_CODE) return true;
  const got = Buffer.from(String(req.headers['x-app-code'] || '')), want = Buffer.from(APP_CODE);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export async function handle(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { key_present: Boolean(KEY), api: API, code_required: Boolean(APP_CODE), code_ok: allowed(req) });
    if (!allowed(req)) return send(res, 401, { error: "Code d'accès requis" });
    if (req.method === 'POST' && url.pathname === '/api/classify') {
      if (!KEY) return send(res, 500, { error: 'CLEO_API_KEY absente' });
      return send(res, 200, await classify(await readJson(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/lire') return send(res, 200, await lire(await readJson(req)));
    if (req.method === 'POST' && url.pathname === '/api/criteres') return send(res, 200, await lireCriteres(await readJson(req)));
    // modules chargés à la demande (ils importent ce fichier)
    if (req.method === 'POST' && url.pathname === '/api/applicabilite') { const { applicabilite } = await import('./lib/applicabilite.mjs'); return send(res, 200, await applicabilite(await readJson(req))); }
    if (req.method === 'POST' && url.pathname === '/api/obligations') { const { obligationsEtDroits } = await import('./lib/obligations.mjs'); const { brut, ...r } = await obligationsEtDroits(await readJson(req)); return send(res, 200, r); }
    if (req.method === 'POST' && url.pathname === '/api/photo') return send(res, 200, await lirePhoto(await readJson(req)));
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 502, { error: String(e && e.message ? e.message : e) });
  }
}
export { send, DIR, KEY, API, converse, locate };
