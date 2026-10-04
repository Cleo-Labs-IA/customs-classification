// Lecture d'une fiche produit en ligne. Le serveur télécharge la page et en relève ce
// qu'elle déclare elle-même : données structurées schema.org (Product), balises Open
// Graph et meta, tableaux de caractéristiques, texte visible. Aucun modèle : rien n'est
// déduit, chaque valeur est recopiée de la page. Une personne relit avant de classer.
//
// Garde-fous : http ou https seulement, ports 80 et 443, pas d'identifiants dans
// l'adresse, aucun hôte local ou privé (vérifié sur l'adresse et sur chaque adresse IP
// résolue, à chaque redirection), 10 s et 5 Mo au plus.
import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_OCTETS = 5_000_000;
const DELAI_MS = 10_000;
const MAX_REDIRECTIONS = 3;
const MAX_TEXTE = 6000;
const MAX_CARACS = 40;

export function ipPrivee(ip) {
  const s = String(ip).toLowerCase();
  if (net.isIPv4(s)) {
    const [a, b] = s.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
  }
  if (s === '::' || s === '::1') return true;
  if (s.startsWith('::ffff:')) return ipPrivee(s.slice(7));
  return /^(fc|fd|fe[89ab]|ff)/.test(s);
}

// Adresse acceptée, ou une erreur qui dit pourquoi.
export function adresseAcceptee(texte) {
  let u;
  try { u = new URL(String(texte || '').trim()); } catch { throw new Error('adresse illisible'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('seules les adresses http et https sont lues');
  if (u.username || u.password) throw new Error('adresse avec identifiants refusée');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('port non standard refusé');
  const hote = u.hostname.replace(/^\[|\]$/g, '');
  if (hote === 'localhost' || hote.endsWith('.localhost') || hote.endsWith('.local') || hote.endsWith('.internal')) throw new Error('hôte local refusé');
  if (net.isIP(hote) ? ipPrivee(hote) : !hote.includes('.')) throw new Error('hôte privé refusé');
  return u;
}

async function hoteVerifie(hote, lookup) {
  if (net.isIP(hote)) return;
  const adresses = await lookup(hote, { all: true });
  if (!adresses.length || adresses.some((a) => ipPrivee(a.address))) throw new Error('hôte privé refusé');
}

const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', ocirc: 'ô', ecirc: 'ê', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', times: '×', deg: '°', reg: '®', trade: '™', copy: '©' };
export function decoder(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return ENTITES[e.toLowerCase()] ?? m;
  });
}
const propre = (s, max = 2000) => decoder(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').trim().slice(0, max);

function meta(html, nom) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${nom}["'][^>]*>`, 'i'), m = html.match(re);
  if (!m) return '';
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? propre(c[1], 1000) : '';
}

// Objets schema.org de type Product, où qu'ils soient dans les blocs JSON-LD.
function produitsJsonLd(html) {
  const out = [];
  const visiter = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(visiter);
    const t = [].concat(x['@type'] || []);
    if (t.some((y) => String(y).toLowerCase() === 'product')) out.push(x);
    if (x['@graph']) visiter(x['@graph']);
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visiter(JSON.parse(m[1].trim())); } catch { /* bloc JSON-LD mal formé : ignoré */ }
  }
  return out;
}
const premier = (v) => (Array.isArray(v) ? v[0] : v);
const texteDe = (v) => (v && typeof v === 'object' ? v.name || v['@id'] || '' : v || '');

// Paires « caractéristique : valeur » des tableaux et listes de définitions.
function tableaux(html) {
  const out = [];
  for (const m of html.matchAll(/<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) out.push([propre(m[1], 80), propre(m[2], 200)]);
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) out.push([propre(m[1], 80), propre(m[2], 200)]);
  return out.filter(([n, v]) => n && v && n.length <= 40 && v.length <= 160 && !HORS_SUJET.test(n + ' ' + v));
}
// Tableaux de politique de confidentialité, de cookies ou de livraison : pas des caractéristiques.
const HORS_SUJET = /personal information|commercial information|purchase history|browsing|privacy|cookie|consent|geolocation|ip address|e-?mail address|données personnelles|confidentialit|livraison|shipping|delivery|retour|returns?\b|paiement|payment/i;

function texteVisible(html) {
  const corps = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, html])[1];
  return propre(corps.replace(/<(script|style|noscript|svg|template|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, ' '), MAX_TEXTE);
}

const absolue = (u, base) => { try { const x = new URL(u, base); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch { return ''; } };

export function extrairePage(html, adresse) {
  const p = produitsJsonLd(html)[0] || {};
  const caracs = [];
  for (const a of [].concat(p.additionalProperty || [])) if (a && a.name && a.value != null) caracs.push([propre(a.name, 80), propre(a.value, 200)]);
  if (p.material) caracs.push(['Matière', propre(texteDe(premier(p.material)), 200)]);
  if (p.weight && p.weight.value != null) caracs.push(['Poids', propre(`${p.weight.value} ${p.weight.unitCode || p.weight.unitText || ''}`, 60)]);
  const vus = new Set(caracs.map(([n]) => n.toLowerCase()));
  for (const [n, v] of tableaux(html)) if (!vus.has(n.toLowerCase())) { vus.add(n.toLowerCase()); caracs.push([n, v]); }
  return {
    adresse, domaine: new URL(adresse).hostname.replace(/^www\./, ''),
    titre: propre(p.name, 300) || meta(html, 'og:title') || propre((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], 300),
    description: propre(p.description, 2000) || meta(html, 'og:description') || meta(html, 'description'),
    sku: propre(p.sku || p.mpn, 48), gtin: propre(p.gtin13 || p.gtin || p.gtin12 || p.gtin14 || p.gtin8, 20),
    marque: propre(texteDe(premier(p.brand)), 80),
    image: absolue(texteDe(premier(p.image)) || meta(html, 'og:image'), adresse),
    caracteristiques: caracs.slice(0, MAX_CARACS).map(([nom, valeur]) => ({ nom, valeur })),
    texte: texteVisible(html),
    schema_produit: Boolean(p.name),
  };
}

async function lireCorps(r) {
  const lecteur = r.body.getReader(), morceaux = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    taille += value.length;
    if (taille > MAX_OCTETS) { lecteur.cancel().catch(() => {}); throw new Error('page trop lourde (plus de 5 Mo)'); }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString('utf8');
}

export async function lirePage({ url } = {}, { fetchImpl = fetch, lookup = dns.lookup } = {}) {
  const t0 = Date.now(), fin = AbortSignal.timeout(DELAI_MS);
  let adresse = adresseAcceptee(url);
  for (let n = 0; n <= MAX_REDIRECTIONS; n++) {
    await hoteVerifie(adresse.hostname.replace(/^\[|\]$/g, ''), lookup);
    const r = await fetchImpl(adresse.href, { redirect: 'manual', signal: fin, headers: { 'User-Agent': 'Mozilla/5.0 (Stamped; lecture de fiche produit)', Accept: 'text/html,application/xhtml+xml' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { adresse = adresseAcceptee(new URL(r.headers.get('location'), adresse).href); continue; }
    if (r.status === 401 || r.status === 403 || r.status === 429) throw new Error(`la boutique refuse les lectures automatiques (${r.status}) : copiez la description et la fiche technique à la main`);
    if (!r.ok) throw new Error(`la page a répondu ${r.status}`);
    const type = r.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(type)) throw new Error('ce n\'est pas une page web (' + (type.split(';')[0] || 'type inconnu') + ')');
    return { ...extrairePage(await lireCorps(r), adresse.href), secondes: Math.round((Date.now() - t0) / 100) / 10 };
  }
  throw new Error('trop de redirections');
}
