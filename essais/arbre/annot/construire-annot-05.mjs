import fs from 'node:fs';
const R='/Users/naomiehalioua/cleo-customs-classifier/';
const lot=JSON.parse(fs.readFileSync(R+'essais/arbre/lots/lot-05.json','utf8'));
const norm=(s)=>s.replace(/\s+/g,' ').trim();
const T=Object.fromEntries(lot.map(d=>[d.id,d]));
let cur;
// q(a) : passage exact ; q(a,b) : du début de a à la fin de b (copie brute du texte)
const q=(a,b)=>{const t=norm(cur.texte);const i=t.indexOf(norm(a));if(i<0)throw new Error(cur.id+' introuvable: '+a);
  if(!b)return norm(a);const j=t.indexOf(norm(b),i);if(j<0)throw new Error(cur.id+' fin introuvable: '+b);return t.slice(i,j+norm(b).length);};
const out=[];
const D=(id,produit,desc,crit)=>{cur=T[id];if(!cur)throw new Error('id '+id);
  const criteres={};for(const [k,[v,c]] of Object.entries(crit(q)))criteres[k]={valeur:v,citation:c};
  out.push({id,source:cur.source,date:cur.date,url:cur.url,code_officiel:cur.code_officiel,hs6:cur.hs6,produit,description:desc(q),motifs:'',criteres});};

D('N323399','Stations d\'énergie portables à batterie lithium-ion',
 q=>q('The items under consideration are Yeti Portable Power Stations','an LCD display that indicates the battery level.'),
 q=>({fonction_principale:['alimenter',q('Each model is functionally similar, providing backup and portable power to electronic devices through a variety of ports.')],
  batterie_integree:['lithium_ion',q('contains a 200 watt-hour rechargeable lithium-ion battery encased in a housing')],
  prises_secteur_sortie:[true,q('encased in a housing with an AC output port, an 8mm charge port, USB ports, 12V ports')]}));

D('N325987','Chargeur mural à deux ports USB-A',
 q=>q('The item under consideration is referred to as the Wall Outlet USB-A Dual Port Charger','such as tablets, watches, speakers, phones, etc.'),
 q=>({fonction_principale:['alimenter',q('You state that the Wall Charger can be utilized to charge various electronic devices, such as tablets, watches, speakers, phones, etc.')],
  convertit_courant:[true,q('the Wall Charger is plugged into a standard receptacle and rectifies/converts alternating current to direct current')],
  genere_electricite:[false,q('In use, the Wall Charger is plugged into a standard receptacle')],
  prises_secteur_sortie:[false,q('with a two-prong electrical plug on one side and two USB Type-A sockets on the other side')]}));

D('N328742','Adaptateur allume-cigare 12 V à deux ports USB-A',
 q=>q('The merchandise under consideration is identified as the Adapter, PN CAT-DC2USB-BLK','in a vehicle for charging personal electronics.'),
 q=>({fonction_principale:['alimenter',q('The subject Adapter is intended to be used in a vehicle for charging personal electronics.')],
  convertit_courant:[true,q('described as a 3.5 A DC-DC having two female USB Type-A socket connectors on one side and 12 V vehicle accessory electrical plug on the other')],
  genere_electricite:[false,q('12 V vehicle accessory electrical plug on the other')],
  prises_secteur_sortie:[false,q('the subject Adapter is equipped with two USB Type-A sockets and only functions to provide DC power for charging various types of electronic devices')]}));

D('N332683','Commutateur clavier, écran et souris (KVM)',
 q=>q('The merchandise under consideration is identified as the Emerald DeskVue','to an automatic data processing machine.'),
 q=>({fonction_principale:['transmettre_signaux',q('The KVM Switch functions to interconnect peripherals, such as a keyboard, display, mouse, and more, to an automatic data processing machine.')],
  electronique_active:[true,q('a plastic enclosure containing a motherboard printed circuit board assembly (PCBA), a memory PCBA, a solid-state storage drive (SSD), and a cooling fan')],
  liaison_reseau:['port_parmi_autres',q('On the side of the KVM Switch are numerous USB ports, and on the rear of the enclosure are two RJ-45 Ethernet ports, three HDMI ports, and two coaxial connectors.')],
  appareil_hote:['ordinateur',q('to interconnect peripherals, such as a keyboard, display, mouse, and more, to an automatic data processing machine')]}));

D('N334999','Adaptateur de prise en cube, une fiche et trois prises',
 q=>q('The merchandise under consideration is identified as the Plug Adapter, PN 115825','or other electrical apparatus inside the plug'),
 q=>({fonction_principale:['alimenter',q('the Plug Adapter has electrical tabs and contacts that allow for external plugs to be inserted to receive power')],
  construction_passive:['bloc_fiches_prises',q('a plastic cube having one male Type-B three-prong plug on one side, and one female Type-B electrical socket each on three corresponding sides')],
  convertit_courant:[false,q('there are no fuses, switches, or other electrical apparatus inside the plug')],
  electronique_active:[false,q('there are no fuses, switches, or other electrical apparatus inside the plug')],
  prises_secteur_sortie:[true,q('one female Type-B electrical socket each on three corresponding sides')]}));

D('N339123','Adaptateur modulaire DB25 mâle vers deux prises RJ45',
 q=>q('The merchandise under consideration is identified as the Modular Adapter','according to their specific design.'),
 q=>({construction_passive:['bloc_fiches_prises',q('a disassembled electrical connector having a plastic housing with two female RJ45 sockets on one side, and a male DB25 connector on the other side')]}));

D('N342905','Bloc de secours à trois piles alcalines AAA, fiche micro-USB',
 q=>q('The Pop Charger is described as an emergency battery pack','need to be replaced once they are depleted.'),
 q=>({fonction_principale:['alimenter',q('The Pop Charger is described as an emergency battery pack with a nominal capacity of 1000 mAh and an output voltage of 5 VDC at 0.8 A.')],
  batterie_integree:['non_rechargeable',q('three non-rechargeable AAA alkaline batteries')],
  genere_electricite:[false,q('Since the battery pack does not have a charging port, the AAA batteries need to be replaced once they are depleted.')],
  prises_secteur_sortie:[false,q('consisting of a plastic housing, a male micro-USB connector, and three non-rechargeable AAA alkaline batteries')]}));

D('N343619','Chargeur mural à deux ports USB avec veilleuse LED',
 q=>q('The merchandise under consideration is identified as the Dual USB Charger + Night Light Plug-in','to receive converted DC power.'),
 q=>({convertit_courant:[true,q('users can plug electrical devices into the USB sockets to receive converted DC power')],
  genere_electricite:[false,q('In use, the Charger is plugged into a standard wall outlet')],
  prises_secteur_sortie:[false,q('a plastic housing with LED night lights, two USB Type-A output sockets, and a two prong wall plug')]}));

D('N346959','Bloc batterie lithium-ion rechargeable pour trottinette-valise',
 q=>q('The merchandise under consideration is referred to as a rechargeable lithium-ion battery pack','such as tablets and smartphones.'),
 q=>({fonction_principale:['alimenter',q('which is described as a portable device for storing and supplying electricity')],
  batterie_integree:['lithium_ion',q('referred to as a rechargeable lithium-ion battery pack')],
  prises_secteur_sortie:[false,q('enclosed in a rectangular housing with a built-in USB-C cable, DC connector port, RC connector port, power button, and LED indicator lights')]}));

D('N349433','Adaptateur secteur à cordon USB-C fixe',
 q=>q('The merchandise under consideration is referred to as the Power Adapter (Adapter), Part Number 115867','to various machines of the user'),
 q=>({fonction_principale:['alimenter',q('In use, the Adapter is intended to be plugged into a wall outlet where the USB-C plug delivers power to various machines')],
  convertit_courant:[true,q('plastic housing containing circuitry to electrically convert AC to DC')],
  genere_electricite:[false,q('the Adapter is intended to be plugged into a wall outlet')],
  prises_secteur_sortie:[false,q('The Adapter has a Type-A two-prong AC male plug on one side and a permanently affixed','with a male USB-C plug')]}));

D('N349898','Supports muraux et de bureau pour tablette, avec adaptateur réseau',
 q=>q('The first item under consideration is identified as the SURFACE MOUNT System iPadA16BK','charging port alignments.'),
 q=>({fonction_principale:['porter_completer',q('an aluminum bezel that is used to encase a tablet personal computer (PC) and provide a physical mounting capability on a wall or flat surface')],
  appareil_hote:['ordinateur',q('The SURFACE MOUNT System iPadA16BK is specifically designed for the tablet PC by positioning microphone/speaker holes and charging port alignments.')]}));

D('N352984','Boîtier externe de carte graphique (eGPU) avec ports d\'accueil',
 q=>q('The merchandise under consideration is identified as the AORUS RTX 5090 AI Box','of a host desktop or laptop.'),
 q=>({fonction_principale:['porter_completer',q('described as an external graphics processing unit (eGPU), designed to enhance the computational and graphical performance of a host desktop or laptop')],
  appareil_hote:['ordinateur',q('designed to enhance the computational and graphical performance of a host desktop or laptop')],
  electronique_active:[true,q('also provides docking functionality by expanding input/output connectivity')],
  liaison_reseau:['port_parmi_autres',q('expanding input/output connectivity with one ethernet port','type-A ports')]}));

D('N356371','Câble audio auxiliaire jack 3,5 mm pour casque d\'aviation',
 q=>q('The merchandise under consideration is identified by part number 301-00002-000.A2','without relying on a Bluetooth connection.'),
 q=>({fonction_principale:['transmettre_signaux',q('You state that the cable allows the pilot to connect their smartphone or other audio inputs to the aviation headset.')],
  construction_passive:['cable_connecteurs',q('The part is comprised of a length of insulated cable with a 3.5mm audio connector at each end.')]}));

D('N356452','Rallonge électrique à deux prises secteur et trois ports USB',
 q=>q('The merchandise under consideration is identified as the USB-Charging Extension Cord','The device is used to power and charge various devices.'),
 q=>({fonction_principale:['alimenter',q('The device is used to power and charge various devices.')],
  convertit_courant:[true,q('Within the enclosure are the necessary electrical components that protect and convert the electrical power signals.')],
  genere_electricite:[false,q('a braided power cord terminated at one end with a standard electrical wall plug')],
  prises_secteur_sortie:[true,q('a plastic housing, which incorporates two standard AC receptacles as well as three USB charging ports')]}));

D('N356502','Câbles adaptateurs Lightning, USB-C et USB-A pour casque d\'aviation',
 q=>q('There are three cables at issue with this request.','a USB A connector on the other end.'),
 q=>({fonction_principale:['transmettre_signaux',q('to smartphones, tablets, and various other input devices in order to listen to music, make phone calls, and listen to navigational alerts via the headsets')],
  construction_passive:['cable_connecteurs',q('This cable consists of a length of insulated conductors with a Universal Accessory Connector (UAC) on one end and a Lightning connector on the other end.')]}));

D('N359212','Adaptateur secteur 120 V vers 12 V continu pour réveil',
 q=>q('The merchandise under consideration is identified as an AC Adaptor, model number ACX012','an optional pillow vibrator device.'),
 q=>({fonction_principale:['alimenter',q('describe as a power adapter used exclusively with the Futuristic Alarm Clock')],
  convertit_courant:[true,q('The power adapter is designed to convert 120V AC to 12V DC with a maximum output under 50 Watts.')],
  genere_electricite:[false,q('a 2-prong power plug for household electrical outlets')],
  prises_secteur_sortie:[false,q('It is comprised of a 2-prong power plug for household electrical outlets and a female output port for connecting DC power plugs.')],
  appareil_hote:['autre',q('a power adapter used exclusively with the Futuristic Alarm Clock')]}));

D('N359291','Chargeur autonome pour batterie de casque d\'aviation',
 q=>q('The merchandise under consideration is identified as Assembly, Battery Charger','a USB-C port for charging cables.'),
 q=>({fonction_principale:['alimenter',q('which is a standalone battery charger for the lithium-ion battery exclusively used in Lightspeed Delta Zulu aviation headsets')],
  batterie_integree:['aucune',q('We note that the lithium-ion battery is not imported with the subject battery charger.')],
  appareil_hote:['autre',q('the lithium-ion battery exclusively used in Lightspeed Delta Zulu aviation headsets')]}));

D('N360577','Ensemble chargeur porté au cou, station d\'accueil et étui pour implant',
 q=>q('The charger is a wireless device that is worn around the neck.','to program the implant during clinic visits.'),
 q=>({fonction_principale:['aucune_dominante',q('the charger is used to both charge the implant and to transmit and receive data to and from the implant')],
  batterie_integree:['lithium_ion',q('It contains a rechargeable lithium-ion battery and a Bluetooth radio transceiver.')],
  appareil_hote:['autre',q('intended solely for use with the SetPoint System, which is an implantable neuro stimulation medical device')]}));

D('N363538','Batterie externe lithium-ion à quatre ports USB',
 q=>q('The merchandise under consideration is the Green Cell PowerPlay Ultra Power Bank','compatible with various fast charging technologies.'),
 q=>({fonction_principale:['alimenter',q('marketed and sold as a multi-port power bank for charging laptops, tablets, cameras, smartphones, and similar devices')],
  batterie_integree:['lithium_ion',q('The power bank uses lithium-ion chemistry')],
  prises_secteur_sortie:[false,q('a compact rectangular case with two USB-C ports, two USB-A ports, and LED indicators')]}));

for(const d of out) d.description=d.description.trim();
fs.writeFileSync(R+'essais/arbre/annot/annot-05.json',JSON.stringify(out,null,1)+'\n');
console.log('écrit',out.length);
