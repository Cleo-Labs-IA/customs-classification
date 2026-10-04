// Boutique par défaut du cockpit : les DEUX produits réels de la démonstration (un chargeur
// USB-C 70 W et un ordinateur portable), tels que lus sur leurs étiquettes photographiées
// (essais/monde/produits.json), et des commandes au format d'export Shopify.
//   node essais/demo/generer.mjs   →  public/data/demo-commandes.csv, public/data/demo.json
//
// Rien n'est illustratif : sans clé d'API, chaque produit rejoue la réponse réelle de la Cleo
// Legal API enregistrée le 04/10/2026 (essais/demo/enr-<SKU>.json), avec son identifiant de
// requête. Aucun code n'est validé au départ : la validation se fait pendant la démonstration.
import { readFileSync, writeFileSync } from 'node:fs';

const ici = (p) => new URL(p, import.meta.url);
const lus = JSON.parse(readFileSync(ici('../monde/produits.json'), 'utf8'));
const PRODUITS = lus.map((p) => ({
  sku: p.sku, nom: p.nom, description: p.description, fiche_technique: p.etiquette.join('\n'), origine: p.origine, prix: p.prix, teinte: p.teinte,
  image: `/data/produits/${p.sku.toLowerCase()}.jpg`, photo: p.photo, etiquette: p.etiquette, marques_vues: p.marques_vues, a_confirmer: p.a_confirmer, criteres: p.criteres,
}));

// Pseudo-hasard reproductible.
let graine = 20261004;
const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
const choisir = (t) => t[Math.floor(hasard() * t.length)];
const PAYS = [['FR', 5], ['US', 5], ['DE', 3], ['GB', 3], ['JP', 3], ['AU', 2], ['IT', 2], ['ES', 2], ['NL', 2], ['CA', 2], ['KR', 2], ['CH', 2], ['MX', 2], ['NZ', 1]];
const NOMS = ['Camille D.', 'Lea M.', 'Hugo B.', 'Emma R.', 'Jules P.', 'Noah S.', 'Mia K.', 'Liam O.', 'Yuki T.', 'Sofia G.', 'Ben W.', 'Arjun N.', 'Lucas F.', 'Ava C.', 'Min-jun L.', 'Olivia H.', 'Matteo R.'];

function commandes() {
  const rangs = [];
  let n = 1041;
  for (const [pays, combien] of PAYS) {
    for (let i = 0; i < combien; i++) {
      const deux = hasard() < 0.3, deja = hasard() < 0.12;
      const jour = 1 + Math.floor(hasard() * 3), heure = 8 + Math.floor(hasard() * 12), minute = Math.floor(hasard() * 60);
      const date = `2026-10-0${jour} ${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00 +0200`;
      const premier = PRODUITS[(i + (pays.charCodeAt(0) % 2)) % 2], articles = deux ? [premier, PRODUITS.find((p) => p !== premier)] : [premier];
      articles.forEach((p, k) => rangs.push({ name: '#' + n, date: k ? '' : date, devise: k ? '' : 'EUR', statut: k ? '' : (deja ? 'fulfilled' : 'unfulfilled'), q: 1, p, client: k ? '' : choisir(NOMS), pays: k ? '' : pays }));
      n++;
    }
  }
  return rangs;
}

const champ = (x) => (/[",\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : String(x));
const entete = ['Name', 'Created at', 'Currency', 'Fulfillment Status', 'Lineitem quantity', 'Lineitem name', 'Lineitem price', 'Lineitem sku', 'Shipping Name', 'Shipping Country'];
const csv = [entete.join(','), ...commandes().map((r) => [r.name, r.date, r.devise, r.statut, r.q, r.p.nom, r.p.prix.toFixed(2), r.p.sku, r.client, r.pays].map(champ).join(','))].join('\n') + '\n';
writeFileSync(ici('../../public/data/demo-commandes.csv'), csv);

const reponses = Object.fromEntries(PRODUITS.map((p) => {
  const e = JSON.parse(readFileSync(ici(`./enr-${p.sku}.json`), 'utf8'));
  if (e.sent.description !== p.description) throw new Error(`${p.sku} : la réponse enregistrée ne porte pas sur la description actuelle, à réenregistrer`);
  return [p.sku, { source: 'enregistree', enregistree_le: '2026-10-04', request_id: e.request_id, secondes: e.seconds, envoye: e.sent, data: e.body.data }];
}));
writeFileSync(ici('../../public/data/demo.json'), JSON.stringify({
  boutique: { nom: 'Demo store', plateforme: 'Shopify', devise: 'EUR', origine: 'CN' },
  produits: PRODUITS, reponses, suites: {},
  depart: { libelle: 'Starting state: no code validated yet. The two products are read from their photographed labels.', validations: {}, attestations: {} },
}, null, 1));

// Réponses réelles enregistrées le 04/10/2026 pour le dossier de classification hors ligne.
const ENREGISTREES = [...['reformulation-1', 'reformulation-2', 'reformulation-3', 'avec-fait-1', 'avec-fait-2', 'contradiction'].map((nom) => [nom, JSON.parse(readFileSync(ici(`../${nom}.json`), 'utf8'))]),
  ...PRODUITS.map((p) => [`store-${p.sku}`, JSON.parse(readFileSync(ici(`./enr-${p.sku}.json`), 'utf8'))])]
  .map(([essai, r]) => ({ essai, enregistree_le: '2026-10-04', request_id: r.request_id, secondes: r.seconds, envoye: r.sent, data: r.body.data }));
writeFileSync(ici('../../public/data/enregistrees.json'), JSON.stringify(ENREGISTREES));
console.log(`${PRODUITS.length} products, ${csv.trim().split('\n').length - 1} order lines, ${ENREGISTREES.length} recorded responses written`);
