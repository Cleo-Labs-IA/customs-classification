// Données mondiales des deux produits de la démonstration : pour chaque pays où un catalogue
// national est activé, le classement rendu par la Cleo Legal API (appel réel, identifiant de
// requête gardé) puis les droits de douane lus pour le code à six chiffres retenu.
//   node essais/monde/enregistrer.mjs [SKU] [PAYS,PAYS…]     (reprend là où il s'est arrêté)
// Rien n'est inventé : un appel en échec est enregistré comme échec, avec son message.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { normaliserDroits } from '../../lib/obligations.mjs';

const ici = (p) => new URL(p, import.meta.url);
const env = Object.fromEntries(readFileSync(ici('../../.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const API = env.CLEO_BASE_URL || 'https://api.legaldata.cleolabs.co', KEY = env.CLEO_API_KEY;
export const PRODUITS = JSON.parse(readFileSync(ici('./produits.json'), 'utf8'));
const couverture = JSON.parse(readFileSync(ici('./couverture-brute.json'), 'utf8')).data.countries;
const sortie = ici('./classements.json');
const etat = existsSync(sortie) ? JSON.parse(readFileSync(sortie, 'utf8')) : {};
const sauver = () => writeFileSync(sortie, JSON.stringify(etat, null, 1));

async function appel(methode, chemin, corps) {
  for (let essai = 0; essai < 4; essai++) {
    const t0 = Date.now();
    const r = await fetch(API + chemin, { method: methode, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined, signal: AbortSignal.timeout(110_000) }).catch((e) => ({ erreur: String(e.message || e) }));
    if (r.erreur) { if (essai === 3) return { http: 0, erreur: r.erreur }; continue; }
    if (r.status === 429) { const attente = Math.min(120, Number(r.headers.get('retry-after')) || 30); await new Promise((ok) => setTimeout(ok, attente * 1000)); continue; }
    const texte = await r.text(); let body; try { body = JSON.parse(texte); } catch { body = { raw: texte.slice(0, 300) }; }
    return { http: r.status, request_id: r.headers.get('x-request-id'), secondes: Math.round((Date.now() - t0) / 100) / 10, body };
  }
  return { http: 429, erreur: 'rate limit' };
}

// GET /v2/customs/lookup rend des lignes de la nomenclature du pays parmi ses candidats ;
// POST /v2/customs/classifications s'arrête à six chiffres tant que le catalogue n'est pas attesté.
async function un(p, pays) {
  const q = new URLSearchParams({ description: p.description, country: pays, top: '8' });
  const c = await appel('GET', '/v2/customs/lookup?' + q);
  const d = c.body && (c.body.data || c.body);
  if (c.http !== 200 || !d || !Array.isArray(d.candidates)) return { erreur: c.erreur || `HTTP ${c.http}: ${JSON.stringify(c.body).slice(0, 200)}`, le: new Date().toISOString() };
  const cands = d.candidates.map((x) => ({ code: x.code, systeme: x.system, hs6: x.hs6_parent || String(x.code).slice(0, 6), confiance: x.confidence ?? null, libelle: (x.title && (x.title.en || x.title.fr)) || '', version: x.source_version || null }));
  const top = [...cands].sort((x, y) => (y.confiance ?? 0) - (x.confiance ?? 0))[0] || null;
  const lignes = top ? cands.filter((x) => x.systeme !== 'hs6' && x.hs6 === top.hs6) : [];
  const nationale = lignes.sort((x, y) => (y.confiance ?? 0) - (x.confiance ?? 0))[0] || null;
  const out = { le: new Date().toISOString(), request_id: c.request_id, secondes: c.secondes, statut: d.classification_status || null, version_jeu: d.dataset_version || null,
    hs6: top ? top.hs6 : null, confiance_hs6: top ? top.confiance : null, libelle_hs6: top ? top.libelle : '',
    ligne_nationale: nationale ? { code: nationale.code, systeme: nationale.systeme, libelle: nationale.libelle, confiance: nationale.confiance } : null, lignes_nationales_rendues: lignes.length,
    couverture: d.coverage ? { level: d.coverage.level, systemes: d.coverage.national_systems || [], via_bloc: d.coverage.via_bloc || null } : null, droits: null };
  if (top) {
    const r = await appel('GET', `/v2/customs/duties?code=${top.hs6}&country=${pays}`);
    try { const n = normaliserDroits({ http: r.http, body: r.body }, { code: top.hs6, destination: pays }); out.droits = { request_id: r.request_id, http: r.http, ...(n.droits ? { droits: n.droits } : {}), manquants: n.manquants || [] }; }
    catch (e) { out.droits = { erreur: String(e.message || e).slice(0, 200), http: r.http }; }
  }
  return out;
}

const [, , skuArg, paysArg] = process.argv;
const nationaux = couverture.filter((c) => c.level === 'national').map((c) => c.country);
const pays = paysArg ? paysArg.split(',') : nationaux;
const taches = [];
for (const p of PRODUITS) { if (skuArg && skuArg !== 'tous' && p.sku !== skuArg) continue; etat[p.sku] ||= {}; for (const c of pays) if (!etat[p.sku][c] || etat[p.sku][c].erreur) taches.push([p, c]); }
console.log(`${taches.length} appels à faire (${nationaux.length} pays à catalogue national)`);
let fait = 0;
await Promise.all(Array.from({ length: 4 }, async () => { for (let t; (t = taches.shift());) { const [p, c] = t; etat[p.sku][c] = await un(p, c); fait++; if (fait % 8 === 0) { sauver(); console.log(fait, 'faits'); } } }));
sauver();
for (const p of PRODUITS) { const v = Object.values(etat[p.sku] || {}); console.log(p.sku, ':', v.length, 'pays,', v.filter((x) => x.erreur).length, 'échecs,', v.filter((x) => x.ligne_nationale).length, 'lignes nationales proposées'); }
