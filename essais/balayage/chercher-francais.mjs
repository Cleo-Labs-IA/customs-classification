// Cherche le français restant dans les littéraux de chaîne (commentaires exclus) et le texte HTML.
import { readFileSync, readdirSync } from 'node:fs';
const files = ['app.mjs', 'server.mjs', ...readdirSync('lib').map((f) => 'lib/' + f), ...readdirSync('public').filter((f) => /\.(js|html)$/.test(f)).map((f) => 'public/' + f), ...readdirSync('api').map((f) => 'api/' + f)];
const ACC = /[àâçéèêëîïôùûœÀÉÈÊÇ«»]/;
const MOTS = /(^|[^a-zA-Z_])(le|la|les|des|du|une|un|est|sont|pour|avec|sans|dans|sur|par|pas|aucun|aucune|ou|et|que|qui|ce|cette|ces|au|aux|votre|vous|nous|produit|fiche|pièce|piece|douane|réponse|erreur|manquant|manquante|inconnu|inconnue|oui|non|écarté|lecture|dossier|chargement|valider|envoyer|ajouter|supprimer|preuve|code SH|règle|taux|droits|pays|origine|destination)([^a-zA-Z_]|$)/i;
for (const f of files) {
  const src = readFileSync(f, 'utf8'); const out = [];
  // tokenisation grossière : on retire les commentaires hors chaînes, on garde les littéraux
  let i = 0, line = 1; const n = src.length; const lits = [];
  const html = f.endsWith('.html');
  let inScript = !html;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (html && !inScript) { if (src.startsWith('<script', i)) { inScript = true; } else if (src.startsWith('<style', i)) { const e = src.indexOf('</style>', i); line += src.slice(i, e).split('\n').length - 1; i = e; continue; } else if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i); line += src.slice(i, e).split('\n').length - 1; i = e + 3; continue; }
      // texte HTML brut jusqu'à la fin de ligne
      const e = src.indexOf('\n', i); const seg = src.slice(i, e < 0 ? n : e); if (!inScript) { lits.push([line, seg.replace(/<[^>]+>/g, ' ')]); i = e < 0 ? n : e; continue; } }
    if (html && inScript && src.startsWith('</script>', i)) { inScript = false; i += 9; continue; }
    if (c === '/' && src[i + 1] === '/' && src[i - 1] !== ':' ) { const e = src.indexOf('\n', i); i = e < 0 ? n : e; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i); line += src.slice(i, e).split('\n').length - 1; i = e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') { let j = i + 1, s = ''; const l0 = line; while (j < n && src[j] !== c) { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '\n') { if (c !== '`') break; line++; } s += src[j]; j++; } lits.push([l0, s]); i = j + 1; continue; }
    i++;
  }
  for (const [l, s] of lits) { if (s.length < 2) continue; if (ACC.test(s) || (MOTS.test(s) && /\s/.test(s.trim()))) out.push(`${f}:${l}: ${s.replace(/\s+/g, ' ').slice(0, 260)}`); }
  console.log(`\n### ${f} (${out.length})`); for (const o of out) console.log(o);
}
