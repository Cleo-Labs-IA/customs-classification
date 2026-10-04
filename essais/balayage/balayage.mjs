// Balayage : parcours réels sur la page principale, dump du texte après chaque étape.
// node essais/balayage/balayage.mjs a|b|c
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const OUT = path.dirname(new URL(import.meta.url).pathname);
const URL_APP = process.env.URL_APP || 'http://localhost:4331/';
const flow = process.argv[2];
const REP = { fonction_principale: 'transmettre_signaux', electronique_active: 'oui', liaison_reseau: 'port_parmi_autres', appareil_hote: 'ordinateur' };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1680, height: 1000 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
p.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ' ' + r.url()); });
let n = 0;
const log = (...a) => console.log(...a);
const idle = async () => { await p.waitForTimeout(600); await p.waitForSelector('.loading', { state: 'detached', timeout: 180000 }); await p.waitForTimeout(300); };
const dump = async (name, extra) => {
  n++;
  const body = await p.evaluate(() => document.body.innerText);
  const drawerOpen = await p.evaluate(() => document.getElementById('drawer').classList.contains('open'));
  const drawer = drawerOpen ? await p.evaluate(() => document.getElementById('drawerBody').innerText) : '';
  // attributs visibles : placeholders, titles, aria-labels, options
  const attrs = await p.evaluate(() => [...document.querySelectorAll('[placeholder],[title],[aria-label]')].map((e) => [e.getAttribute('placeholder'), e.getAttribute('title'), e.getAttribute('aria-label')].filter(Boolean).join(' | ')).concat([...document.querySelectorAll('option')].map((o) => 'option: ' + o.textContent)).join('\n'));
  const f = `${flow}-${String(n).padStart(2, '0')}-${name}.txt`;
  writeFileSync(path.join(OUT, f), `### SCREEN ${flow}/${name}\n### BODY\n${body}\n### DRAWER (${drawerOpen ? 'open' : 'closed'})\n${drawer}\n### ATTRS\n${attrs}\n${extra ? '### EXTRA\n' + extra + '\n' : ''}`);
  log('dump', f, 'body', body.length, 'drawer', drawer.length);
};
const closeDrawer = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(250); };
const step = async (name, fn) => { try { await fn(); } catch (e) { log('STEP FAILED', name, String(e).slice(0, 300)); errs.push('step ' + name + ': ' + String(e).slice(0, 300)); await closeDrawer().catch(() => {}); } };
const openAndDump = async (loc, name) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); await p.waitForTimeout(300); await dump(name); await closeDrawer(); };

await p.goto(URL_APP); await p.waitForTimeout(1200);
await dump('landing');

if (flow === 'a') {
  await p.click('.chip:nth-child(2)'); await dump('sample-filled');
  await p.click('#go'); await idle(); await dump('classified');
  await step('product', async () => openAndDump(p.locator('.node[data-d]').first(), 'drawer-product'));
  await step('facts', async () => { const k = await p.locator('.fact[data-d]').count(); for (let i = 0; i < k; i++) await openAndDump(p.locator('.fact[data-d] span').nth(i * 2).first(), 'drawer-fact-' + i); });
  await step('cands', async () => { const k = await p.locator('.cand').count(); log('cands', k); for (let i = 0; i < k; i++) await openAndDump(p.locator('.cand').nth(i), 'drawer-candidate-' + i); });
  await step('steps', async () => { const k = await p.locator('.step').count(); log('steps', k); for (let i = 0; i < k; i++) await openAndDump(p.locator('.step').nth(i), 'drawer-rule-step-' + i); });
  await step('blocking', async () => {
    for (let i = 0; i < 8 && await p.locator('.block .opts button').count(); i++) {
      await dump('blocking-question-' + i);
      const k = (await p.locator('.block .opts button').first().getAttribute('data-crit')).split(':')[0];
      const sel = REP[k] ? `[data-crit="${k}:${REP[k]}"]` : '.block .opts button';
      log('blocking', k, '->', REP[k] || '(first option)');
      await p.locator(sel).first().click(); await p.waitForTimeout(250);
    }
    await dump('rule-concluded');
    const k = await p.locator('.step').count(); for (let i = 0; i < k; i++) await openAndDump(p.locator('.step').nth(i), 'drawer-rule-step-after-' + i);
  });
  await step('applic', async () => {
    const k = await p.locator('[data-applic]').count(); log('rulings', k);
    for (let i = 0; i < Math.min(k, 3); i++) {
      await p.locator('[data-applic]').first().scrollIntoViewIfNeeded(); await p.locator('[data-applic]').first().click();
      await p.waitForTimeout(500); if (i === 0) await dump('applic-in-progress');
      await p.waitForFunction(() => !/check in progress/.test(document.body.innerText), null, { timeout: 180000 });
    }
    await dump('applic-done');
    const d = p.locator('.prec button[data-d]'); const m = await d.count(); log('applic details', m);
    for (let i = 0; i < m; i++) await openAndDump(d.nth(i), 'drawer-applic-' + i);
  });
  await step('for-against', async () => openAndDump(p.locator('.final .kv button[data-d]').first(), 'drawer-for-against'));
  await step('raw', async () => openAndDump(p.locator('.final .kv button[data-d]').last(), 'drawer-raw-response'));
  await step('oblig', async () => {
    await p.fill('#oblig input[name=v]', '1000'); await p.click('#oblig button');
    await p.waitForTimeout(500); await dump('obligations-in-progress');
    await p.waitForFunction(() => { const b = document.querySelector('#oblig button'); return b && !b.disabled; }, null, { timeout: 240000 });
    await dump('obligations-done');
  });
  await step('t-ref', async () => { await p.fill('#t-ref input', 'Laptop dock with USB-C connection'); await p.click('#t-ref button'); await p.waitForTimeout(200); await dump('test-rephrase-busy'); await idle(); await dump('test-rephrase'); });
  await step('t-rm', async () => { await p.click('#t-rm button'); await p.waitForTimeout(200); await dump('test-remove-busy'); await idle(); await dump('test-remove'); });
  await step('t-con', async () => { await p.fill('#t-con input', 'Power only, no data ports.'); await p.click('#t-con button'); await p.waitForTimeout(200); await dump('test-contradict-busy'); await idle(); await dump('test-contradict'); });
  await step('test details', async () => { const d = p.locator('.bench table button[data-d]'); const m = await d.count(); for (let i = 0; i < m; i++) { await d.nth(i).scrollIntoViewIfNeeded(); await d.nth(i).click(); await p.waitForTimeout(250); const t = await p.evaluate(() => document.getElementById('drawerBody').querySelector('h3').innerText); log('test detail', i, t); if (i === m - 1 || i < 1) await dump('drawer-test-' + i); await closeDrawer(); } });
  await step('others', async () => { await p.click('#others button[type=submit]'); await p.waitForTimeout(200); await dump('others-busy'); await idle(); await dump('others-done'); const d = p.locator('#others table button[data-d]'); if (await d.count()) await openAndDump(d.first(), 'drawer-other-destination'); });
  const readable = async (name) => {
    const [w] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.click('#lisible')]);
    await w.waitForTimeout(1200);
    w.on('pageerror', (e) => errs.push('dossier pageerror: ' + String(e)));
    const t = await w.evaluate(() => document.documentElement.lang + ' | ' + document.title + '\n' + document.body.innerText);
    writeFileSync(path.join(OUT, `${flow}-${name}.txt`), '### SCREEN readable file (' + name + ')\n' + t);
    await w.screenshot({ path: path.join(OUT, `${flow}-${name}.png`), fullPage: true });
    log('readable file', name, t.length); await w.close();
  };
  await step('readable', async () => readable('readable-file'));
  await p.screenshot({ path: path.join(OUT, 'a-main.png'), fullPage: true });
  await step('validate', async () => {
    if (!await p.locator('#validate').count()) { log('no validate form'); return; }
    await p.fill('#who', 'J. Smith'); await p.click('#validate button'); await p.waitForTimeout(500); await dump('validated');
    await readable('readable-file-validated');
  });
}

if (flow === 'b') {
  await p.click('.chip:nth-child(3)'); await p.click('#go'); await idle(); await dump('contradiction-block');
  await p.screenshot({ path: path.join(OUT, 'b-contradiction.png'), fullPage: true });
  await step('keep', async () => {
    const k = await p.locator('[data-keep]').count(); log('keep buttons', k, await p.locator('.conflict .side small').allInnerTexts());
    // garder le côté fiche technique quand il existe
    const sides = await p.locator('.conflict .one').first().locator('.side small').allInnerTexts();
    const idx = sides.findIndex((s) => /Datasheet/i.test(s));
    await p.locator('.conflict .one').first().locator('[data-keep]').nth(idx >= 0 ? idx : 1).click();
    await idle();
    for (let i = 0; i < 4 && await p.locator('[data-keep]').count(); i++) { await dump('contradiction-again-' + i); const s2 = await p.locator('.conflict .one').first().locator('.side small').allInnerTexts(); const j = s2.findIndex((s) => /Datasheet/i.test(s)); await p.locator('.conflict .one').first().locator('[data-keep]').nth(j >= 0 ? j : 1).click(); await idle(); }
    await dump('contradiction-resolved');
  });
  await step('product', async () => openAndDump(p.locator('.node[data-d]').first(), 'drawer-product-struck'));
  await step('readable', async () => {
    if (!await p.locator('#lisible').count()) return;
    const [w] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.click('#lisible')]);
    await w.waitForTimeout(1200);
    writeFileSync(path.join(OUT, 'b-readable-file.txt'), '### SCREEN readable file (b)\n' + await w.evaluate(() => document.documentElement.lang + ' | ' + document.title + '\n' + document.body.innerText)); await w.close();
  });
  await p.screenshot({ path: path.join(OUT, 'b-resolved.png'), fullPage: true });
}

if (flow === 'c') {
  await p.click('.chip:nth-child(1)'); await p.click('#go'); await idle(); await dump('question-form');
  await p.screenshot({ path: path.join(OUT, 'c-question.png'), fullPage: true });
  log('answers form present:', await p.locator('#answers').count(), 'rows', await p.locator('#answers .qrow').count());
  await step('cands', async () => { const k = await p.locator('.cand').count(); for (let i = 0; i < Math.min(k, 2); i++) await openAndDump(p.locator('.cand').nth(i), 'drawer-candidate-' + i); });
  await step('answer', async () => {
    if (!await p.locator('#answers').count()) return;
    const els = p.locator('#answers input, #answers select'); const m = await els.count();
    for (let i = 0; i < m; i++) {
      const e = els.nth(i), tag = await e.evaluate((x) => x.tagName), type = await e.getAttribute('type'), name = await e.getAttribute('name');
      if (tag === 'SELECT') await e.selectOption({ index: 1 });
      else if (type === 'number') await e.fill('100');
      else await e.fill(name === 'function' ? 'connects peripherals, video and network to a laptop over one USB-C cable' : name === 'composition' ? 'aluminium 80, plastics 20' : 'aluminium');
      log('answered', name);
    }
    await p.click('#answers button[type=submit]'); await idle(); await dump('after-answer');
  });
  await step('addfact', async () => { if (!await p.locator('#addfact').count()) return; await p.selectOption('#addfact select', { index: 0 }); await p.fill('#addfact input', 'office use'); await p.click('#addfact button'); await idle(); await dump('after-added-fact'); await openAndDump(p.locator('.fact.main span').first(), 'drawer-fact-by-hand'); });
  await step('readable', async () => {
    if (!await p.locator('#lisible').count()) return;
    const [w] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), p.click('#lisible')]);
    await w.waitForTimeout(1200);
    writeFileSync(path.join(OUT, 'c-readable-file.txt'), '### SCREEN readable file (c)\n' + await w.evaluate(() => document.documentElement.lang + ' | ' + document.title + '\n' + document.body.innerText)); await w.close();
  });
  await p.screenshot({ path: path.join(OUT, 'c-after.png'), fullPage: true });
}

writeFileSync(path.join(OUT, `${flow}-errors.txt`), errs.join('\n') + '\n');
log('ERRORS', errs.length, errs.slice(0, 12));
await b.close();
