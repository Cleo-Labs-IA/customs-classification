# Requirements file after the two reviews: report

Date: 2026-10-04. Market: France. File: `public/data/exigences.json`. Texts: `public/data/textes-conformite.json`.

**This encoding is drafted by AI from the downloaded texts of the acts. It has not been reviewed by a compliance lawyer.** It lists documents, markings and information to hold or check. It never states that a product complies, and a marking seen on a label is recorded as seen, never as proof of conformity.

## 1. Checks run after the corrections

| Check | Command | Result |
|---|---|---|
| Structure of the rules, by the engine | `verifierExigences(exigences, textes)` from `public/exigences-moteur.js` | `[]` (0 defect) |
| Texts word for word against the downloaded acts | `node essais/conformite/verifier-textes.mjs` | 171/171 texts found verbatim; negative control on lvd-art1 ("shall" replaced by "may"): rejected as expected; original entry still accepted; exigences.json: 0 structural defect(s) reported by the engine |
| Engine tests | `node --test tests/exigences.test.mjs` | 6 pass, 0 fail |
| Adversarial cases | `node essais/conformite/cas-epreuve.mjs` | 14 cases, 99 mismatches (16 before the corrections); 56/56 extracts found in their source. See section 6. |

Checksums of the files these figures hold for: exigences.json md5 1645c6e9e84306a834f67f21091993ad, textes-conformite.json md5 a2461240574b33f4ef1c7079972f9c98, exigences-moteur.js md5 70dfa42d76bb41b68dbe36fa496a6867.

## 2. Counts (counted by script from the two files)

| | Before the reviews | After |
|---|---|---|
| Criteria (questions) | 17 | 18 |
| Roles | 3 | 3 |
| Requirements (lines) | 14 | 20 |
| Obligations | 54 | 76 |
| Distinct evidence items | 27 | 35 (14 information, 8 marquage, 13 document) |
| Texts in the catalogue | 110 | 171 |
| Texts cited by the rules | 97 | 160 |

The 110 earlier texts are unchanged; 61 were added through `essais/conformite/construire-textes.mjs`, which copies passages from the downloaded acts.
Texts in the catalogue that no rule cites (11): lvd-annex4, emc-art14, eps-art4-1, eps-annex2-2c, eco-annex6, weee-annex3-6, weee-annex9, gpsr-art20-3, gpsr-art21, msr-art3-13, gpsr-art20-1.

## 3. Acts covered, version used, application

| Act | CELEX | Version downloaded | Texts | Lines of the file | Application |
|---|---|---|---|---|---|
| Directive 2014/35/EU (Low Voltage Directive), consolidated version of 30 May 2026 | 32014L0035 | 02014L0035-20260530 | 27 | lvd | In force. National measures apply from 20 April 2016 (date read in sources/metadata-actes.csv; Article 26 is not in the catalogue). |
| Directive 2014/30/EU (Electromagnetic Compatibility Directive), consolidated version of 30 May 2026 | 32014L0030 | 02014L0030-20260530 | 20 | emc | In force. National measures apply from 20 April 2016 (sources/metadata-actes.csv; Article 44 is not in the catalogue). |
| Directive 2011/65/EU (RoHS Directive), consolidated version of 1 July 2026 | 32011L0065 | 02011L0065-20260701 | 22 | rohs | In force since 21 July 2011 (sources/metadata-actes.csv). Addressed to Member States. |
| Commission Regulation (EU) 2019/1782 (ecodesign of external power supplies), text as published in OJ L 272, 25.10.2019 | 32019R1782 | 32019R1782 | 20 | eps-ecoconception | Applies from 1 April 2020 (eps-art9). Repealed with effect from 14 December 2028 except as provided in Article 9 of Regulation (EU) 2025/2052 (eps2-art8, eps2-art9-1, eps2-art9-2). |
| Directive 2009/125/EC (Ecodesign Directive), consolidated version of 4 December 2012 | 32009L0125 | 02009L0125-20121204 | 9 | eps-ecoconception-importateur | Repealed with effect from 18 July 2024 except Articles 1(3), 2, 3(1), 4, 5, 8 and others kept for products under implementing measures (espr-art79-1, espr-art79-1-b). |
| Regulation (EU) 2024/1781 (Ecodesign for Sustainable Products Regulation), consolidated version of 28 June 2024 | 32024R1781 | 02024R1781-20240628 | 2 | none (basis only) | Used only for Article 79 (survival of the articles of Directive 2009/125/EC). In force since 18 July 2024 (sources/metadata-actes.csv). |
| Commission Regulation (EU) 2025/2052 (ecodesign of external power supplies, applicable from 14 December 2028), text as published in the OJ of 24.11.2025 | 32025R2052 | 32025R2052 | 8 | eps-ecoconception-2028 | Applies from 14 December 2028; Article 9(3) from 14 December 2025 (eps2-art10). Not binding as such on 2026-10-04. |
| Directive 2012/19/EU (WEEE Directive), consolidated version of 8 April 2024 | 32012L0019 | 02012L0019-20240408 | 12 | weee-producteur-marque-propre, weee-producteur-introduction, weee-producteur-vente-distance, weee-mandataire-vente-distance | In force since 13 August 2012 (sources/metadata-actes.csv); all equipment in scope from 15 August 2018 (weee-art2-1-b). Addressed to Member States. |
| Regulation (EU) 2019/1020 (Market Surveillance Regulation), consolidated version of 12 August 2026 | 32019R1020 | 02019R1020-20260812 | 11 | msr-operateur-ue, msr-fabricant-hors-ue, msr-vendeur-hors-ue, msr-taches-fabricant-ue, msr-taches-importateur | Article 4 applies from 16 July 2021 (msr-art44). |
| Regulation (EU) 2023/988 (General Product Safety Regulation), consolidated version of 29 May 2026 | 32023R0988 | 02023R0988-20260529 | 13 | gpsr-offre-distance, gpsr-securite-generale | Applies from 13 December 2024 (gpsr-art52). |
| Directive 2014/53/EU (Radio Equipment Directive), consolidated version of 30 May 2026 | 32014L0053 | 02014L0053-20260530 | 16 | red-equipement-radio, red-chargeur-universel | In force since 11 June 2014 (sources/metadata-actes.csv). Common charger rules applied by Member States from 28 December 2024, from 28 April 2026 for laptops (cc-art2-1). |
| Directive (EU) 2022/2380 (common charger amendment to Directive 2014/53/EU), text as published in OJ L 315, 7.12.2022 | 32022L2380 | 32022L2380 | 1 | none (basis only) | Used only for the application dates of the common charger rules (cc-art2-1). |
| Regulation (EU) 2023/1542 (Batteries Regulation), consolidated version of 13 August 2026 | 32023R1542 | 02023R1542-20260813 | 10 | batteries | Applies from 18 February 2024; Article 17 and Chapter VI from 18 August 2024 (bat-art96-2, bat-art96-2-b). |

A consolidated text is a documentation tool of the Publications Office; only the Official Journal is authentic. For Regulation (EU) 2019/1782 and Regulation (EU) 2025/2052 the original Official Journal text is used: the consolidated versions 02019R1782-20191025 and 02025R2052-20251124 are listed by the Publications Office but return HTTP 404 (the second one was tried again on 2026-10-04 in English, in French and as PDF).

## 4. Changes made, with the text ids they rest on

Each finding was checked against the cited provision in `sources/` before acting. "revue-droit n" and "revue-cas n" give the position of the finding in each review file.

| Target | Change | Text ids | Finding |
|---|---|---|---|
| perimetre | States that a radio function or a battery now opens a line limited to the main conformity duties. | red-art1-4, bat-art1-3 | revue-cas 1, 3 |
| criteres.radio | Purpose condition of the definition added to the question; "wireless charging" removed from the examples. | red-art2-1-1 | revue-droit 6, revue-cas 10 |
| criteres.hors_champ_basse_tension | Conditions of the Annex II items restored in the question; "quoted as written" dropped; the plug sentence presented as the reading of this file. | lvd-annex2 | revue-droit 16 |
| criteres.appareil_alimente | Points 1, 3 and 4 of Annex I added as values, plus "None of the above"; the aide no longer tells the seller that the other kinds are not encoded. | eps-annex1-1, eps-annex1-3, eps-annex1-4, eps-art2-1 | revue-droit 3 |
| criteres.date_mise_sur_marche | Value "before 1 April 2020" removed: it produced "not applicable" although an earlier act applied; such a unit now stays "to determine". | eps-art8, eps-art9 | revue-cas 8 |
| criteres.batterie | New criterion: nothing in the questions enforced the "no battery" perimeter. | bat-art3-1-1, bat-art1-3 | revue-cas 3 |
| roles.fabricant | eco-art2-6 removed from the basis (it has no own-brand rule); definition of Regulation (EU) 2019/1020 added; limit stated. | eco-art2-6, msr-art3-8 | revue-droit 2, 24 |
| roles.importateur | Importer definitions of Regulation (EU) 2019/1020 and of Directives 2014/30/EU and 2011/65/EU added to the basis. | msr-art3-9, emc-art3-1-13, rohs-art3-9 | revue-droit 24 |
| roles.distributeur | Condition widened to every original-brand seller who is not the importer (the importer role is tested first): a seller outside the Union shipping directly no longer falls in "no role". Definitions of the other acts added. | lvd-art2-6, lvd-art2-5, msr-art3-10, msr-art6, emc-art3-1-14, rohs-art3-8 | revue-droit 1, 24; revue-cas 5 |
| msr-operateur-existe, msr-designation | "The provision names no person." added to both qui_agit. | msr-art4-1, msr-art4-2 | revue-droit 17 |
| preuve mandat_operateur_ue | Limited to the written mandate, the only document Article 4(2) names; the importer or fulfilment service provider stays the information item operateur_ue_identifie. | msr-art4-2 | revue-droit 18 |
| msr-vendeur-hors-ue (new line) | The Union-operator condition is now carried as work for a seller outside the Union under the original brand. | msr-art4-1, msr-art4-4, msr-art4-2, msr-art6 | revue-droit 1; revue-cas 5 |
| lvd | New duties lvd-fab-conception (Article 6(1)) and lvd-tracabilite (Article 11, three roles); "where applicable" restored in lvd-fab-documentation; Article 17(1) cited and the CE marking label completed; the own-brand sentence now names Article 10. | lvd-art6-1, lvd-art11, lvd-annex3-2, lvd-art17-1, lvd-art10 | revue-droit 15, 25, 26 |
| preuve notice_instructions_securite | Split: the low voltage duties keep "instructions and safety information"; the EMC duties get notice_instructions_cem (instructions and the Article 18 information). | lvd-art6-7, lvd-art8-4, lvd-art9-2, emc-art7-7, emc-art10-2, emc-art18 | revue-droit 14 |
| emc | The exclusion of radio equipment now rests on its provisions; new duties emc-fab-identification (Article 7(5)) and emc-tracabilite (Article 12); identification added to the importer and distributor checks, which refer to Article 7(5). | emc-art2-2-a, red-art50, emc-art7-5, emc-art12, emc-art9-2, emc-art10-2, emc-art11 | revue-droit 12, 13, 25 |
| red-equipement-radio (new line) | With radio = yes the low voltage and EMC lines were removed and nothing replaced them; the main conformity duties of Directive 2014/53/EU are now shown, with the list of what is not encoded. | red-art1-4, red-art3-1, red-art10-3, red-art10-4, red-art12-2, red-art12-3, red-art13-2, red-art50, emc-art2-2-a | revue-droit 5; revue-cas 1, 2 |
| rohs | Tolerance wording of Article 4(2) sourced; introductory words of Articles 7 and 9 quoted and the "addressed to Member States" caveat added to each duty; new duties rohs-fab-documentation (7(b)), rohs-fab-identification (7(g)), rohs-imp-verification (9(b), quoted up to "required documents"), rohs-tracabilite (12); identification added to the distributor check. | rohs-art4-2, rohs-art7-intro, rohs-art9-intro, rohs-art7-b, rohs-art7-g, rohs-art9-b, rohs-art10-a, rohs-art12, rohs-art11 | revue-droit 7, 8, 9, 10, 11, 25 |
| batteries (new line) | A product with a battery now opens a line for Regulation (EU) 2023/1542, limited to the conformity duties quoted; everything else in that Regulation is listed as not encoded. | bat-art1-3, bat-art3-1-1, bat-art38-2, bat-art38-3, bat-art41-2-ab, bat-art42-2-ab, bat-art44-a, bat-art18-3, bat-art96-2, bat-art96-2-b | revue-cas 3 |
| eps-ecoconception | Applies to the four kinds of Annex I equipment (was point 2 only); the own-brand sentence replaced by the definition of Directive 2009/125/EC; Article 9 exception to the 2028 repeal stated; nameplate, website and declared-value lists now quoted and named; the importer is no longer told that another website discharges it. | eps-annex1-1, eps-annex1-3, eps-annex1-4, eco-art2-6, eco-art2-8, eps2-art9-1, eps2-art9-2, eps-art8, eps-art3, eps-annex2-2a-table, eps-annex2-2b-table, eps-annex2-2c-table, eps-annex2-2b | revue-droit 2, 3, 21, 22; revue-cas 8 |
| eps-ecoconception-importateur | Condition added: the seller is established in the Union (the importer of Directive 2009/125/EC is "established in the Community"); four kinds of Annex I equipment. The own-brand importer case is stated as not decided. | eco-art2-8, eco-art4, eps-annex1-1, eps-annex1-3, eps-annex1-4 | revue-droit 2, 3; revue-cas 6 |
| eps-ecoconception-2028 (new line) | A unit first supplied from 14 December 2028 no longer loses the ecodesign subject: the line names the act that takes over and says its requirements are not encoded. | eps2-art3, eps2-art8, eps2-art10, eps2-art2-1, eps2-art9-1, eps2-art9-2 | revue-droit 22; revue-cas 9 |
| gpsr-securite-generale (new line) | For a consumer product outside the low voltage range and without radio function, the general safety requirement is now shown, flagged as a reading to be confirmed. | gpsr-art5, gpsr-art2-1, gpsr-art2-1-b, gpsr-art3-1, gpsr-art3-2 | revue-cas 4 |
| weee (three lines) | Definition of "WEEE from private households" cited for the financing duty; the registration item reworded and typed "information" (Article 16(2)(a) names no document). | weee-art3-1-h, weee-art12-1, weee-art16-2-a | revue-droit 19, 20 |
| weee-mandataire-vente-distance (new line) | A distance seller established in another Member State is now told to appoint an authorised representative in France by written mandate; the third-country seller is told the text does not settle who registers. | weee-art17-2, weee-art17-3, weee-art16-2-a | revue-droit 4 |

New lines (6): msr-vendeur-hors-ue, red-equipement-radio, batteries, eps-ecoconception-2028, gpsr-securite-generale, weee-mandataire-vente-distance. New criterion: batterie. Removed value: date_mise_sur_marche = avant_2020_04_01.

## 5. Findings declined or applied only in part, and why

- revue-cas 7 (the engine matches "CE" without regard to case, so the French word "ce" on a label is read as the CE marking): confirmed by the re-run (C9n still fails), not acted on. The defect is in `public/exigences-moteur.js`, which this task may not edit, and removing the "CE" marker from the data would also remove the legitimate detection. To be fixed by the engine team: match the marker case-sensitively.
- revue-droit 26, part on Article 20(3) of Regulation (EU) 2023/988 (importers and distributors tell the manufacturer about an accident): declined. The provision is confirmed (gpsr-art20-3, and gpsr-art20-1 was added to the catalogue), but the duty arises only once an accident is known and names no document. The engine only knows evidence to hold: encoding it would show a permanent "missing" item for an event that has not happened. Left as a gap.
- revue-droit 2, part asking that the importer ecodesign line also apply to an own-brand seller established in the Union who buys from a third country: not encoded. The reading is confirmed by eco-art2-6 and eco-art2-8, but the file has no fact about who actually manufactures the product (for an own-brand product, the name on the product is the seller's own). The definition is now quoted in the ecodesign line and the case is stated there as not decided.
- revue-cas 5, fourth role for a seller outside the Union: not done as a fourth role, since the data format allows three role ids. The same seller is now a distributor by the wording of lvd-art2-6 (option given in revue-droit 1), with a dedicated line for the Union-operator condition. The request that the page say "no duty encoded for your situation" on an applicable line without duty concerns the page, not this file.
- revue-droit 23 (the consolidated version of Regulation (EU) 2025/2052 could not be compared): cannot be acted on. The download failed again (HTTP 404). The gap is written in the new line eps-ecoconception-2028. `actes.md` is not among the files of this task and was not edited.
- revue-droit 11 (Article 9(b) of Directive 2011/65/EU): applied, but the provision is quoted only up to "required documents". Its end is a corrected passage carried between consolidation markers, which the builder refuses to copy; the check of the manufacturer identification and contact details by the importer is therefore not listed under RoHS (it is under the Low Voltage and EMC lines).
- revue-cas 8 (unit first supplied before 1 April 2020): applied by removing the value, the first of the two options. No line was created for Regulation (EC) No 278/2009 because that act is not in the source texts.
- revue-cas 1, 3, 4 and 9 offered a line with a single "not encoded" notice. For Directive 2014/53/EU and Regulation (EU) 2023/1542 the main conformity duties were encoded from the downloaded articles instead; for Regulation (EU) 2025/2052 and the general safety requirement, one duty resting on one article (eps2-art3, gpsr-art5).

## 6. Remaining mismatches of the case script, each explained

The script reports 99 mismatches in 14 of 14 cases. The script was not edited (it is not among the files of this task) and no rule was changed for the sole purpose of making a case pass.

- 84 mismatches "line not known when the cases were written": 6 new lines times 14 cases. The script holds a fixed list of the 14 earlier lines and flags any other line in every case. This says nothing about the law; the case team has to add the 6 lines to its list and write the expected state of each by reading the provisions.
- 12 mismatches "questions: batterie": the cases written as "every fact is given" do not give the new fact batterie, so the engine asks it and the line batteries stays "to determine". Expected until the cases state whether the product contains a battery. In C7 (power bank) this means the battery line shows as "to determine", not "applicable": with batterie = true it is applicable.
- C9n: evidence marquage_ce (read from the law: manquante; engine: vu_sur_etiquette). Engine defect described in section 5 (case-insensitive match of "CE"). Not fixed here.
- C10: duties on msr-operateur-ue (read from the law: at least one duty for the seller; engine: line shown as applicable with no duty and no evidence). The seller now has the role distributor and the Union-operator duties, but they sit in the new line msr-vendeur-hors-ue (2 duties, evidence operateur_ue_identifie and coordonnees_operateur_ue), not in msr-operateur-ue: inside one line the engine filters duties by role only, and putting them on the distributor role there would show them to every ordinary distributor, which Article 4(1) does not support. The line msr-operateur-ue is still shown as applicable with no duty for a distributor.
- C11a: line eps-ecoconception (read from the law: a_determiner; engine: non_applicable). The case sends the answer avant_2020_04_01, which no longer exists in the file. The engine treats an answer outside the listed values as a known answer that fails the condition, hence "not applicable". A seller using the page can no longer give that answer: the question stays open and the line stays "to determine". A stored old answer would still give "not applicable"; the page should discard answers that are not among the listed values.

Of the 16 mismatches reported before the corrections, 13 are gone (C5, C6, C7, C11b and 7 of the 8 of C10) and 3 remain (C9n, C10 on the line msr-operateur-ue, C11a).

## 7. What the file does NOT cover

French law: none obtained (legifrance.gouv.fr and the DILA open data server refused scripted requests, see `actes.md`). Not covered as a result:
- the transposition of Directives 2014/35/EU, 2014/30/EU, 2011/65/EU, 2012/19/EU and 2014/53/EU, which are the texts that bind a seller in France; every duty taken from a Directive is quoted from the Directive;
- the language rule (every "language determined by France" is the wording of the Directive; the language itself is not stated);
- producer registration and unique identifier, membership of a producer responsibility organisation, sorting information and any take-back duty of distributors: the WEEE lines quote the Directive only;
- for a distance seller in a third country, who registers as producer: the Directive text obtained does not say.

Standards and test reports:
- no harmonised standard was downloaded or listed; the file names "test reports" and "standards applied" only as elements of the technical documentation, and says nothing of which tests, which standards or what a report must contain;
- the content of an EU or EC declaration of conformity is referred to by its annex (lvd-annex4 and eco-annex6 are in the catalogue but not turned into a checklist); Annex VI of Directive 2011/65/EU and Annexes II and III of Directive 2014/30/EU are named but not extracted;
- the limit values of Regulation (EU) 2019/1782 are quoted as flattened tables (read row by row); Annex III (verification tolerances) and measurement methods are not extracted.

Union texts not encoded or only in part:
- Directive 2014/53/EU for a product with a radio function: only Articles 10(3), 10(4), 12(2), 12(3) and 13(2); not Article 3(2) to (4), Articles 17 and 21, Article 10(6) to (10), importer record keeping, notified bodies;
- Regulation (EU) 2023/1542 for a product with a battery: only Articles 38(2), 38(3), 41(2)(a)-(b) and 42(2)(a)-(b); nothing on Articles 6 to 14, labelling, due diligence, producer registration, waste batteries, or on who is the manufacturer of a battery built into a product;
- Regulation (EU) 2025/2052 (from 14 December 2028): scope, repeal, transition and Article 3 only; Annexes II and III and its conformity assessment are not extracted, and its corrected or consolidated text could not be obtained;
- Regulation (EC) No 278/2009 (units first supplied before 1 April 2020): not downloaded;
- Regulation (EU) 2023/988: Article 5 is shown only when the product is outside the Low Voltage Directive and has no radio function, on a reading that a lawyer should confirm; Articles 6 to 8 (how safety is assessed) and Article 20 (accidents) are not encoded; no line when the Low Voltage Directive is out because of Annex II;
- Directive 2011/65/EU: exemptions (Article 4(6), Annexes III and IV), points (a), (e), (f), (i), (j) of Article 7 and the other points of Articles 9 and 10; Decision No 768/2008/EC;
- Directives 2014/35/EU and 2014/30/EU: corrective action, cooperation with authorities, series production, storage and transport conditions, importer notice under Directive 2014/30/EU; Annex I of Directive 2014/35/EU (the safety objectives);
- Directive 2009/125/EC: which of manufacturer, importer or person placing on the market an own-brand seller is (the file has no fact about who manufactures);
- Regulation (EC) No 765/2008, Article 30 (general principles of the CE marking);
- whether a mobile phone or a tablet falls under a point of Annex I to Regulation (EU) 2019/1782, and whether wireless power transfer makes a product radio equipment: not settled by the texts obtained, left as open questions for the seller;
- modification of a product already on the market (it also makes the seller a manufacturer): no question asks it;
- not examined at all: REACH, POPs, the Packaging Regulation, the Cyber Resilience Act, energy labelling, customs formalities, vehicle-specific legislation for in-car accessories.

Points where the file takes a reading that a lawyer should confirm: a seller outside the Union shipping the original brand directly to buyers in France is treated as a distributor; Directives 2014/30/EU and 2011/65/EU are read as not covering electrical safety; a charger is treated as a power supply and not as a "plug or socket outlet for domestic use".

## 8. Files written

- `public/data/exigences.json` (corrected)
- `public/data/textes-conformite.json` (rebuilt by the builder, earlier entries unchanged)
- `essais/conformite/construire-textes.mjs` (the builder: the added passages)
- `essais/conformite/bilan.md` (this report)

Nothing was committed or deployed.
