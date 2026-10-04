// Serveur local : node server.mjs → http://localhost:4318
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { handle, send, DIR, KEY, API } from './app.mjs';

const PORT = Number(process.env.PORT || 4318);
http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (req.method === 'GET' && (p === '/' || p === '/index.html')) return send(res, 200, await readFile(path.join(DIR, 'public', 'index.html')), 'text/html; charset=utf-8');
  return handle(req, res);
}).listen(PORT, '127.0.0.1', () => console.log(`Classification douanière : http://localhost:${PORT}  (clé ${KEY ? 'présente' : 'ABSENTE'}, API ${API})`));
