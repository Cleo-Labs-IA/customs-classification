// Full journey on the single-decision scene: node sonde-parcours.mjs dock | chargeur <photo>
// Checks the feedback of 4 Oct 2026: validation is blocked while a question is open or the two readings
// disagree; an arbitration needs a reason and a name; the validated code returns to the product record.
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const [mode, file] = process.argv.slice(2);
const REP = mode === 'dock'
  ? { fonction_principale: 'transmettre_signaux', electronique_active: 'oui', liaison_reseau: 'port_parmi_autres', appareil_hote: 'ordinateur' }
  : { fonction_principale: 'alimenter', genere_electricite: 'non', batterie_integree: 'aucune', convertit_courant: 'convertisseur', prises_secteur_sortie: 'non' };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const idle = async () => { await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 }); };
const etat = async () => ({ code: (await p.locator('.scene .code').count()) ? (await p.locator('.scene .code').innerText()).split('\n')[0] : (await p.locator('.scene .vs b').allInnerTexts()).join(' vs '), blockers: await p.locator('.scene .state li').allInnerTexts(), validateDisabled: await p.locator('#validate button').isDisabled() });
await p.goto(process.env.URL_APP || 'http://localhost:4318/'); await p.waitForTimeout(1200);
if (mode === 'dock') await p.click('.chip:nth-child(2)');
else { await p.setInputFiles('#photo', file); await p.waitForSelector('.photo', { timeout: 120000 }); console.log('photo triage:', (await p.locator('.tri b').allInnerTexts()).join(' | ')); }
await p.click('#go'); await idle();
console.log('SCENE at first:', JSON.stringify(await etat()));
console.log('facts line:', (await p.locator('.scene .top').innerText()).replace(/\s+/g, ' ').slice(0, 170));
for (let i = 0; i < 8 && await p.locator('.scene .block [data-crit]').count(); i++) {
  const k = (await p.locator('.scene .block [data-crit]').first().getAttribute('data-crit')).split(':')[0];
  if (!REP[k]) { console.log('no planned answer for', k); break; }
  console.log('deciding question:', (await p.locator('.scene .block .t').innerText()).slice(0, 90), '→', REP[k]);
  await p.click(`.scene [data-crit="${k}:${REP[k]}"]`); await p.waitForTimeout(150);
}
console.log('SCENE after answers:', JSON.stringify(await etat()));
if (await p.locator('#arbitrage').count()) {
  // negative control: an arbitration without a real reason must not unlock validation
  await p.locator('#arbitrage input[type=radio]').nth(1).check();
  await p.fill('#arbitrage textarea', 'too short'); await p.fill('#arbitrage input[name=qui]', 'Probe Declarant');
  await p.evaluate(() => document.querySelector('#arbitrage').noValidate = true); await p.click('#arbitrage button[type=submit]'); await p.waitForTimeout(150);
  console.log('arbitration with a 9-character reason → still blocked:', (await etat()).validateDisabled);
  await p.locator('#arbitrage input[type=radio]').nth(1).check();
  await p.fill('#arbitrage textarea', 'Probe reading: the station links peripherals to the computer, its network port is one port among others.');
  await p.fill('#arbitrage input[name=qui]', 'Probe Declarant'); await p.locator('#arbitrage input[type=checkbox]').first().check();
  await p.click('#arbitrage button[type=submit]'); await p.waitForTimeout(200);
  console.log('SCENE after arbitration:', JSON.stringify(await etat()), '|', (await p.locator('.scene .top .muted').last().innerText()));
}
if (!(await etat()).validateDisabled) {
  if (!(await p.inputValue('#who'))) await p.fill('#who', 'Probe Declarant');
  await p.click('#validate button'); await p.waitForTimeout(300);
  console.log('validated → product record:', (await p.textContent('#hscode')).trim(), '| state:', (await p.locator('.scene .state').innerText()).slice(0, 90));
  const [pop] = await Promise.all([p.context().waitForEvent('page'), p.click('#lisible')]);
  await pop.waitForLoadState(); const txt = await pop.locator('body').innerText();
  console.log('exported file:', txt.length, 'chars | arbitration in file:', /Arbitration by/.test(txt), '| status line:', (txt.match(/Proposal validated by[^\n]*/) || ['(not found)'])[0].slice(0, 80), '| forbidden words:', ['undefined', 'NaN', '[object Object]'].filter((w) => txt.includes(w)));
  await pop.close();
} else console.log('validation still blocked:', (await etat()).blockers);
console.log('collapsed sections:', await p.locator('details.more > summary').allInnerTexts());
await p.screenshot({ path: `sonde-parcours-${mode}.png`, fullPage: true });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('mobile overflow (px):', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
console.log('JS errors:', errs.length, errs.slice(0, 3));
await b.close();
