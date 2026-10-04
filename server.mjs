// Serveur local : node server.mjs → http://localhost:4318
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handle, send, DIR, KEY, API } from './app.mjs';

const PORT = Number(process.env.PORT || 4318);
const PUBLIC = path.join(DIR, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/')) return handle(req, res);
  // fichiers de public/, comme sur l'hébergement (arbre → arbre.html)
  const rel = p === '/' ? 'index.html' : p.slice(1), file = path.join(PUBLIC, path.extname(rel) ? rel : rel + '.html');
  if (req.method !== 'GET' || !file.startsWith(PUBLIC + path.sep)) return send(res, 404, { error: 'not found' });
  try { return send(res, 200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream'); }
  catch { return send(res, 404, { error: 'not found' }); }
}).listen(PORT, '127.0.0.1', () => console.log(`Customs classification: http://localhost:${PORT}  (key ${KEY ? 'present' : 'MISSING'}, API ${API})`));
