// Sonde navigateur : joue le parcours complet contre l'API réelle et capture chaque étape.
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4318/');
await p.click('.chip:nth-child(2)');
await p.click('#go');
await p.waitForSelector('.final', { timeout: 90000 });
console.log('tour 1 :', await p.textContent('.final .tag'), '| questions :', await p.locator('#answers .qrow').count(), '| candidats :', await p.locator('.cand').count());
await p.screenshot({ path: 'sonde-1-question.png', fullPage: true });
if (await p.locator('#answers').count()) {
  for (const i of await p.locator('#answers input').all()) {
    const n = await i.getAttribute('name');
    await i.fill(n === 'material' ? 'plastics' : n === 'use' ? 'toy for toddlers' : 'battery-operated sound toy');
  }
  await p.click('#answers button');
  await p.waitForSelector('.tour >> nth=1', { timeout: 90000 });
  await p.waitForSelector('.final', { timeout: 90000 });
  console.log('tour 2 :', await p.textContent('.final .tag'), '| code :', await p.locator('.final .big').count() ? await p.textContent('.final .big') : 'aucun');
}
await p.screenshot({ path: 'sonde-2-proposition.png', fullPage: true });
await p.locator('.cand').first().click();
await p.waitForTimeout(300);
console.log('tiroir ouvert :', await p.locator('.drawer.open').count(), '| extraits :', await p.locator('.drawer blockquote').count());
await p.screenshot({ path: 'sonde-3-tiroir.png' });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
if (await p.locator('#validate').count()) {
  await p.fill('#who', 'Sonde automatique');
  await p.click('#validate button');
  await p.waitForSelector('.done');
  console.log('fiche après validation :', await p.textContent('#hscode'));
} else console.log('validation : bouton absent (statut non validable)');
await p.screenshot({ path: 'sonde-4-valide.png', fullPage: true });
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(200);
console.log('débordement mobile (px) :', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await p.screenshot({ path: 'sonde-5-mobile.png', fullPage: true });
console.log('erreurs JS :', errs.length, errs.slice(0, 3));
await b.close();
