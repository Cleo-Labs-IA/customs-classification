# Stamped: customs classification and shipment compliance

## The demo (since 4 Oct 2026)

The default store holds two real products, read from their photographed labels: a 70 W USB-C power adapter and a notebook PC (model M1605N).

Navigation: **Products**, **Shipments**, **Questions**, **Regulatory watch**; the rule editor sits apart, for experts.

- **Products** (home): one card per product (photo, code, state, and where it stands: label read, code found, signed, evidence per market), a card to add a product (photo, label, pictogram, product page link or text), and the store's shipments in one line.
- **A product** (`#/produit?sku=…`) opens its own space, one header and four tabs:
  - **Overview**: what the label says, the code with the steps that lead to it, *Validate and sign*, the evidence per market (Yes / No, signed; every order to that market follows), and the orders waiting.
  - **Why this code** (`#/arbre?sku=…`): the encoded rule drawn as a graph, each step with its question, the label passage and the official text.
  - **World** (`#/monde?sku=…`): per country, the tariff line the engine proposes and the base duty; per market, the requirements with the official sentence behind each.
  - **Classification file** (`#/dossier?sku=…`): the full file, started from the facts already established on the label.
- **Shipments**: an overview (map, deadlines) and the orders, behind one switch. Each order line is checked for its country against the verified rules, on the code of the product's single decision (engine and encoded rule read together, `public/decision.js`); a code validated by a person takes precedence.
- **Questions**: everything still to decide, across products.
- **Rule editor** (`#/arbre`): the free-form tree, signed edits, replay on the 87 official decisions.

### Where the data comes from

    node essais/monde/enregistrer.mjs        # real lookups on the Cleo Legal API, 112 countries with a national catalogue
    node essais/monde/verifier.mjs <file>    # re-downloads each official source and looks for the quote word for word
    node essais/monde/assembler.mjs          # public/data/monde-produits.json
    node essais/monde/construire-veille.mjs  # public/data/veille.json, from verified entries only
    node essais/demo/generer.mjs             # default store: the two products and their orders

- Regulations: 62 requirements in 11 markets (`essais/monde/reglementation-*.json`), each with a quote found word for word in the official text. The gaps (rules that could not be checked) are listed in the `.md` file next to each JSON file.
- The 11 rules of the former regulatory watch were audited claim by claim (`essais/monde/veille-audit.md`): 34 confirmed, 20 inexact, 6 unsupported out of 60. The watch now only applies verified rules.
- Limits: the encoded rule is drafted by AI and not reviewed by a customs declarant; tariff lines are proposals of the engine; the requirement list is not complete; nothing states that a product is compliant.

## Cockpit (home page, since 4 Oct 2026)

A shop imports its orders (Shopify or Etsy CSV export, or free columns). Each product is classified once on the Cleo Legal API; each order line is then checked for its delivery country by the rules of the regulatory watch, applied to the retained code. Each status (ready, to check, blocked) points to what it rests on: the classification, an official text, a signed answer.

    node server.mjs                          # http://localhost:4318 (Node 22)
    node --test tests/conformite.test.mjs tests/csv.test.mjs tests/page.test.mjs tests/dossier.logique.test.mjs
    node essais/demo/generer.mjs             # regenerates the demo shop

- **Overview**: breakdown of the lines to ship, map of shipments (Europe inset), deadlines with a countdown, signed log.
- **Orders**: one row per line, tabs by status, country and deadline filters. Only ready lines ship.
- **Products**: product × destination matrix; a code is validated once, at six digits.
- **Questions**: questions from the engine, codes to validate, documents required by a country. Before you answer, each answer shows how many lines it unblocks or blocks.
- **Regulatory watch**: `public/data/veille.json`, 11 official texts cited (GPSR, common charger, toys, the EU's flat €3 duty, end of the US de minimis, CPSIA, FCC, Japanese PSE, Australian GST, button batteries, IATA lithium). Summaries drafted by AI, to be reviewed. "Simulate an announcement" publishes a fictional scenario (duty increase at midnight in Washington, suspension in Australia), flagged as such everywhere.
- **Compliance engine**: `public/app/conformite.js`, pure, shared by the browser and the tests.
- **Demo data**: the docking station replays a real API response recorded on 4 Oct 2026; without an API key, the other products use illustrative responses, marked as such. With the key, everything is classified live. Product illustrations drawn for the app; flags from the flag-icons package (MIT).
- **Classify a product** (`#/dossier`, also from the bar of the overview): you drop a photo, a label or a pictogram (read by Claude on Bedrock), you paste the address of a product page (`POST /api/url`, `lib/page.mjs`: schema.org data, Open Graph and tables copied as they are, with no model; private hosts refused, including after a redirect; a shop that refuses robots is reported, never bypassed), or you write a few lines. Then the full journey of the historical file: reading of the documents, contradictions, engine rounds, question to the merchant, encoded rule, close decisions, tests, obligations, other destinations, readable file, signed validation that goes back up into the cockpit.
- **Interpretation tree** (`#/arbre`): same engine (`public/arbre-moteur.js`), signed editing, replay on the 87 decisions, generated code, log. Opened from a file, it takes up that file's criteria.
- **Offline** (without `CLEO_API_KEY`): six real responses recorded on 4 Oct 2026 (`public/data/enregistrees.json`) are replayed when the documents sent are exactly the same, and the screen says so; otherwise an illustrative response from the demo catalogue, otherwise an explicit error. Without Bedrock access, the reading of photos, documents and criteria is reported as not done.
- The old addresses `/classer` and `/arbre` redirect to `#/dossier` and `#/arbre`.

## Classification file (`/classer`)

A product record and a destination as input. As output, a decision graph: candidates, candidates set aside, question to the merchant, new evaluation, proposal with its texts and its close official decisions, then validation by an authorised person and return of the code to the record.

Everything displayed on the right comes from a live call to `POST /v2/customs/classifications` of the Cleo Legal API. Nothing is written in advance.

    node server.mjs          # http://localhost:4318
    node sonde.mjs           # full journey in a browser, screenshots sonde-*.png

The API key lives in `.env` (`CLEO_API_KEY=...`), read by the server, never sent to the browser. Validations are written to `catalogue.json`, locally only: the app records nothing in the API (`persist` is not sent, the `/review` route is not wired).

## What the screen does in addition since 4 Oct ("verifiable decision" framing)

- **Photo**: `POST /api/photo` converts the image (sips, macOS) and has the label transcribed by Claude on Bedrock (aws CLI, the machine's profile). The transcription fills the "Datasheet or label" field, with the list of what could not be read. A person reviews before classifying.
- **Reading of the documents**: `POST /api/lire` picks out the characteristics written in the datasheet and the contradictions between description, datasheet and characteristics. Each item quotes a passage; the server checks that the passage exists word for word in the document and discards the rest.
- **Contradictions**: they block the classification until a person has said which of the two statements is true. The passage declared false is struck through and is no longer transmitted.
- **Traceable re-evaluation**: removing, adding or correcting a characteristic relaunches the call and displays "what changed" (status, retained code, confidence).
- **For, against, unknown** per candidate, only from the fields of the API response.
- **Three tests** replayed live: rephrase, remove a piece of information, introduce a contradiction. Mechanical verdict on the retained code and the status.
- **Other destinations**: one call per country, with the level actually obtained.

    node sonde.mjs photo ~/Downloads/IMG_1022.HEIC
    node sonde.mjs contradiction

## Encoded rule, interpretation tree and modules (4 Oct 2026)

- **Encoded rule at the heart of the journey**: `public/data/arbre.json` (9 criteria, 28 nodes, chargers, power banks, docking stations, hubs, adapters, cables) is run on the facts that the documents establish (`POST /api/criteres`, each value with its passage). Each step shows the official rule, the verified fact, the consequence. A missing fact becomes a question that says where each answer leads.
- **Expert mode**: `/arbre`. Editing a branch requires a reading in one sentence and a signature; the result, the generated code and the replay on the official decisions are recomputed. The edited version remains a working version in the browser.
- **Measurement** (`node essais/arbre/assembler.mjs`): 87 official decisions (13 EU classification regulations, 74 CBP rulings), 38 reproduced of which 12 on facts all explicit, 1 contradicted, 35 undecided, 13 out of scope. Detail and limits: `essais/arbre/bilan.md`. The tree and the records are drafted by AI, not reviewed by a customs declarant.
- **Texts**: `public/data/textes.json`, 59 passages of the CN 2026 (Regulation (EU) 2025/1926), checked word for word by `node essais/arbre/verifier-textes.mjs` (the 24 MB source is downloaded again, see `construire-textes.mjs`).
- **Modules**: `lib/applicabilite.mjs` (does a close decision concern a comparable product), `lib/obligations.mjs` (obligations, duties, cost, with what is sourced or not; measurement in `essais/modules/obligations-mesure.md`), `public/dossier.js` (readable and printable file).

    node --test tests/*.test.mjs
    node sonde-arbre.mjs                       # /arbre page, real data
    node sonde-parcours.mjs dock               # full journey, docking station
    node sonde-parcours.mjs chargeur <photo>   # full journey from a photo

## Single decision, arbitration, market access (4 Oct 2026, app now in English)

- **One decision at the top of the page** (`public/decision.js`, tested): engine and encoded rule are read together. Validation is refused while a question is open, the two readings disagree, a contradiction is unresolved, or a national line is required and not established. A divergence is settled by a signed arbitration (code retained, reason, elements examined, name), which goes into the readable file.
- **Photo triage**: observed, to confirm, cannot be deduced from a photo.
- **Market access requirements for France** (`public/data/exigences.json`, engine `public/exigences-moteur.js`, rendering `public/conformite.js`): 20 requirement lines, 76 duties, 3 roles, 18 questions, grounded in 171 passages of EU acts checked word for word (`node essais/conformite/verifier-textes.mjs`). For each requirement: why it concerns the product, the duty, the evidence expected, what the file holds, what is missing, who acts. Limits in `essais/conformite/bilan.md`: no French national rule could be downloaded, no standards, drafted by AI, not reviewed by a lawyer.
- Probes: `node sonde-parcours.mjs dock`, `node sonde-parcours.mjs chargeur <photo>`, `node sonde-epreuves.mjs`, `node sonde-conformite.mjs`, `node sonde-arbre.mjs`, `node sonde-regle.mjs`.
- Screen tests without API quota: `node essais/rejouer-api.mjs essais/avec-fait-1.json 4341` then `CLEO_BASE_URL=http://localhost:4341 PORT=4340 node server.mjs`. It replays one saved real response; it is not a measurement of the engine.
