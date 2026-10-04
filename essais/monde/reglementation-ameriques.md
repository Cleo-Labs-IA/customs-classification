# Regulations for the Americas (US, Canada, Mexico): charger and laptop

Deliverable: `essais/monde/reglementation-ameriques.json` (19 entries: 8 US, 7 Canada, 4 Mexico).

Command: `node essais/monde/verifier.mjs essais/monde/reglementation-ameriques.json` (run on 2026-10-04)

## Checker output (raw)

```
OK   us-fcc-15-101-unintentional | citation retrouvée mot pour mot dans la source
OK   us-fcc-15-201-intentional | citation retrouvée mot pour mot dans la source
OK   us-doe-eps-standard | citation retrouvée mot pour mot dans la source
OK   us-doe-eps-marking | citation retrouvée mot pour mot dans la source
OK   us-ca-prc-25402-certification | citation retrouvée mot pour mot dans la source
OK   us-cbp-origin-marking | citation retrouvée mot pour mot dans la source
OK   us-de-minimis-suspension | citation retrouvée mot pour mot dans la source
OK   us-phmsa-lithium-un383 | citation retrouvée mot pour mot dans la source
OK   ca-radiocom-act-4-3 | citation retrouvée mot pour mot dans la source
OK   ca-ised-rss-gen-rel-listing | citation retrouvée mot pour mot dans la source
OK   ca-ised-rss-gen-host-label | citation retrouvée mot pour mot dans la source
OK   ca-ised-ices-003 | citation retrouvée mot pour mot dans la source
OK   ca-energy-efficiency-act-s4 | citation retrouvée mot pour mot dans la source
OK   ca-bc-electrical-certification-mark | citation retrouvée mot pour mot dans la source
OK   ca-tdg-air-icao | citation retrouvée mot pour mot dans la source
OK   mx-nom-001-scfi-2018 | citation retrouvée mot pour mot dans la source
OK   mx-nom-019-scfi-1998 | citation retrouvée mot pour mot dans la source
OK   mx-nom-029-ener-2017 | citation retrouvée mot pour mot dans la source
OK   mx-lmtr-art-271-homologacion | citation retrouvée mot pour mot dans la source

19/19 vérifiées dans essais/monde/reglementation-ameriques.json
```

## Count

19 OK / 19 total.

The checker proves that each quote is on the official page. It does not prove that the product falls in scope: scope limits are written in each entry's `note`.

## Gaps

Rules that probably apply but are NOT in the file, because the official text could not be read or verified.

1. California Title 20 (20 CCR 1601 to 1609): product scope for computers and battery charger systems, MAEDbS listing, and the meaning of the "CEC ID" on the laptop label. The official site (govt.westlaw.com/calregs) answers HTTP 403 to a plain client. Only the statute (Public Resources Code 25402) is quoted. A CEC advisory PDF on energy.ca.gov confirms computers are covered but is not the regulation.
2. Mexico NOM-019-SE-2021 (IT equipment safety, meant to cancel NOM-019-SCFI-1998): found only in a regulatory review list dated January 2022, no final publication found in the Diario Oficial. The 1998 standard is quoted instead, and its scope wording is dated. To confirm with a Mexican certification body.
3. Mexico: the legal basis that makes NOM certification a condition of import (Ley de Infraestructura de la Calidad and the Secretaría de Economía import rules listing tariff lines) was not opened. The NOM mark obligation on the laptop is therefore not proven here.
4. Mexico: homologation certificate number and label details (IFT guidelines, DOF note 5639645) opened but not quoted; lithium battery air transport rules for Mexico not searched to a national text.
5. Canada electrical safety: only British Columbia is quoted. Ontario Regulation 438/07 is served by script on ontario.ca and could not be read; other provinces not checked. There is no single federal text.
6. Canada ICES-001 (the standard ICES-003 points to for a separately sold power supply) not opened. The applicable RSS for Wi-Fi and Bluetooth (the text that makes the module Category I) not opened.
7. US DOE: numeric efficiency limits of 10 CFR 430.32(w)(1)(ii) are in an image table, not read. The International Efficiency Marking Protocol (incorporated by reference) not opened. The 10 CFR 429.12 certification report and the FCC rules read but left out of the file to stay near 18 entries (47 CFR 2.1077 US responsible party, 15.19 label statement, 15.212 host label, 2.925 FCC ID label) are mentioned in notes only.
8. US product safety listing (the cULus mark): no federal text found that requires it for consumer sale, so no entry. US duty rates and additional tariffs on Chinese origin goods are outside this file.
9. ICAO Technical Instructions (referenced by both the US and Canadian rules for air transport): not a free official text, not opened. The battery Wh rating is unknown, so the packing regime was not determined.
10. Label facts not checked against photos: "Made in China" and the "IC:" number are taken from the product description, not from the list of marks.
