// Replays one saved, real API response for every classification call. For screen tests only,
// when the API key has no quota left: node essais/rejouer-api.mjs <saved response> [port]
import http from 'node:http';
import { readFileSync } from 'node:fs';
const saved = JSON.parse(readFileSync(process.argv[2], 'utf8')), port = Number(process.argv[3] || 4341);
http.createServer((req, res) => { req.resume(); req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json', 'X-Request-Id': 'replay-of-a-saved-response' }); res.end(JSON.stringify(saved.body || saved)); }); }).listen(port, '127.0.0.1', () => console.log('replaying', process.argv[2], 'on', port));
