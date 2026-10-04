// Balayage de la page expert /arbre : vide document.body.innerText après chaque geste.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const base = process.env.URL_APP || 'http://localhost:4332/';
const OUT = new URL('./dumps/', import.meta.url); mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push('pageerror: ' + String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
p.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ' ' + r.url()); });
let n = 0; const all = [];
const dump = async (nom) => {
  const t = await p.evaluate(() => {
    const extra = [];
    document.querySelectorAll('[placeholder]').forEach((e) => extra.push('placeholder: ' + e.getAttribute('placeholder')));
    document.querySelectorAll('[title]').forEach((e) => extra.push('title: ' + e.getAttribute('title')));
    document.querySelectorAll('[aria-label]').forEach((e) => extra.push('aria: ' + e.getAttribute('aria-label')));
    document.querySelectorAll('option').forEach((e) => extra.push('option: ' + e.textContent));
    document.querySelectorAll('input,textarea').forEach((e) => { if (e.value && e.type !== 'password') extra.push('value: ' + e.value); });
    return document.title + '\n' + document.body.innerText + '\n--- attrs ---\n' + [...new Set(extra)].join('\n') + '\nlang=' + document.documentElement.lang;
  });
  const f = String(++n).padStart(2, '0') + '-' + nom + '.txt'; writeFileSync(new URL(f, OUT), t); all.push('=== ' + f + ' ===\n' + t);
  console.log('dump', f, t.length);
};
await p.goto(base + 'arbre'); await p.waitForSelector('.tree', { timeout: 30000 });
await dump('initial');
console.log('nodes', await p.locator('.nd').count(), 'questions', await p.locator('.nd:not(.code)').count(), 'decisions', await p.locator('tr.click').count());
// décisions : une de chaque verdict si possible
const tags = await p.locator('tr.click').evaluateAll((rs) => rs.map((r) => [r.dataset.d, r.querySelector('.tag').textContent]));
const seen = new Set();
for (const [id, tag] of tags) { if (seen.has(tag)) continue; seen.add(tag); await p.locator(`tr.click[data-d="${id}"] td`).nth(1).click(); await dump('decision-' + tag.replace(/\W+/g, '_')); }
await p.click('#clearVals'); await dump('reset-unknown');
// réponses : bool et enum
await p.locator('.seg button').first().click(); await dump('answer-yes');
const s0 = p.locator('select[data-s]').first(); await s0.selectOption({ index: 1 }); await dump('answer-enum');
await p.click('#clearVals');
// plusieurs nœuds question
const nq = await p.locator('.nd:not(.code)').count();
for (const i of [0, 1, Math.min(4, nq - 1), nq - 1]) { await p.locator('.nd:not(.code)').nth(i).click(); await dump('node-q-' + i);
  const chip = p.locator('.base .b').first(); if (await chip.count()) { await chip.click({ position: { x: 6, y: 6 } }); await dump('node-q-' + i + '-text'); } }
const nc = await p.locator('.nd.code').count();
for (const i of [0, Math.floor(nc / 2), nc - 1]) { await p.locator('.nd.code').nth(i).click(); await dump('node-c-' + i);
  const chip = p.locator('.base .b').first(); if (await chip.count()) { await chip.click({ position: { x: 6, y: 6 } }); await dump('node-c-' + i + '-text'); } }
// hors périmètre
const hp = p.locator('.nd.code:has(b)').first(); if (await hp.count()) { await hp.click(); await dump('node-out-of-scope'); }
// modification non signée
await p.locator('.nd:not(.code)').first().click();
const selB = p.locator('select[data-b]').first(), cur = await selB.inputValue();
const opts = await selB.locator('option').evaluateAll((os) => os.map((o) => [o.value, o.textContent]));
const cible = opts.find(([v, t]) => v && v !== cur && /^\d{4}\.\d{2}/.test(t));
await selB.selectOption(cible[0]); await p.fill('#edReason', ''); await p.fill('#edWho', '');
await p.click('#apply'); await dump('unsigned-edit');
// branche vidée → édition refusée
await p.locator('select[data-b]').nth(1).selectOption('');
await p.fill('#edReason', 'Test reading: this branch leads elsewhere under my interpretation.'); await p.fill('#edWho', 'Sweep probe');
await p.click('#apply'); await dump('refused-edit');
// édition signée valable
await p.locator('.nd:not(.code)').first().click();
await p.locator('select[data-b]').first().selectOption(cible[0]);
await p.fill('#edReason', 'Test reading: this branch leads elsewhere under my interpretation.'); await p.fill('#edWho', 'Sweep probe');
await p.click('#apply'); await dump('signed-edit');
for (const t of ['decisions', 'code', 'journal']) { await p.click(`[data-tab=${t}]`); await dump('tab-' + t); }
// téléchargements
await p.click('[data-tab=code]');
for (const id of ['#dlJson', '#dlJs']) { const [d] = await Promise.all([p.waitForEvent('download'), p.click(id)]); const path = await d.path(); const txt = (await import('node:fs')).readFileSync(path, 'utf8'); writeFileSync(new URL('download-' + d.suggestedFilename(), OUT), txt); console.log('download', d.suggestedFilename(), txt.length); }
// modifier un nœud code : code invalide
await p.locator('.nd.code').first().click(); await p.fill('#edCode', '12'); await p.fill('#edReason', 'Test reading: code changed to a short one.'); await p.click('#apply'); await dump('code-invalid');
await p.fill('#edCode', '847130'); await p.fill('#edReason', 'Test reading: code changed to another subheading.'); await p.click('#apply'); await dump('code-edit');
// revert d'un nœud
await p.locator('.nd.mod').first().click(); if (await p.locator('#revert').count()) { await p.click('#revert'); await dump('revert-node'); }
await p.click('[data-tab=journal]'); await dump('journal-after-revert');
// fermer l'éditeur, ajouter un code et une question
if (await p.locator('#closeEd').count()) await p.click('#closeEd'); await dump('editor-closed');
await p.click('#addCode'); await dump('add-code');
await p.fill('#edCode', '850450'); await p.fill('#edLib', 'Probe code'); await p.fill('#edReason', 'Test reading: a new code node added by the probe.'); await p.fill('#edWho', 'Sweep probe'); await p.click('#apply'); await dump('add-code-applied');
await p.click('#closeEd'); await p.click('#addQ'); await dump('add-question');
await p.fill('#edReason', 'Test reading: a new question with no branch.'); await p.fill('#edWhy', 'x'); await p.click('#apply'); await dump('add-question-refused');
// supprimer un nœud ajouté
if (await p.locator('#delNode').count()) { await p.click('#delNode'); await dump('delete-node'); }
await p.reload(); await p.waitForSelector('.tree'); await dump('after-reload');
console.log('edited nodes after reload', await p.locator('.nd.mod').count());
await p.click('#reset'); await dump('back-to-reference');
// « Read the current file » : bouton visible quand un dossier existe (sans appel modèle : on ne clique pas)
await p.evaluate(() => localStorage.setItem('dossier', JSON.stringify({ sku: 'SKU-TEST', description: 'USB-C charger 65 W', fiche_technique: '', caracteristiques: {} })));
await p.reload(); await p.waitForSelector('.tree'); await dump('with-dossier-button');
// porte d'accès (rendue visible sans appel)
await p.evaluate(() => { document.getElementById('gate').style.display = 'flex'; }); await dump('gate'); await p.evaluate(() => { document.getElementById('gate').style.display = 'none'; localStorage.removeItem('dossier'); });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
console.log('mobile overflow px', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await p.locator('.nd:not(.code)').first().click(); await dump('mobile-390');
console.log('mobile overflow px (editor open)', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await p.screenshot({ path: new URL('mobile-390.png', OUT).pathname, fullPage: true });
// jeu d'essai dev et données absentes
await p.setViewportSize({ width: 1440, height: 950 });
await p.goto(base + 'arbre?data=dev'); await p.waitForTimeout(1500); await dump('data-dev');
writeFileSync(new URL('tout.txt', OUT), all.join('\n\n'));
console.log('JS errors:', errs.length, JSON.stringify(errs.slice(0, 10), null, 1));
await b.close();
