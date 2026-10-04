// Explicit local-only synthetic preview. Start with Node 22; no credentials,
// cloud writes, model calls or automatic live fallback are used.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createFixtureUpstream, readBody, fixtureJson, FIXTURE_DATASHEET, FIXTURE_CRITERIA } from '../tests/fixtures/customs-upstream.mjs';

const upstream = http.createServer(createFixtureUpstream());
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
process.env.CLEO_BASE_URL = `http://127.0.0.1:${upstream.address().port}`;
process.env.CLEO_API_KEY = 'local-fixture-key';
process.env.APP_CODE = 'fixture';
process.env.CUSTOMS_PREVIEW_MODE = 'fixture';
const { handle } = await import('../app.mjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://preview');
    if (req.method === 'POST' && ['/api/lire', '/api/criteres'].includes(u.pathname)) {
      if (req.headers['x-app-code'] !== 'fixture') return fixtureJson(res, 401, { error: 'Access code required' });
      const b = await readBody(req);
      if (u.pathname === '/api/lire') {
        const ds = String(b.fiche_technique || '');
        return fixtureJson(res, 200, { caracteristiques: ds.includes('Powers a laptop through USB-C.') ? [{ fact: 'function', value: 'Powers a laptop through USB-C.', source: 'fiche_technique', quotes: ['Powers a laptop through USB-C.'] }] : [], contradictions: [], rejected: 0, model: 'synthetic-fixture', seconds: 0 });
      }
      const ds = String(b.pieces?.fiche_technique || '');
      const valeurs = ds === FIXTURE_DATASHEET ? Object.fromEntries(Object.entries(FIXTURE_CRITERIA).filter(([key]) => b.criteres?.some(c => c.id === key))) : {};
      return fixtureJson(res, 200, { valeurs, rejected: 0, model: 'synthetic-fixture', seconds: 0 });
    }
    if (u.pathname.startsWith('/api/')) {
      // Prevent every fixture endpoint from accidentally falling through to Bedrock.
      if (['/api/photo', '/api/applicabilite', '/api/obligations'].includes(u.pathname)) return fixtureJson(res, 503, { error: 'This live-only action is unavailable in the synthetic fixture preview.' });
      return handle(req, res);
    }
    const rel = decodeURIComponent(u.pathname) === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1);
    const file = path.resolve(root, path.extname(rel) ? rel : rel + '.html');
    if (!file.startsWith(root + path.sep) || req.method !== 'GET') return fixtureJson(res, 404, { error: 'Not found' });
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(content);
  } catch { fixtureJson(res, 404, { error: 'Not found' }); }
});
const port = Number(process.env.PORT || 4362);
server.listen(port, '127.0.0.1', () => console.log(`Fixture preview: http://localhost:${port}/\nAccess code: fixture\nSynthetic data only. No live API or model calls.`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(); upstream.close(); process.exit(0); });
