// Construit annot-04.json : chaque citation est découpée dans le texte du lot entre deux ancres (début, fin).
import fs from 'node:fs';
const lot = JSON.parse(fs.readFileSync(new URL('../lots/lot-04.json', import.meta.url)));
const T = Object.fromEntries(lot.map((d) => [d.id, d]));
const cut = (id, a, b) => {
  const t = T[id].texte, i = t.indexOf(a);
  if (i < 0) throw new Error(`${id} : ancre de début absente « ${a} »`);
  if (!b) return a;
  const j = t.indexOf(b, i);
  if (j < 0) throw new Error(`${id} : ancre de fin absente « ${b} »`);
  return t.slice(i, j + b.length).trim();
};
const A = [
  ['N303514', 'Adaptateur de prise secteur américaine vers européenne, sans électronique',
    ['the Universal Power Adapter, PN AD-00077-001', 'conditions the applied voltage.'], {
      convertit_courant: [false, 'There are no electrical components inside the adapter', 'conditions the applied voltage.'],
      construction_passive: ['bloc_fiches_prises', 'an electrical plug having a U.S. format', 'female receptacle on the top'],
    }],
  ['N304098', 'Bloc d\'alimentation en rack pour centres de données et serveurs',
    ['the Power Supply Unit (PSU)', 'server equipment racks.'], {
      fonction_principale: ['alimenter', 'a rack mountable PSU that supplies both main output DC power as well as standby DC power'],
    }],
  ['N304253', 'Alimentation 24 V pour concentrateur d\'oxygène portable',
    ['a MANGO120S-24-ING DC Power Supply', 'for the Inogen POC.'], {
      fonction_principale: ['alimenter', 'a 24 VDC, 5 Amp power supply for use with a Portable Oxygen Concentrator (POC)'],
      convertit_courant: [true, 'permanently embossed stating its limited use as a medical AC/DC Adapter for the Inogen POC'],
      appareil_hote: ['autre', 'The subject power supply is said to provide power exclusively to a POC'],
    }],
  ['N304573', 'Adaptateur d\'alimentation par Ethernet pour machines de traitement de l\'information',
    ['the ELO-KIT-POE-ADAPTER Part Number E615169', 'an instruction sheet.'], {
      fonction_principale: ['alimenter', 'a power over Ethernet (POE) adapter for use with automatic data processing machines'],
      appareil_hote: ['ordinateur', 'for use with automatic data processing machines'],
    }],
  ['N304715', 'Chargeurs de batteries pour concentrateurs d\'oxygène portables',
    ['the Battery Charger Model BA-303', 'charge level of the inserted battery.'], {
      fonction_principale: ['alimenter', 'The function of the battery charger is to charge lithium batteries for the Inogen G3 POC'],
      appareil_hote: ['autre', 'charger for batteries used exclusively with a Portable Oxygen Concentrator (POC)'],
    }],
  ['N305600', 'Rangement de bureau à tiroirs avec socle de charge sans fil',
    ['a plastic square desk caddy with 3 drawers', 'to a power source.'], {
      fonction_principale: ['alimenter', 'The caddy contains a wireless charging base incorporated into the top', 'wirelessly charging the device'],
      convertit_courant: [true, 'for users to place their personal electronics for the purpose of wirelessly charging the device'],
      genere_electricite: [false, 'a micro USB port which allows users to plug the caddy into a USB socket to receive power'],
    }],
  ['N305608', 'Alimentation multi-sorties pour pédales d\'effets d\'instruments à cordes',
    ['the RockBoard ISO Power Block V10 Multi-Power Supply', 'as well as a mains adapter.'], {
      fonction_principale: ['alimenter', 'a compact power supply for use with electric string musical instrument effects pedals'],
    }],
  ['N305957', 'Cadre photo avec socle de charge sans fil',
    ['a plastic wireless charging base having a photo display', 'memory for the storage of pictures.'], {
      fonction_principale: ['alimenter', 'a plastic wireless charging base having a photo display and a kick stand on the back side'],
      convertit_courant: [true, 'smart mobile device for the purpose of receiving a wireless charge'],
      genere_electricite: [false, 'The wireless charging pad is powered through a micro USB cable which is provided with the frame'],
    }],
  ['N305975', 'Chauffe-mains rechargeable faisant aussi batterie externe',
    ['the Rechargeable Heat Bank, item number V36402', 'via USB connection.'], {
      fonction_principale: ['autre', 'portable hand warmer with six heat settings that is powered by a 5200 MAh lithium-ion battery'],
      batterie_integree: ['lithium_ion', 'when charged, the lithium-ion battery can also be used to charge external devices, such as smart phones or tablets, via USB connection'],
    }],
  ['N306782', 'Tapis de souris avec charge sans fil par induction',
    ['The PowerTrack is constructed of cellular plastic', 'charging their personal electronic devices.'], {
      fonction_principale: ['porter_completer', 'In use, the PowerTrack is placed on a desk surface', 'charging their personal electronic devices'],
      convertit_courant: [true, 'has an embedded 10 W wireless inductive charging coil'],
      genere_electricite: [false, 'a USB port for connecting to a power source'],
    }],
  ['N306841', 'Démarreur de secours avec batterie portable, et batterie externe',
    ['The ChargeUp Auto 12V Jump Starter and Power Pack, product number CY2075CHAUT', '2.5L (2,500cc) diesel.'], {
      fonction_principale: ['alimenter', 'is designed to store and provide power to electronic devices and vehicles'],
      batterie_integree: ['lithium_ion', 'The battery unit consists of a 12,000 mAh lithium polymer battery'],
    }],
  ['N307014', 'Câble d\'extension vidéo VGA/SVGA pour écran',
    ['the VGA/SGA Monitor Extension Cable, Item 26845', 'connector at each end.'], {
      fonction_principale: ['transmettre_signaux', 'A video signal is then transmitted from the computer to the output unit through the subject cable.'],
      construction_passive: ['cable_connecteurs', 'The cable can be of various lengths and is fitted with a 15-pin SVGA connector at each end.'],
      appareil_hote: ['ordinateur', 'The cable is meant to connect an output display monitor', 'via the SVGA port on each'],
    }],
  ['N307161', 'Bloc d\'alimentation interne de 850 W pour ordinateur personnel',
    ['a Power Supply for a Personal Computer', 'maximum power output of 850 Watts.'], {
      fonction_principale: ['alimenter', 'The subject switching power supply is intended to be installed internally and has a maximum power output of 850 Watts'],
      convertit_courant: [true, 'containing rectifying apparatus and having multiple output cable harnesses'],
      appareil_hote: ['ordinateur', 'for connecting to various components within an automatic data processing machine'],
    }],
  ['N307285', 'Stations d\'accueil USB pour ordinateur, deux écrans et périphériques',
    ['the VT4000 Dual 4K Universal Docking Station (VT4000)', 'through a single USB-C input connection.'], {
      fonction_principale: ['transmettre_signaux', 'The principal function of the VT4000 is to provide users', 'through a single USB-C input connection'],
      liaison_reseau: ['port_parmi_autres', 'two HDMI ports, two DisplayPorts, audio lines in/out, one RJ45 Ethernet Port, six USB 3.0 Ports, and a single USB-C Port'],
      appareil_hote: ['ordinateur', 'allow the connected ADP machine to interface and control the attached units'],
    }],
  ['N310490', 'Alimentation régulée de 850 W pour machines de jeu',
    ['the Power Supply-AC, Model No. YGEB0850AM-1A00P10', 'maximum power output of 850 W.'], {
      fonction_principale: ['alimenter', 'regulated power supply that is intended to be used with gaming machines'],
      appareil_hote: ['autre', 'intended to be used with gaming machines'],
    }],
  ['N315544', 'Support de téléphone combiné à un câble de charge rigide',
    ['a combination cellphone stand, holder, and charging cable', 'charge or sync the cell phone.'], {
      appareil_hote: ['autre', 'The cable can also be removed from the holder and used to charge or sync the cell phone.'],
    }],
  ['N316909', 'Câble adaptateur USB vers DB9 (RS-232) pour ventilateur médical',
    ['This cable assembly incorporates an adapter module', 'it needs to run.'], {
      fonction_principale: ['transmettre_signaux', 'is a custom cable that was designed to connect the Trilogy EVO Ventilator to a PC or host device'],
      electronique_active: [true, 'The adapter module facilitates the conversion of a USB communication signal to an RS-232 communication signal and vice versa.'],
      liaison_reseau: ['seule_fonction', 'The adapter module facilitates the conversion of a USB communication signal to an RS-232 communication signal and vice versa.'],
      convertit_courant: [true, 'It also converts power in the form of a linear regulator, creating the 3.3 volts it needs to run.'],
      appareil_hote: ['autre', 'is designed to be used exclusively with the Trilogy EVO series of ventilators'],
    }],
  ['N319727', 'Borne de recharge solaire pour téléphones, avec batterie',
    ['a powder coated stainless steel pole with mounting plates', 'functions as a stand-alone charger'], {
      fonction_principale: ['alimenter', 'the Charging Pole does not connect to the electrical grid and functions as a stand-alone charger'],
      genere_electricite: [true, 'the power generated by the PV panel is provided solely to the charge controller for distribution to the various USB/Qi ports'],
      batterie_integree: ['lithium_ion', 'Incorporated into the Charging Pole are a charge controller, a 30 Ah lithium-ion battery, three USB outlets, and one Qi charging pad.'],
    }],
];
const out = A.map(([id, produit, desc, crit]) => {
  const d = T[id];
  return { id, source: d.source, date: d.date, url: d.url, code_officiel: d.code_officiel, hs6: d.hs6, produit, description: cut(id, ...desc), motifs: '',
    criteres: Object.fromEntries(Object.entries(crit).map(([k, [valeur, a, b]]) => [k, { valeur, citation: cut(id, a, b) }])) };
});
fs.writeFileSync(new URL('./annot-04.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
