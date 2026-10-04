// Stress tests on the decision: node sonde-epreuves.mjs  (dock sample with datasheet, rephrasing + contradiction flow)
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
const idle = async () => { await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 }); };
const U = process.env.URL_APP || 'http://localhost:4318/';
// 1. charger-like text sample: rephrasing must not move the rule on confirmed facts
await p.goto(U); await p.waitForTimeout(1200);
await p.fill('#sku', 'CHG-65'); await p.fill('#desc', 'USB-C power adapter, 65 W wall charger for laptops');
await p.fill('#ds', 'Input: 100-240 V AC, 50/60 Hz, 1.6 A. Output: 20 V DC 3.25 A (USB Power Delivery). Converts mains AC to DC to charge a laptop. No battery. Plastic housing.');
await p.click('#go'); await idle();
for (const [k, v] of [['fonction_principale', 'alimenter'], ['genere_electricite', 'non'], ['batterie_integree', 'aucune'], ['convertit_courant', 'convertisseur'], ['prises_secteur_sortie', 'non']]) if (await p.locator(`.scene [data-crit="${k}:${v}"]`).count()) { await p.click(`.scene [data-crit="${k}:${v}"]`); await p.waitForTimeout(120); }
console.log('decision before test:', (await p.locator('.scene').innerText()).replace(/\s+/g, ' ').slice(0, 420));
await p.locator('details[data-key=tests] > summary').click();
await p.fill('#t-ref input', 'USB-C wall charger for notebook computers'); await p.click('#t-ref button'); await idle();
console.log('REPHRASING:', (await p.locator('details[data-key=tests] table tr').last().innerText()).replace(/\s+/g, ' ').slice(0, 330));
// 2. contradictory catalogue and datasheet: classification blocked, then released
await p.goto(U); await p.waitForTimeout(1000); await p.click('.chip:nth-child(3)'); await p.click('#go'); await idle();
console.log('contradictions shown:', await p.locator('.conflict .one').count(), '| scene present while unresolved:', await p.locator('.scene').count());
for (let n = 0; n < 5 && await p.locator('.conflict').count(); n++) { await p.locator('.conflict .one').first().locator('.side').nth(1).locator('button').click(); await idle(); }
console.log('after resolution → scene:', await p.locator('.scene').count(), '| blockers:', await p.locator('.scene .state li').allInnerTexts());
console.log('page errors:', errs.length, errs.slice(0, 2));
await b.close();
