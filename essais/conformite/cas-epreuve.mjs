// Adversarial cases for public/data/exigences.json.
//
// The expected result of every case below was written by reading the downloaded provisions
// (public/data/textes-conformite.json and essais/conformite/sources/*.txt) BEFORE the engine
// was run on it. Nothing in ATTENDU comes from the engine. Each expectation carries the
// provision it rests on, with a verbatim extract that this script checks against the source
// (an expectation whose extract is not found is reported as "unsourced" and the run exits 2).
//
// A mismatch is a finding to be read by a person: either the data file or the reading is wrong.
// The script never says that a product complies.
//
//   node essais/conformite/cas-epreuve.mjs           table + mismatches
//   node essais/conformite/cas-epreuve.mjs --json    machine output on stdout
//   node essais/conformite/cas-epreuve.mjs --strict  exit 1 when there is at least one mismatch

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { evaluerExigences } from '../../public/exigences-moteur.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const DATA = JSON.parse(readFileSync(join(RACINE, 'public/data/exigences.json'), 'utf8'));
const TEXTES = JSON.parse(readFileSync(join(RACINE, 'public/data/textes-conformite.json'), 'utf8'));

// ---------------------------------------------------------------------------------------------
// Provisions the reading rests on. { id } = entry of textes-conformite.json, { fichier } = a
// downloaded act that is not in the catalogue. "extrait" is copied from the source, verbatim.
// ---------------------------------------------------------------------------------------------
const B = {
  lvd_champ: { id: 'lvd-art1', extrait: 'between 50 and 1 000 V for alternating current and between 75 and 1 500 V for direct current' },
  lvd_fabricant: { id: 'lvd-art2-3', extrait: 'has electrical equipment designed or manufactured, and markets that equipment under his name or trade mark' },
  lvd_importateur: { id: 'lvd-art2-5', extrait: 'established within the Union who places electrical equipment from a third country on the Union market' },
  lvd_distributeur: { id: 'lvd-art2-6', extrait: 'other than the manufacturer or the importer, who makes electrical equipment available on the market' },
  lvd_marque_propre: { id: 'lvd-art10', extrait: 'where he places electrical equipment on the market under his name or trade mark' },
  lvd_fab_ce: { id: 'lvd-art6-2', extrait: 'manufacturers shall draw up an EU declaration of conformity and affix the CE marking' },
  lvd_imp_verif: { id: 'lvd-art8-2', extrait: 'that the electrical equipment bears the CE marking and is accompanied by the required documents' },
  lvd_imp_copie: { id: 'lvd-art8-8', extrait: 'keep a copy of the EU declaration of conformity at the disposal of the market surveillance authorities' },
  lvd_dis_verif: { id: 'lvd-art9-2', extrait: 'distributors shall verify that the electrical equipment bears the CE marking' },
  emc_appareil: { id: 'emc-art3-1-2', extrait: 'any finished appliance or combination thereof made available on the market as a single functional unit, intended for the end-user' },
  emc_imp_verif: { id: 'emc-art9-2', extrait: 'that the apparatus bears the CE marking and is accompanied by the required documents' },
  emc_exclusion_radio: { fichier: '02014L0030-20260530.txt', ref: 'Directive 2014/30/EU, Article 2(2)(a)', extrait: 'equipment covered by Directive 1999/5/EC;' },
  red_renvoi: { fichier: '02014L0053-20260530.txt', ref: 'Directive 2014/53/EU, Article 50', extrait: 'References to the repealed Directive shall be construed as references to this Directive' },
  red_definition: { id: 'red-art2-1-1', extrait: 'intentionally emits and/or receives radio waves for the purpose of radio communication and/or radiodetermination' },
  red_pas_lvd: { id: 'red-art1-4', extrait: 'shall not be subject to Directive 2014/35/EU, except as set out in point (a) of Article 3(1) of this Directive' },
  red_securite: { fichier: '02014L0053-20260530.txt', ref: 'Directive 2014/53/EU, Article 3(1)(a)', extrait: 'including the objectives with respect to safety requirements set out in Directive 2014/35/EU, but with no voltage limit applying;' },
  red_fab: { fichier: '02014L0053-20260530.txt', ref: 'Directive 2014/53/EU, Article 10(3)', extrait: 'Where compliance of radio equipment with the applicable requirements has been demonstrated by that conformity assessment procedure, manufacturers shall draw up an EU declaration of conformity and affix the CE marking.' },
  red_imp: { fichier: '02014L0053-20260530.txt', ref: 'Directive 2014/53/EU, Article 12(2)', extrait: 'They shall ensure that the manufacturer has drawn up the technical documentation, that the radio equipment bears the CE marking' },
  red_3a_1: { id: 'red-art3a-1', extrait: 'the economic operator shall also offer the consumers and other end-users the possibility of acquiring that radio equipment without any charging device' },
  red_3a_2: { id: 'red-art3a-2', extrait: 'The pictogram shall be printed on the packaging or affixed to the packaging as a sticker.' },
  red_liste: { id: 'red-annex1a-1', extrait: '1.13. laptops.' },
  red_date_portables: { id: 'cc-art2-1', extrait: 'from 28 April 2026 for the categories or classes of radio equipment referred to in Part I, point 1.13 of Annex Ia' },
  red_operateurs: { fichier: '02014L0053-20260530.txt', ref: 'Directive 2014/53/EU, Article 2(1), definition of economic operators', extrait: '‘economic operators’ means the manufacturer, the authorised representative, the importer and the distributor;' },
  rohs_eee: { id: 'rohs-art3-1', extrait: 'designed for use with a voltage rating not exceeding 1 000 volts for alternating current and 1 500 volts for direct current' },
  rohs_categorie: { id: 'rohs-annex1', extrait: '11. Other EEE not covered by any of the categories above.' },
  rohs_imp_copie: { id: 'rohs-art9-g', extrait: 'a copy of the EU declaration of conformity at the disposal of the market surveillance authorities' },
  rohs_dis: { id: 'rohs-art10-a', extrait: 'by verifying that the EEE bears the CE marking' },
  eps_definition_a: { id: 'eps-art2-1', extrait: 'it is designed to convert alternating current (AC) power input from the mains power source input into one or more lower voltage direct current (DC) or AC outputs' },
  eps_application: { id: 'eps-art9', extrait: 'It shall apply from 1 April 2020.' },
  eps_predecesseur: { fichier: '32019R1782.txt', ref: 'Regulation (EU) 2019/1782, Article 8', extrait: 'Regulation (EC) No 278/2009 is repealed as from 1 April 2020.' },
  eps2_application: { id: 'eps2-art10', extrait: 'It shall apply from 14 December 2028.' },
  eps2_abrogation: { id: 'eps2-art8', extrait: 'Regulation (EU) 2019/1782 is repealed with effect from 14 December 2028' },
  eco_ce: { id: 'eco-art5-1', extrait: 'a CE marking shall be affixed and an EC declaration of conformity issued' },
  eco_importateur: { id: 'eco-art4', extrait: 'Where the manufacturer is not established within the Community and in the absence of an authorised representative, the importer shall have the following obligations' },
  eco_def_importateur: { fichier: '02009L0125-20121204.txt', ref: 'Directive 2009/125/EC, Article 2, point 8', extrait: '‘Importer’ means any natural or legal person established in the Community who places a product from a third country on the Community market in the course of his business;' },
  msr_condition: { id: 'msr-art4-1', extrait: 'may be placed on the market only if there is an economic operator established in the Union' },
  msr_qui: { id: 'msr-art4-2', extrait: '(b) an importer, where the manufacturer is not established in the Union' },
  msr_fab_ue: { id: 'msr-art4-2', extrait: '(a) a manufacturer established in the Union' },
  msr_actes: { id: 'msr-art4-5', extrait: '2011/65/EU' },
  msr_actes_batteries: { id: 'msr-art4-5', extrait: '(EU) 2023/1542' },
  msr_actes_radio: { id: 'msr-art4-5', extrait: '2014/53/EU' },
  gpsr_offre: { id: 'gpsr-art19', extrait: 'Where economic operators make products available on the market online or through other means of distance sales' },
  gpsr_resp: { id: 'gpsr-art19', extrait: 'where the manufacturer is not established in the Union, the name, postal and electronic address of the responsible person' },
  gpsr_residuel: { id: 'gpsr-art2-1', extrait: 'this Regulation applies only to those aspects and risks or categories of risks which are not covered by those requirements' },
  gpsr_chapitre2: { id: 'gpsr-art2-1', extrait: 'Chapter II does not apply insofar as the risks or categories of risks covered by Union harmonisation legislation are concerned' },
  gpsr_art5: { fichier: '02023R0988-20260529.txt', ref: 'Regulation (EU) 2023/988, Article 5', extrait: 'Economic operators shall place or make available on the market only safe products.' },
  gpsr_operateur: { fichier: '02023R0988-20260529.txt', ref: 'Regulation (EU) 2023/988, Article 3, definition of economic operator', extrait: 'or any other natural or legal person who is subject to obligations in relation to the manufacture of products or making them available on the market in accordance with this Regulation;' },
  weee_i: { id: 'weee-art3-1-f', extrait: 'has EEE designed or manufactured and markets it under his name or trademark within the territory of that Member State' },
  weee_ii: { id: 'weee-art3-1-f', extrait: 'a reseller not being regarded as the ‘producer’ if the brand of the producer appears on the equipment' },
  weee_iii: { id: 'weee-art3-1-f', extrait: 'is established in a Member State and places on the market of that Member State, on a professional basis, EEE from a third country or from another Member State' },
  weee_iv: { id: 'weee-art3-1-f', extrait: 'sells EEE by means of distance communication directly to private households or to users other than private households in a Member State, and is established in another Member State or in a third country' },
  weee_registre: { id: 'weee-art16-1', extrait: 'including producers supplying EEE by means of distance communication' },
  bat_champ: { fichier: '02023R1542-20260813.txt', ref: 'Regulation (EU) 2023/1542, Article 1(3)', extrait: 'It shall also apply to batteries that are incorporated into or added to products or that are specifically designed to be incorporated into or added to products.' },
  bat_definition: { fichier: '02023R1542-20260813.txt', ref: 'Regulation (EU) 2023/1542, Article 3, definition of battery', extrait: '‘battery’ means any device delivering electrical energy generated by direct conversion of chemical energy' },
  bat_fab: { fichier: '02023R1542-20260813.txt', ref: 'Regulation (EU) 2023/1542, Article 38(3)', extrait: 'manufacturers shall draw up an EU declaration of conformity in accordance with Article 18 and affix the CE marking in accordance with Articles 19 and 20.' },
  bat_marque_propre: { fichier: '02023R1542-20260813.txt', ref: 'Regulation (EU) 2023/1542, Article 44(a)', extrait: 'a battery is placed on the market or put into service under that importer’s or distributor’s own name or trademark;' },
};

// ---------------------------------------------------------------------------------------------
// Facts of a plain mains USB-C charger, read on its rating label and datasheet.
// ---------------------------------------------------------------------------------------------
const CHARGEUR = {
  tension_entree: 'ac_50_1000', radio: false, hors_champ_basse_tension: false,
  sortie_plus_basse: true, boitier_separe: true, puissance_sortie: 'jusqu_a_250_w',
  type_exclu_ecoconception: false, appareil_alimente: 'informatique_domestique',
  date_mise_sur_marche: 'du_2020_04_01_au_2028_12_13',
};
const IMPORTATEUR_FR = { marque: 'origine', etablissement_vendeur: 'france', approvisionnement: 'hors_ue', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: true, acheteurs_consommateurs: true };
const ETIQUETTE_CE = ['Model: A2305', 'Input: 100-240V~ 50/60Hz 1.5A', 'Output: 5V 3A / 9V 3A / 20V 3.25A', 'CE', 'Made in China'];

const A = 'applicable', N = 'non_applicable', D = 'a_determiner';
const LIGNES = ['msr-operateur-ue', 'msr-fabricant-hors-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'red-chargeur-universel', 'weee-producteur-marque-propre', 'weee-producteur-introduction', 'weee-producteur-vente-distance', 'msr-taches-fabricant-ue', 'msr-taches-importateur'];
// Short way to write the 14 expected states: everything not named is "not applicable".
const etats = (applicables, autres = {}) => Object.fromEntries(LIGNES.map((l) => [l, autres[l] || (applicables.includes(l) ? A : N)]));

// ---------------------------------------------------------------------------------------------
// The cases. "lecture" is the reading of the law, "attendu" what the output must then show:
//   role            legal role of the seller ('aucun_attendu' is never used: a seller always has duties)
//   etats           state of each of the 14 lines of the data file
//   devoirs         lines on which the seller must be given at least one duty
//   preuves         evidence id -> state it must have somewhere in the work list
//   signaler        acts the output must carry as "applicable" or "to determine" (by CELEX)
//   questions       'toutes' = every criterion of the file is asked, 'aucune' = nothing left to ask
// ---------------------------------------------------------------------------------------------
export const CAS = [
  {
    id: 'C1', titre: 'Own-brand seller established outside the EU, selling online to consumers in France, no representative',
    faits: { ...CHARGEUR, marque: 'propre', etablissement_vendeur: 'hors_ue', approvisionnement: 'hors_ue', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: true, acheteurs_consommateurs: true },
    lecture: [
      { point: 'Selling under its own name or trade mark makes the seller the manufacturer, with the manufacturer duties: technical documentation, EU declaration of conformity, CE marking.', base: [B.lvd_fabricant, B.lvd_marque_propre, B.lvd_fab_ce] },
      { point: 'Input 100-240 V AC is inside the low voltage range; no radio, so the EMC Directive applies; the product is EEE.', base: [B.lvd_champ, B.emc_appareil, B.rohs_eee, B.rohs_categorie] },
      { point: 'The manufacturer is not established in the Union: the product may be placed on the market only if an importer, an authorised representative or a fulfilment service provider in the Union exists. The seller is not itself that operator.', base: [B.msr_condition, B.msr_qui, B.msr_actes] },
      { point: 'Distance sale to consumers: the listing must carry the Article 19 items, including the responsible person since the manufacturer is outside the Union.', base: [B.gpsr_offre, B.gpsr_resp] },
      { point: 'Established in a third country and selling at a distance directly to users in France: producer under point (iv), not under points (i) to (iii), which need an establishment in the Member State.', base: [B.weee_iv, B.weee_registre] },
      { point: 'The importer duty of the Ecodesign Directive does not concern a manufacturer.', base: [B.eco_importateur] },
    ],
    attendu: {
      role: 'fabricant',
      etats: etats(['msr-operateur-ue', 'msr-fabricant-hors-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'gpsr-offre-distance', 'weee-producteur-vente-distance']),
      devoirs: ['msr-operateur-ue', 'msr-fabricant-hors-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'gpsr-offre-distance', 'weee-producteur-vente-distance'],
      preuves: { declaration_ue_conformite: 'manquante', marquage_ce: 'manquante', doc_technique_bt: 'manquante', mandat_operateur_ue: 'manquante', offre_personne_responsable: 'manquante', enregistrement_registre_producteurs: 'manquante', declaration_ce_ecoconception: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C2a', titre: 'French reseller of the original brand, in a shop, buying from an importer established in another Member State',
    faits: { ...CHARGEUR, marque: 'origine', etablissement_vendeur: 'france', approvisionnement: 'ue_autre_etat', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: false, acheteurs_consommateurs: true },
    lecture: [
      { point: 'The product was already placed on the Union market by the importer: the seller is neither manufacturer nor importer, so it is a distributor, with verification duties (CE marking, documents, manufacturer and importer details).', base: [B.lvd_distributeur, B.lvd_dis_verif, B.rohs_dis] },
      { point: 'Established in France and placing on the French market equipment from another Member State: producer under point (iii), even under the original brand.', base: [B.weee_iii] },
      { point: 'No distance sale: Article 19 of Regulation (EU) 2023/988 is not triggered. The seller is not the Union operator of Article 4 (it is neither manufacturer nor importer).', base: [B.gpsr_offre, B.msr_qui] },
    ],
    attendu: {
      role: 'distributeur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'weee-producteur-introduction']),
      devoirs: ['lvd', 'emc', 'rohs', 'weee-producteur-introduction'],
      preuves: { marquage_ce: 'manquante', nom_adresse_importateur: 'manquante', nom_adresse_fabricant: 'manquante', notice_instructions_securite: 'manquante', enregistrement_registre_producteurs: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C2b', titre: 'Same reseller, buying from an importer established in France',
    faits: { ...CHARGEUR, marque: 'origine', etablissement_vendeur: 'france', approvisionnement: 'france', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: false, acheteurs_consommateurs: true },
    lecture: [
      { point: 'Distributor as in C2a.', base: [B.lvd_distributeur, B.lvd_dis_verif] },
      { point: 'A reseller is not the producer when the brand of the producer appears on the equipment, and the product comes from France, not from another country: none of the four cases of the definition fits.', base: [B.weee_ii, B.weee_iii] },
    ],
    attendu: {
      role: 'distributeur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception']),
      devoirs: ['lvd', 'emc', 'rohs'],
      preuves: { marquage_ce: 'manquante', nom_adresse_importateur: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C3', titre: 'French reseller of the original brand importing directly from a third country, selling online to consumers',
    faits: { ...CHARGEUR, ...IMPORTATEUR_FR },
    lecture: [
      { point: 'Established in the Union and first to supply a third-country product on the Union market: importer. It checks the CE marking and keeps a copy of the EU declaration of conformity for 10 years.', base: [B.lvd_importateur, B.lvd_imp_verif, B.lvd_imp_copie, B.emc_imp_verif, B.rohs_imp_copie] },
      { point: 'Manufacturer outside the Union: the importer is the Union operator of Article 4.', base: [B.msr_condition, B.msr_qui] },
      { point: 'Manufacturer outside the Community and no authorised representative: the importer carries the ecodesign duties.', base: [B.eco_importateur, B.eco_def_importateur] },
      { point: 'Producer under point (iii); distance offer to consumers under Article 19.', base: [B.weee_iii, B.gpsr_offre] },
    ],
    attendu: {
      role: 'importateur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur']),
      devoirs: ['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur'],
      preuves: { declaration_ue_conformite: 'manquante', acces_doc_technique: 'manquante', marquage_ce: 'manquante', nom_adresse_importateur: 'manquante', declaration_ce_ecoconception: 'manquante', doc_technique_ecoconception: 'manquante', enregistrement_registre_producteurs: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C4', titre: 'Charger supplied in the box of a laptop, sold online to consumers by a French reseller buying in France',
    faits: { ...CHARGEUR, marque: 'origine', etablissement_vendeur: 'france', approvisionnement: 'france', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'avec_appareil_radio_liste', vente_a_distance: true, acheteurs_consommateurs: true },
    lecture: [
      { point: 'Laptops are point 1.13 of the list, binding from 28 April 2026 (before the reference date). The operator that offers the laptop with a charging device must also offer it without one and show the pictogram; a distributor is an economic operator under the Directive.', base: [B.red_liste, B.red_date_portables, B.red_3a_1, B.red_3a_2, B.red_operateurs] },
      { point: 'The charger itself keeps its own lines: low voltage, EMC, RoHS, with distributor duties.', base: [B.lvd_champ, B.lvd_dis_verif] },
      { point: 'Bought in France under the original brand: not a WEEE producer.', base: [B.weee_ii] },
    ],
    attendu: {
      role: 'distributeur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'gpsr-offre-distance', 'red-chargeur-universel']),
      devoirs: ['lvd', 'emc', 'rohs', 'gpsr-offre-distance', 'red-chargeur-universel'],
      preuves: { offre_sans_chargeur: 'manquante', pictogramme_chargeur: 'manquante', marquage_ce: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C5', titre: '12 V car charger (DC input, outside the low voltage range), imported by a French reseller, sold online to consumers',
    faits: { ...CHARGEUR, ...IMPORTATEUR_FR, tension_entree: 'sous_50_ac_75_dc', sortie_plus_basse: false },
    lecture: [
      { point: 'A 12 V DC rating is below 75 V DC: the Low Voltage Directive does not apply.', base: [B.lvd_champ] },
      { point: 'It has no AC mains input, so it is not an external power supply within the Regulation: no ecodesign line, for the manufacturer or the importer.', base: [B.eps_definition_a] },
      { point: 'It remains an apparatus (EMC) and EEE (RoHS), so the Article 4 operator rule still applies and the importer still holds a copy of the EU declaration of conformity and checks the CE marking.', base: [B.emc_appareil, B.emc_imp_verif, B.rohs_eee, B.rohs_imp_copie, B.msr_actes] },
      { point: 'With the Low Voltage Directive out, the electrical safety risk is not covered by the harmonisation acts that still apply (EMC, RoHS). For a consumer product, Regulation (EU) 2023/988 then applies to that risk: the general safety requirement of Article 5 stays in force. The output must say so, or at least ask.', base: [B.gpsr_residuel, B.gpsr_chapitre2, B.gpsr_art5] },
    ],
    attendu: {
      role: 'importateur',
      etats: etats(['msr-operateur-ue', 'emc', 'rohs', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur']),
      devoirs: ['msr-operateur-ue', 'emc', 'rohs', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur'],
      preuves: { declaration_ue_conformite: 'manquante', marquage_ce: 'manquante' },
      signaler: [{ regime: 'General safety requirement (Regulation (EU) 2023/988, Article 5) for the risks no harmonisation act covers', celex: ['32023R0988'], sauf: ['gpsr-offre-distance'], base: [B.gpsr_residuel, B.gpsr_art5] }],
      questions: 'aucune',
    },
  },
  {
    id: 'C6', titre: 'Mains charger with a radio function (Bluetooth or Wi-Fi), imported by a French reseller, sold online to consumers',
    faits: { ...CHARGEUR, ...IMPORTATEUR_FR, radio: true },
    lecture: [
      { point: 'A product that intentionally emits or receives radio waves for radio communication is radio equipment.', base: [B.red_definition] },
      { point: 'Radio equipment is not subject to the Low Voltage Directive, and the EMC Directive does not apply to equipment covered by the radio equipment Directive (the reference to Directive 1999/5/EC is read as a reference to Directive 2014/53/EU).', base: [B.red_pas_lvd, B.emc_exclusion_radio, B.red_renvoi] },
      { point: 'Those two lines are replaced, not removed: Directive 2014/53/EU carries the safety objectives with no voltage limit, and gives the manufacturer the declaration and CE marking duties and the importer the CE marking check. The output must show a radio equipment line, as applicable or to determine.', base: [B.red_securite, B.red_fab, B.red_imp, B.msr_actes_radio] },
      { point: 'RoHS, ecodesign (it is still an external power supply), Article 4 operator, WEEE and the distance offer are unchanged.', base: [B.rohs_eee, B.eco_importateur, B.msr_qui, B.weee_iii, B.gpsr_offre] },
    ],
    attendu: {
      role: 'importateur',
      etats: etats(['msr-operateur-ue', 'rohs', 'eps-ecoconception', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur']),
      devoirs: ['msr-operateur-ue', 'rohs', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur'],
      preuves: { declaration_ue_conformite: 'manquante', marquage_ce: 'manquante', acces_doc_technique: 'manquante' },
      signaler: [{ regime: 'Radio equipment duties (Directive 2014/53/EU, Articles 3, 10 and 12)', celex: ['32014L0053'], sauf: ['red-chargeur-universel'], base: [B.red_fab, B.red_imp] }],
      questions: 'aucune',
    },
  },
  {
    id: 'C7', titre: 'Power bank (a battery with USB ports) sold online to consumers under the own brand of a French seller',
    faits: { ...CHARGEUR, tension_entree: 'sous_50_ac_75_dc', sortie_plus_basse: false, marque: 'propre', etablissement_vendeur: 'france', approvisionnement: 'hors_ue', fabricant_etabli_ue: true, mandataire_ue: false, fourniture: 'seul', vente_a_distance: true, acheteurs_consommateurs: true },
    lecture: [
      { point: 'A power bank delivers electrical energy from the conversion of chemical energy: it is, or contains, a battery. Regulation (EU) 2023/1542 applies to all batteries, including those incorporated into products; the own-brand seller has the manufacturer duties (EU declaration of conformity, CE marking). The output must show a battery line, as applicable or to determine.', base: [B.bat_definition, B.bat_champ, B.bat_fab, B.bat_marque_propre, B.msr_actes_batteries] },
      { point: 'USB input below 75 V DC: outside the Low Voltage Directive. No AC mains input: not an external power supply.', base: [B.lvd_champ, B.eps_definition_a] },
      { point: 'Own brand and established in France: manufacturer, Union operator of Article 4 point (a), WEEE producer under point (i) or (ii).', base: [B.lvd_fabricant, B.msr_fab_ue, B.weee_i] },
    ],
    attendu: {
      role: 'fabricant',
      etats: etats(['msr-operateur-ue', 'emc', 'rohs', 'gpsr-offre-distance', 'weee-producteur-marque-propre', 'msr-taches-fabricant-ue']),
      devoirs: ['msr-operateur-ue', 'emc', 'rohs', 'gpsr-offre-distance', 'weee-producteur-marque-propre', 'msr-taches-fabricant-ue'],
      preuves: { declaration_ue_conformite: 'manquante', marquage_ce: 'manquante' },
      signaler: [
        { regime: 'Batteries (Regulation (EU) 2023/1542, Articles 1(3) and 38)', celex: ['32023R1542'], sauf: [], base: [B.bat_champ, B.bat_fab] },
        { regime: 'General safety requirement (Regulation (EU) 2023/988, Article 5) for the risks no harmonisation act covers', celex: ['32023R0988'], sauf: ['gpsr-offre-distance'], base: [B.gpsr_residuel, B.gpsr_art5] },
      ],
      questions: 'aucune',
    },
  },
  {
    id: 'C8', titre: 'Nothing known about the product or the sale',
    faits: {},
    lecture: [
      { point: 'No fact, no conclusion: every scope article quoted above turns on a fact (voltage, radio, brand, establishment, origin, distance sale). Each line must come out as a question; none may be "not applicable"; no role, no duty and no evidence may be stated.', base: [B.lvd_champ, B.red_definition, B.lvd_fabricant, B.lvd_importateur, B.weee_iv, B.gpsr_offre] },
    ],
    attendu: {
      role: null,
      etats: Object.fromEntries(LIGNES.map((l) => [l, D])),
      devoirs: [],
      preuves: {},
      aucune_preuve: true,
      questions: 'toutes',
    },
  },
  {
    id: 'C9', titre: 'Importer of C3 with a rating label that shows "CE"',
    faits: { ...CHARGEUR, ...IMPORTATEUR_FR },
    etiquette: ETIQUETTE_CE,
    lecture: [
      { point: 'The CE marking is affixed by the manufacturer after it has drawn up the declaration; seeing it proves neither. The importer must still hold a copy of the EU declaration of conformity and have access to the technical documentation: both stay missing. The marking is recorded as seen on the label, never as held or verified.', base: [B.lvd_fab_ce, B.lvd_imp_verif, B.lvd_imp_copie, B.rohs_imp_copie, B.eco_ce] },
    ],
    attendu: {
      role: 'importateur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur']),
      devoirs: ['lvd', 'emc', 'rohs'],
      preuves: { marquage_ce: 'vu_sur_etiquette', identification_produit: 'vu_sur_etiquette', declaration_ue_conformite: 'manquante', acces_doc_technique: 'manquante', declaration_ce_ecoconception: 'manquante', doc_technique_ecoconception: 'manquante', nom_adresse_importateur: 'manquante' },
      ligne_vue: { marquage_ce: 'CE' },
      rien_declare: true,
      // Seeing two markings removes exactly those two ids from the missing list and nothing else.
      manquantes_vs_sans_etiquette: -2,
      questions: 'aucune',
    },
  },
  {
    id: 'C9n', titre: 'Negative control: a label with French text and look-alike marks, no CE marking',
    faits: { ...CHARGEUR, ...IMPORTATEUR_FR },
    etiquette: ['Ne pas jeter ce produit avec les ordures ménagères', 'ICES-003', 'CEC', 'SERVICE', 'Input: 100-240V~ 50/60Hz'],
    lecture: [
      { point: 'None of these lines is a CE marking: "ce" is a French word, "CEC" and "ICES-003" are other marks. The marking must stay missing, as must the declaration.', base: [B.lvd_imp_verif] },
    ],
    attendu: {
      role: 'importateur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'eps-ecoconception-importateur', 'gpsr-offre-distance', 'weee-producteur-introduction', 'msr-taches-importateur']),
      devoirs: [],
      preuves: { marquage_ce: 'manquante', declaration_ue_conformite: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C10', titre: 'Seller established outside the EU, original brand, shipping directly to consumers in France (not asked for, found while writing C1)',
    faits: { ...CHARGEUR, marque: 'origine', etablissement_vendeur: 'hors_ue', approvisionnement: 'hors_ue', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: true, acheteurs_consommateurs: true },
    lecture: [
      { point: 'WEEE producer under point (iv): the definition turns on distance selling from a third country, not on the role of manufacturer, importer or distributor. The seller must be given the producer duties.', base: [B.weee_iv, B.weee_registre] },
      { point: 'The seller makes a product available online to consumers in the Union; it is in the supply chain and is neither manufacturer nor importer, which is the wording of "distributor", and the definition of economic operator also takes in any other person with duties on making products available. The Article 19 items must be asked of it.', base: [B.gpsr_offre, B.gpsr_operateur, B.lvd_distributeur] },
      { point: 'No operator in the Union is known: the product may not be placed on the market. The output must carry that condition as work for the seller.', base: [B.msr_condition, B.msr_qui] },
      { point: 'The seller is not established in the Community, so it is not the importer that Article 4 of the Ecodesign Directive binds.', base: [B.eco_importateur, B.eco_def_importateur] },
    ],
    attendu: {
      role_non_vide: true,
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'eps-ecoconception', 'gpsr-offre-distance', 'weee-producteur-vente-distance']),
      devoirs: ['msr-operateur-ue', 'gpsr-offre-distance', 'weee-producteur-vente-distance'],
      preuves: { enregistrement_registre_producteurs: 'manquante', offre_personne_responsable: 'manquante', operateur_ue_identifie: 'manquante' },
      questions: 'aucune',
    },
  },
  {
    id: 'C11a', titre: 'Old stock: unit first supplied before 1 April 2020, resold by a French distributor',
    faits: { ...CHARGEUR, date_mise_sur_marche: 'avant_2020_04_01', marque: 'origine', etablissement_vendeur: 'france', approvisionnement: 'france', fabricant_etabli_ue: false, mandataire_ue: false, fourniture: 'seul', vente_a_distance: false, acheteurs_consommateurs: true },
    lecture: [
      { point: 'Regulation (EU) 2019/1782 applies from 1 April 2020 and repeals an earlier ecodesign Regulation on external power supplies as from that date. A unit supplied before that date was under the earlier act, which was not downloaded: the ecodesign line cannot be "not applicable", it is undetermined.', base: [B.eps_application, B.eps_predecesseur] },
    ],
    attendu: {
      role: 'distributeur',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs'], { 'eps-ecoconception': D }),
      devoirs: ['lvd', 'emc', 'rohs'],
      preuves: {},
      questions: null,
    },
  },
  {
    id: 'C11b', titre: 'Unit to be first supplied on or after 14 December 2028, own-brand French seller',
    faits: { ...CHARGEUR, date_mise_sur_marche: 'a_partir_du_2028_12_14', marque: 'propre', etablissement_vendeur: 'france', approvisionnement: 'hors_ue', fabricant_etabli_ue: true, mandataire_ue: false, fourniture: 'seul', vente_a_distance: false, acheteurs_consommateurs: true },
    lecture: [
      { point: 'From 14 December 2028 Regulation (EU) 2019/1782 is repealed and Regulation (EU) 2025/2052 applies. Ecodesign duties continue under the new act: the output must show an ecodesign line as applicable or to determine, not drop the subject.', base: [B.eps2_abrogation, B.eps2_application] },
    ],
    attendu: {
      role: 'fabricant',
      etats: etats(['msr-operateur-ue', 'lvd', 'emc', 'rohs', 'weee-producteur-marque-propre', 'msr-taches-fabricant-ue']),
      devoirs: ['lvd', 'emc', 'rohs'],
      preuves: {},
      signaler: [{ regime: 'Ecodesign of external power supplies from 14 December 2028 (Regulation (EU) 2025/2052)', celex: ['32025R2052', '32019R1782'], sauf: [], base: [B.eps2_abrogation, B.eps2_application] }],
      questions: 'aucune',
    },
  },
];

// ---------------------------------------------------------------------------------------------
// 1. Every extract must be found verbatim in its source.
// ---------------------------------------------------------------------------------------------
const plat = (s) => s.replace(/\s+/g, ' ');
const fichiers = new Map();
function sourcee(b) {
  if (b.id) { const t = TEXTES.find((x) => x.id === b.id); return Boolean(t && plat(t.texte).includes(plat(b.extrait))); }
  if (!fichiers.has(b.fichier)) fichiers.set(b.fichier, plat(readFileSync(join(ICI, 'sources', b.fichier), 'utf8')));
  return fichiers.get(b.fichier).includes(plat(b.extrait));
}
const nonSourcees = Object.entries(B).filter(([, b]) => !sourcee(b)).map(([k, b]) => `${k} (${b.id || b.fichier})`);

// ---------------------------------------------------------------------------------------------
// 2. Run the engine and compare.
// ---------------------------------------------------------------------------------------------
const refs = (bases) => (bases || []).map((b) => b.id || `${b.ref} [${b.fichier}, not in the catalogue]`);
const EXIG = Object.fromEntries(DATA.exigences.map((e) => [e.id, e]));

function comparer(cas) {
  const res = evaluerExigences(DATA, { valeurs: cas.faits, etiquette: cas.etiquette || [], declarees: [] });
  const att = cas.attendu, ecarts = [];
  const L = Object.fromEntries(res.lignes.map((l) => [l.id, l]));
  const ecart = (sujet, attendu, obtenu, bases) => ecarts.push({ sujet, attendu, obtenu, textes: refs(bases) });
  const basesDuCas = cas.lecture.flatMap((x) => x.base);

  if ('role' in att && res.role.role !== att.role) ecart('role', att.role === null ? 'no role stated' : att.role, res.role.role === null ? `none (${res.role.etat})` : res.role.role, basesDuCas);
  if (att.role_non_vide && !res.role.role) ecart('role', 'a role that carries duties', `none (${res.role.etat})`, basesDuCas);

  for (const id of LIGNES) {
    if (!L[id]) { ecart(`line ${id}`, att.etats[id], 'absent from the data file', []); continue; }
    if (L[id].etat !== att.etats[id]) ecart(`line ${id}`, att.etats[id], L[id].etat, basesDuCas);
  }
  for (const l of res.lignes) if (!LIGNES.includes(l.id)) ecart(`line ${l.id}`, 'not known when the cases were written: add it to LIGNES and to each case by reading the law', l.etat, []);

  for (const id of att.devoirs || []) if (L[id] && L[id].etat === A && !L[id].obligations.length) ecart(`duties on ${id}`, 'at least one duty for the seller', 'line shown as applicable with no duty and no evidence', basesDuCas);

  const toutes = res.lignes.flatMap((l) => l.obligations.flatMap((o) => o.preuves));
  for (const [id, etat] of Object.entries(att.preuves || {})) {
    const vus = [...new Set(toutes.filter((p) => p.id === id).map((p) => p.etat))];
    if (!vus.length) ecart(`evidence ${id}`, etat, 'not asked for anywhere in the work list', basesDuCas);
    else if (vus.length !== 1 || vus[0] !== etat) ecart(`evidence ${id}`, etat, vus.join(' + '), basesDuCas);
  }
  for (const [id, ligne] of Object.entries(att.ligne_vue || {})) {
    const p = toutes.find((x) => x.id === id && x.etat === 'vu_sur_etiquette');
    if (!p || p.ligne !== ligne) ecart(`label line for ${id}`, ligne, p ? p.ligne : 'none', basesDuCas);
  }
  if (att.aucune_preuve && toutes.length) ecart('evidence', 'none stated while nothing is known', `${toutes.length} evidence items`, basesDuCas);
  if (att.rien_declare && (res.bilan.preuves_declarees !== 0 || toutes.some((p) => p.etat === 'declaree'))) ecart('declared evidence', '0', String(res.bilan.preuves_declarees), basesDuCas);
  if (typeof att.manquantes_vs_sans_etiquette === 'number') {
    const sans = evaluerExigences(DATA, { valeurs: cas.faits, etiquette: [], declarees: [] });
    const delta = res.bilan.preuves_manquantes - sans.bilan.preuves_manquantes;
    if (delta !== att.manquantes_vs_sans_etiquette) ecart('missing evidence, with label minus without', String(att.manquantes_vs_sans_etiquette), String(delta), basesDuCas);
  }

  for (const s of att.signaler || []) {
    const porteuses = res.lignes.filter((l) => EXIG[l.id] && s.celex.includes(EXIG[l.id].acte.celex) && !s.sauf.includes(l.id) && l.etat !== N);
    if (!porteuses.length) ecart(`act to show: ${s.regime}`, 'a line "applicable" or "to determine"', 'no such line: the subject is absent or "not applicable"', s.base);
  }

  if (att.questions === 'aucune' && res.questions.length) ecart('questions', 'none (every fact is given)', res.questions.join(', '), []);
  if (att.questions === 'toutes') {
    const oubli = DATA.criteres.map((c) => c.id).filter((c) => !res.questions.includes(c));
    if (oubli.length) ecart('questions', 'every criterion of the file is asked', `not asked: ${oubli.join(', ')}`, basesDuCas);
    if (res.bilan.non_applicables !== 0) ecart('silent exclusions', '0 line "not applicable"', String(res.bilan.non_applicables), basesDuCas);
  }

  return {
    id: cas.id, titre: cas.titre,
    obtenu: { role: res.role.role, role_etat: res.role.etat, bilan: res.bilan, etats: Object.fromEntries(res.lignes.map((l) => [l.id, l.etat])), devoirs: Object.fromEntries(res.lignes.map((l) => [l.id, l.obligations.length])), questions: res.questions },
    ecarts,
  };
}

const resultats = CAS.map(comparer);
const total = resultats.reduce((n, r) => n + r.ecarts.length, 0);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ date: new Date().toISOString().slice(0, 10), extraits: { total: Object.keys(B).length, non_sources: nonSourcees }, cas: resultats.length, ecarts: total, resultats }, null, 1));
} else {
  console.log(`Extracts checked against their source: ${Object.keys(B).length - nonSourcees.length}/${Object.keys(B).length}${nonSourcees.length ? ' | NOT FOUND: ' + nonSourcees.join(', ') : ''}`);
  for (const r of resultats) {
    const b = r.obtenu.bilan;
    console.log(`\n${r.ecarts.length ? 'MISMATCH' : 'match   '} ${r.id}  ${r.titre}`);
    console.log(`  engine: role=${r.obtenu.role || r.obtenu.role_etat}, ${b.applicables} applicable, ${b.a_determiner} to determine, ${b.non_applicables} not applicable, ${b.preuves_manquantes} missing, ${b.marquages_vus} seen on label`);
    for (const e of r.ecarts) console.log(`  - ${e.sujet}: read from the law = ${e.attendu} | engine = ${e.obtenu}${e.textes.length ? ' | ' + e.textes.join('; ') : ''}`);
  }
  console.log(`\n${resultats.length} cases, ${resultats.filter((r) => r.ecarts.length).length} with at least one mismatch, ${total} mismatches in all.`);
}
if (nonSourcees.length) process.exit(2);
if (process.argv.includes('--strict') && total) process.exit(1);
