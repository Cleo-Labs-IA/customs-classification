// Market-access work list on real data: node sonde-conformite.mjs
// A US brand selling its own-brand mains charger online to consumers in France.
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const REP = { marque: 'propre', etablissement_vendeur: 'hors_ue', approvisionnement: 'hors_ue', mandataire_ue: 'non', fourniture: 'seul', vente_a_distance: 'oui', acheteurs_consommateurs: 'oui', date_mise_sur_marche: 'du_2020_04_01_au_2028_12_13',
  tension_entree: 'ac_50_1000', radio: 'non', batterie: 'non', hors_champ_basse_tension: 'non', sortie_plus_basse: 'oui', boitier_separe: 'oui', puissance_sortie: 'jusqu_a_250_w', type_exclu_ecoconception: 'non', appareil_alimente: 'informatique_domestique', fabricant_etabli_ue: 'non' };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const idle = async () => { await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 }); };
await p.goto(process.env.URL_APP || 'http://localhost:4318/'); await p.waitForTimeout(1200);
await p.fill('#sku', 'CHG-65'); await p.fill('#desc', 'USB-C power adapter, 65 W wall charger for laptops');
await p.fill('#ds', 'Input: 100-240 V AC, 50/60 Hz, 1.6 A. Output: 20 V DC 3.25 A, 65 W (USB Power Delivery). External power supply in its own enclosure, connected to the laptop by a USB-C cable. No battery. No radio function. CE');
await p.click('#go'); await idle();
const sum = async () => (await p.locator('details[data-key=conformite] > summary').innerText()).replace(/\s+/g, ' ');
console.log('summary at first:', await sum());
await p.locator('details[data-key=conformite] > summary').click(); await p.waitForTimeout(200);
console.log('read from the documents:', await p.locator('.cf .req .row .muted').filter({ hasText: '“' }).count(), 'facts with a quoted passage');
let asked = 0;
for (let i = 0; i < 30 && await p.locator('.cf .ask [data-cq]').count(); i++) {
  const k = (await p.locator('.cf .ask [data-cq]').first().getAttribute('data-cq')).split(':')[0];
  if (!REP[k]) { console.log('no planned answer for', k); break; }
  await p.click(`.cf .ask [data-cq="${k}:${REP[k]}"]`); await p.waitForTimeout(120); asked++;
}
console.log('questions answered by the seller:', asked);
console.log('summary after answers:', await sum());
console.log('role:', (await p.locator('.cf .req .h b').first().innerText()));
console.log('requirements that apply:', (await p.locator('.cf .req .h b').allInnerTexts()).slice(1).map((x) => x.slice(0, 70)));
console.log('evidence states:', JSON.stringify(Object.fromEntries(['Missing', 'Seen on the label', 'Declared held, not checked'].map((t) => [t, 0]).map(([t]) => [t, 0]))), await p.locator('.cf .ev .tag').allInnerTexts().then((a) => a.reduce((o, t) => (o[t] = (o[t] || 0) + 1, o), {})));
await p.locator('.cf [data-have]').first().click(); await p.waitForTimeout(150);
console.log('after "I hold this" on one document:', await sum());
await p.locator('.cf .lnk[data-d]').first().click(); await p.waitForTimeout(250);
console.log('official text drawer:', (await p.locator('.drawer h3').innerText()).slice(0, 80), '|', (await p.locator('.drawer blockquote').innerText()).length, 'chars');
await p.keyboard.press('Escape');
await p.screenshot({ path: 'sonde-conformite.png', fullPage: true });
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
console.log('mobile overflow (px):', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
console.log('JS errors:', errs.length, errs.slice(0, 3));
await b.close();
