# Synthesis of the two proposals: public/data/exigences.json

Reference date 2026-10-04. Market FR. Product: mains external power supply / USB-C charger, no radio, no battery.
Every provision cited is an entry of `public/data/textes-conformite.json` (110 entries, built from the files in `sources/`). The one statement that rests on a downloaded provision outside that catalogue is marked as such in section 3.
Drafted by AI from the official texts, not reviewed by a compliance lawyer. The file lists work to do; it never says a product complies, and a marking seen on a label is recorded as "seen", never as proof.

## 1. Figures (counted by script, not estimated)

| File | Engine defects (`verifierExigences`) | Criteria | Requirements | Obligations | Distinct evidence ids |
|---|---|---|---|---|---|
| proposition-a.json | 0 | 14 (1 drives nothing: `batterie`) | 14 | 47 | 24 |
| proposition-b.json | 0 | 14 | 11 | 51 | 26 |
| public/data/exigences.json | 0 | 17 (all used) | 14 | 54 | 27 |

Texts cited by the final file: 97 of the 110 catalogue entries. The 13 not cited create no duty with a named evidence for this product, or are covered by another entry: lvd-art6-1, lvd-art15-4, lvd-art17-1, lvd-annex4, emc-art14, eps-art4-1, eps-annex2-2c, eco-annex6, eps2-art1-1, weee-annex3-6, weee-annex9, gpsr-art20-3, gpsr-art21.

## 2. What was kept from each proposal

Three tests were applied to every item: (1) is each criterion a fact a seller can answer, (2) does the cited provision say what the item claims, (3) is the evidence the one the article names.

### Structure
- Requirement grid of A (14 lines): A splits the market surveillance and importer ecodesign duties by the facts written in the articles (manufacturer established in the Union or not). B applied the Article 4(3) tasks to every importer established in the Union, which fails test 2: under Article 4(2)(b) the importer is the operator "where the manufacturer is not established in the Union". B also gave the Article 4 duty of Directive 2009/125/EC to every importer, although the article opens with "Where the manufacturer is not established within the Community and in the absence of an authorised representative".
- Evidence model of B: one EU declaration of conformity (Directive 2014/35/EU, Article 15(3): "a single EU declaration of conformity shall be drawn up in respect of all such Union acts"), technical documentation split by subject for the manufacturer (safety, EMC, substances, ecodesign: four different sets of test results) and one single item for the importer (`acces_doc_technique`, the wording of Article 8(8): "ensure that the technical documentation can be made available").

### Criteria
- From B: the definition of an external power supply cut into facts readable on the label (`sortie_plus_basse`, `boitier_separe`, `puissance_sortie`), the input voltage enum with the DC range of Article 1 of Directive 2014/35/EU, the three-value date (before 1 April 2020, until 13 December 2028, from 14 December 2028), `acheteurs_consommateurs` (Article 4 of Regulation (EU) 2023/988 speaks of an offer "targeted at consumers").
- From A: `approvisionnement` (one question read on the supplier invoice, instead of B's two booleans), `fabricant_etabli_ue`, the Annex II list of Directive 2014/35/EU as a yes/no question (`hors_champ_basse_tension`; B cited the annex but never asked), the exclusions of Article 1(2) of Regulation (EU) 2019/1782 as a yes/no question (`type_exclu_ecoconception`; B cited them but never asked).
- Rejected from A: `type_appareil`, one enum mixing the definition of Article 2(1) with the exclusions of Article 1(2) (a seller cannot pick one value when two are true), and its use as the scope test of the EMC Directive, which no provision supports. `batterie`: asked but drives nothing.
- Added: `mandataire_ue`, because Article 4 of Directive 2009/125/EC makes the absence of an authorised representative a condition of the importer's duty. Neither proposal asked it.

### Roles
- Manufacturer and importer: identical in both, kept.
- Distributor: B's explicit condition (original brand and product already placed on the Union market). A's catch-all ("original brand", nothing else) labelled as distributor a seller outside the Union that brings the product in itself, which the definition does not say (see 4.2).

### Obligations
- Low voltage: B's list (technical documentation content from Annex III, single declaration, model of the declaration) with A's direct wording of "who acts".
- EMC and RoHS: common to both. B attached the RoHS technical documentation to Article 7(c), which only says a single documentation "may be drawn up"; it is now attached to Article 7(d), which names it.
- Ecodesign: B's file obligation (Directive 2009/125/EC, Annex IV, point 2) and declaration content (Article 5(3)); A's two limit values (no-load consumption, average active efficiency, Annex II, points 1(a) and 1(b)), which are the substance the file must prove; B's split of manual and website information into two evidence items.
- Market surveillance: A's four lines, with one correction. Both proposals put the "operator must exist" duty on Article 4(2), a list; it is now on Article 4(1) ("may be placed on the market only if"). A also listed the distributor for it; a distributor does not place on the market, so it was removed.
- WEEE: B's three obligations (registration, marking, financing). A left financing out because Article 12(1) names no document; it is kept as a line of type "information" whose label says so.
- Distance offer (Regulation (EU) 2023/988, Article 19) and common charger (Directive 2014/53/EU, Article 3a): identical in both.

### Evidence ids merged
- `declaration_ue_conformite` + A's `declaration_ue_conformite_traduite`: one document, the translation is a property of it.
- A's `notice_securite_langue` + `notice_informations_cem` + B's `notice_utilisation`: one leaflet, `notice_instructions_securite`.
- A's `identification_type_lot_serie` = B's `identification_produit` (kept with B's label markers Model, Modèle, M/N, S/N).
- A's `documentation_technique` for importers = B's `acces_doc_technique`.
- A's `information_notice_site_ecoconception` split into `info_ecoconception_notice` and `info_ecoconception_site`.
- B's `designation_operateur_ue` = A's `mandat_ecrit_mandataire`, now `mandat_operateur_ue`.

### Order (what blocks a sale first)
1. No economic operator in the Union: the product "may be placed on the market only if" one exists (2 lines).
2. Product conditions carried by the CE marking: electrical safety, EMC, restricted substances, ecodesign, importer ecodesign.
3. Conditions on the offer: distance listing, bundle with a radio device.
4. Producer duties for waste equipment (3 lines; the binding French rules are not sourced).
5. Standing tasks of the Union operator after the sale (2 lines).

## 3. Gaps (not written in the data because no official text was obtained, or outside the catalogue)

French law, none obtained (legifrance.gouv.fr answers HTTP 403 to scripted requests, the DILA open data server resets the connection, the PISTE API needs credentials absent from this machine):
- Loi n° 94-665 du 4 août 1994, article 2 (French language). Every "language determined by France" in the file is the Directive's wording; the language itself is not stated.
- Code de l'environnement: producer registration and unique identifier, eco-organisation membership, Triman and sorting information. The three WEEE lines quote the Directive, which is addressed to Member States, and say so in "who acts".
- French transposition of Directives 2014/35/EU, 2014/30/EU, 2011/65/EU, 2012/19/EU and 2014/53/EU, which are the texts that bind a seller in France.

Union texts:
- Directive 2014/30/EU, Article 2(2)(a) is downloaded but not in the catalogue. It reads: "This Directive shall not apply to: (a) equipment covered by Directive 1999/5/EC;" (`sources/02014L0030-20260530.txt`, lines 40 to 43). The EMC line is "not applicable" when the product has a radio function on that basis, without a clickable citation. To add to `textes-conformite.json` as `emc-art2-2-a`.
- Radio equipment duties themselves (Directive 2014/53/EU for a product with a radio function): not encoded. With `radio = yes` the file removes the low voltage and EMC lines and puts nothing in their place.
- Regulation (EU) 2023/1542 (batteries): downloaded, no entry. No battery criterion.
- Regulation (EU) 2019/1782: the lists of nameplate items (Annex II, 2(a)), manual and website items (2(b)) and declared values (2(c)) are quoted by their introductory words only. Annex I is limited to point 2 (information technology equipment); points 1, 3 and 4 (household appliances, consumer equipment, toys and leisure equipment) are in the downloaded file but not in the catalogue, so a charger for such equipment stays "to determine". Article 3 (the article that makes Annex II binding) is not in the catalogue: the limit values are cited from the annex. A corrigendum cannot be ruled out (no consolidated English version at the Publications Office).
- Regulation (EU) 2025/2052 (applies from 14 December 2028): requirements not extracted. A unit first supplied on or after that date gets no ecodesign line.
- Directive 2014/35/EU, Articles 6(4), 6(8), 8(5) to 8(7), 9(3) onwards; Directive 2014/30/EU, Articles 7(3) (manufacturer record keeping), 7(5), 9(7) (importer record keeping) and 18; Directive 2011/65/EU, Articles 7(a), (b), (e), (f), (g) and the importer verification points of Article 9: not in the catalogue, no line.
- Regulation (EU) 2023/988: Article 20(3) (telling the manufacturer about an accident) is event-driven and names no document: not encoded. The definitions of "product" and "consumer" are not in the catalogue.
- Regulation (EC) No 765/2008, Article 30 (general principles of the CE marking): not extracted.
- Modification of a product already on the market (Article 10 of Directive 2014/35/EU and equivalents) also makes the seller a manufacturer: no criterion, the scenario says "unchanged".
- Not examined: harmonised standards, REACH, POPs, Packaging Regulation (EU) 2025/40, Cyber Resilience Act, energy labelling, customs formalities.

Cases the file does not resolve:
- A seller established outside the Union that keeps the original brand and brings the product in itself matches no role (the importer must be "established within the Union"). The requirement lines still show as applicable, without duties.
- A seller established in France that buys under the original brand from a French supplier is not a WEEE producer under Article 3(1)(f): no WEEE line. Any take-back duty of distributors under French law is not sourced.

## 4. Points where a lawyer could read the law differently

1. One declaration or two. Directive 2009/125/EC requires an "EC declaration of conformity"; Directives 2014/35/EU, 2014/30/EU and 2011/65/EU an "EU declaration of conformity", single for all acts "requiring an EU declaration of conformity". The file keeps two evidence items. Practice commonly merges them into one document; no catalogued provision says so.
2. The seller outside the Union under the original brand. Read literally, the definition of distributor ("other than the manufacturer or the importer") could cover it; but a distributor does not place on the market, and this seller does. The file assigns no role.
3. Own-brand reseller as manufacturer of someone else's product. Article 10 of Directive 2014/35/EU is clear. For ecodesign, Article 2(6) of Directive 2009/125/EC defines the manufacturer as the person "who manufactures" and is responsible for conformity "under the manufacturer's own name or trademark": whether a pure rebrander is that person or falls under the second sentence is arguable. The file treats it as manufacturer.
4. Which Union operator, when several exist. Article 4(2) of Regulation (EU) 2019/1020 says "any of the following". When an importer and an authorised representative both exist, the file gives the tasks to the importer; a mandate can place them on the representative.
5. Who must print the Union operator's details (Article 4(4) names nobody) and whether the manufacturer or importer address already required by the Directives satisfies it. The file asks for it as its own line, on the one placing the product on the market.
6. "Accompanied by the required documents" (importer and distributor checks). The file reads it as the instructions and safety information; some read it as including the declaration of conformity.
7. "Plugs and socket outlets for domestic use" (Annex II of Directive 2014/35/EU). The file reads a charger as a power supply, not as a plug sold as such, and says so in the help line; the question remains the seller's to answer.
8. Annex I, point 2 of Regulation (EU) 2019/1782. Whether a phone or a tablet is "information technology equipment ... intended primarily for use in the domestic environment" is an assumption carried by the seller's answer.
9. EMC "apparatus". "Finished appliance ... intended for the end-user" is assumed for a charger sold as such; a power supply sold only for incorporation by an assembler could be read as a component.
10. Regulation (EU) 2023/988, Article 19, for a product under harmonisation legislation. The file reads Article 2(1) as leaving Chapter III, Section 2 in force. The "responsible person" then points to Article 4(1) of Regulation (EU) 2019/1020.
11. Common charger duties. Article 3a binds the "economic operator" offering the radio equipment with a charging device. The file applies it to the seller of the bundle in any role; who must print the pictogram on the packaging (manufacturer of the device or seller) is not settled by the article.
12. WEEE producer when the French seller is own-brand and also imports: points (i)/(ii) and (iii) both fit; one line is shown (own brand). The Directive binds Member States, so each duty is conditional on French law that was not obtained.
13. WEEE financing: Article 12(1) covers waste "from private households". A business-only seller is under Article 13, not in the catalogue.
14. Ecodesign record keeping: "10 years after the last of that product has been manufactured" (Directive 2009/125/EC) against "10 years after the equipment has been placed on the market" (the other three Directives): two different clocks, both kept as written.

## 5. Verification (run on 2026-10-04)

`verifierExigences(data, textes)` returns `[]`. Extra script checks: every condition value exists in its criterion, every criterion is used, no obligation id is duplicated, each evidence id has one label and one type, no em dash: `[]`. Engine tests (`node --test tests/exigences.test.mjs`): 6 pass, 0 fail.

`evaluerExigences` on the two cases of the scenario (product facts: AC 50 to 1 000 V input, no radio, not in Annex II, lower voltage output, separate enclosure, 250 W or less, not an excluded type, powers domestic IT equipment; first supply between 1 April 2020 and 13 December 2028; nothing declared as held):

| Case | Role found | Applicable | To determine | Not applicable | Missing evidence | With a rating label read ("Model: A2305", "CE") |
|---|---|---|---|---|---|---|
| 1. Resold unchanged under the original brand: French seller buying from outside the EU, manufacturer outside the EU without representative, sold alone, online to consumers | importateur | 9 | 0 | 5 | 20 | 18 missing, 2 markings seen |
| 2. Sold under the seller's own brand: French seller, supplied with a listed radio device, online to consumers | fabricant | 9 | 0 | 5 | 25 | 23 missing, 2 markings seen |
| 3. (extra) Resold unchanged, bought from a French wholesaler, sold alone in a shop | distributeur | 5 | 0 | 9 | 5 | not run |
| 4. (extra) Product facts only, nothing answered about the sale | to determine | 4 | 10 | 0 | 0 | not run |
| 5. (extra) Nothing known | to determine | 0 | 14 | 0 | 0 | not run |

Case 5 asks all 17 questions and declares nothing "not applicable": an unknown fact is a question, never a silent exclusion.
In case 3, two of the five applicable lines (Union operator, ecodesign) carry no encoded duty for a distributor; the page says so.
