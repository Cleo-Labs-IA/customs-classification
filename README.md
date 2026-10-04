# Mini app de classification douanière

Une fiche produit et une destination en entrée. En sortie, un graphe de décision : candidats, candidats écartés, question au marchand, nouvelle évaluation, proposition avec ses textes et ses décisions officielles proches, puis validation par une personne habilitée et retour du code sur la fiche.

En mode normal, les propositions du moteur viennent d'un appel à `POST /v2/customs/classifications` de la Cleo Legal API. L'aperçu de test séparé décrit ci-dessous utilise des données synthétiques, explicitement signalées.

    node server.mjs          # http://localhost:4318
    node sonde.mjs           # parcours complet dans un navigateur, captures sonde-*.png

La clé d'API vit dans `.env` (`CLEO_API_KEY=...`), lue par le serveur, jamais envoyée au navigateur. Le parcours produit enregistre les classifications avec `persist:true` et soumet les validations à la route `/review` de la Legal API. L'historique et les dossiers JSON/PDF viennent de l'API. Les pièces et versions de travail restent enregistrées dans ce navigateur et sont signalées comme telles.

## Parcours produit et aperçu local

Le parcours en anglais suit capture, identité, faits, décision, validation, puis distribution. Une validation ne réussit dans l'interface qu'après l'accusé de réception de l'API. Les questions ouvertes, contradictions, arbitrages non résolus et niveaux nationaux manquants conservent leur blocage.

Pour vérifier l'interface sans consommer de quota ni appeler un modèle :

    node scripts/workflow-preview.mjs     # http://localhost:4362/ ; code : fixture

Cet aperçu utilise uniquement un serveur local de données synthétiques et affiche « Fixture preview ». Il n'est pas une mesure de justesse de classification. Ses dossiers et validations disparaissent au redémarrage du serveur. La lecture de photos, les modèles d'applicabilité et le calcul des droits y sont désactivés.

Cas de test reproductible :

- SKU : `PREVIEW-CHARGER` ; origine `CN` ; destination `FR`.
- Description : `External 65 W USB-C power adapter for a laptop`.
- Fiche technique : `Converts 100-240 V AC to 20 V DC. Powers a laptop through USB-C. No battery, no generator and no mains socket outlets. Polycarbonate housing. Maximum output 65 W.`
- Ajouter `[hs6]`, `[quota]`, `[question]` ou `[unsupported]` à la description pour exercer ces états. Pour `[question]`, laisser la fiche technique vide.
- Utiliser `fail` comme nom de relecteur pour un échec de validation, ou `conflict` pour un conflit de version. Un autre nom permet le parcours nominal.
- Le niveau initial est HS6 : son approbation n'autorise pas l'export de déclaration. Pour exercer l'export national, choisir « national tariff line » dans Decision, réévaluer ce nouveau périmètre, l'approuver puis contrôler la validité exacte du code dans Distribution.

L'export CSV signifie « exporté pour import », pas « publié dans l'ERP ». Les connecteurs restent non connectés. La vérification des codes et de la couverture est déclenchée à la demande, pas une veille continue. Les pièces/versionnements locaux ne constituent pas un registre produit partagé. Le dossier de l'API et le dossier enrichi local ont des provenances distinctes.

Tests du branchement (Node 22, sans réseau externe) :

    node --test tests/customs-api.test.mjs tests/customs-routes.test.mjs tests/workflow.test.mjs tests/decision.test.mjs tests/workflow-fixture.test.mjs

La suite historique inclut des tests en direct et des réponses brutes hors dépôt. Pour les tests d'applicabilité hors ligne : `APPLICABILITE_HORS_LIGNE=1`. Les fichiers `essais/modules/obligations-raw/` restent nécessaires aux tests historiques de droits. La recette navigateur doit distinguer données synthétiques, réponses enregistrées et appels réels.

## Ce que l'écran fait de plus depuis le 04/10 (cadrage « décision vérifiable »)

- **Photo** : `POST /api/photo` convertit l'image (sips, macOS) et fait transcrire l'étiquette par Claude sur Bedrock (aws CLI, profil de la machine). La transcription remplit le champ « Fiche technique ou étiquette », avec la liste de ce qui n'a pas pu être lu. Une personne relit avant de classer.
- **Lecture des pièces** : `POST /api/lire` relève les caractéristiques écrites dans la fiche technique et les contradictions entre description, fiche et caractéristiques. Chaque élément cite un passage ; le serveur vérifie que le passage existe mot pour mot dans la pièce et jette le reste.
- **Contradictions** : elles bloquent la classification tant qu'une personne n'a pas dit laquelle des deux affirmations est vraie. Le passage déclaré faux est barré et n'est plus transmis.
- **Réévaluation traçable** : retirer, ajouter ou corriger une caractéristique relance l'appel et affiche « ce qui a changé » (statut, code retenu, confiance).
- **Pour, contre, inconnu** par candidat, uniquement depuis les champs de la réponse de l'API.
- **Trois épreuves** rejouées en direct : reformuler, retirer une information, introduire une contradiction. Verdict mécanique sur le code retenu et le statut.
- **Autres destinations** : un appel par pays, avec le niveau réellement obtenu.

    node sonde.mjs photo ~/Downloads/IMG_1022.HEIC
    node sonde.mjs contradiction

## Règle encodée, arbre d'interprétation et modules (04/10/2026)

- **Règle encodée au cœur du parcours** : `public/data/arbre.json` (9 critères, 28 nœuds, chargeurs, batteries externes, stations d'accueil, hubs, adaptateurs, câbles) est exécutée sur les faits que les pièces établissent (`POST /api/criteres`, chaque valeur avec son passage). Chaque étape montre la règle officielle, le fait vérifié, la conséquence. Un fait manquant devient une question qui dit où mène chaque réponse.
- **Mode expert** : `/arbre`. Modifier une branche demande une lecture en une phrase et une signature ; le résultat, le code généré et le rejeu sur les décisions officielles se recalculent. La version modifiée reste une version de travail dans le navigateur.
- **Mesure** (`node essais/arbre/assembler.mjs`) : 87 décisions officielles (13 règlements de classement UE, 74 décisions CBP), 38 reproduites dont 12 sur des faits tous explicites, 1 contredite, 35 non tranchées, 13 hors périmètre. Détail et limites : `essais/arbre/bilan.md`. L'arbre et les fiches sont rédigés par IA, non relus par un déclarant.
- **Textes** : `public/data/textes.json`, 59 passages de la NC 2026 (règlement (UE) 2025/1926), vérifiés mot pour mot par `node essais/arbre/verifier-textes.mjs` (la source de 24 Mo se retélécharge, voir `construire-textes.mjs`).
- **Modules** : `lib/applicabilite.mjs` (une décision proche porte-t-elle sur un produit comparable), `lib/obligations.mjs` (obligations, droits, coût, avec ce qui est sourcé ou non ; mesure dans `essais/modules/obligations-mesure.md`), `public/dossier.js` (dossier lisible et imprimable).

    node --test tests/*.test.mjs
    node sonde-arbre.mjs                       # page /arbre, données réelles
    node sonde-parcours.mjs dock               # parcours complet, station d'accueil
    node sonde-parcours.mjs chargeur <photo>   # parcours complet depuis une photo

## Single decision, arbitration, market access (4 Oct 2026, app now in English)

- **One decision at the top of the page** (`public/decision.js`, tested): engine and encoded rule are read together. Validation is refused while a question is open, the two readings disagree, a contradiction is unresolved, or a national line is required and not established. A divergence is settled by a signed arbitration (code retained, reason, elements examined, name), which goes into the readable file.
- **Photo triage**: observed, to confirm, cannot be deduced from a photo.
- **Market access requirements for France** (`public/data/exigences.json`, engine `public/exigences-moteur.js`, rendering `public/conformite.js`): 20 requirement lines, 76 duties, 3 roles, 18 questions, grounded in 171 passages of EU acts checked word for word (`node essais/conformite/verifier-textes.mjs`). For each requirement: why it concerns the product, the duty, the evidence expected, what the file holds, what is missing, who acts. Limits in `essais/conformite/bilan.md`: no French national rule could be downloaded, no standards, drafted by AI, not reviewed by a lawyer.
- Probes: `node sonde-parcours.mjs dock`, `node sonde-parcours.mjs chargeur <photo>`, `node sonde-epreuves.mjs`, `node sonde-conformite.mjs`, `node sonde-arbre.mjs`, `node sonde-regle.mjs`.
- Screen tests without API quota: `node essais/rejouer-api.mjs essais/avec-fait-1.json 4341` then `CLEO_BASE_URL=http://localhost:4341 PORT=4340 node server.mjs`. It replays one saved real response; it is not a measurement of the engine.
