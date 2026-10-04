// Applicabilité d'une décision : une décision officielle « proche » par le texte
// n'est pas une preuve qu'elle vaut pour ce produit. Ce module refait le contrôle
// d'un déclarant : il lit le texte de la décision à la source officielle, compare
// les seules caractéristiques qui comptent pour le classement, et ne garde que ce
// qui est cité au caractère près des deux côtés. Le verdict est calculé ici, à
// partir des éléments vérifiés ; il n'est jamais repris du modèle. Le module ne
// propose jamais le code de la décision comme code du produit.
//
// Tout ce que le module rend est du TEXTE BRUT (citations, motif, identifiants) :
// une citation reproduit ce que la source écrit, y compris des chevrons. C'est à
// l'affichage de l'échapper, par exemple avec echapper() exporté ici.
import { converse as converseBedrock, locate } from '../app.mjs';

const UA = { 'User-Agent': 'cleo-customs-classifier applicabilite (+https://cleolabs.co)' };
const SOURCES = {
  US_CBP_CROSS: { juridiction: 'US', nom: 'US customs (CBP)', fin_attendue: false },
  UK_HMRC_ATAR: { juridiction: 'GB', nom: 'UK customs (HMRC)', fin_attendue: true },
};
// Les seuls aspects comparés : ceux qui décident d'un classement tarifaire.
export const ASPECTS = {
  fonction: 'Function',
  alimentation_donnees: 'Electrical or data role',
  presentation: 'Presentation for sale',
  matiere: 'Material',
};
const MAX_CITATION = 300;
const MAX_ELEMENTS = 6;        // points communs et différences rendus, chacun
const MAX_EXAMINES = 60;       // éléments du modèle examinés par liste
const MAX_PIECE = 20_000;      // caractères par pièce du produit
const MAX_FAITS = 40;          // caractéristiques déclarées
const MAX_FAIT = 500;          // caractères par caractéristique
const MAX_DECISION = 60_000;   // caractères du texte de la décision
const nombre = (k) => String(k).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const echapper = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Pays de destination : code à deux lettres, ou l'un des noms usuels des deux
// juridictions lues. Tout le reste est « inconnu » (null), jamais « autre pays ».
const ALIAS = {
  US: ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA', 'ETATS UNIS', "ETATS UNIS D'AMERIQUE"],
  GB: ['GB', 'UK', 'GBR', 'UNITED KINGDOM', 'GREAT BRITAIN', 'ROYAUME UNI', 'GRANDE BRETAGNE'],
};
export function pays(x) {
  if (typeof x !== 'string') return null;
  const p = x.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[-.\s]+/g, ' ').trim();
  for (const [code, noms] of Object.entries(ALIAS)) if (noms.includes(p)) return code;
  return /^[A-Z]{2}$/.test(p) ? p : null;
}
const propre = (s) => String(s || '').replace(/\f/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{2,}/g, '\n').trim();
const entites = (s) => s.replace(/&#x([0-9a-f]{1,6});/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return m; } })
  .replace(/&#(\d{1,7});/g, (m, d) => { try { return String.fromCodePoint(Number(d)); } catch { return m; } })
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

// Les seuls messages d'échec qui peuvent atteindre l'utilisateur sont écrits ici.
// Un message technique (réseau, JSON, modèle) n'est jamais recopié.
class Echec extends Error {}
const definitif = (msg) => Object.assign(new Echec(msg), { definitif: true });

async function avecReprise(fn, pauseMs, essais = 3) {
  let derniere;
  for (let i = 1; i <= essais; i++) {
    try { return await fn(); } catch (e) {
      derniere = e;
      if (e.definitif || i === essais) break;
      await new Promise((r) => setTimeout(r, pauseMs * i));
    }
  }
  throw derniere;
}
const lireSource = (fetchImpl, url, lecture, pauseMs) => avecReprise(async () => {
  let r;
  try { r = await fetchImpl(url, { headers: UA, signal: AbortSignal.timeout(30_000) }); } catch { throw new Echec('the official source is unreachable'); }
  if (!r) throw new Echec('the official source is unreachable');
  if (r.status === 404) throw definitif('the official source has no record of this ruling (404 response)');
  if (!r.ok) throw new Echec('the official source responded with ' + (Number(r.status) ? 'status ' + Number(r.status) : 'an error'));
  try { return await lecture(r); } catch (e) { throw e instanceof Echec ? e : definitif('the official source returned an unreadable response'); }
}, pauseMs);

// Page publique d'une décision britannique : un titre « Information for ruling
// <numéro> » et une liste « libellé / valeur ». On en tire le numéro, la
// description des marchandises, les mots-clés et la justification. Les entités
// sont décodées après le retrait des balises : le résultat est le texte que la
// page affiche, à traiter comme du texte brut.
export function lireDecisionUK(html) {
  const page = String(html || '');
  const champs = {};
  const re = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g;
  for (let m; (m = re.exec(page));) {
    const brut = m[2].replace(/<span class="no-print">[\s\S]*?<\/span>/g, '').replace(/<\/li>/g, '\n');
    champs[propre(entites(m[1].replace(/<[^>]+>/g, '')))] = propre(entites(brut.replace(/<[^>]+>/g, '')));
  }
  const description = champs['Description'] || '';
  if (!description) return null;
  const motsCles = (champs['Keywords'] || '').split('\n').map((x) => x.trim()).filter(Boolean).join(', ');
  const texte = ['Description: ' + description, motsCles && 'Keywords: ' + motsCles, champs['Justification'] && 'Justification: ' + champs['Justification']].filter(Boolean).join('\n');
  const titre = page.match(/<(title|h1)[^>]*>\s*Information for ruling\s+(\d{6,12})\b/);
  return { texte, numero: titre ? titre[2] : null, debut: champs['Start date'] || null, fin: champs['Expiry date'] || null };
}
// Date britannique : seulement « jour mois-en-lettres année ». Une date toute en
// chiffres est ambiguë (jour et mois) : elle reste inconnue plutôt que devinée.
const MOIS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function jourUK(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})$/);
  if (!m) return null;
  const mois = MOIS.indexOf(m[2].slice(0, 3).toLowerCase()), jour = Number(m[1]), an = Number(m[3]);
  if (mois < 0) return null;
  const d = new Date(Date.UTC(an, mois, jour));
  return d.getUTCDate() === jour && d.getUTCMonth() === mois ? d.toISOString().slice(0, 10) : null;
}

// Décision américaine : le texte vient de /api/ruling/<id>. Les liens de
// révocation et de modification ne sont PAS renseignés sur cette route (ils y
// sont à null même pour une décision révoquée) : ils se lisent sur /api/search.
// Un champ absent ou mal formé reste « inconnu » (null), jamais « aucun ».
export function statutUS(recherche, id) {
  const lignes = recherche && Array.isArray(recherche.rulings) ? recherche.rulings : [];
  const r = lignes.find((x) => x && String(x.rulingNumber).toUpperCase() === String(id).toUpperCase());
  if (!r) return { revoquee: null, revoquee_par: [], modifiee_par: null };
  const modifiee_par = Array.isArray(r.modifiedBy) ? r.modifiedBy.map(String) : null;
  if (!Array.isArray(r.revokedBy) || typeof r.operationallyRevoked !== 'boolean') return { revoquee: null, revoquee_par: [], modifiee_par };
  return { revoquee: r.revokedBy.length > 0 || r.operationallyRevoked, revoquee_par: r.revokedBy.map(String), modifiee_par };
}

async function chargerUS(id, fetchImpl, pauseMs) {
  const texte = await lireSource(fetchImpl, `https://rulings.cbp.gov/api/ruling/${encodeURIComponent(id)}`, async (r) => {
    const j = await r.json();
    if (!j || String(j.rulingNumber || '').trim().toUpperCase() !== id) throw definitif('the text returned by the official source does not carry this ruling number');
    return propre(j.text);
  }, pauseMs);
  if (!texte) throw definitif('the official source returned an empty text');
  let statut = { revoquee: null, revoquee_par: [], modifiee_par: null };
  try {
    statut = statutUS(await lireSource(fetchImpl, `https://rulings.cbp.gov/api/search?term=${encodeURIComponent(id)}&collection=ALL&pageSize=30&page=1`, (r) => r.json(), pauseMs), id);
  } catch { /* statut inconnu : revoquee et modifiee_par restent à null */ }
  return { texte, ...statut, date_fin: null, expiree: null };
}

async function chargerUK(numero, adresse, fetchImpl, aujourdhui, pauseMs) {
  const lu = await lireSource(fetchImpl, adresse, async (r) => lireDecisionUK(await r.text()), pauseMs);
  if (!lu) throw definitif('the official page contains no description of the goods');
  if (lu.numero !== numero) throw definitif('the official page read does not carry this ruling number');
  const fin = jourUK(lu.fin);
  // La page britannique n'affiche pas de statut de révocation ni de modification : ils restent inconnus.
  return { texte: lu.texte, revoquee: null, revoquee_par: [], modifiee_par: null, date_fin: fin, expiree: fin ? fin < aujourdhui : null };
}

const SYSTEM = `You help a customs declarant check whether an official tariff ruling applies to a product. You never classify, never guess, and never state or suggest a tariff code for the product.
You receive "produit" (documents: "description", "fiche_technique", and "caracteristiques" as declared key/value facts) and "decision" (the full text of an official ruling about ANOTHER product).
Compare ONLY the characteristics that matter for tariff classification:
- "fonction": what the goods are and what they do.
- "alimentation_donnees": electrical or data role (converts or supplies power, output power, voltage, transfers data, network, internal or external to another machine).
- "presentation": how the goods are put up (set, kit, retail packaging, with accessories, incomplete, part).
- "matiere": constituent material, only when the ruling's reasoning relies on it.
Ignore brand, model number, importer, country of origin, duty rates, additional tariffs and procedural boilerplate.

Return ONLY a JSON object:
{"points_communs":[{"aspect":"fonction|alimentation_donnees|presentation|matiere","produit":{"source":"description|fiche_technique|caracteristique:<key>","citation":"verbatim"},"decision":{"citation":"verbatim"}}],
 "differences":[{"aspect":"...","produit":{"source":"...","citation":"verbatim"} or null,"decision":{"citation":"verbatim"},"decisive":true|false,"pourquoi_ca_compte":"one English sentence"}]}

Rules:
- Every "citation" is copied character for character (same letter case, same punctuation) from the named product document or from the ruling text, under 250 characters, no paraphrase, no ellipsis, no added quotation marks. A citation is made of whole words, at least two words, and is long enough to state the characteristic by itself. For a declared fact, source is "caracteristique:<key>" and citation is its whole value copied exactly.
- A common point: both texts state the same classification-relevant characteristic. Do not list a common point when the two passages describe different things, or when one of them says the goods are NOT or do NOT have what the other states.
- A difference: the ruling's goods have a classification-relevant characteristic that the product documents contradict (produit = the contradicting passage) or do not mention at all (produit = null).
- "decisive" is true only when the difference alone would lead a customs officer to classify the two goods under different headings or subheadings (for example a different kind of goods or a different principal function). A missing detail is never decisive.
- "pourquoi_ca_compte" is one plain English sentence explaining why the difference matters for classification. It contains no digit at all, no tariff code, no heading or chapter number, and no markup.
- At most 6 common points and 6 differences, each listed once. If nothing qualifies, return empty arrays.`;

// ---- Contrôle d'une citation.
const LETTRE = /[\p{L}\p{N}]/u;
const VIDES = new Set(['the', 'and', 'for', 'with', 'not', 'are', 'was', 'has', 'have', 'its', 'this', 'that', 'from', 'into', 'than', 'which', 'une', 'des', 'les', 'que', 'pas', 'est', 'sur', 'par', 'pour', 'avec', 'dans', 'sans']);
// Assez de matière pour dire quelque chose : au moins deux mots, cinq lettres ou
// chiffres, et un mot porteur (un nombre, ou un mot de trois lettres qui n'est
// pas un mot vide). « to », « is a », « for » ne passent pas.
function consistante(c) {
  const mots = c.match(/[\p{L}\p{N}]+/gu) || [];
  const porteur = mots.some((m) => /\p{N}/u.test(m) || (m.length >= 3 && !VIDES.has(m.toLowerCase())));
  return mots.length >= 2 && mots.join('').length >= 5 && porteur;
}
// Position d'une occurrence exacte qui ne coupe aucun mot, ou -1.
function entiere(src, c) {
  for (let i = src.indexOf(c); i >= 0; i = src.indexOf(c, i + 1)) {
    const avant = i > 0 ? src[i - 1] : '', apres = src[i + c.length] || '';
    const coupeDebut = LETTRE.test(c[0]) && LETTRE.test(avant), coupeFin = LETTRE.test(c[c.length - 1]) && LETTRE.test(apres);
    if (!coupeDebut && !coupeFin) return i;
  }
  return -1;
}
// La phrase qui porte la citation contient-elle une négation ? Sert à refuser un
// « point commun » dont un seul des deux côtés est nié (« is not a ... »).
const NEGATION = /(?:^|[^\p{L}\p{N}])(?:not|no|non|never|without|neither|nor|except|excluding|cannot|sans|ne|pas|aucun|aucune|jamais|ni|sauf|hors)(?![\p{L}\p{N}])|n['\u2019]t(?![\p{L}\p{N}])|(?:^|[^\p{L}\p{N}])n['\u2019](?=\p{L})/iu;
function niee(src, i, longueur) {
  const avant = src.slice(0, i), apres = src.slice(i + longueur);
  let debut = 0;
  for (const m of avant.matchAll(/[.!?;](?=\s)|\n/g)) debut = m.index + 1;
  const f = apres.match(/[.!?;](?=\s|$)|\n/);
  return NEGATION.test(src.slice(debut, f ? i + longueur + f.index : src.length));
}
// Rend { citation, niee } si la citation est retrouvée au caractère près (locate
// puis égalité stricte : la recherche sans casse de locate ne suffit pas), en
// mots entiers et avec assez de matière ; sinon null.
function citer(src, c, { entier = false } = {}) {
  if (typeof src !== 'string' || typeof c !== 'string') return null;
  const q = c.trim();
  if (!q || q.length > MAX_CITATION || locate(src, q) !== q) return null;
  if (entier) return q === src.trim() && (q.match(/[\p{L}\p{N}]/gu) || []).length >= 2 ? { citation: q, niee: NEGATION.test(q) } : null;
  if (!consistante(q)) return null;
  const i = entiere(src, q);
  return i < 0 ? null : { citation: q, niee: niee(src, i, q.length) };
}

// Contrôle des éléments rendus par le modèle : aspect dans la liste, citation
// retrouvée au caractère près dans la pièce nommée et dans le texte de la
// décision, sans doublon, six au plus par liste. Ce qui échoue est jeté et
// compté, jamais corrigé.
export function verifierElements(brut, sources, texteDecision) {
  let rejetes = 0, hors_criteres = 0, doublons = 0, au_dela_du_plafond = 0, explications_retirees = 0;
  const src = sources && typeof sources === 'object' ? sources : {};
  const liste = (v) => {
    const l = Array.isArray(v) ? v : [];
    au_dela_du_plafond += Math.max(0, l.length - MAX_EXAMINES);
    return l.slice(0, MAX_EXAMINES);
  };
  const cote = (p) => {
    if (!p || typeof p !== 'object' || typeof p.source !== 'string' || !Object.hasOwn(src, p.source)) return null;
    const c = citer(src[p.source], p.citation, { entier: p.source.startsWith('caracteristique:') });
    return c && { source: p.source, ...c };
  };
  const vus = new Set();
  const nouveau = (p, d) => { const k = JSON.stringify([p && p.source, p && p.citation, d.citation]); if (vus.has(k)) return false; vus.add(k); return true; };
  const corps = brut && typeof brut === 'object' ? brut : {};
  const points_communs = [], differences = [];
  for (const x of liste(corps.points_communs)) {
    if (!x || typeof x !== 'object' || !Object.hasOwn(ASPECTS, x.aspect)) { hors_criteres++; continue; }
    const p = cote(x.produit), d = citer(texteDecision, x.decision && x.decision.citation);
    // Un côté nié et pas l'autre : ce n'est pas un point commun.
    if (!p || !d || p.niee !== d.niee) { rejetes++; continue; }
    if (!nouveau(p, d)) { doublons++; continue; }
    if (points_communs.length >= MAX_ELEMENTS) { au_dela_du_plafond++; continue; }
    points_communs.push({ aspect: ASPECTS[x.aspect], produit: { source: p.source, citation: p.citation }, decision: { citation: d.citation } });
  }
  for (const x of liste(corps.differences)) {
    if (!x || typeof x !== 'object' || !Object.hasOwn(ASPECTS, x.aspect)) { hors_criteres++; continue; }
    const d = citer(texteDecision, x.decision && x.decision.citation);
    const sansProduit = x.produit === null || x.produit === undefined;
    const p = sansProduit ? null : cote(x.produit);
    if (!d || (!sansProduit && !p)) { rejetes++; continue; }
    if (!nouveau(p, d)) { doublons++; continue; }
    if (differences.length >= MAX_ELEMENTS) { au_dela_du_plafond++; continue; }
    // L'explication vient du modèle et n'est adossée à aucune citation : elle est
    // retirée dès qu'elle porte un chiffre (donc tout code, position ou chapitre,
    // quel que soit le séparateur) ou un chevron.
    let pourquoi = typeof x.pourquoi_ca_compte === 'string' ? x.pourquoi_ca_compte.trim().replace(/\s*\u2014\s*/g, ', ').slice(0, 400) : '';
    if (pourquoi && /[\p{N}<>]/u.test(pourquoi)) { pourquoi = ''; explications_retirees++; }
    differences.push({
      aspect: ASPECTS[x.aspect], produit: p && { source: p.source, citation: p.citation }, decision: { citation: d.citation },
      pourquoi_ca_compte: pourquoi,
      // Un silence des pièces n'est pas une contradiction : jamais décisif.
      decisive: x.decisive === true && p !== null,
    });
  }
  return { points_communs, differences, rejetes, hors_criteres, doublons, au_dela_du_plafond, explications_retirees };
}

// Verdict calculé à partir des seuls éléments vérifiés. « applicable » exige un
// point commun sur la fonction, aucune différence, et une décision dont on sait
// qu'elle n'est ni révoquée, ni modifiée, ni expirée : tout inconnu rétrograde.
// meme_juridiction : true, false, ou null quand la destination est inconnue.
export function decider({ points_communs = [], differences = [], revoquee = null, modifiee = null, expiree = null, fin_attendue = false, meme_juridiction = null, nom_source = 'this customs authority' } = {}) {
  const pc = points_communs.length, decisives = differences.filter((d) => d.decisive).length, autres = differences.length - decisives;
  const n = (k, un, plusieurs) => `${k} ${k > 1 ? plusieurs : un}`;
  let verdict, motif;
  if (decisives) {
    verdict = 'non_applicable';
    motif = `${n(decisives, 'verified difference bears', 'verified differences bear')} on a criterion that decides the classification: the ruling covers different goods.`;
  } else if (!pc) {
    verdict = 'non_verifiable';
    motif = 'No common point could be established by an exact quotation on both sides: nothing shows that the ruling covers this product.';
  } else if (differences.length) {
    verdict = 'partiellement';
    motif = `${n(pc, 'verified common point', 'verified common points')} and ${n(autres, 'difference', 'differences')} to resolve before relying on the ruling.`;
  } else {
    verdict = 'applicable';
    motif = `${n(pc, 'verified common point', 'verified common points')}, no difference found in the documents provided.`;
  }
  const compare = verdict !== 'non_verifiable';
  const reserves = [];
  if (compare && verdict !== 'non_applicable' && !points_communs.some((p) => p && p.aspect === ASPECTS.fonction)) reserves.push('No verified common point bears on the function of the goods.');
  if (revoquee === true) reserves.push('The ruling has been revoked: it can no longer be relied on.');
  else if (revoquee !== false && compare) reserves.push('The source does not show whether the ruling has been revoked: check before relying on it.');
  if (modifiee === true) reserves.push('The ruling has been modified by a later ruling, to be read before any use.');
  else if (modifiee !== false && compare) reserves.push('The source does not show whether the ruling has been modified since.');
  if (expiree === true) reserves.push('The ruling is past its expiry date.');
  else if (expiree !== false && fin_attendue && compare) reserves.push('The expiry date of the ruling could not be read: its validity remains to be checked.');
  if (verdict === 'applicable' && reserves.length) verdict = 'partiellement';
  if (compare && meme_juridiction === false) reserves.push(`Ruling issued by ${nom_source}, which is not the customs authority of the destination country: it informs the reasoning, it does not bind that authority.`);
  else if (compare && meme_juridiction !== true) reserves.push(`Destination country not given or not recognized: it cannot be said whether ${nom_source} is the customs authority of the destination country.`);
  return { verdict, motif: [motif, ...reserves].join(' ') };
}

// Pièces du produit : seules les chaînes non vides comptent. Une valeur absente
// (null, undefined, chaîne vide) n'est pas une pièce.
function pieces(produit) {
  const p = produit && typeof produit === 'object' && !Array.isArray(produit) ? produit : {};
  const texte = (v) => (typeof v === 'string' ? v : '');
  const description = texte(p.description), fiche_technique = texte(p.fiche_technique);
  const c = p.caracteristiques && typeof p.caracteristiques === 'object' && !Array.isArray(p.caracteristiques) ? p.caracteristiques : {};
  const faits = {};
  for (const [k, v] of Object.entries(c)) {
    if (v === null || v === undefined) continue;
    const s = typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s && s.trim()) faits[k] = s;
  }
  return { description, fiche_technique, faits };
}

// Identifiant et adresse officielle, recalculés ici : rien de ce que l'appelant
// fournit comme adresse n'est rendu ni appelé tel quel.
function reperer(decision) {
  const d = decision && typeof decision === 'object' ? decision : {};
  const source = typeof d.source === 'string' && Object.hasOwn(SOURCES, d.source) ? d.source : '';
  const brut = typeof d.ruling_id === 'string' || typeof d.ruling_id === 'number' ? String(d.ruling_id).trim().toUpperCase() : '';
  const date = typeof d.ruling_date === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(d.ruling_date.trim()) ? d.ruling_date.trim().slice(0, 10) : null;
  const code = typeof d.official_code === 'string' && /^\d[\d. ]{3,15}$/.test(d.official_code.trim()) ? d.official_code.trim() : null;
  const base = { source, date, code, fourni: Boolean(brut), id: '', numero: null, url: null, adresse_coherente: true };
  if (source === 'US_CBP_CROSS' && /^[A-Z0-9]{4,12}$/.test(brut)) return { ...base, id: brut, numero: brut, url: `https://rulings.cbp.gov/ruling/${brut}` };
  const uk = source === 'UK_HMRC_ATAR' && brut.match(/^(?:UK|GB)?(\d{6,12})$/);
  if (uk) {
    const url = `https://www.tax.service.gov.uk/search-for-advance-tariff-rulings/ruling/${uk[1]}`;
    let adresse_coherente = true;
    if (d.url !== undefined && d.url !== null && d.url !== '') {
      try { adresse_coherente = new URL(String(d.url)).href.replace(/\/$/, '') === url; } catch { adresse_coherente = false; }
    }
    return { ...base, id: brut, numero: uk[1], url, adresse_coherente };
  }
  return base;
}

export async function applicabilite(entree, options) {
  const { produit, decision, destination } = entree && typeof entree === 'object' ? entree : {};
  const { fetchImpl = fetch, converseImpl = converseBedrock, aujourdhui = new Date().toISOString().slice(0, 10), pauseMs = 600 } = options && typeof options === 'object' ? options : {};
  const t0 = Date.now();
  const rep = reperer(decision);
  const src = SOURCES[rep.source] || null;
  const juridiction = src ? src.juridiction : null;
  const fiche = {
    id: rep.id, source: rep.source, juridiction, date: rep.date, url: rep.url, code: rep.code,
    revoquee: null, texte_disponible: false, revoquee_par: [], modifiee_par: null, date_fin: null, expiree: null,
  };
  const dest = pays(destination);
  const meme_juridiction = juridiction && dest ? juridiction === dest : null;
  const fin = (extra) => ({ decision: fiche, meme_juridiction, points_communs: [], differences: [], rejetes: 0, hors_criteres: 0, doublons: 0, au_dela_du_plafond: 0, explications_retirees: 0, ...extra, secondes: Math.round((Date.now() - t0) / 100) / 10 });
  const inverifiable = (raison) => fin({ verdict: 'non_verifiable', motif: raison });

  if (!src) return inverifiable('Unknown ruling source: the official text cannot be read.');
  if (!rep.fourni) return inverifiable('Ruling identifier missing: the official text cannot be read.');
  if (!rep.id) return inverifiable('Ruling identifier unreadable for this source: the official text cannot be read.');
  if (!rep.adresse_coherente) return inverifiable('Ruling text not retrieved: the address provided does not match the official page for this identifier.');

  const { description, fiche_technique, faits } = pieces(produit);
  const sources = { description, fiche_technique };
  for (const [k, v] of Object.entries(faits)) sources[`caracteristique:${k}`] = v;
  if (!Object.values(sources).some((s) => s.trim())) return inverifiable('No product document to compare with the ruling.');
  const longue = [description, fiche_technique].find((s) => s.length > MAX_PIECE);
  if (longue) return inverifiable(`Comparison not performed: a product document is too long to be read in full (${nombre(longue.length)} characters, limit ${nombre(MAX_PIECE)}).`);
  if (Object.keys(faits).length > MAX_FAITS || Object.entries(faits).some(([k, v]) => k.length > 80 || v.length > MAX_FAIT)) return inverifiable(`Comparison not performed: the declared characteristics exceed what can be read in full (at most ${MAX_FAITS}, ${MAX_FAIT} characters each).`);

  let lu;
  try {
    lu = rep.source === 'US_CBP_CROSS' ? await chargerUS(rep.numero, fetchImpl, pauseMs) : await chargerUK(rep.numero, rep.url, fetchImpl, aujourdhui, pauseMs);
  } catch (e) {
    return inverifiable(`Ruling text not retrieved: ${e instanceof Echec ? e.message : 'the official source could not be read'}.`);
  }
  if (lu.texte.length > MAX_DECISION) return inverifiable(`Comparison not performed: the ruling text is too long to be read in full (${nombre(lu.texte.length)} characters, limit ${nombre(MAX_DECISION)}).`);
  Object.assign(fiche, { revoquee: lu.revoquee, texte_disponible: true, revoquee_par: lu.revoquee_par, modifiee_par: lu.modifiee_par, date_fin: lu.date_fin, expiree: lu.expiree });

  let brut;
  try {
    brut = await converseImpl({ system: SYSTEM, content: [{ text: JSON.stringify({ produit: { description, fiche_technique, caracteristiques: faits }, decision: lu.texte }) }], maxTokens: 3000 });
  } catch (e) {
    // Le message d'erreur du modèle peut contenir un bout de sa réponse : il n'est jamais recopié.
    // Le message d'app.mjs est reconnu en français et dans sa forme anglaise (app.mjs est traduit par ailleurs).
    const sansAcces = /^(?:accès Bedrock absent|(?:no |missing )?Bedrock access(?: is)?(?: (?:absent|missing|not configured|unavailable|not available))?)$/i.test(String(e && e.message).trim().replace(/\.$/, ''));
    return inverifiable(`Comparison not performed: ${sansAcces ? 'access to the reading model is not configured' : 'the reading model did not return a usable answer'}.`);
  }
  const v = verifierElements(brut, sources, lu.texte);
  const { verdict, motif } = decider({
    points_communs: v.points_communs, differences: v.differences, revoquee: lu.revoquee,
    modifiee: lu.modifiee_par === null ? null : lu.modifiee_par.length > 0,
    expiree: lu.expiree, fin_attendue: src.fin_attendue, meme_juridiction, nom_source: src.nom,
  });
  return fin({ ...v, verdict, motif });
}
