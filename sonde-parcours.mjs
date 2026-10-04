// Parcours complet avec la règle encodée réelle : node sonde-parcours.mjs dock | chargeur <photo>
import { createRequire } from 'node:module';
const require = createRequire(process.env.HOME + '/cleo-chat/');
const { chromium } = require('playwright');
const [mode, file] = process.argv.slice(2);
const REP = mode === 'dock'
  ? { fonction_principale: 'transmettre_signaux', electronique_active: 'oui', liaison_reseau: 'port_parmi_autres', appareil_hote: 'ordinateur' }
  : { fonction_principale: 'alimenter', genere_electricite: 'non', batterie_integree: 'aucune', convertit_courant: 'convertisseur', prises_secteur_sortie: 'non' };
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1680, height: 1000 } });
const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const idle = async () => { await p.waitForTimeout(500); await p.waitForSelector('.loading', { state: 'detached', timeout: 150000 }); };
await p.goto(process.env.URL_APP || 'http://localhost:4318/'); await p.waitForTimeout(1000);
if (mode === 'dock') await p.click('.chip:nth-child(2)');
else { await p.setInputFiles('#photo', file); await p.waitForSelector('.photo', { timeout: 120000 }); }
await p.click('#go'); await idle();
const etabli = await p.locator('.step').count();
console.log('étapes établies par les pièces seules :', etabli, (await p.locator('.step .l:nth-child(2)').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').slice(13, 150)));
for (let i = 0; i < 8 && await p.locator('.block .opts button').count(); i++) {
  const q = (await p.locator('.block .t').innerText()).slice(0, 110), k = (await p.locator('.block .opts button').first().getAttribute('data-crit')).split(':')[0];
  if (!REP[k]) { console.log('question sans réponse prévue :', k); break; }
  console.log('blocage →', q, '| réponse donnée :', REP[k]);
  await p.click(`[data-crit="${k}:${REP[k]}"]`); await p.waitForTimeout(150);
}
console.log('CONCLUSION DE LA RÈGLE :', (await p.locator('.concl, .block').last().innerText()).replace(/\s+/g, ' ').slice(0, 420));
console.log('PROPOSITION DU MOTEUR :', await p.locator('.final .big').count() ? await p.textContent('.final .big') : 'aucune', '|', await p.textContent('.final .tag'));
console.log('travail restant :', await p.locator('.todo li').allTextContents());
await p.screenshot({ path: `sonde-parcours-${mode}.png`, fullPage: true });
console.log('erreurs JS :', errs.length, errs.slice(0, 3));
await b.close();
