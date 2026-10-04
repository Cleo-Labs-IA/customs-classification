// Met en anglais le texte AFFICHÉ de public/data/arbre.json, decisions.json et textes.json.
//
//   node essais/arbre/traduire-en.mjs             traduit et réécrit les trois fichiers
//   node essais/arbre/traduire-en.mjs --controle  ne modifie rien : compare les fichiers à git HEAD, champs
//                                                 affichés mis à part, et cherche le français restant
//
// À relancer après appliquer-corrections.mjs, assembler.mjs ou construire-textes.mjs, qui régénèrent du
// français. Le script est déterministe et sans réseau : une table français -> anglais par champ. Une chaîne
// déjà anglaise est laissée telle quelle ; une chaîne française absente de la table est signalée, laissée
// en français, et le script sort en erreur (code 1) pour qu'on complète la table.
//
// Ce qui n'est jamais touché : ids, "critere", "type", "v", "branches", "code", "base", "racine", "niveau",
// les "criteres" des décisions (valeur, citation, appui), "description" et "motifs" des décisions, et le
// "texte" de textes.json, qui sont des citations mot pour mot.
//
// Vocabulaire : celui de la version anglaise de la nomenclature combinée (heading, subheading, note 6(C),
// rule 3(b)) ; les libellés de codes reprennent les termes anglais de textes.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TABLES = {
  "titre": {
    "Chargeurs, batteries externes, stations d'accueil, hubs, adaptateurs et câbles pour ordinateurs et téléphones":
      "Chargers, power banks, docking stations, hubs, adapters and cables for computers and phones",
  },
  "perimetre": {
    "Alimentations et chargeurs pour appareils électroniques (adaptateurs secteur, chargeurs USB, chargeurs sans fil, batteries externes), stations d'accueil, réplicateurs de ports, hubs USB, adaptateurs de connexion et câbles munis de connecteurs pour ordinateurs et téléphones, pour des tensions n'excédant pas 1 000 V.":
      "Power supplies and chargers for electronic devices (mains adapters, USB chargers, wireless chargers, power banks), docking stations, port replicators, USB hubs, connection adapters and cables fitted with connectors for computers and phones, for a voltage not exceeding 1 000 V.",
  },
  "nomenclature": {
    "Nomenclature combinée 2026 (règlement d'exécution (UE) 2025/1926)":
      "Combined Nomenclature 2026 (Implementing Regulation (EU) 2025/1926)",
  },
  "critere.libelle": {
    "Fonction principale":
      "Principal function",
    "Produit sa propre électricité":
      "Generates its own electricity",
    "Batterie qui alimente d'autres appareils":
      "Battery that powers other devices",
    "Convertit le courant":
      "Converts the current",
    "Prises secteur en sortie":
      "Mains socket outlets",
    "Électronique active sur le signal":
      "Active electronics on the signal",
    "Construction du produit sans électronique":
      "Construction of the product without electronics",
    "Liaison réseau ou de communication":
      "Network or communication link",
    "Appareil auquel il se raccorde":
      "Device it connects to",
  },
  "critere.question": {
    "Quelle fonction la fiche technique et l'emballage annoncent-ils en premier pour ce produit ?":
      "Which function do the datasheet and the packaging state first for this product?",
    "Le produit fabrique-t-il lui-même son électricité (panneau solaire, dynamo, manivelle) ?":
      "Does the product generate its own electricity (solar panel, dynamo, hand crank)?",
    "Le produit contient-il une batterie ou des piles dont l'énergie est restituée à l'appareil branché, et de quel type ?":
      "Does the product contain a battery or cells whose energy is delivered to the connected device, and of what type?",
    "Le produit change-t-il la nature du courant (alternatif vers continu, continu vers continu, charge par induction avec redressement) ?":
      "Does the product change the nature of the current (alternating to direct, direct to direct, inductive charging with rectification)?",
    "Le produit offre-t-il aussi des prises secteur de sortie (multiprise, rallonge) en plus de ses ports de charge ?":
      "Does the product also provide mains socket outlets (power strip, extension lead) in addition to its charging ports?",
    "Le produit contient-il une puce ou un circuit qui convertit, régénère, répartit ou commute le signal ?":
      "Does the product contain a chip or a circuit that converts, regenerates, distributes or switches the signal?",
    "Comment le produit sans électronique est-il construit ?":
      "How is the product without electronics constructed?",
    "Quelles interfaces de réseau ou de communication le produit porte-t-il (Ethernet, Wi-Fi, Bluetooth, réseau mobile, liaison série, émetteurs-récepteurs sur fibre ou cuivre) ?":
      "Which network or communication interfaces does the product carry (Ethernet, Wi-Fi, Bluetooth, mobile network, serial link, transceivers on fibre or copper)?",
    "D'après la fiche, pour quels appareils le produit est-il annoncé (port amont, pilotes, compatibilité) ?":
      "According to the datasheet, for which devices is the product stated (upstream port, drivers, compatibility)?",
  },
  "critere.aide": {
    "Relever le nom commercial et la première ligne de la fiche. La réponse est un fait de présentation ; la conclusion de droit (fonction principale, caractère essentiel) appartient au nœud et aux textes qu'il cite.":
      "Record the trade name and the first line of the datasheet. The answer is a fact of presentation; the legal conclusion (principal function, essential character) belongs to the node and to the texts it cites.",
    "Oui pour un chargeur solaire ou à manivelle ; non pour un produit qui se recharge ou s'alimente sur une prise, un port USB ou un allume-cigare.":
      "Yes for a solar or hand-crank charger; no for a product that is recharged or powered from a mains socket, a USB port or a cigarette lighter socket.",
    "La technologie et la capacité (mAh, Wh) figurent sur l'étiquette de la batterie ou sur sa fiche de données de sécurité.":
      "The technology and the capacity (mAh, Wh) appear on the battery label or on its safety data sheet.",
    "Convertisseur si la fiche indique une sortie en courant continu (par exemple entrée 100-240 V alternatif, sortie 5 V continu ; entrée 12 V continu, sortie 5 V continu). Transformateur si l'entrée et la sortie sont toutes deux alternatives. Non pour un câble de charge ou un adaptateur de prise de voyage sans électronique.":
      "Converter if the datasheet states a direct current output (for example input 100-240 V alternating current, output 5 V direct current; input 12 V direct current, output 5 V direct current). Transformer if the input and the output are both alternating current. No for a charging cable or a travel plug adapter without electronics.",
    "Oui pour une rallonge ou un bloc multiprise avec ports USB ; non pour un chargeur qui n'a que des ports USB, un câble fixe ou une surface de charge.":
      "Yes for an extension lead or a power strip with USB ports; no for a charger that has only USB ports, a fixed cable or a charging surface.",
    "Non pour un câble ou un adaptateur qui ne fait que relier les contacts ; oui pour un hub, une station d'accueil, un convertisseur de format vidéo, un câble à émetteurs-récepteurs.":
      "No for a cable or an adapter that only connects the contacts; yes for a hub, a docking station, a video format converter, a cable with transceivers.",
    "La coupe du câble et le type de connecteurs (clips automobiles, par exemple) se lisent sur le plan ou la fiche technique.":
      "The cross-section of the cable and the type of connectors (automotive clips, for example) can be read from the drawing or the datasheet.",
    "Relever les ports de la fiche, type par type, sans compter le raccordement à l'appareil hôte.":
      "Record the ports in the datasheet, type by type, without counting the connection to the host device.",
    "La liste des systèmes compatibles et le type de port amont figurent sur la fiche produit. Une compatibilité annoncée n'établit pas à elle seule l'usage exclusif ou principal qu'exige la note 6 C) 1) du chapitre 84.":
      "The list of compatible systems and the type of upstream port appear in the product datasheet. A stated compatibility does not by itself establish the sole or principal use required by note 6(C)(1) to Chapter 84.",
  },
  "valeur.libelle": {
    "Fournir de l'énergie à un autre appareil : l'alimenter, le charger ou stocker du courant pour lui":
      "Supply energy to another device: power it, charge it or store electricity for it",
    "Faire passer des données, de la vidéo ou du son entre des appareils (câble, adaptateur, hub, station d'accueil, clé réseau)":
      "Carry data, video or sound between devices (cable, adapter, hub, docking station, network dongle)",
    "Porter un appareil ou lui servir de surface (support, cadre mural, tapis de souris)":
      "Hold a device or serve as a surface for it (stand, wall frame, mouse pad)",
    "Autre chose (chauffer, éclairer, diffuser du son)":
      "Something else (heating, lighting, playing sound)",
    "Plusieurs fonctions annoncées, sans que la fiche en place une devant les autres":
      "Several functions stated, with none placed ahead of the others in the datasheet",
    "Aucune batterie ni pile":
      "No battery or cells",
    "Batterie rechargeable lithium-ion ou lithium-polymère":
      "Rechargeable lithium-ion or lithium-polymer battery",
    "Batterie rechargeable au plomb, au nickel-cadmium ou au nickel-hydrure métallique":
      "Rechargeable lead-acid, nickel-cadmium or nickel-metal hydride battery",
    "Batterie rechargeable d'une technologie que la nomenclature ne nomme pas (ni lithium-ion, ni plomb, ni nickel-cadmium, ni nickel-hydrure métallique)":
      "Rechargeable battery of a technology that the nomenclature does not name (not lithium-ion, lead-acid, nickel-cadmium or nickel-metal hydride)",
    "Piles non rechargeables (alcalines)":
      "Non-rechargeable cells (alkaline)",
    "Non : le produit relie des contacts ou conduit le courant sans le modifier":
      "No: the product connects contacts or conducts the current without modifying it",
    "Oui : alternatif vers continu, continu vers continu (12 V vers 5 V) ou charge par induction avec redressement":
      "Yes: alternating to direct current, direct to direct current (12 V to 5 V) or inductive charging with rectification",
    "Il abaisse ou élève seulement une tension alternative, sans la redresser (transformateur)":
      "It only steps an alternating voltage down or up, without rectifying it (transformer)",
    "Câble souple à conducteurs isolés, muni de connecteurs (USB, Lightning, HDMI, jack, alimentation)":
      "Flexible cable of insulated conductors, fitted with connectors (USB, Lightning, HDMI, jack, power)",
    "Câble coaxial muni de connecteurs (âme centrale entourée d'un second conducteur)":
      "Coaxial cable fitted with connectors (central core surrounded by a second conductor)",
    "Câble ou faisceau conçu pour être monté dans un véhicule, un avion ou un bateau":
      "Cable or wiring set designed to be fitted in a vehicle, an aircraft or a ship",
    "Câble de fibres optiques dont chaque fibre est gainée individuellement, sans émetteur-récepteur":
      "Optical fibre cable in which each fibre is individually sheathed, without a transceiver",
    "Bloc rigide de fiches et de prises sans longueur de câble, sans interrupteur ni fusible":
      "Rigid block of plugs and sockets with no length of cable, no switch and no fuse",
    "Boîtier à boutons mécaniques qui sélectionne une entrée":
      "Box with mechanical buttons that selects an input",
    "Aucune interface réseau ni radio":
      "No network or radio interface",
    "Une ou plusieurs interfaces réseau à côté de ports pour écrans ou périphériques (relever le nombre de chaque type), ou une interface réservée aux mises à jour":
      "One or more network interfaces alongside ports for displays or peripherals (record the number of each type), or an interface reserved for updates",
    "En dehors du raccordement à l'appareil hôte, uniquement des interfaces réseau ou de communication (modem, adaptateur Ethernet, Wi-Fi ou Bluetooth, convertisseur USB vers liaison série, câble à émetteurs-récepteurs)":
      "Apart from the connection to the host device, only network or communication interfaces (modem, Ethernet, Wi-Fi or Bluetooth adapter, USB to serial converter, cable with transceivers)",
    "Des ordinateurs ou des tablettes, sans autre appareil annoncé (compatibilité Windows, macOS, Linux, port hôte USB ou Thunderbolt)":
      "Computers or tablets, with no other device stated (Windows, macOS, Linux compatibility, USB or Thunderbolt host port)",
    "Des ordinateurs et aussi d'autres appareils (téléphone, téléviseur, console)":
      "Computers and also other devices (phone, television, console)",
    "Des appareils audio ou vidéo en général (téléviseur, décodeur, lecteur, caméra)":
      "Audio or video devices in general (television, set-top box, player, camera)",
    "Un autre appareil seulement (téléphone, véhicule, console de jeux, appareil médical)":
      "Another device only (phone, vehicle, games console, medical device)",
  },
  "noeud.pourquoi": {
    "Quand un produit réunit plusieurs machines ou plusieurs fonctions, la note 3 de la section XVI le classe, sauf contexte contraire, selon la fonction principale. Pour un objet composite qui n'est pas une machine, la règle 3 b) retient le composant qui donne le caractère essentiel, si la règle 3 a) ne suffit pas. Limite : la règle 1 fait passer les termes des positions avant ce test, et un produit à fonction unique (câble, bloc de fiches, batterie seule) n'a pas de fonction principale à établir ; l'arbre pose pourtant cette question à tous les produits et prend pour indice la fonction que la fiche annonce en premier.":
      "Where a product combines several machines or several functions, note 3 to Section XVI classifies it, unless the context otherwise requires, according to the principal function. For a composite article that is not a machine, rule 3(b) takes the component which gives the essential character, if rule 3(a) is not sufficient. Limit: rule 1 puts the terms of the headings before this test, and a single-function product (cable, block of plugs, battery alone) has no principal function to establish; the tree nevertheless asks this question of every product and takes as an indication the function that the datasheet states first.",
    "Un chargeur qui produit son courant réunit un générateur et d'autres fonctions ; la note 3 de la section XVI le classe selon la fonction principale, que cet arbre ne départage pas.":
      "A charger that generates its own current combines a generator and other functions; note 3 to Section XVI classifies it according to the principal function, which this tree does not decide.",
    "Le 8507 couvre les accumulateurs, y compris présentés avec des composants auxiliaires qui contribuent à stocker et à fournir l'énergie ou qui les protègent (note 3 du chapitre 85) ; la règle 6 départage ensuite les sous-positions de même niveau selon la technologie. Limite : la note ne cite ni convertisseur ni onduleur parmi ces composants, et l'arbre ne compare pas le 8504 et le 8507 pour une station d'énergie à sorties secteur.":
      "Heading 8507 covers electric accumulators, including those presented with ancillary components which contribute to storing and supplying energy or protect them from damage (note 3 to Chapter 85); rule 6 then decides between subheadings at the same level according to the technology. Limit: the note cites neither a converter nor an inverter among these components, and the tree does not compare headings 8504 and 8507 for a power station with mains outputs.",
    "Le 8504 vise les transformateurs, les convertisseurs statiques et les bobines d'induction ; le 8504 40 ne reçoit que les convertisseurs statiques (règle 6). Un produit qui ne fait que relier des contacts est un câble du 8544 ou un appareillage de connexion du 8536.":
      "Heading 8504 covers electrical transformers, static converters and inductors; subheading 8504 40 takes only static converters (rule 6). A product that only connects contacts is a cable of heading 8544 or connection apparatus of heading 8536.",
    "Un bloc qui réunit plusieurs prises du 8536 pour distribuer le courant peut relever d'une autre position ; avec un convertisseur, c'est une machine composite au sens de la note 3 de la section XVI, que cet arbre ne départage pas.":
      "A block that combines several sockets of heading 8536 to distribute the current may fall under another heading; with a converter, it is a composite machine within the meaning of note 3 to Section XVI, which this tree does not decide.",
    "Le 8544 couvre les conducteurs isolés munis ou non de connecteurs et le 8536 l'appareillage qui raccorde ou commute des circuits. Un produit qui traite le signal n'est décrit par aucun de ces deux libellés et se classe selon sa fonction.":
      "Heading 8544 covers insulated conductors whether or not fitted with connectors, and heading 8536 the apparatus for making connections to or switching electrical circuits. A product that processes the signal is described by neither of these two heading texts and is classified according to its function.",
    "La règle 1 classe selon les termes des positions : le 8544 vise les fils et câbles isolés munis ou non de connecteurs, le 8536 les fiches, prises et interrupteurs, et la règle 6 départage ensuite les sous-positions de même niveau.":
      "Rule 1 classifies according to the terms of the headings: heading 8544 covers insulated wire and cable whether or not fitted with connectors, heading 8536 plugs, sockets and switches, and rule 6 then decides between subheadings at the same level.",
    "La note 6 D) 2) du chapitre 84 écarte du 8471 les appareils de transmission ou de réception de données présentés isolément, même s'ils remplissent les conditions de la note 6 C) ; quand cette fonction côtoie d'autres fonctions, la note 3 de la section XVI retient la fonction principale. Lecture retenue par cet arbre, tirée de décisions et non du texte de la note : un hub, une station d'accueil ou un adaptateur d'affichage sans interface réseau n'est pas traité comme un appareil de transmission (H348342, N292574). La décision N289786 lit la note dans l'autre sens.":
      "Note 6(D)(2) to Chapter 84 excludes from heading 8471 apparatus for the transmission or reception of data when presented separately, even if it meets the conditions of note 6(C); where this function sits alongside other functions, note 3 to Section XVI takes the principal function. Reading adopted by this tree, drawn from rulings and not from the text of the note: a hub, a docking station or a display adapter without a network interface is not treated as transmission apparatus (H348342, N292574). Ruling N289786 reads the note the other way.",
    "La note 6 C) du chapitre 84 tient pour unité du 8471 l'article qui remplit trois conditions à la fois : être du type utilisé exclusivement ou principalement dans un système informatique, être connectable à l'unité centrale, et pouvoir recevoir ou fournir des données sous une forme utilisable par le système. Un appareil qui exerce une fonction propre autre que le traitement de l'information suit la note 6 E). L'arbre ne contrôle que la première condition, par les appareils que la fiche annonce.":
      "Note 6(C) to Chapter 84 regards as a unit of heading 8471 the article that meets three conditions at once: being of a kind solely or principally used in an automatic data-processing system, being connectable to the central processing unit, and being able to accept or deliver data in a form which can be used by the system. Apparatus performing a specific function other than data processing follows note 6(E). The tree checks only the first condition, through the devices that the datasheet states.",
    "Le 8473 reçoit les parties et accessoires propres à être utilisés exclusivement ou principalement avec les machines des positions 8470 à 8472, housses et étuis exclus, et le 8473 30 ceux des machines du 8471. La note 2 de la section XVI ne joue que sous réserve de la note 1 et ne traite que des parties, pas des accessoires. Limite : l'arbre ne contrôle pas les exclusions de la note 1 (un support en métal peut être une partie d'usage général, note 1 g)).":
      "Heading 8473 takes parts and accessories suitable for use solely or principally with machines of headings 8470 to 8472, other than covers and carrying cases, and subheading 8473 30 those of the machines of heading 8471. Note 2 to Section XVI applies only subject to note 1 and deals only with parts, not with accessories. Limit: the tree does not check the exclusions of note 1 (a metal stand may be a part of general use, note 1(g)).",
  },
  "noeud.libelle": {
    "Convertisseurs statiques":
      "Static converters",
    "Accumulateurs au lithium-ion":
      "Lithium-ion accumulators",
    "Autres accumulateurs":
      "Other accumulators",
    "Autres conducteurs électriques, pour tensions n'excédant pas 1 000 V, munis de pièces de connexion":
      "Other electric conductors, for a voltage not exceeding 1 000 V, fitted with connectors",
    "Fiches et prises de courant, autres, pour une tension n'excédant pas 1 000 V":
      "Plugs and sockets, other, for a voltage not exceeding 1 000 V",
    "Appareils pour la réception, la conversion et l'émission, la transmission ou la régénération de la voix, d'images ou d'autres données, y compris les appareils de commutation et de routage":
      "Machines for the reception, conversion and transmission or regeneration of voice, images or other data, including switching and routing apparatus",
    "Autres unités de machines automatiques de traitement de l'information":
      "Other units of automatic data-processing machines",
    "Autres machines et appareils électriques ayant une fonction propre, non dénommés ni compris ailleurs dans le chapitre 85":
      "Other electrical machines and apparatus, having individual functions, not specified or included elsewhere in Chapter 85",
    "Parties et accessoires des machines du n° 8471":
      "Parts and accessories of the machines of heading 8471",
  },
  "noeud.motif": {
    "Un appareil qui transforme le courant reçu pour alimenter ou charger (adaptateur secteur, chargeur USB, chargeur de voiture, chargeur à induction) est un convertisseur statique du 8504 40, quel que soit l'appareil auquel il est destiné : pour l'ordinateur, la note 6 E) du chapitre 84 renvoie à la position de la fonction propre.":
      "An appliance that converts the current it receives in order to power or charge (mains adapter, USB charger, car charger, inductive charger) is a static converter of subheading 8504 40, whatever the device it is intended for: for the computer, note 6(E) to Chapter 84 refers to the heading appropriate to the specific function.",
    "Une batterie externe reste un accumulateur du 8507 lorsqu'elle est présentée avec des composants auxiliaires qui contribuent à stocker et fournir l'énergie ou qui la protègent (connecteurs, contrôle de température, protection des circuits) ; ses éléments lithium-ion la placent au 8507 60.":
      "A power bank remains an electric accumulator of heading 8507 when it is presented with ancillary components which contribute to storing and supplying energy or protect it from damage (connectors, temperature control, circuit protection); its lithium-ion cells place it in subheading 8507 60.",
    "Une batterie externe rechargeable dont la technologie n'est nommée par aucune sous-position du 8507 relève de la sous-position résiduelle des autres accumulateurs. Le plomb, le nickel-cadmium et le nickel-hydrure métallique ont leurs propres sous-positions (8507 10, 8507 20, 8507 30 et 8507 50, lues dans la nomenclature combinée 2026 mais absentes du référentiel de textes) et sortent de cet arbre.":
      "A rechargeable power bank whose technology is not named by any subheading of heading 8507 falls under the residual subheading for other accumulators. Lead-acid, nickel-cadmium and nickel-metal hydride have their own subheadings (8507 10, 8507 20, 8507 30 and 8507 50, read in the Combined Nomenclature 2026 but absent from the text repository) and fall outside this tree.",
    "Un câble isolé muni de connecteurs qui ne fait que conduire le courant ou le signal répond au libellé du 8544 puis de la sous-position 8544 42, même s'il sert à la fois aux données et à la charge.":
      "An insulated cable fitted with connectors that only conducts the current or the signal meets the terms of heading 8544 and then of subheading 8544 42, even if it serves both data and charging.",
    "Un adaptateur sans câble ni électronique, dont le seul effet est d'établir une connexion entre deux formats de fiche ou de prise, est un appareillage de raccordement du 8536, sous-position des fiches et prises.":
      "An adapter without cable or electronics, whose only effect is to make a connection between two plug or socket formats, is connection apparatus of heading 8536, in the subheading for plugs and sockets.",
    "Un appareil qui reçoit, convertit et émet des données sur un réseau ou une liaison de communication, ou qui les régénère, est écarté du 8471 par la note 6 D) 2) du chapitre 84 et répond au libellé du 8517 62 ; celui qui ne fait que recevoir ou qu'émettre relève du 8517 69, hors de cet arbre. Le libellé du 8517 réserve aussi les appareils des positions 8443, 8525, 8527 et 8528.":
      "Apparatus that receives, converts and transmits data over a network or a communication link, or that regenerates them, is excluded from heading 8471 by note 6(D)(2) to Chapter 84 and meets the terms of subheading 8517 62; apparatus that only receives or only transmits falls under subheading 8517 69, outside this tree. The terms of heading 8517 also exclude the apparatus of headings 8443, 8525, 8527 and 8528.",
    "Un hub, une station d'accueil, un réplicateur de ports ou un adaptateur d'affichage actif qui relie l'ordinateur à ses périphériques est une autre unité du 8471 80, à condition de remplir les trois conditions de la note 6 C) et de ne pas tomber sous l'exclusion de la note 6 D), qui prime. Il ne saisit ni ne restitue lui-même les données (8471 60), ne les stocke pas (8471 70) et ne les traite pas (8471 50). Lecture retenue d'après des décisions (H348342, N292574) et non d'après le seul texte : la décision N289786 classe au contraire des adaptateurs d'affichage au 8517 62.":
      "A hub, a docking station, a port replicator or an active display adapter that connects the computer to its peripherals is another unit of subheading 8471 80, provided that it meets the three conditions of note 6(C) and does not fall under the exclusion of note 6(D), which prevails. It neither inputs nor outputs the data itself (8471 60), does not store them (8471 70) and does not process them (8471 50). Reading adopted on the basis of rulings (H348342, N292574) and not on the text alone: ruling N289786, on the contrary, classifies display adapters under 8517 62.",
    "Un appareil actif qui répartit, sélectionne ou convertit un signal entre équipements audio ou vidéo a une fonction propre. Le règlement (UE) n° 457/2014 écarte le 8536 parce que l'appareil répartit, amplifie ou traite le signal au lieu de seulement raccorder ou commuter un circuit. L'arbre écarte le 8517 62 faute d'interface de réseau ou de communication (question précédente) et le 8471 parce que la fiche n'annonce pas l'appareil pour un ordinateur (note 6 C)). Reste la position résiduelle 8543.":
      "An active appliance that distributes, selects or converts a signal between audio or video equipment has an individual function. Regulation (EU) No 457/2014 sets aside heading 8536 because the appliance distributes, amplifies or processes the signal instead of only connecting or switching a circuit. The tree sets aside subheading 8517 62 for lack of a network or communication interface (previous question) and heading 8471 because the datasheet does not state the appliance for a computer (note 6(C)). That leaves the residual heading 8543.",
    "Un article qui porte un ordinateur ou une tablette, ou lui sert de surface, et que la fiche n'annonce pour aucun autre appareil, est classé ici comme accessoire des machines du 8471, s'il n'est ni une housse ni un étui et s'il ne tombe pas sous une exclusion de la note 1 de la section XVI, que cet arbre ne contrôle pas.":
      "An article that holds a computer or a tablet, or serves as a surface for it, and that the datasheet states for no other device, is classified here as an accessory of the machines of heading 8471, if it is neither a cover nor a carrying case and if it does not fall under an exclusion of note 1 to Section XVI, which this tree does not check.",
    "La fonction principale n'est ni l'alimentation ni la connexion (chaufferette qui recharge aussi un téléphone, luminaire, enceinte) : le produit se classe selon cette fonction, dans une position que cet arbre ne couvre pas.":
      "The principal function is neither power supply nor connection (hand warmer that also recharges a phone, luminaire, loudspeaker): the product is classified according to that function, under a heading that this tree does not cover.",
    "Aucune fonction ne l'emporte : pour une machine du chapitre 84, la note 8 renvoie au 8479 ; sinon, après les règles 3 a) et 3 b), la règle 3 c) retient la dernière position parmi celles qui méritent également d'être retenues. Cet arbre ne fait pas ce calcul.":
      "No function prevails: for a machine of Chapter 84, note 8 refers to heading 8479; otherwise, after rules 3(a) and 3(b), rule 3(c) takes the heading which occurs last among those which equally merit consideration. This tree does not make that determination.",
    "Chargeur qui produit sa propre électricité (solaire, manivelle) : machine composite que cet arbre ne départage pas. La note 2 du chapitre 85 écarte les positions 8501 à 8504 pour les articles décrits au 8541 ; les textes des positions 8501 et 8541 ne sont pas dans le référentiel. La décision américaine N319727 retient le 8504 40 pour une borne de charge solaire à batterie.":
      "Charger that generates its own electricity (solar, hand crank): a composite machine that this tree does not decide. Note 2 to Chapter 85 excludes headings 8501 to 8504 for goods described in heading 8541; the texts of headings 8501 and 8541 are not in the repository. US ruling N319727 retains subheading 8504 40 for a solar charging station with a battery.",
    "Bloc de piles non rechargeables, ou accumulateur au plomb, au nickel-cadmium ou au nickel-hydrure métallique : le produit ne relève ni du 8507 60 ni du 8507 80. Les piles ne sont pas des accumulateurs du 8507 (la décision américaine N342905 retient le 8506 10) et les accumulateurs nommés ont leurs propres sous-positions. Aucun de ces textes n'est dans le référentiel : cet arbre ne les couvre pas.":
      "Pack of non-rechargeable cells, or lead-acid, nickel-cadmium or nickel-metal hydride accumulator: the product falls under neither subheading 8507 60 nor subheading 8507 80. Primary cells are not accumulators of heading 8507 (US ruling N342905 retains 8506 10) and the named accumulators have their own subheadings. None of these texts is in the repository: this tree does not cover them.",
    "Multiprise ou rallonge à prises secteur avec ports de charge : machine composite au sens de la note 3 de la section XVI. La décision américaine N356452 retient le 8537 10 pour une rallonge à deux prises et trois ports USB ; le texte de la position 8537 n'est pas dans le référentiel et cet arbre ne la couvre pas.":
      "Power strip or extension lead with mains sockets and charging ports: a composite machine within the meaning of note 3 to Section XVI. US ruling N356452 retains 8537 10 for an extension lead with two sockets and three USB ports; the text of heading 8537 is not in the repository and this tree does not cover it.",
    "Câble coaxial, jeu de fils pour véhicules ou câble de fibres optiques gainées individuellement : le produit reste dans le 8544 mais hors des sous-positions 8544 42 et 8544 49. Les sous-positions 8544 20, 8544 30 et 8544 70 ne sont pas dans le référentiel de textes et cet arbre ne les couvre pas.":
      "Coaxial cable, wiring set for vehicles or optical fibre cable made up of individually sheathed fibres: the product stays in heading 8544 but outside subheadings 8544 42 and 8544 49. Subheadings 8544 20, 8544 30 and 8544 70 are not in the text repository and this tree does not cover them.",
    "Sélecteur mécanique sans électronique : interrupteur de la sous-position 8536 50, non couverte par cet arbre.":
      "Mechanical selector without electronics: a switch of subheading 8536 50, not covered by this tree.",
    "Produit annoncé pour un téléphone, un véhicule, une console, un appareil médical, des appareils audio ou vidéo, ou pour plusieurs types d'appareils à la fois, et non pour le seul ordinateur. Pour les parties, la note 2 b) de la section XVI renvoie au 8517 celles des appareils des positions 8517 et 8525 à 8528 et au 8529 celles du 8524 ; les articles du chapitre 95 sortent de la section (note 1 p)). Les positions en concurrence (8517, 8522, 8529, 8537, 8543, 9504) dépendent de l'appareil hôte et cet arbre ne les départage pas.":
      "Product stated for a phone, a vehicle, a console, a medical device, audio or video devices, or for several types of device at once, and not for the computer alone. For parts, note 2(b) to Section XVI refers to heading 8517 those of the goods of headings 8517 and 8525 to 8528 and to heading 8529 those of heading 8524; articles of Chapter 95 fall outside the section (note 1(p)). The competing headings (8517, 8522, 8529, 8537, 8543, 9504) depend on the host device and this tree does not decide between them.",
    "Transformateur qui abaisse ou élève une tension alternative sans la redresser : il relève du 8504 mais pas des convertisseurs statiques du 8504 40. Ses sous-positions ne sont pas dans le référentiel de textes et cet arbre ne les couvre pas.":
      "Transformer that steps an alternating voltage down or up without rectifying it: it falls under heading 8504 but not under the static converters of subheading 8504 40. Its subheadings are not in the text repository and this tree does not cover them.",
  },
  "decision.produit": {
    "Câbles d'empilage Ethernet pour commutateurs réseau":
      "Ethernet stack cables for network switches",
    "Plaque de charge sans fil Qi avec adaptateur secteur":
      "Qi wireless charging pad with mains adapter",
    "Convertisseur vidéo SDI vers HDMI":
      "SDI to HDMI video converter",
    "Adaptateur Bluetooth pour enceintes ou chaîne audio":
      "Bluetooth adapter for loudspeakers or hi-fi system",
    "Adaptateur secteur 12 V à câble pour décodeur":
      "12 V mains adapter with cable for set-top box",
    "Station d'accueil pour smartphone avec écran, clavier et haut-parleurs":
      "Docking station for smartphone with screen, keyboard and loudspeakers",
    "Adaptateur secteur (redresseur) pour console de jeux":
      "Mains adapter (rectifier) for games console",
    "Répartiteur HDMI actif, une entrée et huit sorties":
      "Active HDMI splitter, one input and eight outputs",
    "Sélecteur HDMI actif, quatre entrées et une sortie":
      "Active HDMI switch, four inputs and one output",
    "Sélecteur HDMI passif à boutons-poussoirs, quatre entrées":
      "Passive push-button HDMI switch, four inputs",
    "Chargeur allume-cigare à deux ports USB":
      "Cigarette lighter charger with two USB ports",
    "Câble USB de 1 m pour données et charge":
      "1 m USB cable for data and charging",
    "Câble audio-vidéo pour console de jeux vidéo":
      "Audio-video cable for video games console",
    "Batterie externe lithium-ion à quatre ports USB":
      "Lithium-ion power bank with four USB ports",
    "Hub USB 3.0 à 7 ports (UH700)":
      "7-port USB 3.0 hub (UH700)",
    "Ensemble chargeur porté au cou, station d'accueil et étui pour implant":
      "Set of neck-worn charger, docking station and case for implant",
    "Chargeur autonome pour batterie de casque d'aviation":
      "Standalone charger for aviation headset battery",
    "Adaptateur secteur 120 V vers 12 V continu pour réveil":
      "120 V to 12 V direct current mains adapter for alarm clock",
    "Câbles adaptateurs Lightning, USB-C et USB-A pour casque d'aviation":
      "Lightning, USB-C and USB-A adapter cables for aviation headset",
    "Rallonge électrique à deux prises secteur et trois ports USB":
      "Extension lead with two mains sockets and three USB ports",
    "Câble audio auxiliaire jack 3,5 mm pour casque d'aviation":
      "3.5 mm jack auxiliary audio cable for aviation headset",
    "Boîtier externe de carte graphique (eGPU) avec ports d'accueil":
      "External graphics card enclosure (eGPU) with docking ports",
    "Station d'accueil USB Dell D3100":
      "Dell D3100 USB docking station",
    "Chargeurs USB pour allume-cigare et pour prise murale":
      "USB chargers for cigarette lighter socket and for wall socket",
    "Supports muraux et de bureau pour tablette, avec adaptateur réseau":
      "Wall and desk mounts for tablet, with network adapter",
    "Adaptateur secteur à cordon USB-C fixe":
      "Mains adapter with fixed USB-C cord",
    "Stations d'accueil universelles pour ordinateur portable et adaptateur USB vers HDMI":
      "Universal docking stations for laptop and USB to HDMI adapter",
    "Bloc batterie lithium-ion rechargeable pour trottinette-valise":
      "Rechargeable lithium-ion battery pack for scooter suitcase",
    "Plante artificielle en pot servant de station de charge USB":
      "Potted artificial plant serving as a USB charging station",
    "Chargeur mural à deux ports USB avec veilleuse LED":
      "Wall charger with two USB ports and LED night light",
    "Câbles cuivre à attache directe (DAC) munis d'émetteurs-récepteurs":
      "Direct attach copper (DAC) cables fitted with transceivers",
    "Bloc de secours à trois piles alcalines AAA, fiche micro-USB":
      "Backup pack with three AAA alkaline cells, micro-USB plug",
    "Adaptateur modulaire DB25 mâle vers deux prises RJ45":
      "Modular adapter, DB25 male to two RJ45 sockets",
    "Adaptateur de prise en cube, une fiche et trois prises":
      "Cube plug adapter, one plug and three sockets",
    "Commutateur clavier, écran et souris (KVM)":
      "Keyboard, video and mouse (KVM) switch",
    "Adaptateur allume-cigare 12 V à deux ports USB-A":
      "12 V cigarette lighter adapter with two USB-A ports",
    "Chauffe-mains électriques rechargeables faisant aussi batterie externe":
      "Rechargeable electric hand warmers also serving as power bank",
    "Chargeur mural à deux ports USB-A":
      "Wall charger with two USB-A ports",
    "Stations d'énergie portables à batterie lithium-ion":
      "Portable power stations with lithium-ion battery",
    "Câbles audio et vidéo munis de connecteurs (24 modèles)":
      "Audio and video cables fitted with connectors (24 models)",
    "Borne de recharge solaire pour téléphones, avec batterie":
      "Solar charging station for phones, with battery",
    "Câble adaptateur USB vers DB9 (RS-232) pour ventilateur médical":
      "USB to DB9 (RS-232) adapter cable for medical ventilator",
    "Support de téléphone combiné à un câble de charge rigide":
      "Phone holder combined with a rigid charging cable",
    "Alimentation régulée de 850 W pour machines de jeu":
      "850 W regulated power supply for gaming machines",
    "Stations d'accueil USB pour ordinateur, deux écrans et périphériques":
      "USB docking stations for computer, two displays and peripherals",
    "Bloc d'alimentation interne de 850 W pour ordinateur personnel":
      "850 W internal power supply unit for personal computer",
    "Démarreur de secours avec batterie portable, et batterie externe":
      "Jump starter with portable battery, and power bank",
    "Câble d'extension vidéo VGA/SVGA pour écran":
      "VGA/SVGA video extension cable for display",
    "Tapis de souris avec charge sans fil par induction":
      "Mouse pad with wireless inductive charging",
    "Cadre photo avec socle de charge sans fil":
      "Photo frame with wireless charging base",
    "Chauffe-mains rechargeable faisant aussi batterie externe":
      "Rechargeable hand warmer also serving as power bank",
    "Rangement de bureau à tiroirs avec socle de charge sans fil":
      "Desk organiser with drawers and wireless charging base",
    "Alimentation multi-sorties pour pédales d'effets d'instruments à cordes":
      "Multi-output power supply for stringed instrument effects pedals",
    "Chargeurs de batteries pour concentrateurs d'oxygène portables":
      "Battery chargers for portable oxygen concentrators",
    "Adaptateur d'alimentation par Ethernet pour machines de traitement de l'information":
      "Power over Ethernet adapter for automatic data-processing machines",
    "Alimentation 24 V pour concentrateur d'oxygène portable":
      "24 V power supply for portable oxygen concentrator",
    "Bloc d'alimentation en rack pour centres de données et serveurs":
      "Rack power supply unit for data centres and servers",
    "Adaptateur de prise secteur américaine vers européenne, sans électronique":
      "US to European mains plug adapter, without electronics",
    "Concentrateurs USB 3.0 avec ports de charge":
      "USB 3.0 hubs with charging ports",
    "Adaptateurs réseau sans fil USB et PCI-E":
      "USB and PCI-E wireless network adapters",
    "Chargeur à deux ports USB avec veilleuse LED":
      "Charger with two USB ports and LED night light",
    "Câble USB vers micro-USB gainé d'acier":
      "Steel-sheathed USB to micro-USB cable",
    "Batterie externe lithium-ion de 4000 mAh avec lampe intégrée":
      "4000 mAh lithium-ion power bank with built-in lamp",
    "Câbles USB-C et Lightning gainés de tissu":
      "Fabric-sheathed USB-C and Lightning cables",
    "Câbles USB à connecteurs automobiles, à installer dans un véhicule":
      "USB cables with automotive connectors, to be installed in a vehicle",
    "Boîtiers AUX/USB pour console de véhicule":
      "AUX/USB boxes for vehicle console",
    "Chargeur sans fil à induction pour console centrale automobile":
      "Wireless inductive charger for automotive centre console",
    "Étuis en plastique pour iPad avec récepteur de charge par induction":
      "Plastic cases for iPad with inductive charging receiver",
    "Câble audio/vidéo composante à cinq conducteurs coaxiaux":
      "Component audio/video cable with five coaxial conductors",
    "Adaptateur passif USB-C vers USB-A femelle sur câble":
      "Passive USB-C to USB-A female adapter on cable",
    "Adaptateur passif DVI vers HDMI sur câble court":
      "Passive DVI to HDMI adapter on short cable",
    "Câbles optiques actifs munis d'émetteurs-récepteurs":
      "Active optical cables fitted with transceivers",
    "Adaptateurs de format vidéo pour ordinateur":
      "Video format adapters for computer",
    "Câbles USB de rallonge pour faisceaux automobiles":
      "USB extension cables for automotive wiring harnesses",
    "Câble S-Vidéo de six pieds":
      "Six-foot S-Video cable",
    "Adaptateur DisplayPort vers VGA pour ordinateur Surface (décision à trois produits)":
      "DisplayPort to VGA adapter for Surface computer (ruling covering three products)",
    "Câble adaptateur audio en Y, jack 3,5 mm vers deux RCA":
      "Y audio adapter cable, 3.5 mm jack to two RCA",
    "Kits de charge avec batteries externes lithium-ion":
      "Charging kits with lithium-ion power banks",
    "Modem USB 4G LTE":
      "4G LTE USB modem",
    "Câbles cuivre passifs QSFP munis de connecteurs":
      "Passive QSFP copper cables fitted with connectors",
    "Câbles optiques actifs QSFP+ à émetteurs-récepteurs intégrés":
      "QSFP+ active optical cables with integrated transceivers",
    "Organiseur de bureau à trois ports USB relié à un ordinateur":
      "Desk organiser with three USB ports connected to a computer",
    "Modem USB externe 3G et 4G LTE":
      "External 3G and 4G LTE USB modem",
    "Chargeur mural USB à deux ports de 36 W":
      "36 W USB wall charger with two ports",
    "Câble USB de charge logé dans un pompon porte-clés":
      "USB charging cable housed in a keyring tassel",
    "Câble USB de charge logé dans un pompon en cuir porte-clés":
      "USB charging cable housed in a leather keyring tassel",
    "Batterie externe lithium-ion de 6000 mAh avec lampe intégrée":
      "6000 mAh lithium-ion power bank with built-in lamp",
  },
  "texte.ref": {
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 1":
      "General rules for the interpretation of the Combined Nomenclature, rule 1",
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 3 (phrase introductive)":
      "General rules for the interpretation of the Combined Nomenclature, rule 3 (introductory sentence)",
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 3 a)":
      "General rules for the interpretation of the Combined Nomenclature, rule 3(a)",
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 3 b)":
      "General rules for the interpretation of the Combined Nomenclature, rule 3(b)",
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 3 c)":
      "General rules for the interpretation of the Combined Nomenclature, rule 3(c)",
    "Règles générales pour l'interprétation de la nomenclature combinée, règle 6":
      "General rules for the interpretation of the Combined Nomenclature, rule 6",
    "Section XVI, note 1":
      "Section XVI, note 1",
    "Section XVI, note 1 g)":
      "Section XVI, note 1(g)",
    "Section XVI, note 1 p)":
      "Section XVI, note 1(p)",
    "Section XVI, note 2 (phrase introductive)":
      "Section XVI, note 2 (introductory sentence)",
    "Section XVI, note 2 a)":
      "Section XVI, note 2(a)",
    "Section XVI, note 2 b)":
      "Section XVI, note 2(b)",
    "Section XVI, note 2 c)":
      "Section XVI, note 2(c)",
    "Section XVI, note 3":
      "Section XVI, note 3",
    "Section XVI, note 4":
      "Section XVI, note 4",
    "Section XVI, note 5":
      "Section XVI, note 5",
    "Chapitre 84, note 6 (A)":
      "Chapter 84, note 6(A)",
    "Chapitre 84, note 6 (B)":
      "Chapter 84, note 6(B)",
    "Chapitre 84, note 6 (C), premier alinéa":
      "Chapter 84, note 6(C), first paragraph",
    "Chapitre 84, note 6 (C), deuxième alinéa":
      "Chapter 84, note 6(C), second paragraph",
    "Chapitre 84, note 6 (C), troisième alinéa":
      "Chapter 84, note 6(C), third paragraph",
    "Chapitre 84, note 6 (D)":
      "Chapter 84, note 6(D)",
    "Chapitre 84, note 6 (D) (2)":
      "Chapter 84, note 6(D)(2)",
    "Chapitre 84, note 6 (E)":
      "Chapter 84, note 6(E)",
    "Chapitre 84, note 8, premier alinéa":
      "Chapter 84, note 8, first paragraph",
    "Chapitre 84, note 8, deuxième alinéa":
      "Chapter 84, note 8, second paragraph",
    "Chapitre 85, note 2":
      "Chapter 85, note 2",
    "Chapitre 85, note 3":
      "Chapter 85, note 3",
    "Chapitre 85, note 5":
      "Chapter 85, note 5",
    "Position 8471":
      "Heading 8471",
    "Position 8473":
      "Heading 8473",
    "Position 8504":
      "Heading 8504",
    "Position 8507":
      "Heading 8507",
    "Position 8517":
      "Heading 8517",
    "Position 8536":
      "Heading 8536",
    "Position 8543":
      "Heading 8543",
    "Position 8544":
      "Heading 8544",
    "Sous-position 8471 30":
      "Subheading 8471 30",
    "Sous-positions 8471 41 et 8471 49 (tiret commun)":
      "Subheadings 8471 41 and 8471 49 (common dash)",
    "Sous-position 8471 41":
      "Subheading 8471 41",
    "Sous-position 8471 49":
      "Subheading 8471 49",
    "Sous-position 8471 50":
      "Subheading 8471 50",
    "Sous-position 8471 60":
      "Subheading 8471 60",
    "Sous-position 8471 70":
      "Subheading 8471 70",
    "Sous-position 8471 80":
      "Subheading 8471 80",
    "Sous-position 8473 30":
      "Subheading 8473 30",
    "Sous-position 8504 40":
      "Subheading 8504 40",
    "Sous-position 8507 60":
      "Subheading 8507 60",
    "Sous-position 8507 80":
      "Subheading 8507 80",
    "Sous-positions 8517 61 à 8517 69 (tiret commun)":
      "Subheadings 8517 61 to 8517 69 (common dash)",
    "Sous-position 8517 62":
      "Subheading 8517 62",
    "Sous-position 8517 69":
      "Subheading 8517 69",
    "Sous-positions 8536 61 et 8536 69 (tiret commun)":
      "Subheadings 8536 61 and 8536 69 (common dash)",
    "Sous-position 8536 69":
      "Subheading 8536 69",
    "Sous-position 8536 90":
      "Subheading 8536 90",
    "Sous-position 8543 70":
      "Subheading 8543 70",
    "Sous-positions 8544 42 et 8544 49 (tiret commun)":
      "Subheadings 8544 42 and 8544 49 (common dash)",
    "Sous-position 8544 42":
      "Subheading 8544 42",
    "Sous-position 8544 49":
      "Subheading 8544 49",
  },
  "texte.source": {
    "Règlement d'exécution (UE) 2025/1926 (NC 2026)":
      "Implementing Regulation (EU) 2025/1926 (CN 2026)",
  },
};

const racine = fileURLToPath(new URL('../../', import.meta.url));
const chemin = (f) => racine + 'public/data/' + f;

// Les champs affichés de chaque fichier : [table, objet porteur, clé].
function champs(fichier, data) {
  const out = [];
  if (fichier === 'arbre.json') {
    for (const k of ['titre', 'perimetre', 'nomenclature']) if (typeof data[k] === 'string') out.push([k, data, k]);
    for (const c of data.criteres || []) {
      for (const k of ['libelle', 'question', 'aide']) if (typeof c[k] === 'string') out.push(['critere.' + k, c, k]);
      for (const x of c.valeurs || []) if (typeof x.libelle === 'string') out.push(['valeur.libelle', x, 'libelle']);
    }
    for (const n of Object.values(data.noeuds || {})) for (const k of ['pourquoi', 'libelle', 'motif']) if (typeof n[k] === 'string') out.push(['noeud.' + k, n, k]);
  } else if (fichier === 'decisions.json') {
    for (const d of data) if (typeof d.produit === 'string') out.push(['decision.produit', d, 'produit']);
  } else if (fichier === 'textes.json') {
    for (const t of data) for (const k of ['ref', 'source']) if (typeof t[k] === 'string') out.push(['texte.' + k, t, k]);
  }
  return out;
}

const ANGLAIS = Object.fromEntries(Object.entries(TABLES).map(([k, o]) => [k, new Set(Object.values(o))]));
const FICHIERS = ['arbre.json', 'decisions.json', 'textes.json'];

// Même mise en forme que le fichier lu : retrait détecté, saut de ligne final conservé.
function lire(src) {
  const m = src.match(/\n( +)\S/);
  const retrait = m ? m[1].length : 2;
  const data = JSON.parse(src);
  const ecrire = (d) => JSON.stringify(d, null, retrait) + (src.endsWith('\n') ? '\n' : '');
  return { data, ecrire, fidele: ecrire(data) === src };
}

function traduire() {
  let manquants = 0;
  for (const f of FICHIERS) {
    const src = readFileSync(chemin(f), 'utf8');
    const { data, ecrire, fidele } = lire(src);
    if (!fidele) { console.error(`${f} : mise en forme non reproductible, fichier laissé intact`); manquants++; continue; }
    let traduits = 0, deja = 0;
    for (const [table, o, k] of champs(f, data)) {
      const v = o[k];
      if (Object.hasOwn(TABLES[table], v) && TABLES[table][v] !== v) { o[k] = TABLES[table][v]; traduits++; }
      else if (ANGLAIS[table].has(v)) deja++;
      else { manquants++; console.error(`SANS TRADUCTION ${f} [${table}] : ${v}`); }
    }
    const sortie = ecrire(data);
    if (sortie !== src) writeFileSync(chemin(f), sortie);
    console.log(`${f} : ${traduits} champs traduits, ${deja} déjà en anglais`);
  }
  if (manquants) { console.error(`${manquants} problème(s) : compléter les tables de traduire-en.mjs`); process.exit(1); }
}

const FRANCAIS = /[àâäçéèêëîïôöùûüÿœæ«»]|\b(le|la|les|des|du|un|une|et|ou|pour|avec|sans|dans|sur|est|sont|qui|que|au|aux|ne|pas|cet|cette|ces|son|ses|leur|par|entre|chargeur|batterie|prise|prises|position|positions|chapitre|fiche|appareil|appareils|autre|autres|aucune|produit|ordinateur)\b/i;

// Les sigles en capitales (AUX, USB, LED) ne sont pas des mots français.
const SIGLES = /\b[A-Z0-9]{2,}\b/g;

function controler() {
  let echecs = 0;
  for (const f of FICHIERS) {
    const actuel = JSON.parse(readFileSync(chemin(f), 'utf8'));
    const reference = JSON.parse(execFileSync('git', ['-C', racine, 'show', 'HEAD:public/data/' + f], { maxBuffer: 1 << 28 }).toString());
    const ca = champs(f, actuel), cr = champs(f, reference);
    const restes = ca.filter(([, o, k]) => FRANCAIS.test(o[k].replace(SIGLES, ""))).map(([t, o, k]) => `[${t}] ${o[k]}`);
    const horsTable = ca.filter(([t, o, k]) => !ANGLAIS[t].has(o[k])).length;
    const modifies = ca.filter(([, o, k], i) => cr[i] && cr[i][1][cr[i][2]] !== o[k]).length;
    // champs affichés neutralisés des deux côtés : tout le reste doit être identique, ordre des clés compris
    for (const [, o, k] of ca) o[k] = null;
    for (const [, o, k] of cr) o[k] = null;
    const identique = JSON.stringify(actuel) === JSON.stringify(reference) && ca.length === cr.length;
    if (!identique || restes.length || horsTable) echecs++;
    console.log(`${f} : hors champs affichés ${identique ? 'identique à git HEAD' : 'DIFFÉRENT de git HEAD'} ; ${ca.length} champs affichés, ${modifies} modifiés depuis HEAD, ${horsTable} hors table anglaise, ${restes.length} avec du français`);
    for (const r of restes) console.log('  français : ' + r);
  }
  process.exit(echecs ? 1 : 0);
}

if (process.argv.includes('--controle')) controler(); else traduire();
