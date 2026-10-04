// Construit annot-02.json : chaque description et chaque citation est découpée dans le texte du lot
// (entre une amorce et une fin), jamais retapée.
import { readFileSync, writeFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const lot = JSON.parse(readFileSync(new URL('../lots/lot-02.json', ici), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const T = Object.fromEntries(lot.map((d) => [d.id, norm(d.texte)]));
let courant;
// Les textes du lot contiennent quelques caractères de contrôle (U+0002) : l'amorce les tolère,
// l'extrait rendu reste la tranche exacte du texte.
const CTRL = '[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f]*';
const motif = (a) => new RegExp([...a].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(CTRL), 'g');
const x = (debut, fin, max = 300) => {
  const t = T[courant], m = motif(debut).exec(t);
  if (!m) throw new Error(`${courant} : amorce introuvable « ${debut} »`);
  let j = m.index + m[0].length;
  if (fin != null) {
    const r = motif(fin); r.lastIndex = m.index;
    const f = r.exec(t);
    if (!f) throw new Error(`${courant} : fin introuvable « ${fin} »`);
    j = f.index + f[0].length;
  }
  const s = t.slice(m.index, j);
  if (s.length > max) throw new Error(`${courant} : extrait de ${s.length} caractères > ${max} (${debut})`);
  return s;
};
const v = (valeur, debut, fin) => ({ valeur, citation: x(debut, fin) });
const A = {
  H273383: () => ({
    produit: 'Câbles optiques actifs munis d\'émetteurs-récepteurs',
    description: x('The optical fiber cable assemblies at issue are', 'read by a computer.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'They are used in structured cabling systems to transport aggregated data', 'up to 4 kilometers'),
      electronique_active: v(true, 'The optical fiber cable assemblies at issue are optical fiber cables fitted with transceivers or with transceivers and connectors.'),
      liaison_reseau: v('seule_fonction', 'an active optical cable (AOC) with a QSFP+ transceiver on one end', 'active optical cables with SFP transceivers at both ends'),
    },
  }),
  H287462: () => ({
    produit: 'Étuis en plastique pour iPad avec récepteur de charge par induction',
    description: x('The subject charging sleeves are plastic iPad cases', 'within the rear portion of the sleeves.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'The subject charging sleeves are plastic iPad cases with internal electrical components that enable the sleeves to work as charging devices.'),
      convertit_courant: v(true, 'The receivers’ electronic circuitry converts that alternating current into direct current', 'inserted into the sleeves.'),
      appareil_hote: v('ordinateur', 'Each sleeve has a built-in connector that fits into the power ports of iPads'),
    },
  }),
  H298118: () => ({
    produit: 'Batterie externe lithium-ion de 4000 mAh avec lampe intégrée',
    description: x('The subject power bank is a universal, portable device', 'another USB power source.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'The subject power bank is a universal, portable device which stores energy and acts as power source for electronic devices'),
      batterie_integree: v('lithium_ion', 'The power bank device consists of a lithium-ion rechargeable battery'),
      genere_electricite: v(false, 'The power bank can be recharged via its micro USB port', 'another USB power source.'),
    },
  }),
  H319416: () => ({
    produit: 'Câbles audio et vidéo munis de connecteurs (24 modèles)',
    description: x('The cable described as NS-HZ303 is described as', 'surrounded by a PVC jacket.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'Each cable is used to facilitate the transfer of voice, images or data.'),
      construction_passive: v('cable_connecteurs', 'It incorporates male 3.5mm plugs on both ends.', 'surrounded by insulation'),
    },
  }),
  H322074: () => ({
    produit: 'Chauffe-mains électriques rechargeables faisant aussi batterie externe',
    description: x('The electric hand warmers are described as portable devices', 'within a handheld plastic enclosure.', 700),
    criteres: {
      batterie_integree: v('lithium_ion', 'The 9S model is comprised of a 5200 mAh rechargeable lithium-ion battery, one output USB used for charging compatible devices'),
      genere_electricite: v(false, 'one input USB for charging the rechargeable lithium-ion battery'),
    },
  }),
  H328693: () => ({
    produit: 'Station d\'accueil USB Dell D3100',
    description: x('The subject merchandise is a Dell D3100', 'one audio line out.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'Through a single connection, the docking station allows users to connect to the Internet, external devices, and up to three additional monitors.'),
      liaison_reseau: v('port_parmi_autres', 'three USB 3.0 ports;', 'one RJ45 Gigabit Ethernet port'),
      appareil_hote: v('ordinateur', 'The D3100 features one USB 3.0 Type-B port for upstream input'),
    },
  }),
  H337673: () => ({
    produit: 'Stations d\'accueil universelles pour ordinateur portable et adaptateur USB vers HDMI',
    description: x('The subject docking stations UD-3900H', 'for network connection.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'The subject docking stations allow for combined audio, data, power, and video through one station.'),
      liaison_reseau: v('port_parmi_autres', 'The docking stations include two USB 3.0 ports', 'for network connection.'),
      appareil_hote: v('ordinateur', 'The various USB ports allow for a laptop to connect to various peripheral devices including a monitor, hard drive, and speaker.'),
    },
  }),
  H341609: () => ({
    produit: 'Câbles cuivre à attache directe (DAC) munis d\'émetteurs-récepteurs',
    description: x('The DACs consist of a twin-axial copper cable', 'to operate in the proper mode.”', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'The media interface sends signals into the media, the copper cable, and receives the transmitted signals.'),
      electronique_active: v(true, 'they are designed with Tx/Rx circuitry that converts', 'suitable to send over the copper cable media'),
      liaison_reseau: v('seule_fonction', 'The DACs consist of a twin-axial copper cable', 'terminating the cable at each end.'),
    },
  }),
  H342570: () => ({
    produit: 'Chargeurs USB pour allume-cigare et pour prise murale',
    description: x('the subject merchandise consists of various car and wall chargers.', 'between 2.1-4.8 Amp.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'described as a 3.0A, USB quick wall charger, capable of charging smartphones, tablets and other devices at home.'),
      convertit_courant: v(true, 'The chargers are primarily plastic AC-DC static converters'),
      genere_electricite: v(false, 'designed to be plugged into a standard cigarette lighter outlet in an automobile (car charger) or a standard wall outlet (wall charger).'),
      prises_secteur_sortie: v(false, 'Protestant’s chargers typically feature one USB-A port or a USB-A and a USB-C port.'),
    },
  }),
  H343160: () => ({
    produit: 'Plante artificielle en pot servant de station de charge USB',
    description: x('The iPP45 is an artificial succulent plant', 'universal 30 W power adapter.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'the iPP45 is described as an “Artificial Plant Charging Station with Multiple USB Charging Ports.”'),
      convertit_courant: v(true, 'housed in a cylindrical plastic flowerpot that serves as an electric static converter'),
      genere_electricite: v(false, 'An electrical cord extends from the bottom of the flowerpot and includes a universal 30 W power adapter.'),
      prises_secteur_sortie: v(false, 'with two USB-C sockets (20Watts (W) max shared) and one 10 W USB-A socket on its side'),
    },
  }),
  H348342: () => ({
    produit: 'Hub USB 3.0 à 7 ports (UH700)',
    description: x('The fourth item is the USB 3.0 7-Port Hub (UH700).', 'in the process of transferring data.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'is used to expand the number of available USB ports on a PC.'),
      appareil_hote: v('ordinateur', 'It supports systems such as Windows, Mac OS X and Linux systems.'),
    },
  }),
  N281995: () => ({
    produit: 'Câble USB de charge logé dans un pompon porte-clés',
    description: x('The merchandise in question is a USB/charging cable', 'polyvinyl chloride plastic sheeting.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'can connect to a cell phone and provide battery power when the USB end is connected to a power source'),
      construction_passive: v('cable_connecteurs', 'The USB cable, which has connectors on both ends'),
      genere_electricite: v(false, 'provide battery power when the USB end is connected to a power source'),
      appareil_hote: v('autre', 'The USB cable, which has connectors on both ends, can connect to a cell phone'),
    },
  }),
  N282038: () => ({
    produit: 'Chargeur mural USB à deux ports de 36 W',
    description: x('this dual port USB wall charger is a static converter/rectifier', 'is rated at 36 W.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'is used to power/charge various personal, USB enabled, electronic devices'),
      convertit_courant: v(true, 'is a static converter/rectifier that converts alternating current to direct current'),
      genere_electricite: v(false, 'It connects to a standard wall outlet'),
      prises_secteur_sortie: v(false, 'It is rectangular in shape with a 2-prong electrical plug on one side and two USB ports on the other side (USB-A and USB-C ports).'),
    },
  }),
  N282039: () => ({
    produit: 'Batterie externe lithium-ion de 6000 mAh avec lampe intégrée',
    description: x('The iSmart is encased in an outer shell', 'such as cell phones and tablets.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'The lithium-ion battery stores and supplies power to mobile devices, such as cell phones and tablets.'),
      batterie_integree: v('lithium_ion', 'a lithium-ion battery that is re-chargeable and has a storage capacity of 6000mAh'),
    },
  }),
  N282047: () => ({
    produit: 'Câble USB de charge logé dans un pompon en cuir porte-clés',
    description: x('It is a USB/charging cable that is embedded within a tassle', 'leather strips.', 700),
    criteres: {
      fonction_principale: v('alimenter', 'can connect to a cell phone and provide battery power when the USB end is connected to a power source'),
      construction_passive: v('cable_connecteurs', 'The USB cable, which has connectors on both ends'),
      genere_electricite: v(false, 'provide battery power when the USB end is connected to a power source'),
      appareil_hote: v('autre', 'The USB cable, which has connectors on both ends, can connect to a cell phone'),
    },
  }),
  N284052: () => ({
    produit: 'Modem USB externe 3G et 4G LTE',
    description: x('This device is an external USB modem.', 'connectivity protocols.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'This device is an external USB modem.'),
      liaison_reseau: v('seule_fonction', 'Its compatible networks include', 'connectivity protocols.'),
    },
  }),
  N284202: () => ({
    produit: 'Organiseur de bureau à trois ports USB relié à un ordinateur',
    description: x('The merchandise under consideration is referred to as', 'and a mobile telephone.', 700),
    criteres: {
      appareil_hote: v('ordinateur', 'On the rear of the unit is a male USB cable that a user would connect to a host personal computer (PC).'),
    },
  }),
  N284888: () => ({
    produit: 'Câbles cuivre passifs QSFP munis de connecteurs',
    description: x('These copper cable assemblies are comprised of', 'gold plated contact pads.', 700),
    criteres: {
      fonction_principale: v('transmettre_signaux', 'designed for the higher-bandwidth signal integrity associated with', 'per channel transmission'),
      electronique_active: v(false, 'Quad Small Form-Factor Pluggable (QSFP/QSFP+) passive copper cable assemblies'),
      construction_passive: v('cable_connecteurs', 'These copper cable assemblies are comprised of', 'edge card connector on each end.'),
    },
  }),
};
const sortie = lot.map((d) => {
  courant = d.id;
  if (!A[d.id]) throw new Error('décision sans annotation : ' + d.id);
  const a = A[d.id]();
  return { id: d.id, source: d.source, date: d.date, url: d.url, code_officiel: d.code_officiel, hs6: d.hs6, produit: a.produit, description: a.description, motifs: '', criteres: a.criteres };
});
writeFileSync(new URL('annot-02.json', ici), JSON.stringify(sortie, null, 2) + '\n');
console.log('écrit :', sortie.length, 'décisions');
