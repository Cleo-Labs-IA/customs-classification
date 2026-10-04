import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { disposer, grapheHtml, raisonsHtml } from '../public/app/graphe-arbre.js';
import { evaluer } from '../public/arbre-moteur.js';

const arbre = JSON.parse(readFileSync(new URL('../public/data/arbre.json', import.meta.url), 'utf8'));
const textes = JSON.parse(readFileSync(new URL('../public/data/textes.json', import.meta.url), 'utf8'));
const T = Object.fromEntries(textes.map((x) => [x.id, x]));

test('layout: every node is placed once, no two nodes overlap, a child sits to the right of its parent', () => {
  const { pos } = disposer(arbre), ids = Object.keys(arbre.noeuds);
  assert.equal(Object.keys(pos).length, ids.length);
  const cases = new Set(Object.values(pos).map((p) => p.x + ':' + p.y));
  assert.equal(cases.size, ids.length);
  for (const [id, n] of Object.entries(arbre.noeuds)) for (const c of Object.values(n.branches || {})) assert.ok(pos[c].x > pos[id].x, `${id} → ${c}`);
});

test('notebook: the path q1 → q11 → q12 → 8471.30 is the only one drawn as followed, with its official texts', () => {
  const res = evaluer(arbre, { fonction_principale: 'traiter_donnees', programmable_librement: true, portable_complet: true });
  assert.equal(res.code, '847130');
  const html = grapheHtml(arbre, { res });
  assert.equal((html.match(/<path class="on"/g) || []).length, 3);
  assert.match(html, /class="ga-n code on fin[^"]*" data-n="c847130"/);
  assert.doesNotMatch(html, /class="ga-n code on[^"]*" data-n="c850440"/);
  const pourquoi = raisonsHtml(arbre, res, { T, faits: { fonction_principale: { kind: 'pieces', citation: 'Notebook PC', source: 'label' }, portable_complet: { kind: 'reponse' } } });
  assert.match(pourquoi, /<q>Notebook PC<\/q>/);
  assert.match(pourquoi, /stated by the seller, no document supports it/);
  assert.match(pourquoi, /Subheading 8471 30/);
  assert.match(pourquoi, /8471\.30/);
});

test('negative control: an unanswered criterion stops the path and no code is shown as concluded', () => {
  const res = evaluer(arbre, { fonction_principale: 'traiter_donnees', programmable_librement: true });
  assert.equal(res.statut, 'information_manquante');
  const html = grapheHtml(arbre, { res });
  assert.equal((html.match(/<path class="on"/g) || []).length, 2);
  assert.doesNotMatch(html, /ga-n code on/);
  assert.match(html, /class="ga-n question on fin stop[^"]*" data-n="q12"/);
  assert.match(raisonsHtml(arbre, res, { T }), /Not established yet/);
});

test('charger: AC to DC converter without mains outlets ends at 8504.40', () => {
  const res = evaluer(arbre, { fonction_principale: 'alimenter', genere_electricite: false, batterie_integree: 'aucune', convertit_courant: 'convertisseur', prises_secteur_sortie: false });
  assert.equal(res.code, '850440');
  assert.equal((grapheHtml(arbre, { res }).match(/<path class="on"/g) || []).length, 5);
});

test('path view: only the path and the outcomes it did not take are drawn, the whole rule stays available', () => {
  const res = evaluer(arbre, { fonction_principale: 'traiter_donnees', programmable_librement: true, portable_complet: true });
  const chemin = grapheHtml(arbre, { res }), tout = grapheHtml(arbre, { res, entier: true });
  const n = (h) => (h.match(/class="ga-n /g) || []).length;
  assert.equal(n(tout), Object.keys(arbre.noeuds).length);
  assert.ok(n(chemin) < n(tout) && n(chemin) >= 4);
  assert.match(chemin, /data-n="c847130"/);
  assert.match(chemin, /more branches, not followed/);
  assert.equal((chemin.match(/<path class="on"/g) || []).length, 3);
});
