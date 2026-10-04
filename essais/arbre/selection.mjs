#!/usr/bin/env node
// Sélection déterministe des décisions de classement « alimentations, chargeurs, docks, hubs, adaptateurs, câbles ».
// Entrées (locales, jamais re-téléchargées) : règlements de classement UE + rulings CBP CROSS chapitres 84/85.
// Sorties : candidats.json + lots/lot-NN.json (22 décisions max par lot, UE et US séparés).
// Usage : node selection.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SRC = '/Users/naomiehalioua/outputs/customs-data-electronique-2026-10-04';
const F_EU = path.join(SRC, 'eu-reglements-classement.jsonl');
const F_US = path.join(SRC, 'cbp-textes-84-85.jsonl');
const MAX_LOT = 22;
const MAX_TEXTE = 7000;
const PART_MAX_HS6_US = 0.30;
const COUPE = '\n[...]\n';

function assert(cond, msg) { if (!cond) { console.error('ECHEC VERIFICATION : ' + msg); process.exit(1); } }

// Lecture tolérante : le fichier CBP peut encore grossir, une dernière ligne tronquée est ignorée.
function lireJsonl(f) {
  const lignes = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
  const out = []; let rejets = 0;
  for (const l of lignes) { try { out.push(JSON.parse(l)); } catch { rejets++; } }
  return { lignes: out, rejets };
}

// Registre d'exclusions : une raison d'une ligne par identifiant.
const EXCLU = new Map();
function ex(raison, ...ids) { for (const id of ids) { assert(!EXCLU.has(id), 'exclusion en double ' + id); EXCLU.set(id, raison); } }

// ───────────────────────── UE ─────────────────────────
// Règle mots-clés : description dans le périmètre ET code NC dans une position concurrente.
const EU_MOTS = /charger|charging|power supply|adapt[eo]r|rectifier|static converter|power bank|docking|port replicator|\bhub\b|dongle|\bcables?\b|\bUSB\b|HDMI|connectors?\b/i;
const EU_POSITIONS = /^(8471|8473|8504|8507|851762|8536|8537|854370|8544)/;

ex('Rallonge multiprise 220 V : distribution de courant secteur, pas un accessoire d\'appareil électronique', '32010R0727#1');
ex('Bloc de 27 prises pour baie (PDU) : distribution de courant secteur, hors périmètre', '32016R1958#1');
ex('Boîte de jonction photovoltaïque : transport d\'électricité de panneau solaire, hors périmètre', '32015R2315#1');
ex('Enrouleur de câble à intégrer dans un aspirateur : électroménager, hors périmètre', '32020R1702#1');
ex('Faisceau de câbles pour kit mains libres automobile (8544 30) : câblage de véhicule, hors périmètre', '32022R2076#1');
ex('Connecteurs de câble à clip génériques en cuivre : composant de raccordement de fils, pas un accessoire d\'ordinateur ou de téléphone', '32018R2041#1');
ex('Cigarette électronique en assortiment (le chargeur n\'est qu\'un élément accessoire de l\'ensemble)', '32008R1143#1');
ex('Multi-commutateur satellite (signaux LNB) : distribution de signaux TV, hors périmètre', '32012R1089#1');
ex('Liseuse électronique : appareil autonome, pas un accessoire d\'alimentation ou de connexion', '32011R0763#1');
ex('Platine DJ avec lecteur CD : appareil audio autonome', '32014R0311#2');
ex('Interface audio / table de mixage : appareil audio autonome', '32016R0663#1');
ex('Détecteur infrarouge passif (8536 50) : interrupteur, hors périmètre', '32012R1123#1');
ex('Écran tactile de commande électrique (8537) : commande industrielle, hors périmètre', '32014R0115#1');
ex('Ordinateur de poche (8471 30) : machine de traitement de l\'information elle-même, pas un accessoire', '32015R1800#1');
ex('Boîtier de fibres optiques avec connecteurs (8536 70) : infrastructure réseau optique, hors périmètre', '32019R0924#1');
ex('Unité de commande de phares xénon (8504 40) : équipement automobile, pas une alimentation d\'appareil électronique', '32016R1957#1');
ex('Boîte à monnaie électronique (8470) : sans rapport, faux positif mot-clé', '32015R2316#1');

// ───────────────────────── US ─────────────────────────
// Règle mots-clés : sujet dans le périmètre ET position SH concurrente ; ou texte très spécifique ET sous-position concurrente.
const US_SUJET = /charger|converter|charging|power suppl|adapt[eo]r|power bank|powerbank|power station|power pack|battery pack|docking|port replicator|\bhubs?\b|dongle|\bcables?\b|\busb\b|\bkvm\b|keyboard, video, and mouse|modem|hand warmer/i;
const US_POSITIONS = /^(8471|8473|8504|8506|8507|8517|8536|8537|8543|8544)/;
const US_TEXTE = /docking functionality|usb-c adapter cable|two USB-C sockets|power bank|portable power station/i;
const US_TEXTE_POS = /^(850440|850760|847180|847330|854370)/;

// Retenus après lecture de chaque description (liste revue à la main, le 2026-10-04).
const US_RETENUS = new Set([
  // HQ (raisonnement développé)
  'H273383', 'H287462', 'H298118', 'H319416', 'H322074', 'H328693', 'H337673', 'H341609', 'H342570', 'H343160', 'H348342',
  // NY
  'N281995', 'N282038', 'N282039', 'N282047', 'N284052', 'N284202', 'N284888', 'N284892', 'N285505', 'N288408', 'N289786',
  'N290026', 'N290028', 'N290926', 'N292574', 'N296103', 'N296304', 'N296307', 'N298534', 'N298750', 'N298752',
  'N299351', 'N300708', 'N300797', 'N301141', 'N301143', 'N303514', 'N303914', 'N304098', 'N304253', 'N304568',
  'N304573', 'N304715', 'N305211', 'N305600', 'N305608', 'N305648', 'N305957', 'N305975', 'N306782', 'N306841',
  'N307014', 'N307161', 'N307285', 'N308133', 'N310490', 'N315544', 'N316909', 'N319727', 'N319801', 'N323399',
  'N325987', 'N328742', 'N332683', 'N334094', 'N334999', 'N339123', 'N342905', 'N343619', 'N346959', 'N349433',
  'N349898', 'N352984', 'N356371', 'N356452', 'N356502', 'N356789', 'N359212', 'N359291', 'N360577', 'N362423',
  'N363538',
]);

ex('Câbles de monitorage patient (dispositif médical), hors périmètre', 'H127136');
ex('Répéteurs / extenseurs Wi-Fi, CPL et maillage : équipements réseau autonomes, pas des adaptateurs de connexion', 'H306942', 'H307923', 'H313242', 'N303238');
ex('Câble de transport d\'énergie moyenne tension, hors périmètre', 'H330938');
ex('Quasi-doublon de H342570 (mêmes chargeurs voiture et secteur, même importateur, même analyse)', 'H342571', 'H344006');
ex('Batterie et chargeur d\'outillage électroportatif : pas un appareil électronique du périmètre', 'H342925', 'N340642');
ex('Câbles détecteurs coaxiaux enterrés (détection d\'intrusion), hors périmètre', 'N286948');
ex('Capot inox d\'un chargeur de batterie automobile : pièce de tôlerie, pas un chargeur', 'N285628');
ex('Rallonges 12 V d\'allume-cigare : câblage de véhicule, hors périmètre', 'N289330');
ex('Bornier à vis pour câble : composant de raccordement industriel', 'N292404');
ex('Quasi-doublons de N298750 (câbles USB/LVDS montés dans un véhicule, même requérant)', 'N298747', 'N298748');
ex('Quasi-doublons de N298752 (boîtier AUX/USB de console automobile, même requérant, même analyse)', 'N298753', 'N298754');
ex('Système d\'alimentation 10 à 19 kW pour site télécom : énergie d\'infrastructure, pas une alimentation d\'appareil', 'N300768');
ex('Faisceaux de câbles de machines agricoles, hors périmètre', 'N301582');
ex('Câble coaxial d\'accéléromètre piézoélectrique (instrumentation), hors périmètre', 'N301628');
ex('Câble de charge 12 V propre à un concentrateur d\'oxygène : câble de dispositif médical, hors périmètre des câbles ordinateur / téléphone', 'N304597');
ex('Lecteur de piste magnétique : unité d\'entrée, pas un accessoire d\'alimentation ou de connexion', 'N304629');
ex('Alimentation 800 W intégrée de lit d\'hôpital : équipement médical lourd, hors périmètre', 'N305510');
ex('Chargeurs de batteries de dispositifs médicaux : quasi-doublons de N304715 (même requérant, même analyse)', 'N305616', 'N305620', 'N305640', 'N306125', 'N306126');
ex('Cadre photo à recharge sans fil : quasi-doublon de N305957 (même requérant, même jour)', 'N305959');
ex('Chargeurs de batteries de fauteuil roulant : pas un appareil électronique du périmètre', 'N306110');
ex('Câbles coaxiaux d\'antenne ou de capteurs automobiles (CB, radar, caméras), hors périmètre', 'N305623', 'N306740', 'N318686');
ex('Alimentations médicales Respironics : quasi-doublons de N308133 (même requérant, même analyse 8504 contre 9019)', 'N308577', 'N311388', 'N311390', 'N314355', 'N314440', 'N315436', 'N316160', 'N316735', 'N317006', 'N317690');
ex('Câbles internes ou propres à un ventilateur médical ou à un appareil PPC, hors périmètre des câbles ordinateur / téléphone', 'N308578', 'N312961', 'N312963', 'N312967', 'N312968', 'N312969', 'N312970', 'N313684', 'N314413', 'N314785', 'N315081', 'N315180', 'N316902', 'N316908', 'N318039', 'N319769');
ex('Blocs batterie propres à un dispositif médical ou à un appareil (batterie interne, pas une batterie externe de recharge)', 'N308582', 'N309284', 'N310725', 'N311393', 'N312651', 'N316097', 'N347094', 'N351814', 'N351853', 'N351927', 'N351928', 'N352685');
ex('Prise extérieure à disjoncteur différentiel avec interrupteur d\'éclairage : appareillage d\'installation, hors périmètre', 'N317618');
ex('Alimentation de guirlande lumineuse LED : éclairage, pas un appareil électronique du périmètre', 'N322021');
ex('Convertisseur continu-continu 1200 V d\'une borne de recharge de véhicule électrique, hors périmètre', 'N323675');
ex('Station Yeti : quasi-doublon de N323399 (même requérant, même jour, même gamme)', 'N323400');
ex('Bornes et stations de recharge de véhicules électriques, hors périmètre', 'N313573', 'N324397', 'N346832');
ex('Câbles de distribution d\'énergie en aluminium (bâtiment / réseau), hors périmètre', 'N326084', 'N332833');
ex('Passerelle Wi-Fi d\'un programmateur d\'arrosage : équipement réseau, pas un adaptateur de connexion', 'N328617');
ex('Faisceau de trois fils à cosse et fiche DC : description trop mince pour savoir à quoi sert le produit', 'N334187');
ex('Câble interne à deux fils d\'un casque d\'aviation (alimentation par pile) : câblage interne, hors périmètre', 'N346114');
ex('Driver LED 800 W d\'éclairage sportif, hors périmètre', 'N349537');
ex('Bloc batterie de fauteuil ou canapé inclinable motorisé, hors périmètre', 'N350116');
ex('Convertisseur analogique-numérique de chromatographe (instrument de laboratoire), hors périmètre', 'N351244');
ex('Capteur de vitesse de roue avec câble (automobile), hors périmètre', 'N353069');
ex('Câbles de casques d\'aviation vers l\'intercom ou internes au casque (ni ordinateur ni téléphone)', 'N355203', 'N356776', 'N356777', 'N356780', 'N357418', 'N357419', 'N357420', 'N357423', 'N357425', 'N357426', 'N359367');
ex('Alimentation 760 W avec refroidissement d\'un système laser, hors périmètre', 'N355229');
ex('Cordon secteur avec disjoncteur de surintensité : distribution de courant, hors périmètre', 'N356962');
ex('Cache de port USB en plastique d\'un casque d\'aviation : pièce moulée, pas un accessoire de connexion', 'N356495');
ex('Passerelle sans fil pour ventilateurs médicaux : équipement réseau, hors périmètre', 'N361336');
ex('Câbles de batterie et de masse de poids lourds, hors périmètre', 'N363912');
ex('Cordon secteur haute-fidélité (C15/C19) : simple cordon d\'alimentation, hors périmètre des câbles ordinateur / téléphone', 'N364038');
ex('Câbles LAN / Ethernet et télécom en bobine ou sans analyse de connecteurs (8544 49) : câble au mètre, pas un câble de connexion fini', 'N337956', 'N353127', 'N353128', 'N353129', 'N353130', 'N353131', 'N354596', 'N355321', 'N356923', 'N356924', 'N357574', 'N357575', 'N359729', 'N362750');
ex('Câbles chauffants, sous-marins, optiques ou haute tension et jeux de barres : hors périmètre', 'N288617', 'N290369', 'N318176', 'N322713', 'N324842', 'N330604', 'N342021', 'N344044', 'N355584', 'N356005', 'N361444', 'N362917');
ex('Hub de sécurité / domotique à écran (8531) : centrale d\'alarme, pas un hub USB', 'N347542', 'N347798');
ex('Chargeur solaire d\'entretien de batterie automobile (8501 31), hors périmètre', 'N302575');
ex('Lampe disco USB : luminaire d\'ambiance, faux positif mot-clé', 'N314533');
ex('Kitchen Hub : écran connecté de cuisine (8471 41), pas un hub USB', 'N304114');
ex('Mineur de cryptomonnaie, lecteur de transpondeurs, contrôle d\'accès biométrique, tablette kiosque : appareils autonomes, faux positifs texte', 'H310388', 'H310654', 'N289637', 'N307854');
ex('Nettoyeur à ultrasons, appareil de spa, système d\'optogénétique, pédale d\'effet, répulsif à ultrasons : appareils autonomes, faux positifs texte', 'N321794', 'N335978', 'N350275', 'N347828', 'N348388');
ex('Modem LoRa pour capteurs de distance : équipement de réseau de capteurs, pas un adaptateur d\'ordinateur ou de téléphone', 'N288932');
ex('Chaufferette rechargeable qui ne recharge aucun autre appareil : pas une batterie externe', 'N297929');
ex('Pièces de modem (8517 70) : composants, pas un accessoire fini de connexion', 'N313253', 'N313970', 'N314870', 'N316374');
ex('Poste de conversion de tension sur châssis (transformateur industriel), hors périmètre', 'N355367');
ex('Casque sans fil avec dongle USB : l\'article classé est le casque (8518), pas le dongle', 'H346387');

// Découpe déterministe à 7000 caractères : faits / description, puis fin de l'analyse et conclusion.
function decouper(t) {
  if (t.length <= MAX_TEXTE) return [t];
  const budget = MAX_TEXTE - COUPE.length;
  const iF = t.indexOf('FACTS:');
  const iH = t.lastIndexOf('HOLDING:');
  if (iF >= 0 && iH > iF) {
    const a = t.slice(iF, iF + 2800);
    const finB = Math.min(t.length, iH + 700);
    const debB = Math.max(iF + 2800, finB - (budget - a.length));
    return [a, t.slice(debB, finB)];
  }
  const iS = t.indexOf('applicable subheading');
  if (iS >= 0 && iS + 1500 > budget) {
    const a = t.slice(0, 4300);
    const debB = Math.max(4300, iS - 500);
    return [a, t.slice(debB, debB + (budget - a.length))];
  }
  return [t.slice(0, MAX_TEXTE)];
}

// ───────────────────────── Construction ─────────────────────────
const eu = lireJsonl(F_EU), us = lireJsonl(F_US);
const journal = [];
const candidats = [];
const source = new Map(); // id -> texte source complet, pour la vérification de sous-chaîne

// UE
const euPerimetre = eu.lignes.filter((r) => r.date >= '2007-01-01' && EU_MOTS.test(r.description || '') && EU_POSITIONS.test(r.code_nc || ''));
for (const r of euPerimetre.sort((a, b) => (a.celex + '#' + String(a.rang).padStart(2, '0') < b.celex + '#' + String(b.rang).padStart(2, '0') ? -1 : 1))) {
  const id = `${r.celex}#${r.rang}`;
  if (EXCLU.has(id)) { journal.push(`EXCLU ${id} : ${EXCLU.get(id)}`); continue; }
  const texte = r.description + '\n\nReasons: ' + r.motifs;
  source.set(id, { description: r.description, motifs: r.motifs });
  candidats.push({ id, source: 'EU_REGLEMENT', date: r.date, url: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${r.celex}`, code_officiel: String(r.code_nc).replace(/\D/g, ''), hs6: String(r.code_nc).replace(/\D/g, '').slice(0, 6), texte });
}
const nEuAvant = candidats.length;

// US
const usEligibles = us.lignes.filter((r) => r.revoquee === false && Array.isArray(r.codes) && r.codes.length === 1 && r.date >= '2017-01-01' && typeof r.text === 'string');
const usMots = usEligibles.filter((r) => (US_SUJET.test(r.sujet || '') && US_POSITIONS.test(r.codes[0])) || (US_TEXTE.test(r.text.replace(/\s+/g, ' ')) && US_TEXTE_POS.test(r.codes[0])));
const nonRevus = [];
let usGarde = [];
for (const r of usMots.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
  if (EXCLU.has(r.id)) { journal.push(`EXCLU ${r.id} : ${EXCLU.get(r.id)}`); continue; }
  if (!US_RETENUS.has(r.id)) { nonRevus.push(r); continue; } // jamais retenu sans lecture humaine
  if (r.text.replace(/\s+/g, ' ').length < 900) { journal.push(`EXCLU ${r.id} : texte trop mince`); continue; }
  usGarde.push(r);
}
for (const id of US_RETENUS) assert(usMots.some((r) => r.id === id), `retenu ${id} absent de la règle mots-clés ou inéligible (révoqué, plusieurs codes, date)`);

// Plafond : aucune sous-position SH6 au-dessus de 30 % de l'échantillon US.
// Dans le groupe en excès, on garde d'abord les HQ, puis des NY régulièrement espacés dans l'ordre des identifiants.
for (;;) {
  const parHs = new Map();
  for (const r of usGarde) { const h = r.codes[0].slice(0, 6); parHs.set(h, [...(parHs.get(h) || []), r]); }
  const exces = [...parHs.entries()].filter(([, l]) => l.length > Math.floor(PART_MAX_HS6_US * usGarde.length)).sort((a, b) => b[1].length - a[1].length)[0];
  if (!exces) break;
  const [h, l] = exces;
  const autres = usGarde.length - l.length;
  let cible = l.length; while (cible > Math.floor(PART_MAX_HS6_US * (autres + cible))) cible--;
  const hq = l.filter((r) => r.id.startsWith('H')), ny = l.filter((r) => !r.id.startsWith('H'));
  const nNy = Math.max(0, cible - hq.length);
  const garde = new Set(hq.slice(0, cible).map((r) => r.id));
  for (let i = 0; i < nNy; i++) garde.add(ny[Math.floor((i * ny.length) / nNy)].id);
  for (const r of l) if (!garde.has(r.id)) journal.push(`PLAFOND ${r.id} : retiré, sous-position ${h} plafonnée à 30 % de l'échantillon US`);
  usGarde = usGarde.filter((r) => r.codes[0].slice(0, 6) !== h || garde.has(r.id));
}
for (const r of usGarde) {
  const code = String(r.codes[0]).replace(/\D/g, '');
  source.set(r.id, { text: r.text });
  candidats.push({ id: r.id, source: 'US_CBP', date: r.date, url: `https://rulings.cbp.gov/ruling/${r.id}`, code_officiel: code, hs6: code.slice(0, 6), texte: decouper(r.text).join(COUPE) });
}

// ───────────────────────── Vérification ─────────────────────────
const ids = candidats.map((c) => c.id);
assert(new Set(ids).size === ids.length, 'identifiant en double');
for (const c of candidats) {
  assert(/^\d{8,}$/.test(c.code_officiel), `code_officiel invalide pour ${c.id} : ${c.code_officiel}`);
  assert(c.hs6 === c.code_officiel.slice(0, 6), `hs6 incohérent pour ${c.id}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(c.date), `date invalide pour ${c.id}`);
  const s = source.get(c.id);
  if (c.source === 'EU_REGLEMENT') {
    assert(c.date >= '2007-01-01', `date UE trop ancienne ${c.id}`);
    const [d, m] = c.texte.split('\n\nReasons: ');
    assert(d === s.description && m === s.motifs && d.length > 0 && m.length > 0, `texte UE non conforme à la source ${c.id}`);
  } else {
    assert(c.date >= '2017-01-01', `date US trop ancienne ${c.id}`);
    assert(c.texte.length <= MAX_TEXTE, `texte trop long ${c.id} : ${c.texte.length}`);
    let pos = 0;
    for (const seg of c.texte.split(COUPE)) {
      const i = s.text.indexOf(seg, pos);
      assert(seg.length > 0 && i >= 0, `segment non retrouvé mot pour mot dans la source ${c.id}`);
      pos = i + seg.length;
    }
    assert(/subheading|HOLDING/.test(c.texte), `texte sans passage de classement ${c.id}`);
  }
}
const nEu = candidats.filter((c) => c.source === 'EU_REGLEMENT').length;
const nUs = candidats.filter((c) => c.source === 'US_CBP').length;
assert(nEu === nEuAvant, 'tous les règlements UE du périmètre doivent être gardés');
const parHs6 = {}, parHs6Us = {};
for (const c of candidats) { parHs6[c.hs6] = (parHs6[c.hs6] || 0) + 1; if (c.source === 'US_CBP') parHs6Us[c.hs6] = (parHs6Us[c.hs6] || 0) + 1; }
for (const [h, n] of Object.entries(parHs6Us)) assert(n <= Math.floor(PART_MAX_HS6_US * nUs), `sous-position ${h} au-dessus de 30 % de l'échantillon US (${n}/${nUs})`);
assert(candidats.length >= 70 && candidats.length <= 110, `total hors cible 70 à 110 : ${candidats.length}`);

// ───────────────────────── Écriture ─────────────────────────
fs.writeFileSync(path.join(ICI, 'candidats.json'), JSON.stringify(candidats, null, 2) + '\n');
const dirLots = path.join(ICI, 'lots');
fs.rmSync(dirLots, { recursive: true, force: true });
fs.mkdirSync(dirLots, { recursive: true });
const lots = [];
for (const src of ['EU_REGLEMENT', 'US_CBP']) {
  const l = candidats.filter((c) => c.source === src);
  const nLots = Math.ceil(l.length / MAX_LOT);
  for (let i = 0; i < nLots; i++) {
    const morceau = l.slice(Math.floor((i * l.length) / nLots), Math.floor(((i + 1) * l.length) / nLots));
    assert(morceau.length > 0 && morceau.length <= MAX_LOT && morceau.every((c) => c.source === src), 'lot non conforme');
    const f = path.join(dirLots, `lot-${String(lots.length + 1).padStart(2, '0')}.json`);
    fs.writeFileSync(f, JSON.stringify(morceau, null, 2) + '\n');
    lots.push({ fichier: f, source: src, n: morceau.length });
  }
}
assert(lots.reduce((s, l) => s + l.n, 0) === candidats.length, 'la somme des lots ne fait pas le total');
fs.writeFileSync(path.join(ICI, 'selection-journal.txt'), journal.join('\n') + '\n');

// ───────────────────────── Compte rendu ─────────────────────────
console.log(`Sources : UE ${eu.lignes.length} lignes (${eu.rejets} illisibles), US ${us.lignes.length} lignes (${us.rejets} illisibles)`);
console.log(`UE : ${euPerimetre.length} par mots-clés, ${nEu} retenus`);
console.log(`US : ${usEligibles.length} éligibles (non révoqués, un seul code, depuis 2017), ${usMots.length} par mots-clés, ${nUs} retenus`);
console.log(`Total : ${candidats.length}`);
console.log('Par source :', JSON.stringify({ EU_REGLEMENT: nEu, US_CBP: nUs }));
const tri = (o) => Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([h, n]) => `${h}:${n}`).join(' ');
console.log('Par hs6 (tout) :', tri(parHs6));
console.log('Par hs6 (US)   :', tri(parHs6Us));
console.log('Lots :'); for (const l of lots) console.log(`  ${l.fichier} ${l.source} ${l.n}`);
if (nonRevus.length) {
  console.log(`ATTENTION : ${nonRevus.length} ruling(s) attrapés par les mots-clés mais jamais relus, donc non retenus :`);
  for (const r of nonRevus) console.log(`  ${r.id} ${r.codes[0]} ${r.sujet}`);
}
console.log('VERIFICATION OK : aucun doublon, codes à 8 chiffres ou plus, textes mot pour mot dans la source.');
