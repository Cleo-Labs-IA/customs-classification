import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1680, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto((process.env.URL_APP || 'http://localhost:4318/') + (process.argv[2] === 'dev' ? '?data=dev' : ''));
await p.waitForTimeout(800);
await p.click('.chip:nth-child(2)'); await p.click('#go');
await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 });
// the reasoning, duties and tests sit behind collapsed sections: open them all for this probe
const ouvrir = () => p.evaluate(() => document.querySelectorAll('details.more').forEach((d) => { d.open = true; }));
await ouvrir(); await p.waitForTimeout(150);
const regle = async () => (await p.locator('.rule').innerText()).replace(/\n+/g, ' | ').slice(0, 700);
console.log('RULE:', await regle());
for (let i = 0; i < 3 && await p.locator('.block .opts button').count(); i++) {
  const btns = await p.locator('.block .opts button').allInnerTexts(); console.log('blocking point, options:', btns.map((x) => x.replace(/\n/g, ' ')));
  await p.locator('.block .opts button').last().click(); await p.waitForTimeout(150);
}
console.log('AFTER ANSWERS:', await regle());
if (await p.locator('.step').count()) { await p.locator('.step').first().click(); await p.waitForTimeout(250); console.log('step drawer:', await p.locator('.drawer h4').allTextContents()); await p.keyboard.press('Escape'); }
// applicabilité d'une décision proche
if (await p.locator('[data-applic]').count()) { await p.locator('[data-applic]').first().click(); await p.waitForSelector('.prec .tag', { timeout: 90000 }); console.log('applicability:', (await p.locator('.prec').first().innerText()).replace(/\n/g, ' ').slice(0, 220)); }
// obligations et droits
if (await p.locator('#oblig').count()) { await p.fill('#oblig input', '1000'); await p.click('#oblig button'); await p.waitForSelector('.comp, #oblig ~ .err', { timeout: 120000 }); console.log('obligations:', await p.locator('.ob .tag').allTextContents(), '| cost:', (await p.locator('.comp').innerText().catch(() => 'absent')).replace(/\n/g, ' ').slice(0, 260)); }
// dossier lisible
const [pop] = await Promise.all([p.context().waitForEvent('page'), p.click('#lisible')]);
await pop.waitForLoadState(); const txt = await pop.locator('body').innerText();
console.log('readable file:', txt.length, 'characters | headings:', (await pop.locator('h2').allTextContents()).join(' · ').slice(0, 400), '| forbidden words:', ['undefined', 'NaN', '[object Object]'].filter((w) => txt.includes(w)));
await pop.screenshot({ path: 'sonde-dossier.png', fullPage: true }); await pop.close();
console.log('remaining work:', await p.locator('.todo li').allTextContents());
await p.screenshot({ path: 'sonde-regle-1.png', fullPage: true });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('mobile overflow (px):', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
console.log('JS errors:', errs.length, errs.slice(0, 3));
await b.close();
