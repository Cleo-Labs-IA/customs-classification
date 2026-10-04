# Audit of the regulatory watch (public/data/veille.json)

Date of the audit: 2026-10-04. Every claim of the 11 rules was checked against an official text read during the audit. Data: essais/monde/veille-audit.json (60 claims). Proof of the quotations: essais/monde/veille-audit-cites.json.

## Counts per rule

| Rule | Confirmed | Inexact | Unsupported | Total |
|---|---|---|---|---|
| ue-gpsr | 4 | 2 | 0 | 6 |
| ue-chargeur | 3 | 2 | 0 | 5 |
| ue-jouets | 4 | 1 | 0 | 5 |
| ue-3eur | 2 | 5 | 1 | 8 |
| us-de-minimis | 4 | 2 | 0 | 6 |
| us-cpsia | 2 | 2 | 0 | 4 |
| us-fcc | 2 | 1 | 1 | 4 |
| jp-pse | 2 | 3 | 0 | 5 |
| au-gst | 5 | 1 | 0 | 6 |
| au-piles-bouton | 4 | 1 | 0 | 5 |
| iata-lithium | 2 | 0 | 4 | 6 |
| **Total** | **34** | **20** | **6** | **60** |

## Inexact claims (20)

- **ue-gpsr-3**. App says: The question asked to the seller accepts the contact details only "on the product or the packaging" (effet.question)
  - Correction: The contact details may be indicated on the product or on its packaging, the parcel or an accompanying document.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0988
  - Note: The app question is narrower than Article 16(3): a seller who prints the details on the parcel or on a leaflet is compliant but would answer no.
- **ue-gpsr-6**. App says: The rule applies to every product, whatever its HS code (sh: "*")
  - Correction: The Regulation does not apply to medicinal products, food, feed, living plants and animals, animal by-products, plant protection products, certain transport equipment, certain aircraft and antiques.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0988
  - Note: Legal act, Article 2(2). The excluded categories are outside the electronics and toys of the demo, but the "*" scope overstates the text.
- **ue-chargeur-2**. App says: The listed devices "must charge through a USB-C port"; "Without a USB-C port, sale prohibited in the EU" (resume; effet.si_non_texte)
  - Correction: The USB Type-C receptacle is required only in so far as the device is capable of being recharged by means of wired charging.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2380
  - Note: Legal act, Annex Ia, Part I, point 2. A device that only charges wirelessly is not required to have a USB-C port, so the blocking message is too broad. Above 5 V, 3 A or 15 W the device must also support USB Power Delivery (point 3).
- **ue-chargeur-5**. App says: The list of devices is in "Annex I, Part I" of Directive (EU) 2022/2380 (source.ref)
  - Correction: The list is in Part I of Annex Ia, which the Annex to Directive (EU) 2022/2380 inserts into Directive 2014/53/EU.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2380
  - Note: Reference error only: Annex I of Directive 2014/53/EU is a different annex (equipment not covered by the Directive).
- **ue-jouets-3**. App says: The toy "comes with an EU declaration of conformity drawn up by the manufacturer" (resume)
  - Correction: The manufacturer draws up an EC declaration of conformity and keeps it for 10 years after the toy has been placed on the market; the Directive does not require it to accompany the toy.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0048
  - Note: Legal act, Article 4(2) and (3). Two errors: the document is named "EC declaration of conformity" in this Directive, and it is kept on file, not supplied with the toy. The app question ("on file") is right, the summary is not.
- **ue-3eur-4**. App says: The duty concerns shipments "worth less than EUR 150" / "under EUR 150" (resume; effet.valeur_max: 150; effet.libelle)
  - Correction: The duty applies to consignments whose intrinsic value does not exceed a total of EUR 150, so a consignment of exactly EUR 150 is covered.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0382
  - Note: Legal act, recital 6 and Article 2. The threshold is "not exceeding", not "less than", and it is the intrinsic value of the whole consignment.
- **ue-3eur-5**. App says: The duty applies "until the permanent regime takes effect" (resume)
  - Correction: The duty applies from 1 July 2026 until 1 July 2028.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0382
  - Note: Legal act, Article 2. Article 3(2) only provides that the Commission may propose an extension if the central IT system is not ready by 1 July 2028.
- **ue-3eur-6**. App says: The duty applies to every shipment under the threshold entering the EU (resume; sh: "*"; effet.type taxe_fixe with no condition)
  - Correction: The EUR 3 duty applies only where the import is VAT exempt under Article 143(1), point (ca), of Directive 2006/112/EC (seller using the Import One-Stop Shop) or where the goods are in a postal consignment; other operators pay the normal Common Customs Tariff.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0382
  - Note: Legal act, Article 2. Most serious gap for the demo: for a non-IOSS seller using a courier, the app shows EUR 3 where the ordinary tariff rate applies (recital 6).
- **ue-3eur-7**. App says: Goods of EU origin are excluded from the duty (origines_exclues: ["UE"])
  - Correction: The flat duty applies without considering the origin of the goods.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0382
  - Note: Legal act, recital 6. What matters is that the consignment is imported from a third country, not where the goods were made.
- **ue-3eur-8**. App says: The official text is the "Council of the EU, agreement of 12 December 2025", a press release (source.nom; source.ref; nature: texte_officiel)
  - Correction: The legal act is Council Regulation (EU) 2026/382 of 11 February 2026 amending Regulation (EC) No 1186/2009 as regards the elimination of the threshold-based customs duty relief.
  - Source: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0382
  - Note: The app still cites the press release of the political agreement. The act has since been adopted and published (OJ L, 2026/382, 18.2.2026); the source should point to it.
- **us-de-minimis-4**. App says: "No exemption: duties due on every shipment" (effet.texte)
  - Correction: The de minimis exemption continues to apply to the donations and informational materials covered by 50 U.S.C. 1702(b), and postal shipments are charged under a separate duty regime.
  - Source: https://www.federalregister.gov/documents/2025/09/02/2025-16802/notice-of-implementation-of-the-presidents-executive-order-14324-suspending-duty-free-de-minimis
  - Note: Official notice, section F. Not relevant to commercial electronics, but "every shipment" is too absolute.
- **us-de-minimis-6**. App says: The 2025 notice is presented as the text in force today (nature: texte_officiel; source)
  - Correction: Executive Order 14324 was revised by Executive Order 14388 of 20 February 2026, and CBP wrote an indefinite suspension of the exemption into its regulations by an interim final rule effective on 24 June 2026.
  - Source: https://www.federalregister.gov/documents/2026/06/24/2026-12670/indefinite-suspension-of-the-de-minimis-exemption-for-merchandise-arriving-through-all-modes-other
  - Note: Official interim final rule (91 FR 37789, document 2026-12670). The rule itself is unchanged for the demo (no exemption at or under $800), but the cited source is outdated: the Supreme Court ruling of 20 February 2026 on IEEPA tariffs led to Executive Order 14388 (91 FR 9433), then to this rule. The watch should cite it.
- **us-cpsia-2**. App says: The rule is applied to toys only (sh: 9503)
  - Correction: The certificate is required for any children's product, meaning a consumer product designed or intended primarily for children 12 years of age or younger, that is subject to a children's product safety rule.
  - Source: https://www.cpsc.gov/Business--Manufacturing/Testing-Certification/Childrens-Product-Certificate
  - Note: Regulator page. The app scope is narrower than the rule: children's clothing, nursery products or children's electronics outside heading 9503 also need a CPC.
- **us-cpsia-3**. App says: The obligation started on 14 August 2008 (debut)
  - Correction: 14 August 2008 is the date of enactment of Public Law 110-314; third-party testing and certification apply to a children's product manufactured more than 90 days after the Commission published the accreditation requirements for the safety rule concerned.
  - Source: https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap47-sec2063.htm
  - Note: Statute, 15 U.S.C. 2063(a)(3)(A) (2023 edition of the US Code on govinfo). The start date therefore differs by safety rule; no single date can be stated from the text.
- **us-fcc-2**. App says: An FCC identifier (FCC ID) or a supplier's declaration of conformity is enough for a Bluetooth or Wi-Fi device (effet.question)
  - Correction: Intentional radiators operating under part 15, which is the case of Bluetooth and Wi-Fi transmitters, must be certified; the Supplier's Declaration of Conformity is limited to the few categories listed in 47 CFR 15.201(a).
  - Source: https://www.govinfo.gov/content/pkg/CFR-2024-title47-vol1/xml/CFR-2024-title47-vol1-sec15-201.xml
  - Note: Regulation, 47 CFR 15.201(b) (edition of 1 October 2024 on govinfo). For the earbuds of the demo, a seller holding only a declaration of conformity would wrongly pass the app check.
- **jp-pse-1**. App says: Lithium-ion power banks fall within the scope of the law "since 1 February 2019" (resume; debut)
  - Correction: Power banks have been regulated since 1 February 2018; a one-year transitional period ran until 31 January 2019, after which unmarked stock can no longer be sold.
  - Source: https://www.meti.go.jp/policy/consumer/seian/denan/mlb_faq.html
  - Note: Regulator page (METI FAQ on mobile batteries, answer 14, in Japanese; Heisei 30 is 2018 and Heisei 31 is 2019). The METI guide cited by the app does not mention power banks or this date at all.
- **jp-pse-2**. App says: All lithium-ion power banks are covered (resume; sh 850760)
  - Correction: Only power banks whose cells have a volumetric energy density of 400 Wh/L or more per cell are covered.
  - Source: https://www.meti.go.jp/policy/consumer/seian/denan/mlb_faq.html
  - Note: Regulator page (METI FAQ, answer 1, in Japanese). In practice most power banks exceed this density, but the limit exists. The FAQ also excludes portable power stations with AC output (answer 4).
- **jp-pse-3**. App says: "Manufacture, import and sale are prohibited without technical conformity and PSE marking"; "Without PSE marking, import and sale prohibited in Japan" (resume; effet.si_non_texte)
  - Correction: What the Act prohibits without correct PSE marking is selling or displaying for sale; manufacturers and importers must notify their business and ensure conformity to the technical requirements.
  - Source: https://www.meti.go.jp/english/policy/economy/consumer/product_safety/pse_procedure/pdf/pse_regulatory-instructions.pdf
  - Note: METI guide, section 7 (Article 27 of the Act). The guide states that it is an unofficial translation and that only the Japanese texts have legal effect. The name of the notifying supplier must appear next to the mark.
- **au-gst-6**. App says: "10% GST to collect at the point of sale" for every seller (effet.texte, no condition)
  - Correction: A non-resident seller must register and charge GST only if its GST turnover from sales connected with Australia is equal to or greater than A$75,000 (A$150,000 for a non-profit organisation).
  - Source: https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-for-non-resident-businesses/how-australian-gst-works
  - Note: Regulator page (ATO, How Australian GST works). Below the threshold the seller does not collect GST, unless it registers voluntarily or sells through a marketplace that is liable.
- **au-piles-bouton-4**. App says: The rule is applied to toys and clocks only (sh: 9503, 9105)
  - Correction: The standard applies to all consumer goods containing, or intended to contain, button and coin batteries, with exclusions for hearing aids, certain professional equipment and audio-visual or ICT equipment whose batteries are soldered in place.
  - Source: https://www.productsafety.gov.au/business/search-mandatory-standards/button-and-coin-batteries-mandatory-standards/products-containing-button-and-coin-batteries-mandatory-safety-standard
  - Note: Regulator page. Remote controls, scales, thermometers, key fobs or earbud cases with a coin cell are in scope but outside the two HS headings of the app.

## Unsupported claims (6)

- **ue-3eur-3**. App says: The duty applies "to each distinct item" in the shipment (resume)
  - Why: The Regulation says "per item" and does not define "item" nor use the word "distinct". The idea that identical goods count once comes from the Council press release of 12 December 2025, which a plain HTTP client cannot download (browser check, HTTP 403), so it could not be verified here.
- **us-fcc-4**. App says: The rule started on 1 October 1998 (debut)
  - Why: No date of 1 October 1998 appears on the FCC equipment authorization page nor in the sections of 47 CFR part 2 and part 15 that were read. Origin of this date unknown.
- **iata-lithium-3**. App says: The rule applies since 1 April 2016 (debut)
  - Why: Neither the public IATA batteries page nor the 2026 guidance document gives this date. The ICAO news page that would state it refuses plain HTTP clients (HTTP 403), and the Dangerous Goods Regulations are behind a paywall.
- **iata-lithium-4**. App says: The 30% limit and the UN 3480 label also condition shipment "by land or sea" (effet.question)
  - Why: The IATA document only covers air transport. Nothing read supports a 30% state of charge requirement for road or sea carriage.
- **iata-lithium-5**. App says: "Transport refused by the carrier" if the conditions are not met (effet.si_non_texte)
  - Why: The public guidance does not describe carrier refusal. It states that shipment above 30% state of charge, or on a passenger aircraft, remains possible with State approvals (Special Provisions A331 and A201).
- **iata-lithium-6**. App says: The rule applies in every jurisdiction (juridictions: ["*"])
  - Why: The public IATA pages read do not state the geographic or legal reach of the Dangerous Goods Regulations. The guidance document says it is based on the ICAO Technical Instructions and "should not be relied upon as a source of regulatory compliance".

## Limits of this audit

- The Council press release cited by ue-3eur answers HTTP 403 to a plain HTTP client; the rule was checked against the legal act itself, Council Regulation (EU) 2026/382.
- The METI site (jp-pse) answers HTTP 202 with an empty body when it receives several requests in a short time. If the five jp-pse entries FAIL with "0 caractères lus", wait a few minutes and rerun: the quotations are in the pages.
- IATA: only the public Battery Guidance Document (2026) was read; the Dangerous Goods Regulations are behind a paywall.
- US texts on govinfo are the 2023 edition of the US Code and the 1 October 2024 edition of 47 CFR.
- Two Japanese quotations (jp-pse-1, jp-pse-2) are in Japanese because METI publishes the power bank FAQ only in Japanese.

## Final checker output (raw)

Command: node essais/monde/verifier.mjs essais/monde/veille-audit-cites.json

```
OK   ue-gpsr-1 | citation retrouvée mot pour mot dans la source
OK   ue-gpsr-2 | citation retrouvée mot pour mot dans la source
OK   ue-gpsr-3 | citation retrouvée mot pour mot dans la source
OK   ue-gpsr-4 | citation retrouvée mot pour mot dans la source
OK   ue-gpsr-5 | citation retrouvée mot pour mot dans la source
OK   ue-gpsr-6 | citation retrouvée mot pour mot dans la source
OK   ue-chargeur-1 | citation retrouvée mot pour mot dans la source
OK   ue-chargeur-2 | citation retrouvée mot pour mot dans la source
OK   ue-chargeur-3 | citation retrouvée mot pour mot dans la source
OK   ue-chargeur-4 | citation retrouvée mot pour mot dans la source
OK   ue-chargeur-5 | citation retrouvée mot pour mot dans la source
OK   ue-jouets-1 | citation retrouvée mot pour mot dans la source
OK   ue-jouets-2 | citation retrouvée mot pour mot dans la source
OK   ue-jouets-3 | citation retrouvée mot pour mot dans la source
OK   ue-jouets-4 | citation retrouvée mot pour mot dans la source
OK   ue-jouets-5 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-1 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-2 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-4 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-5 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-6 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-7 | citation retrouvée mot pour mot dans la source
OK   ue-3eur-8 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-1 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-2 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-3 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-4 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-5 | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-6 | citation retrouvée mot pour mot dans la source
OK   us-cpsia-1 | citation retrouvée mot pour mot dans la source
OK   us-cpsia-2 | citation retrouvée mot pour mot dans la source
OK   us-cpsia-3 | citation retrouvée mot pour mot dans la source
OK   us-cpsia-4 | citation retrouvée mot pour mot dans la source
OK   us-fcc-1 | citation retrouvée mot pour mot dans la source
OK   us-fcc-2 | citation retrouvée mot pour mot dans la source
OK   us-fcc-3 | citation retrouvée mot pour mot dans la source
OK   jp-pse-1 | citation retrouvée mot pour mot dans la source
OK   jp-pse-2 | citation retrouvée mot pour mot dans la source
OK   jp-pse-3 | citation retrouvée mot pour mot dans la source
OK   jp-pse-4 | citation retrouvée mot pour mot dans la source
OK   jp-pse-5 | citation retrouvée mot pour mot dans la source
OK   au-gst-1 | citation retrouvée mot pour mot dans la source
OK   au-gst-2 | citation retrouvée mot pour mot dans la source
OK   au-gst-3 | citation retrouvée mot pour mot dans la source
OK   au-gst-4 | citation retrouvée mot pour mot dans la source
OK   au-gst-5 | citation retrouvée mot pour mot dans la source
OK   au-gst-6 | citation retrouvée mot pour mot dans la source
OK   au-piles-bouton-1 | citation retrouvée mot pour mot dans la source
OK   au-piles-bouton-2 | citation retrouvée mot pour mot dans la source
OK   au-piles-bouton-3 | citation retrouvée mot pour mot dans la source
OK   au-piles-bouton-4 | citation retrouvée mot pour mot dans la source
OK   au-piles-bouton-5 | citation retrouvée mot pour mot dans la source
OK   iata-lithium-1 | citation retrouvée mot pour mot dans la source
OK   iata-lithium-2 | citation retrouvée mot pour mot dans la source

54/54 vérifiées dans essais/monde/veille-audit-cites.json
```
