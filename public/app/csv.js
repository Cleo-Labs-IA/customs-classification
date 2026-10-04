// Import des commandes : un export CSV de Shopify, d'Etsy, ou un fichier à colonnes
// libres. Rend des lignes de commande normalisées et la liste des lignes écartées avec
// leur raison. Rien n'est deviné : une ligne sans produit, sans pays de livraison
// reconnu ou sans quantité lisible est écartée et comptée.

// Lecture CSV (RFC 4180) : guillemets, guillemets doublés, retours à la ligne dans un
// champ, séparateur virgule ou point-virgule (détecté sur la première ligne), BOM.
export function lireCsv(texte) {
  const s = String(texte || '').replace(/^﻿/, '');
  const premiere = s.slice(0, s.indexOf('\n') === -1 ? s.length : s.indexOf('\n'));
  const sep = (premiere.match(/;/g) || []).length > (premiere.match(/,/g) || []).length ? ';' : ',';
  const lignes = [];
  let champ = '', ligne = [], guillemets = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (guillemets) {
      if (c === '"' && s[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  ligne.push(champ);
  if (ligne.some((x) => x !== '')) lignes.push(ligne);
  return lignes;
}

const norme = (h) => String(h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Colonnes reconnues, par format. La première colonne présente l'emporte.
const COLONNES = {
  shopify: { commande: ['name'], date: ['created at'], sku: ['lineitem sku'], produit: ['lineitem name'], quantite: ['lineitem quantity'], prix: ['lineitem price'], devise: ['currency'], pays: ['shipping country'], client: ['shipping name', 'billing name'], expedition: ['fulfillment status', 'lineitem fulfillment status'] },
  etsy: { commande: ['order id'], date: ['sale date'], sku: ['sku'], produit: ['item name'], quantite: ['quantity'], prix: ['price'], devise: ['currency'], pays: ['ship country'], client: ['ship name', 'buyer'], expedition: ['date shipped'] },
  generique: { commande: ['commande', 'order', 'order id', 'order number', 'numero de commande'], date: ['date', 'created at', 'order date'], sku: ['sku', 'reference', 'ref'], produit: ['produit', 'product', 'description', 'item', 'title', 'titre'], quantite: ['quantite', 'quantity', 'qty', 'qte'], prix: ['prix', 'price', 'prix unitaire', 'unit price'], devise: ['devise', 'currency'], pays: ['pays', 'country', 'destination', 'pays de livraison', 'shipping country'], origine: ['origine', 'origin', 'pays d origine', 'country of origin'], client: ['client', 'customer', 'nom'], expedition: ['statut', 'expedition', 'fulfillment status'] },
};

export function detecterFormat(entetes) {
  const h = new Set(entetes.map(norme));
  if (h.has('lineitem name') && h.has('name')) return 'shopify';
  if (h.has('item name') && (h.has('ship country') || h.has('order id'))) return 'etsy';
  return 'generique';
}

function indexColonnes(entetes, format) {
  const h = entetes.map(norme), out = {};
  for (const [cle, alias] of Object.entries(COLONNES[format])) {
    const i = alias.map((a) => h.indexOf(a)).find((x) => x >= 0);
    if (i !== undefined) out[cle] = i;
  }
  return out;
}

const PAYS = {
  france: 'FR', allemagne: 'DE', germany: 'DE', espagne: 'ES', spain: 'ES', italie: 'IT', italy: 'IT', 'pays bas': 'NL', netherlands: 'NL', 'the netherlands': 'NL', belgique: 'BE', belgium: 'BE',
  'royaume uni': 'GB', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB', 'etats unis': 'US', 'united states': 'US', usa: 'US', 'united states of america': 'US', canada: 'CA', japon: 'JP', japan: 'JP',
  australie: 'AU', australia: 'AU', suisse: 'CH', switzerland: 'CH', 'coree du sud': 'KR', 'south korea': 'KR', 'korea republic of': 'KR', chine: 'CN', china: 'CN', vietnam: 'VN', 'viet nam': 'VN', inde: 'IN', india: 'IN',
  mexique: 'MX', mexico: 'MX', bresil: 'BR', brazil: 'BR', irlande: 'IE', ireland: 'IE', portugal: 'PT', autriche: 'AT', austria: 'AT', suede: 'SE', sweden: 'SE', danemark: 'DK', denmark: 'DK', norvege: 'NO', norway: 'NO',
  finlande: 'FI', finland: 'FI', pologne: 'PL', poland: 'PL', 'nouvelle zelande': 'NZ', 'new zealand': 'NZ', singapour: 'SG', singapore: 'SG', 'emirats arabes unis': 'AE', 'united arab emirates': 'AE', luxembourg: 'LU', grece: 'GR', greece: 'GR',
};
export function codePays(x) {
  const s = String(x || '').trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return PAYS[norme(s)] || null;
}

const nombre = (x) => { const n = parseFloat(String(x ?? '').replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const versSku = (nom) => String(nom || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
function expedie(valeur, format) {
  const v = norme(valeur);
  if (format === 'etsy') return v !== '';
  return ['fulfilled', 'expediee', 'expedie', 'shipped', 'livree'].includes(v);
}

// Une ligne de commande normalisée, ou la raison pour laquelle elle est écartée.
function versLigne(cellules, idx, format, precedente, defauts) {
  const lire = (k) => (idx[k] === undefined ? '' : String(cellules[idx[k]] ?? '').trim());
  const commande = lire('commande') || (precedente && precedente.commande);
  // Shopify ne répète pas les champs de la commande sur ses lignes suivantes.
  const herite = precedente && precedente.commande === commande;
  const produit = lire('produit');
  if (!produit) return { raison: 'ligne sans produit' };
  const pays = codePays(lire('pays')) || (herite ? precedente.pays : null);
  if (!pays) return { raison: `pays de livraison non reconnu (« ${lire('pays') || 'vide'} »)` };
  const quantite = nombre(lire('quantite') || '1');
  if (!(quantite > 0)) return { raison: 'quantité illisible' };
  const etat = lire('expedition') || (herite ? precedente.etatBrut : '');
  return {
    ligne: {
      commande: commande || '—', date: lire('date') || (herite ? precedente.date : ''), sku: lire('sku') || versSku(produit), produit, quantite,
      prixUnitaire: nombre(lire('prix')) ?? 0, devise: (lire('devise') || (herite ? precedente.devise : '') || defauts.devise).toUpperCase(), pays,
      origine: codePays(lire('origine')) || defauts.origine, client: lire('client') || (herite ? precedente.client : ''),
      expedition: expedie(etat, format) ? 'expediee' : 'a_expedier', etatBrut: etat,
    },
  };
}

export function versCommandes(texte, { origine = 'CN', devise = 'EUR' } = {}) {
  const [entetes, ...rangs] = lireCsv(texte);
  if (!entetes) return { format: null, lignes: [], ecartees: [], erreur: 'fichier vide' };
  const format = detecterFormat(entetes), idx = indexColonnes(entetes, format);
  if (idx.produit === undefined) return { format, lignes: [], ecartees: [], erreur: 'aucune colonne de produit reconnue' };
  if (idx.pays === undefined) return { format, lignes: [], ecartees: [], erreur: 'aucune colonne de pays de livraison reconnue' };
  const lignes = [], ecartees = [];
  let prec = null;
  rangs.forEach((cellules, i) => {
    const r = versLigne(cellules, idx, format, prec, { origine, devise });
    if (r.raison) { ecartees.push({ rang: i + 2, raison: r.raison }); return; }
    lignes.push(r.ligne); prec = r.ligne;
  });
  return { format, lignes: lignes.map(({ etatBrut, ...l }) => l), ecartees };
}
