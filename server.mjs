// Mini app de classification douanière : sert la page et relaie les appels
// vers la Cleo Legal API. La clé reste ici, jamais dans le navigateur.
//   node server.mjs        → http://localhost:4318
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const API = (process.env.CLEO_BASE_URL || 'https://api.legaldata.cleolabs.co').replace(/\/$/, '');
const PORT = Number(process.env.PORT || 4318);
const CATALOGUE = path.join(DIR, 'catalogue.json');

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
