# Regulations for the charger and the laptop: EU, Great Britain, Switzerland

File checked: `essais/monde/reglementation-europe.json` (25 entries: 14 EU, 5 GB, 6 CH).
Command: `node essais/monde/verifier.mjs essais/monde/reglementation-europe.json`, run on 2026-10-04.

## Result: 25 OK / 25

```
OK   eu-lvd-fabricant | citation retrouvée mot pour mot dans la source
OK   eu-emc-fabricant | citation retrouvée mot pour mot dans la source
OK   eu-red-exigences | citation retrouvée mot pour mot dans la source
OK   eu-chargeur-commun-laptop | citation retrouvée mot pour mot dans la source
OK   eu-eps-ecoconception-2019 | citation retrouvée mot pour mot dans la source
OK   eu-eps-usb-c-2028 | citation retrouvée mot pour mot dans la source
OK   eu-ordinateur-ecoconception | citation retrouvée mot pour mot dans la source
OK   eu-rohs-fabricant | citation retrouvée mot pour mot dans la source
OK   eu-deee-symbole | citation retrouvée mot pour mot dans la source
OK   eu-deee-vente-distance | citation retrouvée mot pour mot dans la source
OK   eu-batteries-symbole | citation retrouvée mot pour mot dans la source
OK   eu-rgsp-vente-en-ligne | citation retrouvée mot pour mot dans la source
OK   eu-operateur-responsable | citation retrouvée mot pour mot dans la source
OK   eu-marquage-ce | citation retrouvée mot pour mot dans la source
OK   gb-securite-electrique | citation retrouvée mot pour mot dans la source
OK   gb-marquage-ce-reconnu | citation retrouvée mot pour mot dans la source
OK   gb-equipement-radio | citation retrouvée mot pour mot dans la source
OK   gb-rohs | citation retrouvée mot pour mot dans la source
OK   gb-deee-symbole | citation retrouvée mot pour mot dans la source
OK   ch-basse-tension-ce | citation retrouvée mot pour mot dans la source
OK   ch-cem-marquage | citation retrouvée mot pour mot dans la source
OK   ch-installations-radio | citation retrouvée mot pour mot dans la source
OK   ch-substances-appareils | citation retrouvée mot pour mot dans la source
OK   ch-efficacite-alimentation | citation retrouvée mot pour mot dans la source
OK   ch-efficacite-ordinateur | citation retrouvée mot pour mot dans la source

25/25 vérifiées dans essais/monde/reglementation-europe.json
```

## How to read the file

- Every quote was cut by script from the downloaded official text, never retyped.
- These are obligations to meet. Nothing here says that either product meets them.
- Regulation in application today for the charger: Regulation (EU) 2019/1782 (since 1 April 2020). Regulation (EU) 2025/2052 replaces it from 14 December 2028 and adds the USB-C interoperability rule; both are listed.
- Laptops enter the EU common charger rules on 28 April 2026 (Article 2(1) of Directive (EU) 2022/2380).

## Deviations from the brief

- Swiss urls point to `fedlex.data.admin.ch/filestore/...`, the official Fedlex file store, not to `fedlex.admin.ch/eli/...`: the second one is a JavaScript page with no text in it, so the checker cannot read it. The file addresses were obtained from the official Fedlex SPARQL endpoint. Two Swiss texts have no English version (OMBT, OEEE); their three entries are quoted in French.
- 25 entries instead of the 12 to 20 aimed for, because three markets and two products are covered. All 25 pass.
- The checker cannot read a consolidated EU version: its CELEX pattern stops at the hyphen (`02014L0053-20241228` becomes `02014L0053`, HTTP 404). EU quotes therefore come from the acts as originally published, and only from articles that I checked are not amended where I had the consolidated text (radio equipment directive).
- On legislation.gov.uk each paragraph break carries a `&#xD;` that the checker keeps as text, so a UK quote must sit inside one paragraph. Two UK quotes are short for that reason, and one contains the editorial amendment marker `[ F2 must ]`.

## Gaps (rules that probably apply, not proven here)

EU
1. Directive 2009/125/EC (ecodesign framework): the CE marking and declaration of conformity duties attached to the two ecodesign regulations were not read. The entries for 2019/1782, 2025/2052 and 617/2013 carry no mark for that reason.
2. RoHS Annex II as amended (the four phthalates): only the original annex with six substances was read in the EU text. The phthalates were read in the Swiss ordinance only.
3. WEEE and batteries producer registration in France, Germany, Italy, Spain and the Netherlands: national laws, registers, fees and authorised representative rules were not read. Only the directive and the regulation are quoted.
4. Regulation (EU) No 617/2013: read as originally published, amendments not read; the numeric limits for notebook computers were not extracted.
5. Common charger: national transpositions of Directive (EU) 2022/2380 not read. The consolidated radio equipment directive of 28.12.2024 does not yet show point 1.13 (laptops).
6. Battery regulation: Article 38 (CE marking of the battery), Article 11 (removability, from 18 February 2027) and Article 55 (producer register) were read and are in a note, not as separate verified entries. Annex VI and the restricted substances of Article 6 were not read.
7. Radio equipment delegated acts (for example cybersecurity requirements under Article 3(3)): not read.
8. Efficiency level VI mark, cULus, PSE, NOM, EAC, RCM, KC, BSMI, NCC, VCCI, FCC: outside these three markets, not covered.

Great Britain
9. Electromagnetic Compatibility Regulations 2016 for the charger: regulation 8 and regulation 10 were read, no entry was written.
10. Ecodesign for the charger: the assimilated Regulation (EU) 2019/1782 on legislation.gov.uk was read (Articles 1 and 3, Annex II), no entry was written. Ecodesign for computers in Great Britain was not read.
11. Batteries and Accumulators (Placing on the Market) Regulations 2008: regulations 5 and 7 were read, but the page announces a revocation by S.I. 2026/1053 not yet applied to the text. S.I. 2026/1053 was not read, so no entry was written.
12. WEEE: the duty of a non-UK distance seller to appoint a UK authorised representative or join a scheme (regulation 14(1A) and (2)) was read but cannot be quoted in a form the checker accepts (the sentence spans several paragraphs). It is in the note of `gb-deee-symbole`.
13. CE recognition for the laptop and for EMC and RoHS: only regulation 34A of the Electrical Equipment (Safety) Regulations 2016 was read in full. The equivalent provisions of the radio, EMC and RoHS regulations were seen in the tables of contents only.
14. General Product Safety Regulations 2005, importer labelling duties and any UK responsible person rule: not read. No USB-C common charger rule was found in the UK provisions read.

Switzerland
15. Take-back of equipment (OREA, RS 814.620): Article 6 was read. It binds "fabricants", defined as those who manufacture or import into Switzerland for commercial supply, and traders. Whether a foreign brand shipping straight to Swiss consumers is caught is not settled by the text read, so no entry was written.
16. USB-C for laptops: Article 7 para. 2bis of the telecommunications installations ordinance leaves the categories to OFCOM. The OFCOM provisions were not read.
17. Batteries: Annex 2.15 of the ORRChem was read (mercury and cadmium limits, collection marking), no entry was written. The advance disposal fee was not read.
18. Product safety act and ordinance (LSPro, OSPro) and the low voltage declaration of conformity (OMBT Art. 8, read, in a note): no separate entry.
19. Authorities: the enforcement body for the Swiss energy efficiency ordinance and for the UK regulations was not read in the texts; the "autorite" field for those entries names the adopting body.
