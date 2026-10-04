// Appels au serveur, partagés par le cockpit et le dossier de classification.
// Avec la clé d'API : appel en direct. Sans elle : une réponse réelle enregistrée pour
// exactement les mêmes pièces, sinon une réponse illustrative du catalogue de
// démonstration, sinon une erreur qui dit pourquoi. La source accompagne chaque réponse.
import { reponseEnregistree } from './classification.js';

let statut = null, enregistrees = null, demo = null;
const json = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function etatServeur() {
  if (!statut) {
    const s = await json('/api/status');
    statut = { mode: s && s.key_present ? 'direct' : 'illustratif', ia: Boolean(s && s.bedrock_present), api: (s && s.api) || '' };
  }
  return statut;
}
export async function donneesHorsLigne() {
  if (!enregistrees) [enregistrees, demo] = await Promise.all([json('/data/enregistrees.json'), json('/data/demo.json')]);
  return { enregistrees: enregistrees || [], demo: demo || { reponses: {}, produits: [] } };
}

// Code d'accès de la version en ligne, gardé dans ce navigateur.
const code = () => { try { return localStorage.getItem('code') || ''; } catch { return ''; } };
export async function post(chemin, body) {
  for (let n = 0; n < 3; n++) {
    const r = await fetch(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Code': code() }, body: JSON.stringify(body) });
    if (r.status === 401) {
      let c = null;
      try { c = prompt(n ? 'Code refusé. Code d\'accès :' : 'Code d\'accès :'); } catch { /* fenêtre de saisie indisponible */ }
      if (!c) break;
      try { localStorage.setItem('code', c.trim()); } catch { /* code non mémorisé */ }
      continue;
    }
    const j = await r.json().catch(() => ({ error: `réponse illisible du serveur (${r.status})` }));
    if (!r.ok) throw new Error(j.error || 'erreur ' + r.status);
    return j;
  }
  throw new Error("code d'accès refusé");
}

// Lectures par IA (photo, pièces, critères) : impossibles sans accès au modèle.
export async function lectureIA(chemin, body) {
  const s = await etatServeur();
  if (!s.ia) throw new Error("lecture par IA indisponible : l'accès au modèle (Bedrock) n'est pas posé sur ce serveur");
  return post(chemin, body);
}

// Classification : rend { data, source, request_id, secondes, envoye, http, body, endpoint }.
export async function classifier({ sku, description, pays, faits = {} }) {
  const envoye = { item_id: sku || 'PRODUIT', description, country: pays };
  if (Object.keys(faits).length) envoye.facts = faits;
  if ((await etatServeur()).mode === 'direct') {
    const j = await post('/api/classify', envoye);
    if (j.http !== 200 || !j.body || !j.body.data) throw new Error(`l'API a répondu ${j.http} : ${JSON.stringify(j.body).slice(0, 240)}`);
    return { data: j.body.data, source: 'direct', request_id: j.request_id, secondes: j.seconds, envoye, http: j.http, body: j.body, endpoint: j.endpoint };
  }
  const { enregistrees: liste, demo: d } = await donneesHorsLigne();
  await new Promise((ok) => setTimeout(ok, 600 + Math.random() * 900));
  const rec = reponseEnregistree(liste, { description, faits });
  if (rec) return { data: rec.data, source: 'enregistree', enregistreeLe: rec.enregistree_le, paysEnregistre: rec.envoye.country, request_id: rec.request_id, secondes: rec.secondes, envoye: rec.envoye, http: 200, body: { data: rec.data } };
  const p = (d.produits || []).find((x) => x.sku === sku && x.description.trim().toLowerCase() === String(description).trim().toLowerCase());
  const suite = p && ((d.suites || {})[sku] || []).find((x) => JSON.stringify(x.faits) === JSON.stringify(faits));
  if (suite) return { data: suite.data, source: 'illustrative', request_id: null, secondes: null, envoye, http: 200, body: { data: suite.data } };
  if (p && d.reponses[sku] && !Object.keys(faits).length) {
    const r = d.reponses[sku];
    return { data: r.data, source: r.source || 'illustrative', enregistreeLe: r.enregistree_le || null, request_id: r.request_id || null, secondes: r.secondes || null, envoye, http: 200, body: { data: r.data } };
  }
  throw new Error("hors ligne : la clé d'API n'est pas posée sur ce serveur, et aucune réponse n'a été enregistrée pour ces pièces");
}

// Hors ligne, les réponses qu'on peut rejouer pour une question du moteur : celles
// enregistrées pour la même description, et celles du catalogue de démonstration.
export function suggestionsHorsLigne(donnees, { sku, description, faits = [] }) {
  if (!donnees) return {};
  const n = (x) => String(x || '').trim().replace(/\s+/g, ' ').toLowerCase(), out = {};
  for (const f of faits) {
    const liste = [];
    for (const r of donnees.enregistrees) if (n(r.envoye.description) === n(description) && r.envoye.facts && r.envoye.facts[f]) liste.push({ libelle: 'Réponse enregistrée : ' + r.envoye.facts[f].slice(0, 90) + (r.envoye.facts[f].length > 90 ? '…' : ''), valeur: r.envoye.facts[f] });
    const p = (donnees.demo.produits || []).find((x) => x.sku === sku && n(x.description) === n(description));
    for (const s of (p && (donnees.demo.suites || {})[sku]) || []) if (s.faits[f]) liste.push({ libelle: s.libelle + ' (illustrative)', valeur: s.faits[f] });
    out[f] = liste.filter((x, i) => liste.findIndex((y) => y.valeur === x.valeur) === i);
  }
  return out;
}
