// Fenêtre d'import en trois temps : la source, le fichier lu, la vérification.
// Le fichier est lu dans le navigateur ; rien n'est envoyé avant la classification.
import { esc, ic, nomPays, pluriel, PAYS, toast, drapeau, vignette } from '../ui.js';
import { versCommandes } from '../csv.js';
import * as S from '../store.js';

const SOURCES = [
  { id: 'demo', titre: 'Demo store', sous: '2 products read from their labels, around fifty orders to 14 countries', ic: 'lecture' },
  { id: 'shopify', titre: 'Shopify', sous: 'Orders › Export › CSV', ic: 'fichier' },
  { id: 'etsy', titre: 'Etsy', sous: 'Shop › Settings › Downloads', ic: 'fichier' },
  { id: 'csv', titre: 'Other CSV file', sous: 'Product, country, quantity, price columns', ic: 'fichier' },
];
let m = null;
const DEMO_IMAGES = new Set(['CHG-70W', 'NB-M1605N']);

function lignesApercu() {
  if (m.source === 'demo' || !m.resultat) {
    return [['CHG-70W', 'USB-C power adapter, 70 W', 'JP'], ['NB-M1605N', 'Notebook PC, model M1605N', 'US'], ['CHG-70W', 'USB-C power adapter, 70 W', 'FR'], ['NB-M1605N', 'Notebook PC, model M1605N', 'AU'], ['CHG-70W', 'USB-C power adapter, 70 W', 'DE']];
  }
  return m.resultat.lignes.slice(0, 5).map((l) => [l.sku, l.produit, l.pays]);
}
function visuel() {
  const rangs = lignesApercu();
  const droite = (i) => (m.etape === 0 ? drapeau(rangs[i][2]) : m.etape === 1 ? '<span class="miroite" style="width:64px;height:20px;display:block">.</span>' : `<span class="etat ${['pret', 'bloque', 'a_verifier', 'a_verifier', 'pret'][i]}">${['Ready', 'Blocked', 'To check', 'To check', 'Ready'][i]}</span>`);
  return `<div class="mini"><div class="tete"><span class="logo" style="width:22px;height:22px;border-radius:6px"><span style="font-size:12px;font-weight:600">S</span></span>${m.etape === 2 ? 'Check by country' : 'Orders imported'}<span class="espace"></span><span class="faint mono" style="font-size:11px">${m.etape === 0 ? 'CSV' : m.etape === 1 ? 'reading' : 'rules'}</span></div>
    ${rangs.map((r, i) => `<div class="ligne apparait" style="animation-delay:${i * 70}ms"><div style="display:flex;gap:10px;align-items:center;min-width:0">${vignette({ sku: r[0], teinte: ['sable', 'corail', 'lavande', 'peche', 'menthe'][i], image: DEMO_IMAGES.has(r[0]) ? `/data/produits/${r[0].toLowerCase()}.jpg` : null }, 'petite')}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r[1])}</span></div>${droite(i)}</div>`).join('')}</div>`;
}

function etape0() {
  return `<div class="sur">Import orders</div><h2>Where do your orders come from? <span class="gris">One export is enough: Stamped reads the columns from Shopify, Etsy or a spreadsheet.</span></h2>
    <div class="sources-import">${SOURCES.map((s) => `<button class="src-import ${m.source === s.id ? 'choisi' : ''}" data-source="${s.id}">${ic(s.ic)}<b>${esc(s.titre)}</b><small>${esc(s.sous)}</small></button>`).join('')}</div>
    <p class="faint" style="font-size:12.5px;margin-top:14px">${ic('info')} Continuous sync through the Shopify API: next step. For the demo, a stream of simulated orders mimics that continuous arrival.</p>`;
}
function etape1() {
  if (m.source === 'demo') return `<div class="sur">Demo store</div><h2>A fictional store, <span class="gris">eight products sold from China and Vietnam to twelve countries.</span></h2><p class="muted" style="margin-top:14px">The USB-C docking station replays a real response from the Cleo Legal API, recorded on 4 October 2026. Without an API key, the other products use illustrative responses, flagged as such. With the key, each product is classified live.</p>${apercu()}`;
  return `<div class="sur">File: ${esc(SOURCES.find((s) => s.id === m.source).titre)}</div><h2>Drop the export. <span class="gris">It is read in this browser, line by line.</span></h2>
    <label class="depot" id="depot"><input type="file" accept=".csv,text/csv" id="fichier" class="sr">${ic('import')}<div><b>${m.nomFichier ? esc(m.nomFichier) : 'Choose a CSV file'}</b> or drag it here</div></label>
    <div class="champ"><label for="origine">Country of origin of the products <small class="faint">(the order export does not include it)</small></label><select class="saisie" id="origine">${['CN', 'VN', 'IN', 'FR', 'DE', 'US', 'MX'].map((c) => `<option value="${c}" ${m.origine === c ? 'selected' : ''}>${esc(PAYS[c])}</option>`).join('')}</select></div>
    ${m.resultat ? (m.resultat.erreur ? `<p style="color:var(--bad);margin-top:14px">${esc(m.resultat.erreur)}</p>` : apercu()) : ''}`;
}
function apercu() {
  const r = m.resultat;
  if (!r || !r.lignes) return '';
  const pays = new Set(r.lignes.map((l) => l.pays)), cmd = new Set(r.lignes.map((l) => l.commande)), prod = new Set(r.lignes.map((l) => l.sku));
  return `<div class="apercu"><div><b data-compte="${cmd.size}">${cmd.size}</b><span>orders · ${r.lignes.length} lines</span></div><div><b data-compte="${prod.size}">${prod.size}</b><span>products to classify</span></div><div><b data-compte="${pays.size}">${pays.size}</b><span>delivery countries</span></div></div>
    ${r.ecartees.length ? `<p class="muted" style="margin-top:10px;font-size:12.5px">${pluriel(r.ecartees.length, 'line set aside', 'lines set aside')}: ${esc(r.ecartees.slice(0, 3).map((e) => `line ${e.rang}, ${e.raison}`).join('; '))}${r.ecartees.length > 3 ? '…' : ''}</p>` : ''}
    <p class="faint" style="margin-top:10px;font-size:12.5px">${esc([...pays].map(nomPays).join(', '))}</p>`;
}
function etape2() {
  return `<div class="sur">Check</div><h2>Everything stays in one place. <span class="gris">Classification, the check by country, the questions and the log live in a single file.</span></h2>
    <ul class="muted" style="margin:18px 0 0 18px;display:flex;flex-direction:column;gap:8px"><li>The agent classifies each product once, on the Cleo Legal API.</li><li>Each country's rules apply to the code selected: markings, certificates, duties and deadlines.</li><li>What it cannot decide becomes a question, which you sign.</li></ul>`;
}

function rendre() {
  const pret = m.etape === 0 ? Boolean(m.source) : m.etape === 1 ? m.source === 'demo' || (m.resultat && m.resultat.lignes && m.resultat.lignes.length) : true;
  const corps = [etape0, etape1, etape2][m.etape]();
  m.el.innerHTML = `<div class="modale" role="dialog" aria-modal="true" aria-label="Import orders"><div class="modale-visuel">${visuel()}</div>
    <div class="modale-texte"><div style="display:flex;align-items:center"><span style="flex:1"></span><div class="etapes">${[0, 1, 2].map((i) => `<i class="${i === m.etape ? 'on' : ''}"></i>`).join('')}</div><span style="flex:1;display:flex;justify-content:flex-end"><button class="icobtn" data-fermer title="Close">${ic('fermer')}</button></span></div>
      <div class="contenu">${corps}</div>
      <div class="modale-pied"><button class="btn gris" data-retour ${m.etape === 0 ? 'style="visibility:hidden"' : ''}>Back</button><button class="btn noir" data-suivant ${pret ? '' : 'disabled'}>${m.etape === 2 ? 'Start the check' : 'Next'}</button></div></div></div>`;
  brancherFichier();
}

function lireFichier(f) {
  if (!f) return;
  m.nomFichier = f.name;
  const rd = new FileReader();
  rd.onload = () => { m.texte = String(rd.result); m.resultat = versCommandes(m.texte, { origine: m.origine }); rendre(); };
  rd.onerror = () => { m.resultat = { erreur: 'unreadable file' }; rendre(); };
  rd.readAsText(f);
}
function brancherFichier() {
  const input = m.el.querySelector('#fichier'), depot = m.el.querySelector('#depot'), origine = m.el.querySelector('#origine');
  if (input) input.addEventListener('change', () => lireFichier(input.files[0]));
  if (origine) origine.addEventListener('change', () => { m.origine = origine.value; if (m.texte) m.resultat = versCommandes(m.texte, { origine: m.origine }); rendre(); });
  if (!depot) return;
  depot.addEventListener('dragover', (e) => { e.preventDefault(); depot.classList.add('survol'); });
  depot.addEventListener('dragleave', () => depot.classList.remove('survol'));
  depot.addEventListener('drop', (e) => { e.preventDefault(); depot.classList.remove('survol'); lireFichier(e.dataTransfer.files[0]); });
}

async function terminer() {
  const el = m.el, source = m.source;
  if (source === 'demo') await S.importerDemo();
  else S.importerCsv(m.texte, { origine: m.origine, boutique: m.nomFichier.replace(/\.csv$/i, ''), plateforme: { shopify: 'Shopify', etsy: 'Etsy' }[source] || 'CSV' });
  el.remove(); m = null;
  location.hash = '#/';
  toast({ titre: 'Orders imported', texte: 'The agent is classifying the products; the map fills in as answers arrive.', niveau: 'pret', icone: 'agent' });
}

export function ouvrirImport(source = null) {
  if (m) return;
  const el = document.createElement('div');
  el.className = 'modale-voile';
  document.body.appendChild(el);
  m = { el, etape: source ? 1 : 0, source, origine: 'CN', texte: '', resultat: null, nomFichier: '' };
  if (source === 'demo') prechargerDemo();
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-fermer]')) { el.remove(); m = null; return; }
    const s = e.target.closest('[data-source]');
    if (s) { m.source = s.dataset.source; m.resultat = null; m.texte = ''; m.nomFichier = ''; if (m.source === 'demo') prechargerDemo(); return rendre(); }
    if (e.target.closest('[data-retour]')) { m.etape = Math.max(0, m.etape - 1); return rendre(); }
    if (e.target.closest('[data-suivant]')) { if (m.etape < 2) { m.etape++; return rendre(); } terminer(); }
  });
  document.addEventListener('keydown', function echap(e) { if (e.key === 'Escape' && m) { m.el.remove(); m = null; document.removeEventListener('keydown', echap); } });
  rendre();
}
async function prechargerDemo() {
  const texte = await fetch('/data/demo-commandes.csv').then((r) => r.text()).catch(() => '');
  if (m && m.source === 'demo') { m.resultat = versCommandes(texte); rendre(); }
}
