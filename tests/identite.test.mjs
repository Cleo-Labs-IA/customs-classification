// Tests du panneau « Identity » (étape 2 du dossier). Les valeurs attendues sont écrites
// ici, à part du module : l'échappement de référence, les libellés et la forme d'un
// élément d'historique (celle de `summary` dans tests/fixtures/customs-upstream.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { identiteCarte } from '../public/app/vues/dossier/identite.js';

const PIEGE = '<b>"x"</b>';
const PIEGE_ECHAPPE = '&lt;b&gt;&quot;x&quot;&lt;/b&gt;';
const produit = { sku: 'DOCK-70W', gtin: '03701234567890', desc: 'USB-C dock', ds: '', dest: 'FR', origin: 'CN', photo: null, page: null };
const base = (plus = {}) => ({ produit, identite: null, historique: null, historiqueErreur: null, valide: null, ...plus });
const ELEMENT = { classification_id: '0b6f7a52-9c1e-4d3a-8f21-5e7c9a1b2c3d', item_id: 'DOCK-70W', status: 'needs_review', country: 'FR', system: 'cn8', retained_code: '85044090', created_at: '2026-10-03T12:00:00.000Z', review_status: 'unreviewed', approved_code: null, approved_at: null, review_version: 0 };

const champ = (html, nom) => { const m = html.match(new RegExp(`<input[^>]*name="${nom}"[^>]*>`)); return m ? m[0] : null; };
const bloc = (html) => html.slice(html.indexOf('Already classified on this account'));

test('unconfirmed identity: form with the three named inputs, prefilled and escaped', () => {
  const html = identiteCarte(base({ identite: { fabricant: PIEGE, modele: 'Dock ' + PIEGE, configuration: '70 W ' + PIEGE, confirmee: false } }));
  assert.match(html, /<form data-form="identite">/);
  const f = champ(html, 'fabricant'), m = champ(html, 'modele'), c = champ(html, 'configuration');
  assert.ok(f && m && c, 'the three inputs exist');
  assert.ok(f.includes(`value="${PIEGE_ECHAPPE}"`));
  assert.ok(m.includes(`value="Dock ${PIEGE_ECHAPPE}"`));
  assert.ok(c.includes(`value="70 W ${PIEGE_ECHAPPE}"`));
  assert.match(m, /\srequired[\s>]/);
  assert.doesNotMatch(f, /\srequired[\s>]/);
  assert.doesNotMatch(c, /\srequired[\s>]/);
  assert.match(c, /placeholder="e\.g\. 70 W, white, EU plug"/);
  assert.ok(!html.includes('<b>"x"'), 'no raw value in the output');
  assert.match(html, />Manufacturer<\/label>/);
  assert.match(html, />Model<\/label>/);
  assert.match(html, />Configuration<\/label>/);
  assert.match(html, /<button class="btn noir" type="submit">(<svg.*?<\/svg>)?Confirm this product<\/button>/);
  assert.ok(html.includes('DOCK-70W') && html.includes('03701234567890'), 'SKU and GTIN shown');
  assert.doesNotMatch(html, /name="(sku|gtin)"/, 'SKU and GTIN are not editable inputs');
  assert.ok(!html.includes('data-identite-modifier'));
});

test('no identity yet: empty form, SKU escaped', () => {
  const html = identiteCarte(base({ produit: { ...produit, sku: PIEGE, gtin: '' } }));
  assert.ok(champ(html, 'modele').includes('value=""'));
  assert.ok(html.includes(PIEGE_ECHAPPE) && !html.includes('<b>"x"'));
});

test('confirmed identity: no form, text, date and edit button', () => {
  const html = identiteCarte(base({ identite: { fabricant: 'Acme', modele: PIEGE, configuration: '70 W, white', confirmee: true, le: '2026-10-04T12:00:00.000Z' } }));
  assert.ok(!html.includes('<form'));
  assert.ok(!html.includes('<input'));
  assert.match(html, /<button[^>]*data-identite-modifier[^>]*>Edit the identity<\/button>/);
  assert.ok(html.includes('Acme') && html.includes('70 W, white') && html.includes(PIEGE_ECHAPPE));
  assert.ok(!html.includes('<b>"x"'));
  assert.ok(html.includes('4 Oct 2026'), 'confirmation date shown');
  assert.ok(html.includes('DOCK-70W') && html.includes('03701234567890'));
});

test('approved file: neither form nor edit button', () => {
  for (const identite of [{ fabricant: 'Acme', modele: 'Dock', configuration: '', confirmee: true, le: '2026-10-04T12:00:00.000Z' }, { fabricant: '', modele: 'Dock', configuration: '', confirmee: false }, null]) {
    const html = identiteCarte(base({ identite, valide: { validated_by: 'N.' } }));
    assert.ok(!html.includes('<form'));
    assert.ok(!html.includes('<input'));
    assert.ok(!html.includes('data-identite-modifier'));
    assert.ok(!html.includes('undefined'));
  }
});

test('history not loaded: says so, with the load button', () => {
  const b = bloc(identiteCarte(base()));
  assert.ok(b.includes('The shared history is not loaded.'));
  assert.match(b, /<button[^>]*data-action-dossier="historique"[^>]*>Load the shared history<\/button>/);
});

test('empty history: nothing saved for this SKU, no load button', () => {
  const b = bloc(identiteCarte(base({ historique: [] })));
  assert.match(b, /No classification is saved for SKU <span class="mono">DOCK-70W<\/span> on this account\./);
  assert.ok(!b.includes('data-action-dossier="historique"'));
  assert.ok(!b.includes('not loaded'));
});

test('history with one item: date, code, status, review status, short ID, suggestion notice', () => {
  const b = bloc(identiteCarte(base({ historique: [ELEMENT] })));
  assert.ok(b.includes('3 Oct 2026'));
  assert.ok(b.includes('85044090'));
  assert.ok(b.includes('needs review'));
  assert.ok(b.includes('unreviewed'));
  assert.ok(b.includes('ID 0b6f7a52...'), 'ID shortened');
  assert.match(b, /suggestions to compare/);
  assert.match(b, /not reused automatically/);
  assert.ok(!b.includes('No classification is saved'));
  // the approved code wins over the retained one
  const approuve = bloc(identiteCarte(base({ historique: [{ ...ELEMENT, review_status: 'approved', approved_code: '85044030' }] })));
  assert.ok(approuve.includes('85044030') && !approuve.includes('85044090'));
});

test('history values are escaped and absent fields are left out', () => {
  const b = bloc(identiteCarte(base({ historique: [{ classification_id: PIEGE, retained_code: PIEGE, status: PIEGE, review_status: PIEGE, created_at: PIEGE }, {}, null] })));
  assert.ok(!b.includes('<b>"x"'));
  assert.ok(b.includes(PIEGE_ECHAPPE));
  assert.ok(!b.includes('undefined') && !b.includes('null') && !b.includes('Invalid Date'));
  assert.ok(b.includes('No code'));
});

test('history error: shown plainly and escaped, with the reload button', () => {
  const b = bloc(identiteCarte(base({ historiqueErreur: 'HTTP 502 ' + PIEGE })));
  assert.ok(b.includes('HTTP 502 ' + PIEGE_ECHAPPE));
  assert.ok(!b.includes('<b>"x"'));
  assert.match(b, /<button[^>]*data-action-dossier="historique"[^>]*>Load the shared history<\/button>/);
  assert.ok(!b.includes('The shared history is not loaded.'));
});

test('no output contains "undefined", no inline handler, no long dash', () => {
  const identites = [null, {}, { modele: 'Dock', confirmee: false }, { modele: 'Dock', confirmee: true }, { fabricant: 'Acme', modele: 'Dock', configuration: '70 W', confirmee: true, le: '2026-10-04T12:00:00.000Z' }];
  const historiques = [[null, null], [[], null], [[ELEMENT], null], [[{}], null], [[{ classification_id: 'abc' }], null], [null, 'HTTP 500']];
  const produits = [produit, { sku: 'A' }, {}, null];
  for (const identite of identites) for (const [historique, historiqueErreur] of historiques) for (const p of produits) for (const valide of [null, {}]) {
    const html = identiteCarte({ produit: p, identite, historique, historiqueErreur, valide });
    assert.ok(!html.includes('undefined'), 'undefined in: ' + JSON.stringify({ identite, historique, p, valide }));
    assert.ok(!html.includes('NaN') && !html.includes('Invalid Date'));
    assert.doesNotMatch(html, /\son[a-z]+=/i);
    assert.doesNotMatch(html, /[–—]/);
    assert.ok(html.includes('Already classified on this account'));
  }
});
