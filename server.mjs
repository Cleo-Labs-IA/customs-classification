// Mini app de classification douanière : sert la page et relaie les appels
// vers la Cleo Legal API. La clé reste ici, jamais dans le navigateur.
//   node server.mjs        → http://localhost:4318
import http from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.CLEO_BASE_URL || 'https://api.legaldata.cleolabs.co').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 4318);
const CATALOGUE = path.join(DIR, 'catalogue.json');
const BEDROCK_MODEL = process.env.BEDROCK_MODEL || 'global.anthropic.claude-sonnet-5-5';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const execFileP = promisify(execFile);

function loadKey() {
  if (process.env.CLEO_API_KEY) return process.env.CLEO_API_KEY.trim();
  const envFile = path.join(DIR, '.env');
  if (!existsSync(envFile)) return '';
  const line = readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('CLEO_API_KEY='));
  return line ? line.slice('CLEO_API_KEY='.length).trim() : '';
}
const KEY = loadKey();

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 200_000) throw new Error('body too large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function readCatalogue() {
  if (!existsSync(CATALOGUE)) return [];
  return JSON.parse(await readFile(CATALOGUE, 'utf8'));
}

// Relaie un POST /v2/customs/classifications et rend la réponse telle quelle,
// avec le code HTTP, l'identifiant de requête et la durée mesurée.
async function classify(body) {
  const t0 = Date.now();
  const r = await fetch(`${API}/v2/customs/classifications`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 600) }; }
  return {
    http: r.status,
    request_id: r.headers.get('x-request-id'),
    seconds: Math.round((Date.now() - t0) / 100) / 10,
    endpoint: `${API}/v2/customs/classifications`,
    sent: body,
    body: json,
  };
}

// Lecture des pièces : un modèle (Claude sur Bedrock, via l'aws CLI et le profil
// de la machine) relève les caractéristiques écrites dans la description et la
// fiche technique, et les contradictions entre les pièces. Chaque élément doit
// citer un passage ; le serveur vérifie que le passage existe mot pour mot dans
// la pièce citée et jette le reste. Rien n'est gardé sans passage vérifié.
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
  const user = JSON.stringify({ description, fiche_technique, caracteristiques: facts });
  const { stdout } = await execFileP('aws', [
    'bedrock-runtime', 'converse', '--region', BEDROCK_REGION, '--model-id', BEDROCK_MODEL,
    '--system', JSON.stringify([{ text: LIRE_SYSTEM }]),
    '--messages', JSON.stringify([{ role: 'user', content: [{ text: user }] }]),
    '--inference-config', JSON.stringify({ maxTokens: 2000 }),
    '--output', 'json',
  ], { maxBuffer: 4_000_000, timeout: 90_000 });
  const text = JSON.parse(stdout).output.message.content.map((c) => c.text || '').join('');
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
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

// Lecture d'une photo : la photo est convertie en JPEG (sips, macOS), puis un
// modèle transcrit ce qui est imprimé sur l'appareil, ligne par ligne, et liste
// ce qu'il n'arrive pas à lire. La transcription devient une pièce du dossier,
// qu'une personne relit avant de classer.
const PHOTO_SYSTEM = `You transcribe what is printed on a product or its rating label, for a customs file. The label may be rotated or partly hidden. You never classify and never complete a value you cannot read.
Return ONLY a JSON object:
{"lignes":["each printed line or marking, copied exactly as read"],
 "illisible":["short French note for each part of the label you cannot read with certainty"],
 "description":"a short English customs-style description of the product only (what it is and what the label says it does, e.g. its printed type, input and output ratings), using only what is printed or plainly visible; no surroundings, no colour, no brand guess, no model guess",
 "reference":"model or part reference exactly as printed, or empty string"}
Rules: copy characters as printed (units, symbols, punctuation). If a character is doubtful, leave the whole value out of "lignes" and describe it in "illisible". Certification logos are listed by their name (CE, UL Listed...) on their own line.`;

async function readRaw(req, max = 25_000_000) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > max) throw new Error('photo trop lourde'); chunks.push(c); }
  return Buffer.concat(chunks);
}

async function lirePhoto(bytes) {
  const t0 = Date.now();
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cleo-photo-'));
  try {
    const src = path.join(dir, 'in'), jpg = path.join(dir, 'out.jpg'), small = path.join(dir, 'small.jpg'), input = path.join(dir, 'input.json');
    await writeFile(src, bytes);
    await execFileP('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', '-Z', '2400', src, '--out', jpg]);
    await execFileP('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '-Z', '700', src, '--out', small]);
    const image = (await readFile(jpg)).toString('base64');
    await writeFile(input, JSON.stringify({
      modelId: BEDROCK_MODEL,
      system: [{ text: PHOTO_SYSTEM }],
      messages: [{ role: 'user', content: [{ image: { format: 'jpeg', source: { bytes: image } } }, { text: 'Transcribe this product photo.' }] }],
      inferenceConfig: { maxTokens: 4000 },
    }));
    const { stdout } = await execFileP('aws', ['bedrock-runtime', 'converse', '--region', BEDROCK_REGION, '--cli-input-json', 'file://' + input, '--output', 'json'], { maxBuffer: 4_000_000, timeout: 90_000 });
    const text = JSON.parse(stdout).output.message.content.map((c) => c.text || '').join('');
    let j;
    try { j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); }
    catch { throw new Error('lecture de photo illisible, réponse du modèle : ' + (text.slice(0, 300) || '(vide) ' + stdout.slice(0, 400))); }
    return {
      lignes: (j.lignes || []).map(String), illisible: (j.illisible || []).map(String),
      description: String(j.description || ''), reference: String(j.reference || ''),
      apercu: 'data:image/jpeg;base64,' + (await readFile(small)).toString('base64'),
      model: BEDROCK_MODEL, seconds: Math.round((Date.now() - t0) / 100) / 10,
    };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, await readFile(path.join(DIR, 'index.html')), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return send(res, 200, { key_present: Boolean(KEY), api: API });
    }
    if (req.method === 'POST' && url.pathname === '/api/classify') {
      if (!KEY) return send(res, 500, { error: 'CLEO_API_KEY absente : la poser dans .env' });
      return send(res, 200, await classify(await readJson(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/photo') {
      return send(res, 200, await lirePhoto(await readRaw(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/lire') {
      return send(res, 200, await lire(await readJson(req)));
    }
    if (req.method === 'GET' && url.pathname === '/api/catalogue') {
      return send(res, 200, await readCatalogue());
    }
    if (req.method === 'POST' && url.pathname === '/api/catalogue') {
      const entry = await readJson(req);
      if (!entry.sku || !entry.code || !entry.validated_by) return send(res, 400, { error: 'sku, code et validated_by sont requis' });
      const rows = (await readCatalogue()).filter((r) => !(r.sku === entry.sku && r.destination === entry.destination));
      rows.push({ ...entry, validated_at: new Date().toISOString() });
      await writeFile(CATALOGUE, JSON.stringify(rows, null, 1));
      return send(res, 200, rows);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 502, { error: String(e && e.message ? e.message : e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Classification douanière : http://localhost:${PORT}  (clé ${KEY ? 'présente' : 'ABSENTE'}, API ${API})`);
});
