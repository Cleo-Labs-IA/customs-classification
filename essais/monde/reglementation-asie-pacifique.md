# Asia-Pacific regulations (JP, KR, AU, NZ, TW): verification report

Data file: `essais/monde/reglementation-asie-pacifique.json` (18 entries: JP 6, KR 2, AU 5, NZ 2, TW 3).
Checked on 2026-10-04 with `node essais/monde/verifier.mjs essais/monde/reglementation-asie-pacifique.json`.

## Final checker output (raw)

```
OK   jp-denan-scope-dc-power-supply | citation retrouvée mot pour mot dans la source
OK   jp-denan-conformity-assessment | citation retrouvée mot pour mot dans la source
OK   jp-denan-pse-sale-restriction | citation retrouvée mot pour mot dans la source
OK   jp-denan-importer-notification | citation retrouvée mot pour mot dans la source
OK   jp-radio-technical-conformity-mark | citation retrouvée mot pour mot dans la source
OK   jp-vcci-voluntary-emc | citation retrouvée mot pour mot dans la source
OK   kr-radio-waves-conformity-assessment | citation retrouvée mot pour mot dans la source
OK   kr-radio-waves-conformity-indication | citation retrouvée mot pour mot dans la source
OK   au-eess-level3-registration-rcm | citation retrouvée mot pour mot dans la source
OK   au-eess-responsible-supplier-local | citation retrouvée mot pour mot dans la source
OK   au-acma-supplier-steps-label | citation retrouvée mot pour mot dans la source
OK   au-gems-external-power-supply-scope | citation retrouvée mot pour mot dans la source
OK   au-gst-low-value-imported-goods | citation retrouvée mot pour mot dans la source
OK   nz-rsm-supplier-declaration | citation retrouvée mot pour mot dans la source
OK   nz-rsm-rnz-label | citation retrouvée mot pour mot dans la source
OK   tw-commodity-inspection-import | citation retrouvée mot pour mot dans la source
OK   tw-bsmi-commodity-inspection-mark | citation retrouvée mot pour mot dans la source
OK   tw-bsmi-rohs-presence-marking | citation retrouvée mot pour mot dans la source

18/18 vérifiées dans essais/monde/reglementation-asie-pacifique.json
```

## Count

18 OK / 18 total.

## Source caveats

- `jp-vcci-voluntary-emc` quotes vcci.jp, the VCCI Council's own site. It is a private council, not a government site. No government text on VCCI was found; the Council itself calls the scheme "voluntary control" and the obligation binds members only.
- Japanese texts on japaneselawtranslation.go.jp are official translations whose stated last versions are old (Act: Act No. 122 of 2011; Cabinet Order: No. 96 of 2012). Later amendments were not read.
- The Korean Radio Waves Act is the KLRI translation (elaw.klri.re.kr), stated on the site to be for reference only.
- The two Taiwan mark entries quote a BSMI information booklet (guidance, version 1.87, last updated 19 January 2026), not the regulation itself.
- `au-gems-external-power-supply-scope` is a scope entry: the regulator's page excludes devices with multiple output voltages that are not user-selected ("quick charge" units). The USB PD charger may be outside the Determination. Not decided here.
- "en_vigueur" is filled only where a date was read (AU GST: 1 July 2018; AU external power supplies Determination: 22 November 2014).

## Gaps (rules believed to apply, not verified against an official text)

1. KR, KC safety for the charger (Electrical Appliances and Consumer Products Safety Control Act). The Act was read on elaw.klri.re.kr (Articles 5, 9, 10 on safety certification; 15, 18, 19 on safety verification), but the product list is in the Enforcement Rule tables and no official English text of them was found. Whether a DC power supply is under safety certification or safety verification could not be confirmed, so no entry was written. kats.go.kr English page returned HTTP 500.
2. TW, NCC approval of the radio module (Telecommunications Management Act, controlled telecommunications radio-frequency devices, label CCAF24Y10090T8). ncc.gov.tw answers HTTP 403 to a plain client and law.moj.gov.tw resets the connection from this machine, so no official text could be read or quoted. Also blocks quoting the Commodity Inspection Act from law.moj.gov.tw (the BSMI PDF copy was used instead).
3. JP, PSE diamond versus circle. The Regulation for Enforcement, Article 17, points to Appended Tables 6 and 7 where the marks are drawings; the shapes are not described in text, so the meaning of diamond and circle is not asserted. The METI English page and guide PDF (meti.go.jp) were read once, then answered HTTP 202 with an empty body, so they cannot be used as a quoted source.
4. JP, duty to print the 5.2/5.3 GHz indoor use notice on the laptop. Only the use restriction was read (MIC leaflet); the labelling rule itself was not found. JP, lithium-ion battery under the same safety Act (Appended Table 2, item (xii), energy density threshold): applicability to a battery built into a laptop was not read.
5. AU, ACMA labelling notices on legislation.gov.au (EMC Labelling Notice 2017, General Equipment Rules 2021) and the GEMS Determination 2014 text were not read; the entries rely on the regulators' own pages. ACMA EMC rules for the charger alone were not checked. EESS level 3 definition of "Power supply or charger" was read in a two-column PDF that cannot be quoted cleanly, so it sits in a note.
6. NZ, electrical safety of the charger (WorkSafe, supplier declaration for electrical safety) was not researched; the two NZ entries cover the RSM radio and EMC framework only. The level of conformity of the laptop under RSM rules was not determined.
7. KR, local agent requirement for overseas manufacturers under the Radio Waves Act amendments: reported by secondary sources only, not found in the translation read. KR, route for the MT7920 module (certification versus registration) not read.
8. Waste, battery and import duty rules in the five markets were not researched.
