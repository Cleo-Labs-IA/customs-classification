// Tests du panneau de diffusion (étape 6). Les chiffres attendus de la vue monde sont lus
// dans public/data/monde-produits.json, et les champs de la vérification de code dans la
// réponse de la fixture amont (tests/fixtures/customs-upstream.mjs), pas dans le module testé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { diffusionCarte, csvImport } from '../public/app/vues/dossier/diffusion.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const M = JSON.parse(readFileSync(path.join(DIR, '../public/data/monde-produits.json'), 'utf8'));
const SKU = Object.keys(M.produits)[0];
const ENTETE = 'sku,origin,destination,code,system,level,approved_by,approved_at,classification_id,review_version';
const ID = '3f9c1a7e-52b4-4d18-9e0a-6b7c8d9e0f12';

const base = (plus = {}) => ({ produit: { sku: SKU, dest: 'FR', origin: 'CN', desc: 'USB-C charger' }, valide: null, revue: null, classificationId: null, codeVerifie: null, niveau: 'hs6', ...plus });
const DEC = { code: '850440', origine: 'regle', peutValider: true, blocages: [] };
const VALIDE = { validated_by: 'Ana Reviewer', validated_at: '2026-10-04T09:30:00.000Z' };
const local = (plus = {}) => base({ valide: VALIDE, revue: { locale: true }, ...plus });
const api = (plus = {}) => base({ valide: VALIDE, classificationId: ID, revue: { locale: false, classification_id: ID, review_id: 'rev-1', version: 3, reviewer: 'Ana Reviewer', created_at: '2026-10-04T09:30:00.000Z', approved_code: '850440' }, ...plus });
// Le bouton d'une action, tel que rendu (null s'il est absent).
const bouton = (html, action) => { const m = html.match(new RegExp(`<button[^>]*data-action-dossier="${action}"[^>]*>`)); return m ? m[0] : null; };
const cartes = (html) => html.split('<div class="carte">').slice(1);
// Lecture d'une ligne CSV selon la RFC 4180, écrite ici indépendamment du module.
function lireLigne(l) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out;
}

test('four cards, in the order approval, exports, code check, world', () => {
  const c = cartes(diffusionCarte(api(), DEC, M));
  assert.equal(c.length, 4);
  ['<h3>Approval</h3>', '<h3>Exports</h3>', '<h3>Code check</h3>', '<h3>World</h3>'].forEach((t, i) => assert.ok(c[i].includes(t), t));
});

test('not approved: no JSON file, CSV disabled with its reason, csvImport null', () => {
  const D = base(), html = diffusionCarte(D, DEC, M);
  assert.equal(csvImport(D, DEC), null);
  assert.match(html, /not approved/i);
  assert.match(html, /after the review \(step 5\)/);
  assert.equal(bouton(html, 'telecharger'), null);
  assert.match(bouton(html, 'csv'), / disabled/);
  assert.match(html, /The CSV export is not available: the file is not approved yet\./);
  assert.ok(bouton(html, 'imprimer') && !/ disabled/.test(bouton(html, 'imprimer')));
  assert.equal(bouton(html, 'dossier-api-pdf'), null);
  assert.doesNotMatch(html, /Saved in the Cleo Legal API|This browser only/);
});

test('approved without a retained code: csvImport null and the reason is the missing code', () => {
  for (const dec of [null, { code: null, peutValider: false, blocages: [{ id: 'aucun_code', message: 'No code.' }] }]) {
    const html = diffusionCarte(local(), dec, M);
    assert.equal(csvImport(local(), dec), null);
    assert.match(bouton(html, 'csv'), / disabled/);
    assert.match(html, /no code is retained/);
    assert.match(bouton(html, 'verifier-code'), / disabled/);
  }
});

test('approved locally: this browser only, no API dossier buttons, no classification ID', () => {
  for (const D of [local(), base({ valide: VALIDE, revue: null })]) {
    const html = diffusionCarte(D, DEC, M);
    assert.match(html, /kept in this browser only, because the classification was not saved by the API/);
    assert.doesNotMatch(html, /Saved in the Cleo Legal API/);
    assert.equal(bouton(html, 'dossier-api-pdf'), null);
    assert.equal(bouton(html, 'dossier-api-json'), null);
    assert.doesNotMatch(html, /Classification ID/);
    assert.ok(bouton(html, 'telecharger'));
    assert.doesNotMatch(bouton(html, 'csv'), / disabled/);
  }
});

test('approved by the API: dossier buttons, reviewer, version and shortened classification ID', () => {
  const html = diffusionCarte(api(), DEC, M);
  assert.match(html, /Saved in the Cleo Legal API/);
  assert.doesNotMatch(html, /this browser only/i);
  assert.ok(bouton(html, 'dossier-api-pdf') && bouton(html, 'dossier-api-json'));
  assert.ok(html.includes(`title="${ID}"`), 'full ID in a title attribute');
  assert.ok(html.includes(`>${ID.slice(0, 8)}<`), 'ID shortened to 8 characters');
  assert.ok(!html.includes(`>${ID}<`), 'full ID is not the visible text');
  assert.match(html, /<dt>Reviewer<\/dt><dd>Ana Reviewer<\/dd>/);
  assert.match(html, /<dt>Review version<\/dt><dd>3<\/dd>/);
  assert.match(html, /2026-10-04 09:30 UTC/);
});

test('every action is a button of type button, with no inline handler', () => {
  const html = diffusionCarte(api({ codeVerifie: { code: '850440', country: 'FR', system: 'hs6', status: 'valid', exists: true, le: '2026-10-04T10:00:00.000Z' } }), DEC, M);
  const tous = html.match(/<button[^>]*>/g);
  assert.deepEqual(tous.map((b) => b.match(/data-action-dossier="([^"]+)"/)[1]), ['imprimer', 'telecharger', 'dossier-api-pdf', 'dossier-api-json', 'csv', 'verifier-code']);
  tous.forEach((b) => assert.match(b, /^<button type="button" /));
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
});

test('csvImport: exact header, one row, HS6 labelled as a pre-classification', () => {
  const lignes = csvImport(api(), DEC).split('\n');
  assert.equal(lignes[0], ENTETE);
  assert.equal(lignes.length, 3);
  assert.equal(lignes[2], '');
  assert.deepEqual(lireLigne(lignes[1]), [SKU, 'CN', 'FR', '850440', 'hs6', 'six-digit pre-classification', 'Ana Reviewer', '2026-10-04T09:30:00.000Z', ID, '3']);
  assert.equal(lignes[1].includes('"'), false, 'no field needs quoting here');
});

test('csvImport: classification_id and review_version empty when the review is local', () => {
  for (const D of [local({ classificationId: ID }), base({ valide: VALIDE, revue: null, classificationId: ID })]) {
    const f = lireLigne(csvImport(D, DEC).split('\n')[1]);
    assert.equal(f.length, 10);
    assert.equal(f[8], '');
    assert.equal(f[9], '');
  }
});

test('csvImport: a field with a comma, a quote or a newline is quoted and round-trips', () => {
  const sku = 'AB,"12"', D = local({ produit: { sku, dest: 'FR', origin: 'CN', desc: '' }, valide: { validated_by: 'Line\nBreak', validated_at: '2026-10-04T09:30:00.000Z' } });
  const csv = csvImport(D, DEC);
  assert.ok(csv.startsWith(ENTETE + '\n"AB,""12""",CN,FR,850440,hs6,six-digit pre-classification,"Line\nBreak",2026-10-04T09:30:00.000Z,,\n'), csv);
  const f = lireLigne(csv.slice(ENTETE.length + 1, -1));
  assert.equal(f[0], sku);
  assert.equal(f[6], 'Line\nBreak');
});

test('csvImport: a six-digit code is never labelled national, whatever the requested level', () => {
  const f = lireLigne(csvImport(local({ niveau: 'national' }), DEC).split('\n')[1]);
  assert.equal(f[4], 'hs6');
  assert.equal(f[5], 'six-digit pre-classification');
});

test('code check: not run yet', () => {
  const html = diffusionCarte(local(), DEC, M);
  assert.match(html, /No check has been run/);
  assert.doesNotMatch(bouton(html, 'verifier-code'), / disabled/);
  assert.match(bouton(html, 'verifier-code') + html, /Check this code today/);
  assert.match(html, /The check runs on demand\. No automatic monitoring is connected\./);
});

test('code check: in progress', () => {
  const html = diffusionCarte(local({ codeVerifie: 'encours' }), DEC, M);
  assert.match(html, /Checking the code/);
  assert.match(bouton(html, 'verifier-code'), / disabled/);
  assert.doesNotMatch(html, /Code exists|Code not found|No check has been run/);
});

test('code check: the error is shown, escaped', () => {
  const html = diffusionCarte(local({ codeVerifie: { erreur: 'HTTP 429 <quota>' } }), DEC, M);
  assert.ok(html.includes('HTTP 429 &lt;quota&gt;'));
  assert.ok(!html.includes('<quota>'));
  assert.doesNotMatch(html, /Code exists|Code not found/);
});

test('code check: a result says whether the code exists, its status, the destination and the date', () => {
  // champs de la réponse de GET /v2/customs/codes/validate (fixture amont), plus `le`
  const r = { code: '850440', country: 'FR', system: 'hs6', status: 'valid', exists: true, dataset_version: 'fixture-catalog-2026', hint: 'Synthetic validity check only.', le: '2026-10-04T10:15:00.000Z' };
  const ok = cartes(diffusionCarte(local({ codeVerifie: r }), DEC, M))[2];
  assert.match(ok, /Code exists/);
  assert.match(ok, /<dt>Status<\/dt><dd>valid<\/dd>/);
  assert.match(ok, /France/);
  assert.match(ok, /8504\.40/);
  assert.match(ok, /2026-10-04 10:15 UTC/);
  assert.match(ok, /fixture-catalog-2026/);
  const ko = cartes(diffusionCarte(local({ codeVerifie: { ...r, exists: false, status: 'not_found' } }), DEC, M))[2];
  assert.match(ko, /Code not found/);
  assert.doesNotMatch(ko, /Code exists/);
  assert.match(ko, /<dt>Status<\/dt><dd>not_found<\/dd>/);
  const flou = cartes(diffusionCarte(local({ codeVerifie: { code: '850440', le: r.le } }), DEC, M))[2];
  assert.doesNotMatch(flou, /Code exists|Code not found/);
  assert.match(flou, /Existence not returned/);
});

test('world: loading while M is null', () => {
  const c = cartes(diffusionCarte(local(), DEC, null))[3];
  assert.match(c, /Loading the world data/);
  assert.doesNotMatch(c, /href=/);
});

test('world: a product of the store shows the four figures of its bilan and a link with its SKU', () => {
  const b = M.produits[SKU].bilan, c = cartes(diffusionCarte(local(), DEC, M))[3];
  assert.ok(c.includes(`<dt>Countries looked up</dt><dd>${b.consultes}</dd>`));
  assert.ok(c.includes(`<dt>National lines proposed</dt><dd>${b.lignes_nationales}</dd>`));
  assert.ok(c.includes(`<dt>Countries where the engine alone proposes another code</dt><dd>${b.desaccord}</dd>`));
  assert.ok(c.includes(`<dd>${b.exigences} in ${b.marches_exigences} markets</dd>`));
  assert.ok(c.includes(`<a class="btn noir petit" href="/#/monde?sku=${encodeURIComponent(SKU)}">`));
  assert.match(c, /Open the world view/);
});

test('world: a product outside the store gets the plain link and no figure', () => {
  for (const sku of ['NOT-IN-STORE', 'constructor', '']) {
    const c = cartes(diffusionCarte(local({ produit: { sku, dest: 'FR', origin: 'CN', desc: '' } }), DEC, M))[3];
    assert.match(c, /recorded only for the products of the store/);
    assert.ok(c.includes('<a class="btn noir petit" href="/#/monde">'));
    assert.doesNotMatch(c, /Countries looked up|sku=/);
  }
});

test('values are escaped everywhere', () => {
  const x = '<img src=x>', D = base({
    produit: { sku: x, dest: x, origin: x, desc: x }, valide: { validated_by: x, validated_at: x }, classificationId: x,
    revue: { locale: false, classification_id: x, review_id: x, version: x, reviewer: x, created_at: x, approved_code: x },
    codeVerifie: { code: x, country: x, system: x, status: x, exists: true, dataset_version: x, hint: x, le: x },
  });
  const m = { fixe_le: x, produits: { [x]: { bilan: { consultes: x, lignes_nationales: x, desaccord: x, exigences: x, marches_exigences: x } } } };
  for (const html of [diffusionCarte(D, { ...DEC, code: x }, m), diffusionCarte({ ...D, revue: { locale: true } }, DEC, m), diffusionCarte({ ...D, codeVerifie: { erreur: x } }, DEC, M)]) {
    assert.ok(!html.includes('<img src=x'), 'raw markup must never appear');
    assert.ok(html.includes('&lt;img src=x&gt;'));
  }
});

test('no output says undefined, Published, compliant, or uses a long dash', () => {
  const r = { code: '850440', country: 'FR', system: 'hs6', status: 'valid', exists: true, le: '2026-10-04T10:15:00.000Z' };
  const etats = [base(), local(), api(), base({ valide: VALIDE }), base({ produit: null }), api({ revue: { locale: false } }), base({ valide: {}, revue: { locale: false } }),
    ...[null, 'encours', { erreur: 'x' }, r, {}].map((codeVerifie) => api({ codeVerifie }))];
  for (const D of etats) for (const dec of [DEC, null, { code: null, blocages: [] }]) for (const m of [M, null, {}, { produits: { [SKU]: {} } }]) {
    const sorties = [diffusionCarte(D, dec, m), csvImport(D, dec) ?? ''];
    for (const s of sorties) {
      assert.doesNotMatch(s, /undefined|\bnull\b|NaN|\[object/);
      assert.doesNotMatch(s, /publish/i);
      assert.doesNotMatch(s, /compliant/i);
      assert.doesNotMatch(s, /[–—]/);
    }
    assert.match(sorties[0], /Nothing is sent to another system from here/);
  }
});
