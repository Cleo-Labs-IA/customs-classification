#  Customs Classification

Selling internationally means researching customs codes, chasing missing product details and assembling paperwork for each destination. E-commerce sellers can spend hours on this work without knowing whether their classification will be accepted.

Cleo brings that workflow into one place, starting with a product photo. Multimodal AI reads photos and technical documents, while an encoded rule engine connects product facts to customs rules and official legal texts. An interactive decision graph explains the proposed code, flags contradictions and asks for missing information.

Merchants get a classification dossier they can review with their broker, with the evidence and reasoning already assembled. The goal is less manual research, less repeated data entry and clearer decisions before shipping, with human approval retained.

**Live app:** https://cleo-customs-classifier.vercel.app

## The pain, in the words of the people who live it

These are public posts by sellers, importers and customs brokers. Each quote links to its source.

**Hours of research, and still no certainty.**

> "i have spent ages on Google and feel more confused than when I started!"
> [Shopify Community, 2021](https://community.shopify.com/c/international-commerce/how-do-i-correctly-use-hs-codes-for-international-dropshipping/td-p/1377853)

> "Working out the 'correct' code was a bit of a guessing game."
> [Hacker News, 2024](https://news.ycombinator.com/item?id=38904255)

**The work is multiplied by the catalogue.**

> "i sell over 10k products and now EU want me to fill all tariff/HS code in all products"
> [r/shopify, 2026](https://www.reddit.com/r/shopify/comments/1u1zotm/anyone_have_to_deal_with_eu_rules_where_a_product/)

> "Updating spreadsheets, copying values into Shopify"
> [r/shopify_shipping_help, 2026](https://www.reddit.com/r/shopify_shipping_help/comments/1tiftml/how_are_you_managing_hs_codes_customs_data_for/)

**The product details needed to classify are missing.**

> "Most commercial invoices I've seen in my career are not descriptive enough on their own for classification"
> [r/CustomsBroker, 2024](https://www.reddit.com/r/CustomsBroker/comments/1ani4s7/commercial_invoice_hscode/)

**A wrong code stops the shipment.**

> "our freight forwarder keeps rejecting the HS codes we provide"
> [r/logistics, 2026](https://www.reddit.com/r/logistics/comments/1sm3soq/hs_codes_in_the_us/)

> "My DHL shipment is now held at US customs"
> [r/dhl, 2026](https://www.reddit.com/r/dhl/comments/1shqtyh/because_shipper_gave_wrong_hts_codes_shipment_is/)

**The seller carries the consequences, after the fact.**

> "I as the importer is having to accept the full blame"
> [UK Business Forums, 2025](https://www.ukbusinessforums.co.uk/threads/unexpected-huge-hmrc-c18-claim-for-past-unpaid-import-duties-vat-on-mistaken-commodity-codes-by-clearing-agent.428479/)

**So some sellers give up on selling abroad.**

> "I generally do not offer international for this very reason. Way too much trouble."
> [eBay Community, 2024](https://community.ebay.com/t5/Ask-a-Mentor/How-do-determine-a-6-digit-Tariff-code/td-p/34549196)

## Why it is this hard

- **One product, one code per destination.** The first six digits of a customs code are shared worldwide. Each country then adds its own national digits, with its own wording and its own duty rate. This app holds a national catalogue for 112 of 249 countries.
- **The same product can be read two ways.** A USB-C dock charges, carries data and drives a screen; its heading depends on its principal function. On the demo's 70 W charger, one lookup per country on the Cleo Legal API returned 8504.40 in 68 of 111 countries and another code in the 43 others.
- **The deciding fact is rarely in the product title.** It sits on a label, in a datasheet or on a product page, and two documents can contradict each other.

## What does about it

| The pain | What the app does |
| --- | --- |
| Hours of research | You drop a product photo, a label, a product page address or a few lines. The agent reads them and proposes a code. |
| Missing product details | Each fact is quoted from your documents. The agent asks only for the fact that decides, and says where each answer leads. |
| Documents that disagree | A contradiction stops the file until a person says which statement is true. |
| A code with no explanation | The rule is drawn as a decision graph. Each step shows the official text, the fact and the consequence. |
| Paperwork per destination | For each market: the tariff line, the base duty, the requirements with the official sentence behind each, and a draft declaration of conformity. |
| Who answers for the code | A person reviews and signs. The approved dossier exports with its code, its reasons and its evidence, ready to review with a broker. |

### How a product moves through the app

1. **Product record**: a photo of the product, its label or a pictogram, a product page address, or text.
2. **Identity**: you confirm which physical product the file is about.
3. **Facts**: the agent reads the documents; each fact cites its passage.
4. **Decision**: two readings side by side, the Cleo Legal API engine (`POST /v2/customs/classifications`) and a rule encoded from the Combined Nomenclature 2026 (`public/data/arbre.json`, 11 criteria, 33 nodes). `public/decision.js` gives one decision; a disagreement is settled by a signed arbitration.
5. **Review**: a declarant examines the file and signs. Approval stays closed while a question is open, the two readings disagree or a contradiction remains.
6. **Distribution**: exports of the approved file, what each country requires, draft declarations of conformity.

## What is verified today

Every figure is counted from a file of this repository.

| What | Count | Where |
| --- | --- | --- |
| Passages of the Combined Nomenclature 2026 behind the encoded rule, found word for word | 59 | `public/data/textes.json` |
| Official decisions the rule is replayed on | 87 (13 EU classification regulations, 74 US CBP rulings) | `public/data/decisions.json` |
| Result of that replay | 38 reproduced, 1 contradicted, 35 undecided, 13 out of scope | `essais/arbre/rejeu.json`, `essais/arbre/bilan.md` |
| Market requirements for the two demo products, each with a quote from the official text | 62 in 11 markets | `public/data/monde-produits.json` |
| Market access checklist for France (code 8504.40) | 20 requirement lines, 171 passages of EU acts | `public/data/exigences.json`, `public/data/textes-conformite.json` |

## Limits

- The encoded rule covers one family: notebook computers, chargers, power banks, docks, hubs, adapters and cables.
- The rule and the requirement lists are drafted by AI from the official texts they cite. A customs declarant or a lawyer has not reviewed them.
- The engine answers at six digits; national lines are proposals.
- The app says what a file holds and what is missing. It does not state that a product is compliant, and approval stays with a person.

## Run it

Node 22, no dependency to install.

    node server.mjs                # http://localhost:4318
    node --test tests/*.test.mjs

Settings in `.env`, read by the server only: `CLEO_API_KEY` (Cleo Legal API), `CLEO_BASE_URL`, `BEDROCK_REGION` and `BEDROCK_MODEL` (Claude on Amazon Bedrock, reads photos and documents), `APP_CODE` (optional access code), `PORT`. Without `CLEO_API_KEY`, the app replays the real responses recorded in `public/data/enregistrees.json` and says so on screen.

28 tests of `tests/obligations.test.mjs` need recorded API responses kept outside the repository.

| Path | Content |
| --- | --- |
| `server.mjs`, `app.mjs`, `api/` | Local server and Vercel function; the keys stay on the server. |
| `lib/` | Client of the Cleo Legal API, reading of product pages, obligations and cost. |
| `public/app/` | The interface, plain JavaScript modules, no build step. |
| `public/data/` | The encoded rule, the official texts, the decisions, the requirements, the demo store. |
| `essais/` | Scripts that build and verify the data, and the measurement notes. |
| `sonde-*.mjs` | Browser probes that play a full journey on the running app. |
