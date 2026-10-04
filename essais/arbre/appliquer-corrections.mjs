// Applique les corrections issues de revue-textes.json et revue-rejeu.json à public/data/arbre.json
// et aux fiches annot/annot-*.json. Rejouable : relancer ne change plus rien après le premier passage.
// Chaque citation ajoutée est recontrôlée mot pour mot contre candidats.json (blancs réduits) ; un seul
// écart arrête tout avant écriture. Lancer ensuite assembler.mjs.
//
// Champ ajouté à chaque valeur annotée : « appui », qui dit sur quoi la valeur repose.
//   explicite    : le passage énonce le fait.
//   composition  : le passage est la phrase où la décision décrit de quoi l'article est fait ou équipé ;
//                  l'élément absent de cette description vaut « non » ou « aucune ».
//   alimentation : le passage dit d'où l'article tire son courant (prise, port, socle), d'où « ne produit
//                  pas son électricité ».
//   terme        : le passage nomme l'article par un mot que la question ou l'aide du critère range
//                  elle-même sous cette valeur (hub, station d'accueil, modem, charge par induction).
// Refusé : toute valeur tirée d'un raisonnement sur l'usage ou le nom sans l'un de ces quatre appuis.
import fs from 'node:fs';

const ici = (p) => new URL(p, import.meta.url);
const lire = (p) => JSON.parse(fs.readFileSync(ici(p), 'utf8'));
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const CAND = Object.fromEntries(lire('./candidats.json').map((c) => [c.id, c]));
const TEXTES = new Set(lire('../../public/data/textes.json').map((t) => t.id));
const pb = [];

// ───────────────────────────── 1. Arbre ─────────────────────────────
const arbre = lire('../../public/data/arbre.json');
const crit = (id) => arbre.criteres.find((c) => c.id === id);
const val = (c, v) => crit(c).valeurs.find((x) => x.v === v);
const N = arbre.noeuds;

arbre.nomenclature = "Nomenclature combinée 2026 (règlement d'exécution (UE) 2025/1926)";

// fonction_principale : libellés ramenés à ce que la fiche annonce, sans la conclusion de droit
Object.assign(crit('fonction_principale'), {
  question: "Quelle fonction la fiche technique et l'emballage annoncent-ils en premier pour ce produit ?",
  aide: "Relever le nom commercial et la première ligne de la fiche. La réponse est un fait de présentation ; la conclusion de droit (fonction principale, caractère essentiel) appartient au nœud et aux textes qu'il cite.",
});
val('fonction_principale', 'alimenter').libelle = "Fournir de l'énergie à un autre appareil : l'alimenter, le charger ou stocker du courant pour lui";
val('fonction_principale', 'porter_completer').libelle = 'Porter un appareil ou lui servir de surface (support, cadre mural, tapis de souris)';
val('fonction_principale', 'aucune_dominante').libelle = 'Plusieurs fonctions annoncées, sans que la fiche en place une devant les autres';

// batterie_integree : les technologies nommées par la nomenclature ne vont pas à la sous-position résiduelle
{
  const c = crit('batterie_integree');
  val('batterie_integree', 'autre_rechargeable').libelle = "Batterie rechargeable d'une technologie que la nomenclature ne nomme pas (ni lithium-ion, ni plomb, ni nickel-cadmium, ni nickel-hydrure métallique)";
  if (!c.valeurs.some((x) => x.v === 'rechargeable_nommee')) {
    c.valeurs.splice(c.valeurs.findIndex((x) => x.v === 'autre_rechargeable'), 0,
      { v: 'rechargeable_nommee', libelle: 'Batterie rechargeable au plomb, au nickel-cadmium ou au nickel-hydrure métallique' });
  }
}

// convertit_courant : la position 8504 distingue transformateurs et convertisseurs statiques
Object.assign(crit('convertit_courant'), {
  question: 'Le produit change-t-il la nature du courant (alternatif vers continu, continu vers continu, charge par induction avec redressement) ?',
  type: 'enum',
  valeurs: [
    { v: 'non', libelle: 'Non : le produit relie des contacts ou conduit le courant sans le modifier' },
    { v: 'convertisseur', libelle: 'Oui : alternatif vers continu, continu vers continu (12 V vers 5 V) ou charge par induction avec redressement' },
    { v: 'transformateur', libelle: 'Il abaisse ou élève seulement une tension alternative, sans la redresser (transformateur)' },
  ],
  aide: "Convertisseur si la fiche indique une sortie en courant continu (par exemple entrée 100-240 V alternatif, sortie 5 V continu ; entrée 12 V continu, sortie 5 V continu). Transformateur si l'entrée et la sortie sont toutes deux alternatives. Non pour un câble de charge ou un adaptateur de prise de voyage sans électronique.",
});

// construction_passive : conditions reprises du libellé du 8544
val('construction_passive', 'cable_connecteurs').libelle = 'Câble souple à conducteurs isolés, muni de connecteurs (USB, Lightning, HDMI, jack, alimentation)';
val('construction_passive', 'fibre_optique').libelle = 'Câble de fibres optiques dont chaque fibre est gainée individuellement, sans émetteur-récepteur';

// liaison_reseau : des interfaces que l'on compte, pas la place qu'elles « occupent »
Object.assign(crit('liaison_reseau'), {
  question: 'Quelles interfaces de réseau ou de communication le produit porte-t-il (Ethernet, Wi-Fi, Bluetooth, réseau mobile, liaison série, émetteurs-récepteurs sur fibre ou cuivre) ?',
  aide: 'Relever les ports de la fiche, type par type, sans compter le raccordement à l\'appareil hôte.',
});
val('liaison_reseau', 'port_parmi_autres').libelle = 'Une ou plusieurs interfaces réseau à côté de ports pour écrans ou périphériques (relever le nombre de chaque type), ou une interface réservée aux mises à jour';
val('liaison_reseau', 'seule_fonction').libelle = "En dehors du raccordement à l'appareil hôte, uniquement des interfaces réseau ou de communication (modem, adaptateur Ethernet, Wi-Fi ou Bluetooth, convertisseur USB vers liaison série, câble à émetteurs-récepteurs)";

// appareil_hote : ce que la fiche annonce, avec le cas d'un usage partagé
{
  const c = crit('appareil_hote');
  Object.assign(c, {
    question: "D'après la fiche, pour quels appareils le produit est-il annoncé (port amont, pilotes, compatibilité) ?",
    aide: "La liste des systèmes compatibles et le type de port amont figurent sur la fiche produit. Une compatibilité annoncée n'établit pas à elle seule l'usage exclusif ou principal qu'exige la note 6 C) 1) du chapitre 84.",
  });
  val('appareil_hote', 'ordinateur').libelle = 'Des ordinateurs ou des tablettes, sans autre appareil annoncé (compatibilité Windows, macOS, Linux, port hôte USB ou Thunderbolt)';
  if (!c.valeurs.some((x) => x.v === 'mixte')) {
    c.valeurs.splice(1, 0, { v: 'mixte', libelle: "Des ordinateurs et aussi d'autres appareils (téléphone, téléviseur, console)" });
  }
  val('appareil_hote', 'autre').libelle = 'Un autre appareil seulement (téléphone, véhicule, console de jeux, appareil médical)';
}

// Nœuds
Object.assign(N.q1, {
  pourquoi: "Quand un produit réunit plusieurs machines ou plusieurs fonctions, la note 3 de la section XVI le classe, sauf contexte contraire, selon la fonction principale. Pour un objet composite qui n'est pas une machine, la règle 3 b) retient le composant qui donne le caractère essentiel, si la règle 3 a) ne suffit pas. Limite : la règle 1 fait passer les termes des positions avant ce test, et un produit à fonction unique (câble, bloc de fiches, batterie seule) n'a pas de fonction principale à établir ; l'arbre pose pourtant cette question à tous les produits et prend pour indice la fonction que la fiche annonce en premier.",
  base: ['s16-n3', 's16-n5', 'rgi-1', 'rgi-3', 'rgi-3a', 'rgi-3b'],
});
Object.assign(N.q2, {
  pourquoi: 'Un chargeur qui produit son courant réunit un générateur et d\'autres fonctions ; la note 3 de la section XVI le classe selon la fonction principale, que cet arbre ne départage pas.',
  base: ['s16-n3', 'h8504', 'h8507', 'c85-n2'],
});
Object.assign(N.q3, {
  pourquoi: "Le 8507 couvre les accumulateurs, y compris présentés avec des composants auxiliaires qui contribuent à stocker et à fournir l'énergie ou qui les protègent (note 3 du chapitre 85) ; la règle 6 départage ensuite les sous-positions de même niveau selon la technologie. Limite : la note ne cite ni convertisseur ni onduleur parmi ces composants, et l'arbre ne compare pas le 8504 et le 8507 pour une station d'énergie à sorties secteur.",
  base: ['h8507', 'c85-n3', 'rgi-6', 'sh850760', 'sh850780', 's16-n3'],
  branches: { aucune: 'q4', lithium_ion: 'c850760', rechargeable_nommee: 'h_piles', autre_rechargeable: 'c850780', non_rechargeable: 'h_piles' },
});
Object.assign(N.q4, {
  pourquoi: 'Le 8504 vise les transformateurs, les convertisseurs statiques et les bobines d\'induction ; le 8504 40 ne reçoit que les convertisseurs statiques (règle 6). Un produit qui ne fait que relier des contacts est un câble du 8544 ou un appareillage de connexion du 8536.',
  base: ['h8504', 'sh850440', 'rgi-6', 'h8536', 'h8544'],
  branches: { non: 'q7', convertisseur: 'q5', transformateur: 'h_transformateur' },
});
Object.assign(N.q5, {
  pourquoi: 'Un bloc qui réunit plusieurs prises du 8536 pour distribuer le courant peut relever d\'une autre position ; avec un convertisseur, c\'est une machine composite au sens de la note 3 de la section XVI, que cet arbre ne départage pas.',
  base: ['h8536', 's16-n3', 'h8504'],
});
Object.assign(N.q6, {
  pourquoi: "Le 8544 couvre les conducteurs isolés munis ou non de connecteurs et le 8536 l'appareillage qui raccorde ou commute des circuits. Un produit qui traite le signal n'est décrit par aucun de ces deux libellés et se classe selon sa fonction.",
  base: ['h8544', 'h8536'],
});
Object.assign(N.q8, {
  pourquoi: "La note 6 D) 2) du chapitre 84 écarte du 8471 les appareils de transmission ou de réception de données présentés isolément, même s'ils remplissent les conditions de la note 6 C) ; quand cette fonction côtoie d'autres fonctions, la note 3 de la section XVI retient la fonction principale. Lecture retenue par cet arbre, tirée de décisions et non du texte de la note : un hub, une station d'accueil ou un adaptateur d'affichage sans interface réseau n'est pas traité comme un appareil de transmission (H348342, N292574). La décision N289786 lit la note dans l'autre sens.",
  base: ['c84-n6d', 'c84-n6d2', 's16-n3', 'h8517'],
});
Object.assign(N.q9, {
  pourquoi: "La note 6 C) du chapitre 84 tient pour unité du 8471 l'article qui remplit trois conditions à la fois : être du type utilisé exclusivement ou principalement dans un système informatique, être connectable à l'unité centrale, et pouvoir recevoir ou fournir des données sous une forme utilisable par le système. Un appareil qui exerce une fonction propre autre que le traitement de l'information suit la note 6 E). L'arbre ne contrôle que la première condition, par les appareils que la fiche annonce.",
  branches: { ordinateur: 'c847180', mixte: 'h_hote', audio_video: 'c854370', autre: 'h_hote' },
});
Object.assign(N.q10, {
  pourquoi: "Le 8473 reçoit les parties et accessoires propres à être utilisés exclusivement ou principalement avec les machines des positions 8470 à 8472, housses et étuis exclus, et le 8473 30 ceux des machines du 8471. La note 2 de la section XVI ne joue que sous réserve de la note 1 et ne traite que des parties, pas des accessoires. Limite : l'arbre ne contrôle pas les exclusions de la note 1 (un support en métal peut être une partie d'usage général, note 1 g)).",
  base: ['h8473', 'sh847330', 's16-n1', 's16-n1g', 's16-n2', 's16-n2b'],
  branches: { ordinateur: 'c847330', mixte: 'h_hote', audio_video: 'h_hote', autre: 'h_hote' },
});

Object.assign(N.c850440, {
  motif: "Un appareil qui transforme le courant reçu pour alimenter ou charger (adaptateur secteur, chargeur USB, chargeur de voiture, chargeur à induction) est un convertisseur statique du 8504 40, quel que soit l'appareil auquel il est destiné : pour l'ordinateur, la note 6 E) du chapitre 84 renvoie à la position de la fonction propre.",
  base: ['h8504', 'sh850440', 'c84-n6e', 'rgi-6'],
});
N.c850760.motif = "Une batterie externe reste un accumulateur du 8507 lorsqu'elle est présentée avec des composants auxiliaires qui contribuent à stocker et fournir l'énergie ou qui la protègent (connecteurs, contrôle de température, protection des circuits) ; ses éléments lithium-ion la placent au 8507 60.";
N.c850780.motif = "Une batterie externe rechargeable dont la technologie n'est nommée par aucune sous-position du 8507 relève de la sous-position résiduelle des autres accumulateurs. Le plomb, le nickel-cadmium et le nickel-hydrure métallique ont leurs propres sous-positions (8507 10, 8507 20, 8507 30 et 8507 50, lues dans la nomenclature combinée 2026 mais absentes du référentiel de textes) et sortent de cet arbre.";
Object.assign(N.c851762, {
  motif: "Un appareil qui reçoit, convertit et émet des données sur un réseau ou une liaison de communication, ou qui les régénère, est écarté du 8471 par la note 6 D) 2) du chapitre 84 et répond au libellé du 8517 62 ; celui qui ne fait que recevoir ou qu'émettre relève du 8517 69, hors de cet arbre. Le libellé du 8517 réserve aussi les appareils des positions 8443, 8525, 8527 et 8528.",
  base: ['h8517', 'c84-n6d2', 'sh85176x', 'sh851762', 'sh851769', 'rgi-6'],
});
Object.assign(N.c847180, {
  motif: "Un hub, une station d'accueil, un réplicateur de ports ou un adaptateur d'affichage actif qui relie l'ordinateur à ses périphériques est une autre unité du 8471 80, à condition de remplir les trois conditions de la note 6 C) et de ne pas tomber sous l'exclusion de la note 6 D), qui prime. Il ne saisit ni ne restitue lui-même les données (8471 60), ne les stocke pas (8471 70) et ne les traite pas (8471 50). Lecture retenue d'après des décisions (H348342, N292574) et non d'après le seul texte : la décision N289786 classe au contraire des adaptateurs d'affichage au 8517 62.",
  base: ['h8471', 'c84-n6c', 'c84-n6c-al2', 'c84-n6d', 'sh847150', 'sh847160', 'sh847170', 'sh847180', 'rgi-6'],
});
Object.assign(N.c854370, {
  motif: "Un appareil actif qui répartit, sélectionne ou convertit un signal entre équipements audio ou vidéo a une fonction propre. Le règlement (UE) n° 457/2014 écarte le 8536 parce que l'appareil répartit, amplifie ou traite le signal au lieu de seulement raccorder ou commuter un circuit. L'arbre écarte le 8517 62 faute d'interface de réseau ou de communication (question précédente) et le 8471 parce que la fiche n'annonce pas l'appareil pour un ordinateur (note 6 C)). Reste la position résiduelle 8543.",
  base: ['h8543', 'sh854370', 'h8536', 'h8517', 'sh851762', 'c84-n6c', 'rgi-6'],
});
Object.assign(N.c847330, {
  motif: "Un article qui porte un ordinateur ou une tablette, ou lui sert de surface, et que la fiche n'annonce pour aucun autre appareil, est classé ici comme accessoire des machines du 8471, s'il n'est ni une housse ni un étui et s'il ne tombe pas sous une exclusion de la note 1 de la section XVI, que cet arbre ne contrôle pas.",
  base: ['h8473', 'sh847330', 's16-n1', 's16-n2b', 'rgi-6'],
});

Object.assign(N.h_aucune, {
  motif: "Aucune fonction ne l'emporte : pour une machine du chapitre 84, la note 8 renvoie au 8479 ; sinon, après les règles 3 a) et 3 b), la règle 3 c) retient la dernière position parmi celles qui méritent également d'être retenues. Cet arbre ne fait pas ce calcul.",
  base: ['c84-n8-al2', 'rgi-3a', 'rgi-3b', 'rgi-3c'],
});
Object.assign(N.h_generateur, {
  motif: "Chargeur qui produit sa propre électricité (solaire, manivelle) : machine composite que cet arbre ne départage pas. La note 2 du chapitre 85 écarte les positions 8501 à 8504 pour les articles décrits au 8541 ; les textes des positions 8501 et 8541 ne sont pas dans le référentiel. La décision américaine N319727 retient le 8504 40 pour une borne de charge solaire à batterie.",
  base: ['s16-n3', 'c85-n2'],
});
Object.assign(N.h_piles, {
  motif: "Bloc de piles non rechargeables, ou accumulateur au plomb, au nickel-cadmium ou au nickel-hydrure métallique : le produit ne relève ni du 8507 60 ni du 8507 80. Les piles ne sont pas des accumulateurs du 8507 (la décision américaine N342905 retient le 8506 10) et les accumulateurs nommés ont leurs propres sous-positions. Aucun de ces textes n'est dans le référentiel : cet arbre ne les couvre pas.",
  base: ['h8507', 'sh850780', 'rgi-6'],
});
Object.assign(N.h_multiprise, {
  motif: "Multiprise ou rallonge à prises secteur avec ports de charge : machine composite au sens de la note 3 de la section XVI. La décision américaine N356452 retient le 8537 10 pour une rallonge à deux prises et trois ports USB ; le texte de la position 8537 n'est pas dans le référentiel et cet arbre ne la couvre pas.",
  base: ['h8536', 's16-n3'],
});
Object.assign(N.h_cable, {
  motif: 'Câble coaxial, jeu de fils pour véhicules ou câble de fibres optiques gainées individuellement : le produit reste dans le 8544 mais hors des sous-positions 8544 42 et 8544 49. Les sous-positions 8544 20, 8544 30 et 8544 70 ne sont pas dans le référentiel de textes et cet arbre ne les couvre pas.',
  base: ['h8544', 'sh85444x', 'rgi-6'],
});
Object.assign(N.h_hote, {
  motif: "Produit annoncé pour un téléphone, un véhicule, une console, un appareil médical, des appareils audio ou vidéo, ou pour plusieurs types d'appareils à la fois, et non pour le seul ordinateur. Pour les parties, la note 2 b) de la section XVI renvoie au 8517 celles des appareils des positions 8517 et 8525 à 8528 et au 8529 celles du 8524 ; les articles du chapitre 95 sortent de la section (note 1 p)). Les positions en concurrence (8517, 8522, 8529, 8537, 8543, 9504) dépendent de l'appareil hôte et cet arbre ne les départage pas.",
  base: ['s16-n2b', 's16-n1p', 'h8517', 'h8543'],
});
N.h_transformateur = {
  type: 'hors_perimetre',
  motif: "Transformateur qui abaisse ou élève une tension alternative sans la redresser : il relève du 8504 mais pas des convertisseurs statiques du 8504 40. Ses sous-positions ne sont pas dans le référentiel de textes et cet arbre ne les couvre pas.",
  base: ['h8504', 'sh850440', 'rgi-6'],
};

for (const [id, n] of Object.entries(N)) for (const b of n.base || []) if (!TEXTES.has(b)) pb.push(`arbre ${id} : base « ${b} » absente de textes.json`);
if (arbre.criteres.length > 12) pb.push(`arbre : ${arbre.criteres.length} critères (plafond 12)`);
if (Object.keys(N).length > 28) pb.push(`arbre : ${Object.keys(N).length} nœuds (plafond 28)`);
if (/—/.test(JSON.stringify(arbre))) pb.push('arbre : tiret cadratin');

// ───────────────────────────── 2. Fiches ─────────────────────────────
// Valeurs existantes dont l'appui n'est pas un énoncé explicite (tout le reste : explicite).
const APPUI = {
  '32012R1110#1': { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  '32012R1112#1': { electronique_active: 'composition' },
  '32014R0457#1': { genere_electricite: 'alimentation' },
  '32014R0457#2': { genere_electricite: 'alimentation' },
  '32015R2319#1': { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  '32016R0615#1': { genere_electricite: 'alimentation' },
  '32016R0666#1': { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  '32016R2224#1': { genere_electricite: 'alimentation' },
  '32017R1465#1': { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  '32018R1785#1': { electronique_active: 'composition' },
  H298118: { genere_electricite: 'alimentation' },
  H322074: { genere_electricite: 'alimentation' },
  H328693: { appareil_hote: 'terme' },
  H342570: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  H343160: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N281995: { genere_electricite: 'alimentation' },
  N282047: { genere_electricite: 'alimentation' },
  N282038: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N285505: { liaison_reseau: 'terme' },
  N298534: { convertit_courant: 'terme' },
  N301143: { electronique_active: 'terme' },
  N305600: { genere_electricite: 'alimentation', convertit_courant: 'terme' },
  N305957: { genere_electricite: 'alimentation', convertit_courant: 'terme' },
  N306782: { genere_electricite: 'alimentation', convertit_courant: 'terme' },
  N325987: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N328742: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N342905: { prises_secteur_sortie: 'composition' },
  N343619: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N346959: { prises_secteur_sortie: 'composition' },
  N349433: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N352984: { electronique_active: 'terme' },
  N356452: { genere_electricite: 'alimentation' },
  N359212: { genere_electricite: 'alimentation', prises_secteur_sortie: 'composition' },
  N363538: { prises_secteur_sortie: 'composition' },
};

// Valeurs ajoutées ou remplacées : [critère, valeur, appui, citation]
const A = 'aucune';
const AJOUTS = {
  '32017R1465#1': [['batterie_integree', A, 'composition', 'consisting of an adapter with a cable of a length of approximately 180 cm and a charging plate']],
  '32016R0666#1': [['batterie_integree', A, 'composition', 'The housing is equipped with a plug to connect to the AC and with an electrical cable of 1,5 m fitted with a DC-connector']],
  '32016R0615#1': [['fonction_principale', 'aucune_dominante', 'explicite', 'none of the functions is considered to be the principal function of the apparatus within the meaning of note 3 to Section XVI']],
  '32014R0457#1': [['liaison_reseau', A, 'composition', 'A digital electronic apparatus with one High-Definition Multimedia Interface (HDMI) input and eight HDMI outputs']],
  '32014R0457#2': [['liaison_reseau', A, 'composition', 'A digital electronic apparatus with four High-Definition Multimedia Interfaces (HDMI) inputs, one HDMI output and a button for selecting the input']],
  '32012R1110#1': [['batterie_integree', A, 'composition', 'comprising a car cigarette adapter, two USB interfaces and a light indicator']],
  H348342: [
    ['electronique_active', true, 'terme', 'The fourth item is the USB 3.0 7-Port Hub (UH700).'],
    ['liaison_reseau', A, 'explicite', 'The UH700, however, is not actively transmitting or receiving within a wired or wireless network.'],
  ],
  N359212: [['batterie_integree', A, 'composition', 'It is comprised of a 2-prong power plug for household electrical outlets and a female output port for connecting DC power plugs.']],
  N356502: [['electronique_active', false, 'composition', 'This cable consists of a length of insulated conductors with a Universal Accessory Connector (UAC) on one end and a Lightning connector on the other end']],
  N356452: [['batterie_integree', A, 'composition', 'The subject device is comprised of a braided power cord terminated at one end with a standard electrical wall plug. At the other end of the cable is a plastic housing, which incorporates two standard AC receptacles as well as three USB charging ports.']],
  N356371: [['electronique_active', false, 'composition', 'The part is comprised of a length of insulated cable with a 3.5mm audio connector at each end.']],
  H328693: [['electronique_active', true, 'terme', 'USB docking station']],
  N349433: [['batterie_integree', A, 'composition', 'described as an plastic housing containing circuitry to electrically convert AC to DC']],
  H337673: [['electronique_active', true, 'terme', 'are universal laptop docking stations']],
  N343619: [['batterie_integree', A, 'composition', 'described as a plastic housing with LED night lights, two USB Type-A output sockets, and a two prong wall plug']],
  N334999: [
    ['genere_electricite', false, 'explicite', 'there are no fuses, switches, or other electrical apparatus inside the plug'],
    ['batterie_integree', A, 'explicite', 'there are no fuses, switches, or other electrical apparatus inside the plug'],
  ],
  N328742: [['batterie_integree', A, 'composition', 'described as a 3.5 A DC-DC having two female USB Type-A socket connectors on one side and 12 V vehicle accessory electrical plug on the other']],
  H322074: [['fonction_principale', 'autre', 'explicite', 'principal function is to perform a hand warming function.']],
  N325987: [['batterie_integree', A, 'composition', 'a rectangular plastic enclosure housing a printed circuit board assembly, with a two-prong electrical plug on one side and two USB Type-A sockets on the other side']],
  N323399: [['genere_electricite', false, 'alimentation', 'The unit is recharged using an 8mm charge port or High Power Port.']],
  H319416: [['electronique_active', false, 'composition', 'The cable consists of two bundles of several inner conductor strands surrounded by insulation and one bundle of cotton yarn strands.']],
  N307285: [['electronique_active', true, 'terme', 'identified as the VT4000 Dual 4K Universal Docking Station (VT4000)']],
  N306841: [['genere_electricite', false, 'composition', 'a wall charger, a micro USB charge cable, a female 12V output adapter, and a 12V car charger']],
  N301141: [['electronique_active', true, 'explicite', 'This antenna arm has 2 high gain transmitters built-in']],
  N298750: [['electronique_active', false, 'composition', 'This cable incorporates 4 insulated conductors surrounded by a foil and braided wire shielding']],
  N298534: [
    ['genere_electricite', false, 'composition', 'The sub-assembly is housed in a metal casing and contains two printed circuit boards, electrical connectors, a thermal pad, and board-to-board connector pins.'],
    ['batterie_integree', A, 'composition', 'The sub-assembly is housed in a metal casing and contains two printed circuit boards, electrical connectors, a thermal pad, and board-to-board connector pins.'],
    ['prises_secteur_sortie', false, 'composition', 'The sub-assembly is housed in a metal casing and contains two printed circuit boards, electrical connectors, a thermal pad, and board-to-board connector pins.'],
  ],
  N296103: [['electronique_active', false, 'composition', 'The item consists of 5 cables that are joined together down the length of the product.']],
  N292574: [['liaison_reseau', A, 'composition', 'Each adapter consists of a male connector on one end and a female connector on the other end.']],
  N290926: [['electronique_active', false, 'composition', 'Each cable is constructed from insulated electric conductors within an outer jacket.']],
  N290028: [['electronique_active', false, 'composition', 'The cable has a construction of four PVC insulated copper clad steel conductors that carry or transmit luminance and color.']],
  N290026: [['electronique_active', false, 'composition', 'each cable has an internal insulated conductor and a secondary ground wire (not a surrounding shield)']],
  N288408: [['genere_electricite', false, 'alimentation', 'The dock charges the power bank']],
  H273383: [['liaison_reseau', 'seule_fonction', 'explicite', 'The transmission and reception of data are the principal functions of the OFCAs']],
  // Circulaire : la valeur « porter_completer » ne tenait que par la parenthèse « boîtier d'extension de calcul »,
  // écrite d'après cette décision. La fonction énoncée n'est aucune des quatre premières réponses.
  N352984: [['fonction_principale', 'autre', 'explicite', 'designed to enhance the computational and graphical performance of a host desktop or laptop']],
  // Décision à trois produits pour un seul identifiant : la fiche mêlait l'adaptateur Ethernet et l'adaptateur
  // HDMI. Elle porte désormais sur l'adaptateur VGA, l'un des deux que les motifs de la décision visent.
  N289786: [
    ['fonction_principale', 'transmettre_signaux', 'explicite', 'It provides the computer with the capability to connect any VGA compatible display, monitor or projector, for sharing pictures, videos, etc.'],
    ['electronique_active', true, 'explicite', 'This adapter is a Display Port to VGA converter'],
    ['liaison_reseau', A, 'composition', 'combines a DisplayPort input interface and an analog RGB DAC output'],
    ['appareil_hote', 'ordinateur', 'explicite', 'computer using the device\'s mini display port connection'],
  ],
};
const RETRAITS = { '32018R1785#1': ['liaison_reseau'] }; // câble passif : aucune interface ni émetteur-récepteur à compter
const PRODUIT = { N289786: 'Adaptateur DisplayPort vers VGA pour ordinateur Surface (décision à trois produits)' };

const fichiers = fs.readdirSync(ici('./annot/')).filter((f) => /^annot-.*\.json$/.test(f)).sort();
const sorties = {}, vus = new Set();
let nAjouts = 0, nRetraits = 0, nConv = 0;
const CONV = { true: 'convertisseur', false: 'non' };
for (const f of fichiers) {
  const lot = lire('./annot/' + f);
  for (const d of lot) {
    vus.add(d.id);
    const t = norm(CAND[d.id]?.texte);
    for (const k of RETRAITS[d.id] || []) if (d.criteres[k]) { delete d.criteres[k]; nRetraits++; }
    for (const [k, valeur, appui, citation] of AJOUTS[d.id] || []) {
      if (!t.includes(norm(citation))) { pb.push(`${d.id} / ${k} : citation absente du texte : ${citation}`); continue; }
      if (citation.length > 300) pb.push(`${d.id} / ${k} : citation de plus de 300 caractères`);
      const avant = d.criteres[k];
      if (!avant || avant.valeur !== valeur || avant.citation !== citation) nAjouts++;
      d.criteres[k] = { valeur, citation, appui };
    }
    if (PRODUIT[d.id]) d.produit = PRODUIT[d.id];
    // convertit_courant devient une énumération : oui = convertisseur, non = non (aucune fiche ne décrit un simple transformateur)
    const cc = d.criteres.convertit_courant;
    if (cc && typeof cc.valeur === 'boolean') { cc.valeur = CONV[cc.valeur]; nConv++; }
    for (const [k, x] of Object.entries(d.criteres)) {
      x.appui = x.appui && (AJOUTS[d.id] || []).some((a) => a[0] === k) ? x.appui : (APPUI[d.id]?.[k] || 'explicite');
      const def = arbre.criteres.find((c) => c.id === k);
      const ok = def && (def.type === 'bool' ? typeof x.valeur === 'boolean' : def.valeurs.some((v) => v.v === x.valeur));
      if (!ok) pb.push(`${d.id} / ${k} : valeur hors domaine ${x.valeur}`);
      if (!t.includes(norm(x.citation))) pb.push(`${d.id} / ${k} : citation existante absente du texte`);
    }
    if (/—/.test(d.produit)) pb.push(`${d.id} : tiret cadratin`);
  }
  sorties[f] = lot;
}
for (const id of [...Object.keys(AJOUTS), ...Object.keys(RETRAITS), ...Object.keys(APPUI)]) if (!vus.has(id)) pb.push(`${id} : fiche introuvable`);

if (pb.length) { console.error(pb.join('\n')); process.exit(1); }
fs.writeFileSync(ici('../../public/data/arbre.json'), JSON.stringify(arbre, null, 2) + '\n');
for (const [f, lot] of Object.entries(sorties)) fs.writeFileSync(ici('./annot/' + f), JSON.stringify(lot, null, 1) + '\n');
console.log(`arbre : ${arbre.criteres.length} critères, ${Object.keys(N).length} nœuds`);
console.log(`fiches : ${nAjouts} valeurs ajoutées ou remplacées, ${nRetraits} retirée(s), ${nConv} valeurs de convertit_courant converties`);
