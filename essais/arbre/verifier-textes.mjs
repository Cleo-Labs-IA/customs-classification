// Vérifie que chaque "texte" de textes.json se retrouve mot pour mot dans la NC 2026 téléchargée.
// Seule normalisation, des deux côtés : toute suite de blancs devient une espace.
import { readFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const source = norm(readFileSync(new URL('nc2026.txt', ici), 'utf8'));
const textes = JSON.parse(readFileSync(new URL('../../public/data/textes.json', ici), 'utf8'));
let ok = 0;
const ids = new Set();
for (const t of textes) {
  const x = norm(String(t.texte || ''));
  const pb = [];
  if (!/^[a-z0-9-]+$/.test(t.id || '')) pb.push('id non ascii');
  if (ids.has(t.id)) pb.push('id en double');
  ids.add(t.id);
  for (const k of ['ref', 'source', 'url']) if (!t[k]) pb.push('champ absent : ' + k);
  if (!x) pb.push('texte vide');
  else if (!source.includes(x)) pb.push('texte absent de la source');
  if (pb.length) console.error(`ECHEC ${t.id} : ${pb.join(' ; ')}`);
  else ok++;
}
console.log(`${ok}/${textes.length} textes retrouvés mot pour mot`);
process.exit(ok === textes.length && textes.length > 0 ? 0 : 1);
