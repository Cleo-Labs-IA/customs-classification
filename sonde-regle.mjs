import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1680, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4318/?data=dev');
await p.waitForTimeout(800);
await p.click('.chip:nth-child(2)'); await p.click('#go');
await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 });
const regle = async () => (await p.locator('.rule').innerText()).replace(/\n+/g, ' | ').slice(0, 700);
console.log('RÈGLE :', await regle());
for (let i = 0; i < 3 && await p.locator('.block .opts button').count(); i++) {
  const btns = await p.locator('.block .opts button').allInnerTexts(); console.log('blocage, options :', btns.map((x) => x.replace(/\n/g, ' ')));
  await p.locator('.block .opts button').last().click(); await p.waitForTimeout(150);
}
console.log('APRÈS RÉPONSES :', await regle());
if (await p.locator('.step').count()) { await p.locator('.step').first().click(); await p.waitForTimeout(250); console.log('tiroir étape :', await p.locator('.drawer h4').allTextContents()); await p.keyboard.press('Escape'); }
console.log('travail restant :', await p.locator('.todo li').allTextContents());
await p.screenshot({ path: 'sonde-regle-1.png', fullPage: true });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('débordement mobile (px) :', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
console.log('erreurs JS :', errs.length, errs.slice(0, 3));
await b.close();
