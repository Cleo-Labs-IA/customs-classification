// Projets de déclaration de conformité. Les nombres attendus sont comptés ici, directement dans
// public/data/monde-produits.json, pas par le module testé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { declarations, declarationsHtml, familleDuDossier } from '../public/app/dossier/declaration.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(readFileSync(path.join(DIR, '../public/data/monde-produits.json'), 'utf8'));
const attendu = (famille) => { const n = {}; for (const e of M.reglementation) if (e.verifie === true && e.produits.includes(famille)) n[e.marche] = (n[e.marche] || 0) + 1; return n; };
const dossier = (extra = {}) => ({ produit: { sku: 'CHG-70W', desc: 'USB-C power adapter, 70 W', origin: 'CN', dest: 'FR' }, identite: { fabricant: 'Salcomp (Shenzhen) Co., Ltd.', modele: 'EMC 8425', configuration: '70 W', confirmee: true }, valide: null, ...extra });
const dec = { code: '850440' };

test('une déclaration par marché qui a des exigences vérifiées, avec le bon nombre de textes', () => {
  const liste = declarations(dossier(), dec, M), n = attendu('charger');
  assert.deepEqual(Object.fromEntries(liste.map((d) => [d.marche, d.exigences.length])), n);
  assert.ok(liste.length > 0);
});

test('le portable ne reçoit pas les textes du chargeur', () => {
  const liste = declarations(dossier({ produit: { sku: 'NB-M1605N', desc: 'Notebook PC', origin: 'CN', dest: 'FR' } }), { code: '847130' }, M);
  assert.deepEqual(Object.fromEntries(liste.map((d) => [d.marche, d.exigences.length])), attendu('laptop'));
  assert.ok(liste.every((d) => d.exigences.every((e) => e.produits.includes('laptop'))));
});

test('témoin négatif : sans code, ou pour un code sans exigence vérifiée, aucune déclaration', () => {
  assert.deepEqual(declarations(dossier(), { code: null }, M), []);
  const inconnu = dossier({ produit: { sku: 'TOY-1', desc: 'Talking toy', origin: 'CN', dest: 'US' } });
  assert.equal(familleDuDossier(inconnu, { code: '950300' }, M), null);
  assert.equal(declarationsHtml(inconnu, { code: '950300' }, M), null);
});

test('un produit hors boutique au même code reprend la famille, et le document le dit', () => {
  const autre = dossier({ produit: { sku: 'OTHER-CHARGER', desc: 'Wall charger', origin: 'CN', dest: 'FR' } });
  assert.deepEqual(familleDuDossier(autre, dec, M), { famille: 'charger', memeProduit: false });
  const html = declarationsHtml(autre, dec, M, '2026-10-04');
  assert.match(html, /not for this exact product/);
  assert.doesNotMatch(html, /seen on the photographed label/);
});

test('le document : ce que le dossier sait est écrit, ce qu\'il ignore reste en blanc, rien n\'affirme la conformité', () => {
  const html = declarationsHtml(dossier(), dec, M, '2026-10-04');
  assert.match(html, /EU declaration of conformity/);
  assert.match(html, /Salcomp \(Shenzhen\) Co\., Ltd\./);
  assert.match(html, /8504\.40/);
  assert.match(html, /not approved by a declarant yet/);
  for (const blanc of ['postal address of the manufacturer', 'references and dates of the standards', 'laboratory, report numbers, dates', 'signature']) assert.ok(html.includes(`>${blanc}</span>`), blanc);
  assert.match(html, /does not state that the product complies/);
  assert.doesNotMatch(html, /is compliant|complies with all|hereby declare/i);
  // chaque citation officielle du marché UE est reproduite telle quelle
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  for (const e of M.reglementation.filter((x) => x.marche === 'EU' && x.verifie === true && x.produits.includes('charger'))) assert.ok(html.includes(esc(e.citation)), e.id);
});

test('approuvé : le nom et la date de l\'approbation figurent', () => {
  const html = declarationsHtml(dossier({ valide: { validated_by: 'A. Declarant', validated_at: '2026-10-04T15:00:00Z' } }), dec, M, '2026-10-04');
  assert.match(html, /approved by A\. Declarant on 2026-10-04/);
  assert.doesNotMatch(html, /not approved by a declarant yet/);
});

test('la carte de l\'étape Distribution : un bouton quand il y a des textes, aucun sinon', async () => {
  const { declarationsCarte } = await import('../public/app/vues/dossier/diffusion.js');
  const avec = declarationsCarte(dossier(), dec, M);
  assert.match(avec, /<button type="button" class="btn noir" data-action-dossier="declarations">/);
  assert.match(avec, /not approved yet/);
  const sans = declarationsCarte(dossier({ produit: { sku: 'TOY-1', desc: 'Talking toy', origin: 'CN', dest: 'US' } }), { code: '950300' }, M);
  assert.doesNotMatch(sans, /<button/);
  assert.doesNotMatch(declarationsCarte(dossier(), dec, null), /<button/);
});
