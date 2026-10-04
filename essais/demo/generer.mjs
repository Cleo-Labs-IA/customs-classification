// Jeu de démonstration du cockpit : une boutique fictive (catalogue, commandes au format
// d'export Shopify) et l'état de départ du dossier.
//   node essais/demo/generer.mjs   →  public/data/demo-commandes.csv, public/data/demo.json
//
// Les réponses de classification du jeu :
// - DOCK-PRO : réponse réelle de la Cleo Legal API enregistrée le 04/10/2026
//   (essais/avec-fait-1.json), recopiée telle quelle avec son identifiant de requête ;
// - les autres : réponses illustratives, au format de l'API, marquées comme telles à
//   l'écran. Elles ne servent que lorsque la clé d'API est absente ; avec la clé, chaque
//   produit est classé en direct.
import { readFileSync, writeFileSync } from 'node:fs';

const ici = (p) => new URL(p, import.meta.url);
const DS_DOCK = 'Ports: 2 x USB-A 3.2 Gen 1 (5 Gbps data), 1 x USB-C data, 1 x HDMI 2.0 (4K 60 Hz video output), 1 x RJ45 Gigabit Ethernet. Power delivery pass-through up to 100 W to the host laptop. Aluminium housing. Net weight 310 g. Input 20 V.';

const PRODUITS = [
  { sku: 'DOCK-PRO', nom: "Station d'accueil USB-C 8-en-1", description: 'USB-C docking station for laptop', fiche_technique: DS_DOCK, origine: 'CN', prix: 89, teinte: 'ardoise' },
  { sku: 'CHG-65W', nom: 'Chargeur GaN USB-C 65 W', description: '65 W GaN USB-C wall charger for laptops and phones, input 100-240 V AC, output 5-20 V DC', origine: 'CN', prix: 39.9, teinte: 'sable' },
  { sku: 'PWR-20K', nom: 'Batterie externe 20 000 mAh', description: 'Portable power bank, 20000 mAh lithium-ion battery, USB-C PD 22.5 W output', origine: 'CN', prix: 34.9, teinte: 'corail' },
  { sku: 'BUDS-X', nom: 'Écouteurs sans fil Bluetooth', description: 'True wireless Bluetooth earbuds with microphone and charging case', origine: 'CN', prix: 49, teinte: 'lavande' },
  { sku: 'HDMI-2M', nom: 'Câble HDMI 2.1, 2 m', description: 'HDMI 2.1 cable, 2 m, fitted with connectors, 48 Gbps', origine: 'CN', prix: 12.9, teinte: 'menthe' },
  { sku: 'ROBO-DOG', nom: 'Chien robot interactif', description: 'Interactive robot dog toy, battery powered, barks and moves on motorized base', origine: 'CN', prix: 59, teinte: 'peche' },
  { sku: 'CLOCK-BRICK', nom: 'Horloge murale à construire', description: 'Buildable wall clock for kids, battery powered', origine: 'CN', prix: 44.9, teinte: 'ciel' },
  { sku: 'BOTTLE-750', nom: 'Gourde isotherme inox 750 ml', description: 'Stainless steel vacuum insulated water bottle, 750 ml', origine: 'VN', prix: 24.9, teinte: 'olive' },
];

for (const p of PRODUITS) p.image = `/data/produits/${p.sku.toLowerCase()}.svg`;

const DISCLAIMER = 'Illustrative response for the offline demonstration. Not issued by the Cleo Legal API.';
const cand = (code, en, confidence, rationale, set_aside_reason = null) => ({ code, system: 'hs6', title: { en }, confidence, rationale, set_aside_reason, source_version: 'HS2022' });
const ILLUSTRATIVES = {
  'CHG-65W': { status: 'classified', candidates: [cand('850440', 'Electrical static converters', 0.82, 'An AC to DC power supply that charges laptops and phones is a static converter of heading 8504.'), cand('850490', 'Parts of transformers and static converters', 0.04, 'Applies to parts only.', 'The product is a complete converter, not a part.')] },
  'PWR-20K': { status: 'classified', candidates: [cand('850760', 'Lithium-ion accumulators', 0.88, 'A portable power bank is a lithium-ion accumulator with charging circuitry; the battery gives it its essential character.')] },
  'BUDS-X': { status: 'classified', candidates: [cand('851830', 'Headphones and earphones, whether or not combined with a microphone, and sets consisting of a microphone and one or more loudspeakers', 0.86, 'Wireless earbuds with a microphone are earphones combined with a microphone.'), cand('851762', 'Machines for the reception, conversion and transmission or regeneration of voice, images or other data', 0.06, 'The Bluetooth link is ancillary to the sound function.', 'Note 3 to Section XVI: the principal function is sound reproduction.')] },
  'HDMI-2M': { status: 'classified', candidates: [cand('854442', 'Other electric conductors, for a voltage not exceeding 1 000 V, fitted with connectors', 0.9, 'An insulated cable fitted with HDMI connectors at both ends.')] },
  'ROBO-DOG': { status: 'classified', candidates: [cand('950300', 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls; other toys; reduced-size models; puzzles of all kinds', 0.84, 'A battery-powered robot dog designed for play is a toy of heading 9503.')] },
  'CLOCK-BRICK': {
    status: 'needs_information',
    candidates: [cand('950300', 'Other toys; puzzles of all kinds', 0.41, 'A construction set for children falls in heading 9503 when play is the main purpose.'), cand('910521', 'Wall clocks, electrically operated', 0.38, 'Once assembled, a battery-powered wall clock falls in heading 9105.')],
    questions: [{ fact: 'use', question: 'Is the product mainly a construction toy for children, or a working wall clock that happens to be assembled?', why: 'Heading 9503 covers toys and construction sets; heading 9105 covers clocks. The main purpose decides between them.' }],
  },
  'BOTTLE-750': { status: 'classified', candidates: [cand('961700', 'Vacuum flasks and other vacuum vessels, complete', 0.91, 'A double-walled vacuum insulated bottle is a vacuum flask of heading 9617.')] },
};
// Réponses illustratives après la question de l'horloge, selon la réponse choisie.
const SUITES = {
  'CLOCK-BRICK': [
    { libelle: 'Un jeu de construction pour enfants : l\'horloge est le résultat du jeu', faits: { use: 'construction toy for children, the clock is the result of the building activity' }, data: { status: 'classified', candidates: [cand('950300', 'Other toys; puzzles of all kinds', 0.79, 'Sold and used as a construction toy for children: heading 9503.')] } },
    { libelle: 'Une horloge murale fonctionnelle, livrée en pièces à assembler', faits: { use: 'working wall clock delivered in parts to assemble' }, data: { status: 'classified', candidates: [cand('910521', 'Wall clocks, electrically operated', 0.77, 'An unassembled article is classified as the assembled article (GRI 2(a)): a battery-powered wall clock.')] } },
  ],
};

// Pseudo-hasard reproductible.
let graine = 20261004;
const hasard = () => ((graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648);
const choisir = (t) => t[Math.floor(hasard() * t.length)];
const PAYS = [['FR', 8], ['US', 7], ['DE', 5], ['GB', 4], ['JP', 2], ['AU', 2], ['IT', 3], ['ES', 3], ['NL', 3], ['CA', 3], ['KR', 2], ['CH', 2]];
// Commandes écrites à la main pour que la démonstration raconte quelque chose :
// la batterie externe vers le Japon (sans marquage PSE), vers l'Australie et les
// États-Unis ; l'électronique chinoise vers les États-Unis (simulation de hausse).
const SCENARIO = [['PWR-20K', 'JP', 'Yuki T.'], ['PWR-20K', 'JP', 'Haruto S.'], ['PWR-20K', 'AU', 'Olivia H.'], ['PWR-20K', 'AU', 'Jack M.'], ['PWR-20K', 'US', 'Ava C.'],
  ['BUDS-X', 'US', 'Ben W.'], ['BUDS-X', 'US', 'Noah S.'], ['CHG-65W', 'US', 'Mia K.'], ['DOCK-PRO', 'US', 'Liam O.'], ['ROBO-DOG', 'AU', 'Chloé V.'], ['BUDS-X', 'DE', 'Lucas F.']];
const NOMS = ['Camille D.', 'Léa M.', 'Hugo B.', 'Emma R.', 'Jules P.', 'Noah S.', 'Mia K.', 'Liam O.', 'Yuki T.', 'Sofia G.', 'Ben W.', 'Chloé V.', 'Arjun N.', 'Lucas F.', 'Ava C.', 'Min-jun L.', 'Olivia H.', 'Matteo R.'];

function commandes() {
  const rangs = [];
  let n = 1041;
  for (const [pays, combien] of PAYS) {
    for (let i = 0; i < combien; i++) {
      const lignes = hasard() < 0.25 ? 2 : 1;
      const deja = hasard() < 0.12;
      const jour = 1 + Math.floor(hasard() * 3), heure = 8 + Math.floor(hasard() * 12), minute = Math.floor(hasard() * 60);
      const date = `2026-10-0${jour} ${String(heure).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00 +0200`;
      const vus = new Set();
      for (let k = 0; k < lignes; k++) {
        let p = choisir(PRODUITS);
        while (vus.has(p.sku)) p = choisir(PRODUITS);
        vus.add(p.sku);
        const q = hasard() < 0.8 ? 1 : 2;
        rangs.push({ name: '#' + n, date: k ? '' : date, devise: k ? '' : 'EUR', statut: k ? '' : (deja ? 'fulfilled' : 'unfulfilled'), q, p, client: k ? '' : choisir(NOMS), pays: k ? '' : pays });
      }
      n++;
    }
  }
  for (const [sku, pays, client] of SCENARIO) {
    const p = PRODUITS.find((x) => x.sku === sku), heure = 9 + Math.floor(hasard() * 10);
    rangs.push({ name: '#' + n++, date: `2026-10-03 ${heure}:${String(Math.floor(hasard() * 60)).padStart(2, '0')}:00 +0200`, devise: 'EUR', statut: 'unfulfilled', q: 1, p, client, pays });
  }
  return rangs;
}

const champ = (x) => (/[",\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : String(x));
const entete = ['Name', 'Created at', 'Currency', 'Fulfillment Status', 'Lineitem quantity', 'Lineitem name', 'Lineitem price', 'Lineitem sku', 'Shipping Name', 'Shipping Country'];
const csv = [entete.join(','), ...commandes().map((r) => [r.name, r.date, r.devise, r.statut, r.q, r.p.nom, r.p.prix.toFixed(2), r.p.sku, r.client, r.pays].map(champ).join(','))].join('\n') + '\n';
writeFileSync(ici('../../public/data/demo-commandes.csv'), csv);

const enregistree = JSON.parse(readFileSync(ici('../avec-fait-1.json'), 'utf8'));
const reponses = {
  'DOCK-PRO': { source: 'enregistree', enregistree_le: '2026-10-04', request_id: enregistree.request_id, secondes: enregistree.seconds, envoye: enregistree.sent, data: enregistree.body.data },
  ...Object.fromEntries(Object.entries(ILLUSTRATIVES).map(([sku, d]) => [sku, { source: 'illustrative', data: { item_id: sku, questions: [], coverage: { hint: 'Illustrative response: HS6 only.' }, advisory_disclaimer: DISCLAIMER, ...d } }])),
};
const par = 'Équipe démo', le = '2026-10-03T16:20:00+02:00';
const oui = (motif) => ({ reponse: true, par, le, motif }), non = (motif) => ({ reponse: false, par, le, motif });
const depart = {
  libelle: 'État de départ de la démonstration : codes et pièces renseignés la veille par l\'équipe démo.',
  validations: Object.fromEntries([['HDMI-2M', '854442'], ['CHG-65W', '850440'], ['BOTTLE-750', '961700'], ['ROBO-DOG', '950300'], ['PWR-20K', '850760']].map(([sku, hs6]) => [sku, { hs6, par, le, motif: 'Code proposé par le moteur, relu et validé.' }])),
  attestations: {
    ...Object.fromEntries(['DOCK-PRO', 'CHG-65W', 'PWR-20K', 'HDMI-2M', 'ROBO-DOG', 'CLOCK-BRICK', 'BOTTLE-750'].map((sku) => [`${sku}|ue-gpsr`, oui('Opérateur responsable : Stamped Démo SAS, Paris, indiqué sur l\'emballage.')])),
    'CHG-65W|jp-pse': oui('Marquage PSE (losange) et importateur déclaré au METI.'),
    'PWR-20K|jp-pse': non('Le fournisseur n\'a pas de certificat PSE pour ce modèle.'),
    'ROBO-DOG|ue-jouets': oui('Déclaration UE de conformité EN 71 du fournisseur, au dossier.'),
    'BUDS-X|us-fcc': oui('FCC ID imprimé sur le boîtier de charge.'),
  },
};
writeFileSync(ici('../../public/data/demo.json'), JSON.stringify({
  boutique: { nom: 'Boutique démo', plateforme: 'Shopify', devise: 'EUR', origine: 'CN' },
  produits: PRODUITS, reponses, suites: SUITES, depart,
}, null, 1));
// Réponses réelles de la Cleo Legal API enregistrées le 04/10/2026 (essais/*.json) :
// sans clé d'API, le dossier de classification les rejoue quand les pièces envoyées
// sont exactement les mêmes, et le dit.
const ENREGISTREES = ['reformulation-1', 'reformulation-2', 'reformulation-3', 'avec-fait-1', 'avec-fait-2', 'contradiction'].map((nom) => {
  const r = JSON.parse(readFileSync(ici(`../${nom}.json`), 'utf8'));
  return { essai: nom, enregistree_le: '2026-10-04', request_id: r.request_id, secondes: r.seconds, envoye: r.sent, data: r.body.data };
});
writeFileSync(ici('../../public/data/enregistrees.json'), JSON.stringify(ENREGISTREES));
console.log('commandes, catalogue et réponses enregistrées écrits');
