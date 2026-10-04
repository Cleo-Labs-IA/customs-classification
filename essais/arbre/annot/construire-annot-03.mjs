// Construit annot-03.json : les faits relevés à la main, les champs d'identité recopiés du lot.
import { readFileSync, writeFileSync } from 'node:fs';
const ici = new URL('.', import.meta.url);
const lot = JSON.parse(readFileSync(new URL('../lots/lot-03.json', ici), 'utf8'));
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const A = {
  N284892: { produit: 'Câbles optiques actifs QSFP+ à émetteurs-récepteurs intégrés',
    d: ['The items in question are known as', 'at the opposite end.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'The transceivers are optical/electrical converters that convert electrical signals into optical signals, transmit the optical signals along the length of the fiber optic cable, and then convert the optical signals back into electrical signals at the opposite end.'],
      electronique_active: [true, 'The transceivers are optical/electrical converters that convert electrical signals into optical signals'],
      liaison_reseau: ['seule_fonction', 'These assemblies are comprised of a fiber optic cable with optical transceivers inside both cable connectors on each end.'],
    } },
  N285505: { produit: 'Modem USB 4G LTE',
    d: ['The item concerned is the 4G LTE Global Modem', 'in over 200 countries.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'This modem provides a personal connection to the internet with global connectivity in over 200 countries.'],
      liaison_reseau: ['seule_fonction', 'This electronic device is a plug and play modem'],
      appareil_hote: ['ordinateur', 'It is compatible with Windows® 7,8,10, MAC OS® x 10.6 or higher, and Linux® Ubuntu 10.4 or higher.'],
    } },
  N288408: { produit: 'Kits de charge avec batteries externes lithium-ion',
    d: ['The Iridium Power Bank with High Speed Charging Station', 'stores and provides energy to electronic devices.'],
    c: {
      fonction_principale: ['alimenter', 'The portable power bank is rectangular in shape and consists of a rechargeable lithium-ion battery that stores and provides energy to electronic devices.'],
      batterie_integree: ['lithium_ion', 'The portable power banks are rechargeable lithium-ion batteries that store and provide energy to electronic devices.'],
    } },
  N289786: { produit: 'Adaptateurs Ethernet, HDMI et VGA pour ordinateurs Surface',
    d: ['The first item is referred to as the Surface USB 3.0 Ethernet Adapter', 'up to 1 Gbps.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'The Ethernet adapter is used to convert data from USB to Ethernet.'],
      electronique_active: [true, 'This adapter is a 10/100/l000M Ethernet controller that combines a triple-speed IEEE 802.3 compliant Media Access Controller with a triple-speed Ethernet transceiver, a USB 3.0 bus controller and an embedded memory.'],
      appareil_hote: ['ordinateur', 'It gives the computer the ability to connect with an HDMI compatible display for sharing pictures, videos, etc.'],
    } },
  N290026: { produit: 'Câble adaptateur audio en Y, jack 3,5 mm vers deux RCA',
    d: ['The item concerned is an audio', 'cable assembly is 6 feet.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'The item concerned is an audio “Y” adapter cable, item # 33568.'],
      construction_passive: ['cable_connecteurs', 'each cable has an internal insulated conductor and a secondary ground wire (not a surrounding shield)'],
    } },
  N290028: { produit: 'Câble S-Vidéo de six pieds',
    d: ['Item concerned is a six foot S-Video Cable', 'at a resolution of 480i or 576i.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'The cable has a construction of four PVC insulated copper clad steel conductors that carry or transmit luminance and color.'],
      construction_passive: ['cable_connecteurs', 'The four conductors are wrapped in an outer jacket of PVC. Each end of the cable has an S-Video connector.'],
      appareil_hote: ['audio_video', 'The S-Video cables are used to connect TV, VCR, DVD and other electronic components with S-Video connections together.'],
    } },
  N290926: { produit: 'Câbles USB de rallonge pour faisceaux automobiles',
    d: ['The merchandise is identified as USB cable assemblies', 'on each end.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'specifically designed to enable inter-device communication in any vehicle application requiring high speed data transfer and low power use'],
      construction_passive: ['faisceau_vehicule', 'It is stated that the USB cable assemblies will be incorporated into wiring harnesses used in the automotive industry'],
      appareil_hote: ['autre', 'these four USB cable assemblies are automobile extension cables'],
    } },
  N292574: { produit: 'Adaptateurs de format vidéo pour ordinateur',
    d: ['There are five items under consideration', 'used exclusively with ADP machines.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'each convert a display signal originating from an automatic data processing machine from one type of display format to another type of display format to be used with a display device'],
      electronique_active: [true, 'a PCBA which digitally converts the signal from the USB-C format to the HDMI format'],
      appareil_hote: ['ordinateur', 'All of the subject adapters are said to be used exclusively with ADP machines.'],
    } },
  N296103: { produit: 'Câble audio/vidéo composante à cinq conducteurs coaxiaux',
    d: ['The merchandise in question is referred to as a component audio/video cable', 'audio and video equipment.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'These cables are used to interconnect audio and video equipment.'],
      construction_passive: ['cable_coaxial', 'Each of the joined cables consist of a stranded central copper conductor that is surrounded by an insulating medium, which is then surrounded by a second stranded copper conductor (coaxial construction)'],
      appareil_hote: ['audio_video', 'These cables are used to interconnect audio and video equipment.'],
    } },
  N296304: { produit: 'Adaptateur passif USB-C vers USB-A femelle sur câble',
    d: ['The item concerned is a USB-C to USB-A Female Adapter', 'it is a passive device.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'This device is used to connect older USB-A items to newer USB-C computers.'],
      electronique_active: [false, 'This item does not contain an IC chip, it is a passive device.'],
      construction_passive: ['cable_connecteurs', 'It consists of a 6 inch long insulated electrical cable terminated with a USB-C 3.0 plug connector on one end and a USB-A 3.0 jack connector on the opposite end.'],
      appareil_hote: ['ordinateur', 'This device is used to connect older USB-A items to newer USB-C computers.'],
    } },
  N296307: { produit: 'Adaptateur passif DVI vers HDMI sur câble court',
    d: ['The item concerned is a DVI to HDMI Pigtail Adapter', 'into an HDMI type connection.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'passive device that physically changes a DVI type connection into an HDMI type connection.'],
      electronique_active: [false, 'This item does not contain an IC chip.'],
      construction_passive: ['cable_connecteurs', 'This device incorporates a 6 inch long insulated cable terminated with a DVI connector on one end and a HDMI connector on the opposite end.'],
    } },
  N298534: { produit: 'Chargeur sans fil à induction pour console centrale automobile',
    d: ['The item concerned is referred to as a', 'the same inductive charging technology.'],
    c: {
      fonction_principale: ['alimenter', 'The purpose of the wireless charge system is to provide the driver or passenger with an easy means of charging smartphones or other similar devices.'],
      convertit_courant: [true, 'This power supply/charger uses wireless inductive charging technology to supply power to the internal batteries of a cellular telephone incorporating the same inductive charging technology.'],
      appareil_hote: ['autre', 'supply power to the internal batteries of a cellular telephone'],
    } },
  N298750: { produit: 'Câbles USB à connecteurs automobiles, à installer dans un véhicule',
    d: ['The first item concerned is a USB cable which will be installed within an automobile', 'electrical connectors on each end.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'They are used to connect various automotive communication system components.'],
      construction_passive: ['faisceau_vehicule', 'foam padding, mounting clips and automotive spring lock type electrical connectors on each end.'],
      appareil_hote: ['autre', 'The first item concerned is a USB cable which will be installed within an automobile (Part # TYX1055).'],
    } },
  N298752: { produit: 'Boîtiers AUX/USB pour console de véhicule',
    d: ['The first item under consideration is identified as the AUX/USB Box PN TCX-1772', 'such as a smart phone or tablet.'],
    c: {
      fonction_principale: ['aucune_dominante', 'performs two distinct functions where neither function predominates over the other'],
      appareil_hote: ['autre', 'The intended purpose of this assembly is to be mounted in the console of a motor vehicle to provide a USB type power outlet and data interface to the vehicle’s head unit'],
    } },
  N299351: { produit: 'Câbles USB-C et Lightning gainés de tissu',
    d: ['The items in question are cables', 'iPhones, iPads, and iPods.'],
    c: {
      construction_passive: ['cable_connecteurs', 'is a six foot fabric covered USB-C cable used for USB-C compatible devices only'],
    } },
  N300708: { produit: 'Chargeur à deux ports USB avec veilleuse LED',
    d: ['The item concerned is referred to as a 2 USB Port Charger + Night Light.', 'button for the LED night light.'],
    c: {} },
  N300797: { produit: 'Câble USB vers micro-USB gainé d\'acier',
    d: ['The item in question is a USB cable known as the Titan M.', 'transfer data (sync).'],
    c: {
      construction_passive: ['cable_connecteurs', 'It is composed of insulated conductors (wire) covered in a dual layer of flexible, industrial strength steel with a permanently sealed USB connector on one end and a micro USB connector on the other end.'],
    } },
  N301141: { produit: 'Adaptateurs réseau sans fil USB et PCI-E',
    d: ['The first item concerned is the', 'Transmit power is <20dBm.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'This is a USB 3.0 network adapter with a folding external dual band PIFA antenna.'],
      liaison_reseau: ['seule_fonction', 'This device is compatible with the 802.11 a/b/g/n/ac wireless standards.'],
    } },
  N301143: { produit: 'Concentrateurs USB 3.0 avec ports de charge',
    d: ['There are three items under consideration which are identified as USB', 'not the principal function of the units.'],
    c: {
      fonction_principale: ['transmettre_signaux', 'each of the subject USB Hubs are self-contained and are connected directly to a personal computer (PC) to facilitate data transfer from various peripherals to the connected PC'],
      electronique_active: [true, 'There are three items under consideration which are identified as USB (universal serial bus) Hubs, Model Numbers UH720, UH400, and UC430.'],
      appareil_hote: ['ordinateur', 'connects to a user’s PC via the USB 3.0 Micro socket located on the rear of the device'],
    } },
};
const sortie = lot.map((d) => {
  const a = A[d.id]; if (!a) throw new Error('décision non annotée : ' + d.id);
  const t = norm(d.texte), i = t.indexOf(a.d[0]), j = t.indexOf(a.d[1], i);
  if (i < 0 || j < 0) throw new Error(d.id + ' : bornes de description introuvables');
  const description = t.slice(i, j + a.d[1].length);
  if (description.length > 700) { console.error(d.id + ' : description de ' + description.length + ' caractères'); process.exitCode = 1; }
  return { id: d.id, source: d.source, date: d.date, url: d.url, code_officiel: d.code_officiel, hs6: d.hs6,
    produit: a.produit, description, motifs: '',
    criteres: Object.fromEntries(Object.entries(a.c).map(([k, [valeur, citation]]) => [k, { valeur, citation }])) };
});
writeFileSync(new URL('annot-03.json', ici), JSON.stringify(sortie, null, 1) + '\n');
console.log('écrit :', sortie.length, 'décisions');
