// Sonde navigateur : joue les parcours contre les vrais services et capture chaque étape.
//   node sonde.mjs photo <chemin>   |   node sonde.mjs contradiction
//   URL_APP=https://cleo-customs-classifier.vercel.app/ node sonde.mjs ...   (version en ligne)
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const [mode, file] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const idle = async () => { await p.waitForTimeout(400); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 }); };
const etat = async () => ({ statut: await p.locator('.final .tag').count() ? await p.textContent('.final .tag') : null, code: await p.locator('.final .big').count() ? await p.textContent('.final .big') : null, erreur: await p.locator('.err').count() ? await p.textContent('.err') : null });
const ANS = { function: 'AC/DC power adapter: converts 100-240 V mains to DC USB-C Power Delivery output to charge laptops', use: 'charging laptops and phones', material: 'plastics' };
async function repondre() {
  for (let n = 0; n < 3 && await p.locator('#answers').count(); n++) {
    const qs = await p.locator('#answers .qrow .t').allTextContents();
    for (const i of await p.locator('#answers input, #answers select').all()) { const k = await i.getAttribute('name'); if ((await i.evaluate((e) => e.tagName)) === 'SELECT') await i.selectOption({ index: 1 }); else await i.fill(ANS[k] || '1'); }
    console.log('questions asked:', qs);
    await p.click('#answers button'); await idle();
    console.log('after answer:', await etat());
  }
}
const URL_APP = process.env.URL_APP || 'http://localhost:4318/';
if (process.env.URL_APP) { const { readFileSync } = await import('node:fs'); const c = readFileSync(new URL('./.code-acces', import.meta.url), 'utf8').trim(); await p.addInitScript((v) => localStorage.setItem('code', v), c); }
await p.goto(URL_APP);
if (mode === 'photo') {
  await p.setInputFiles('#photo', file);
  await p.waitForSelector('.photo', { timeout: 90000 });
  console.log('proposed description:', await p.inputValue('#desc'));
  console.log('label read:', JSON.stringify(await p.inputValue('#ds')));
  await p.screenshot({ path: 'sonde-photo-1-fiche.png', fullPage: true });
  await p.click('#go'); await idle();
  console.log('facts:', await p.locator('.fact').allTextContents());
  console.log('round 1:', await etat());
  await repondre();
  await p.click('#others button[type=submit]'); await idle();
  console.log('other destinations:', await p.locator('#others tr').allTextContents());
  await p.fill('#t-ref input', 'USB-C wall charger for notebook computers'); await p.click('#t-ref button'); await idle();
  if (await p.locator('#t-rm select:not([disabled])').count()) { await p.click('#t-rm button'); await idle(); }
  await p.fill('#t-con input', 'This unit is a passive cable organiser with no electrical function.'); await p.click('#t-con button'); await idle();
  console.log('robustness tests:', await p.locator('.bench:not(#others) tr').allTextContents());
  await p.screenshot({ path: 'sonde-photo-2-dossier.png', fullPage: true });
} else {
  await p.click('.chip:nth-child(3)'); await p.click('#go'); await idle();
  console.log('facts:', await p.locator('.fact').allTextContents());
  console.log('contradictions:', await p.locator('.conflict .one .t').allTextContents());
  await p.screenshot({ path: 'sonde-contra-1.png', fullPage: true });
  for (let n = 0; n < 5 && await p.locator('.conflict').count(); n++) { await p.locator('.conflict .one').first().locator('.side').nth(1).locator('button').click(); await idle(); }
  console.log('description after resolution:', await p.locator('.node').first().locator('.s').first().innerHTML());
  console.log('after resolution:', await etat());
  await repondre();
  await p.locator('.cand').first().click(); await p.waitForTimeout(300);
  console.log('candidate drawer:', await p.locator('.drawer h4').allTextContents());
  await p.screenshot({ path: 'sonde-contra-2-tiroir.png' });
  await p.keyboard.press('Escape');
  if (await p.locator('.fact .rm').count()) { await p.locator('.fact .rm').first().click(); await idle(); console.log('after removal:', await etat(), '| changes:', await p.locator('.diff .t').allTextContents()); }
  await p.screenshot({ path: 'sonde-contra-3.png', fullPage: true });
}
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('mobile overflow (px):', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
console.log('JS errors:', errs.length, errs.slice(0, 3));
await b.close();
