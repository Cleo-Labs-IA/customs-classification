// Fenêtre d'import en trois temps : la source, le fichier lu, la vérification.
// Le fichier est lu dans le navigateur ; rien n'est envoyé avant la classification.
import { esc, ic, nomPays, pluriel, PAYS, toast, drapeau, vignette } from '../ui.js';
import { versCommandes } from '../csv.js';
import * as S from '../store.js';

const SOURCES = [
  { id: 'demo', titre: 'Boutique de démonstration', sous: '8 produits, une cinquantaine de commandes vers 12 pays', ic: 'lecture' },
  { id: 'shopify', titre: 'Shopify', sous: 'Commandes › Exporter › CSV', ic: 'fichier' },
  { id: 'etsy', titre: 'Etsy', sous: 'Boutique › Paramètres › Téléchargements', ic: 'fichier' },
  { id: 'csv', titre: 'Autre fichier CSV', sous: 'Colonnes produit, pays, quantité, prix', ic: 'fichier' },
];
let m = null;
const DEMO_IMAGES = new Set(['DOCK-PRO', 'CHG-65W', 'PWR-20K', 'BUDS-X', 'HDMI-2M', 'ROBO-DOG', 'CLOCK-BRICK', 'BOTTLE-750']);

function lignesApercu() {
  if (m.source === 'demo' || !m.resultat) {
    return [['CHG-65W', 'Chargeur GaN USB-C 65 W', 'JP'], ['PWR-20K', 'Batterie externe 20 000 mAh', 'US'], ['BUDS-X', 'Écouteurs sans fil', 'FR'], ['ROBO-DOG', 'Chien robot interactif', 'AU'], ['HDMI-2M', 'Câble HDMI 2.1, 2 m', 'DE']];
  }
  return m.resultat.lignes.slice(0, 5).map((l) => [l.sku, l.produit, l.pays]);
}
function visuel() {
  const rangs = lignesApercu();
  const droite = (i) => (m.etape === 0 ? drapeau(rangs[i][2]) : m.etape === 1 ? '<span class="miroite" style="width:64px;height:20px;display:block">.</span>' : `<span class="etat ${['pret', 'bloque', 'a_verifier', 'a_verifier', 'pret'][i]}">${['Prête', 'Bloquée', 'À vérifier', 'À vérifier', 'Prête'][i]}</span>`);
  return `<div class="mini"><div class="tete"><span class="logo" style="width:22px;height:22px;border-radius:6px"><span style="font-size:12px;font-weight:600">S</span></span>${m.etape === 2 ? 'Vérification par pays' : 'Commandes importées'}<span class="espace"></span><span class="faint mono" style="font-size:11px">${m.etape === 0 ? 'CSV' : m.etape === 1 ? 'lecture' : 'règles'}</span></div>
    ${rangs.map((r, i) => `<div class="ligne apparait" style="animation-delay:${i * 70}ms"><div style="display:flex;gap:10px;align-items:center;min-width:0">${vignette({ sku: r[0], teinte: ['sable', 'corail', 'lavande', 'peche', 'menthe'][i], image: DEMO_IMAGES.has(r[0]) ? `/data/produits/${r[0].toLowerCase()}.svg` : null }, 'petite')}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r[1])}</span></div>${droite(i)}</div>`).join('')}</div>`;
}

function etape0() {
  return `<div class="sur">Importer des commandes</div><h2>D'où viennent vos commandes ? <span class="gris">Un export suffit : Stamped lit les colonnes de Shopify, d'Etsy ou d'un tableur.</span></h2>
    <div class="sources-import">${SOURCES.map((s) => `<button class="src-import ${m.source === s.id ? 'choisi' : ''}" data-source="${s.id}">${ic(s.ic)}<b>${esc(s.titre)}</b><small>${esc(s.sous)}</small></button>`).join('')}</div>
    <p class="faint" style="font-size:12.5px;margin-top:14px">${ic('info')} Synchronisation continue par l'API Shopify : prochaine étape. Pour la démonstration, un flux de commandes simulées imite cet arrivage en continu.</p>`;
}
function etape1() {
  if (m.source === 'demo') return `<div class="sur">Boutique de démonstration</div><h2>Une boutique fictive, <span class="gris">huit produits vendus de Chine et du Vietnam vers douze pays.</span></h2><p class="muted" style="margin-top:14px">La station d'accueil USB-C rejoue une réponse réelle de la Cleo Legal API, enregistrée le 4 octobre 2026. Sans clé d'API, les autres produits utilisent des réponses illustratives, signalées comme telles. Avec la clé, chaque produit est classé en direct.</p>${apercu()}`;
  return `<div class="sur">Fichier ${esc(SOURCES.find((s) => s.id === m.source).titre)}</div><h2>Déposez l'export. <span class="gris">Il est lu dans ce navigateur, ligne par ligne.</span></h2>
    <label class="depot" id="depot"><input type="file" accept=".csv,text/csv" id="fichier" class="sr">${ic('import')}<div><b>${m.nomFichier ? esc(m.nomFichier) : 'Choisir un fichier CSV'}</b> ou le glisser ici</div></label>
    <div class="champ"><label for="origine">Pays d'origine des produits <small class="faint">(l'export de commandes ne le contient pas)</small></label><select class="saisie" id="origine">${['CN', 'VN', 'IN', 'FR', 'DE', 'US', 'MX'].map((c) => `<option value="${c}" ${m.origine === c ? 'selected' : ''}>${esc(PAYS[c])}</option>`).join('')}</select></div>
    ${m.resultat ? (m.resultat.erreur ? `<p style="color:var(--bad);margin-top:14px">${esc(m.resultat.erreur)}</p>` : apercu()) : ''}`;
}
function apercu() {
  const r = m.resultat;
  if (!r || !r.lignes) return '';
  const pays = new Set(r.lignes.map((l) => l.pays)), cmd = new Set(r.lignes.map((l) => l.commande)), prod = new Set(r.lignes.map((l) => l.sku));
  return `<div class="apercu"><div><b data-compte="${cmd.size}">${cmd.size}</b><span>commandes · ${r.lignes.length} lignes</span></div><div><b data-compte="${prod.size}">${prod.size}</b><span>produits à classer</span></div><div><b data-compte="${pays.size}">${pays.size}</b><span>pays de livraison</span></div></div>
    ${r.ecartees.length ? `<p class="muted" style="margin-top:10px;font-size:12.5px">${pluriel(r.ecartees.length, 'ligne écartée', 'lignes écartées')} : ${esc(r.ecartees.slice(0, 3).map((e) => `ligne ${e.rang}, ${e.raison}`).join(' ; '))}${r.ecartees.length > 3 ? '…' : ''}</p>` : ''}
    <p class="faint" style="margin-top:10px;font-size:12.5px">${esc([...pays].map(nomPays).join(', '))}</p>`;
}
function etape2() {
  return `<div class="sur">Vérification</div><h2>Tout reste au même endroit. <span class="gris">Le classement, la vérification par pays, les questions et le journal vivent dans un même dossier.</span></h2>
    <ul class="muted" style="margin:18px 0 0 18px;display:flex;flex-direction:column;gap:8px"><li>L'agent classe chaque produit une fois, sur la Cleo Legal API.</li><li>Les règles de chaque pays s'appliquent au code retenu : marquages, certificats, droits et échéances.</li><li>Ce qu'il ne peut pas trancher devient une question, que vous signez.</li></ul>`;
}

function rendre() {
  const pret = m.etape === 0 ? Boolean(m.source) : m.etape === 1 ? m.source === 'demo' || (m.resultat && m.resultat.lignes && m.resultat.lignes.length) : true;
  const corps = [etape0, etape1, etape2][m.etape]();
  m.el.innerHTML = `<div class="modale" role="dialog" aria-modal="true" aria-label="Importer des commandes"><div class="modale-visuel">${visuel()}</div>
    <div class="modale-texte"><div style="display:flex;align-items:center"><span style="flex:1"></span><div class="etapes">${[0, 1, 2].map((i) => `<i class="${i === m.etape ? 'on' : ''}"></i>`).join('')}</div><span style="flex:1;display:flex;justify-content:flex-end"><button class="icobtn" data-fermer title="Fermer">${ic('fermer')}</button></span></div>
      <div class="contenu">${corps}</div>
      <div class="modale-pied"><button class="btn gris" data-retour ${m.etape === 0 ? 'style="visibility:hidden"' : ''}>Retour</button><button class="btn noir" data-suivant ${pret ? '' : 'disabled'}>${m.etape === 2 ? 'Lancer la vérification' : 'Suivant'}</button></div></div></div>`;
  brancherFichier();
}

function lireFichier(f) {
  if (!f) return;
  m.nomFichier = f.name;
  const rd = new FileReader();
  rd.onload = () => { m.texte = String(rd.result); m.resultat = versCommandes(m.texte, { origine: m.origine }); rendre(); };
  rd.onerror = () => { m.resultat = { erreur: 'fichier illisible' }; rendre(); };
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
  toast({ titre: 'Commandes importées', texte: "L'agent classe les produits ; la carte se remplit au fil des réponses.", niveau: 'pret', icone: 'agent' });
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
