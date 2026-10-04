// Diagnostic : pourquoi /api/lire rend « unreadable model response » sur l'exemple contradictoire.
// Enveloppe fetch pour noter stopReason, jetons et longueur du texte rendu par Bedrock (aucune clé affichée).
import http from 'node:http';
import { readFileSync } from 'node:fs';
const vrai = globalThis.fetch;
const notes = [];
globalThis.fetch = async (url, opt) => {
  const r = await vrai(url, opt);
  if (String(url).includes('bedrock')) { const j = await r.clone().json().catch(() => null); if (j && j.output) { const text = j.output.message.content.map((x) => x.text || '').join(''); notes.push({ stop: j.stopReason, out: j.usage && j.usage.outputTokens, len: text.length, head: "objects=" + (text.split("\"caracteristiques\"").length - 1) + " blocks=" + j.output.message.content.length + " types=" + j.output.message.content.map((x) => Object.keys(x).join("+")).join(","), tail: text.slice(1500, 1700) }); } }
  return r;
};
const { handle } = await import('../../app.mjs');
const srv = http.createServer(handle).listen(4332, '127.0.0.1');
const body = readFileSync(new URL('./lire-b.json', import.meta.url), 'utf8');
for (let i = 0; i < 5; i++) {
  const r = await vrai('http://127.0.0.1:4332/api/lire', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  const j = await r.json(); const n = notes[notes.length - 1] || {};
  console.log(i, 'http', r.status, j.error ? 'ERROR' : 'ok contradictions=' + j.contradictions.length + ' rejected=' + j.rejected, '| stop', n.stop, 'outTokens', n.out, 'len', n.len, '| head', JSON.stringify(n.head), '| tail', JSON.stringify(n.tail));
}
srv.close();
