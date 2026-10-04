// Sonde navigateur de la page « arbre d'interprétation ».
//   node sonde-arbre.mjs            (données réelles)      node sonde-arbre.mjs dev   (jeu d'essai)
//   URL_APP=https://… node sonde-arbre.mjs
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const base = process.env.URL_APP || 'http://localhost:4318/';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
if (process.env.URL_APP && existsSync(new URL('./.code-acces', import.meta.url))) { const c = readFileSync(new URL('./.code-acces', import.meta.url), 'utf8').trim(); await p.addInitScript((v) => localStorage.setItem('code', v), c); }
await p.goto(base + 'arbre' + (process.argv[2] === 'dev' ? '?data=dev' : ''));
await p.waitForSelector('.tree', { timeout: 30000 });
const score = async () => (await p.textContent('.score div b')).trim();
console.log('nodes shown:', await p.locator('.nd').count(), '| decisions:', await p.locator('tr.click').count(), '| reference score:', await score());
// 1. charger une décision : le chemin s'allume et le verdict s'affiche
await p.locator('tr.click').first().click();
console.log('decision loaded:', (await p.textContent('.panel .sub')).slice(0, 80), '| result:', (await p.locator('.result').innerText()).replace(/\n/g, ' ').slice(0, 140), '| nodes on the path:', await p.locator('.nd.on').count());
// 2. produit libre : tout inconnu → information manquante avec ce que la réponse départage
await p.click('#clearVals');
console.log('all unknown:', (await p.locator('.result').innerText()).replace(/\n/g, ' ').slice(0, 200));
// 3. modifier : la première question, sa première branche pointe vers un autre code
await p.locator('.nd:not(.code)').first().click();
const selB = p.locator('select[data-b]').first(), cur = await selB.inputValue();
const opts = await selB.locator('option').evaluateAll((os) => os.map((o) => [o.value, o.textContent]));
const cible = opts.find(([v, t]) => v && v !== cur && /^\d{4}\.\d{2}/.test(t));
await selB.selectOption(cible[0]);
await p.click('#apply');
console.log('without signature:', (await p.locator('.ed .err').count()) ? await p.textContent('.ed .err') : 'ACCEPTED (defect)');
await p.fill('#edReason', 'Test reading: this branch leads elsewhere under my interpretation.'); await p.fill('#edWho', 'Automated probe');
await p.click('#apply');
console.log('after edit → score:', await score(), '| banner:', (await p.textContent('.delta')).slice(0, 150), '| decisions that flip:', await p.locator('tr.flip').count(), '| nodes marked edited:', await p.locator('.nd.mod').count());
await p.click('[data-tab=code]'); console.log('changed code lines:', await p.locator('pre .chg').count());
await p.click('[data-tab=journal]'); console.log('log:', (await p.locator('.j').first().innerText()).replace(/\n/g, ' ').slice(0, 200));
await p.screenshot({ path: 'sonde-arbre-1.png', fullPage: true });
// 4. persistance puis retour à la référence
await p.reload(); await p.waitForSelector('.tree');
console.log('after reload, edited nodes:', await p.locator('.nd.mod').count());
await p.click('#reset'); console.log('back to reference → score:', await score(), '| edited nodes:', await p.locator('.nd.mod').count());
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('mobile overflow (px):', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await p.screenshot({ path: 'sonde-arbre-2-mobile.png', fullPage: true });
console.log('JS errors:', errs.length, errs.slice(0, 3));
await b.close();
