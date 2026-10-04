# Stamped : classification douanière et conformité des envois

## Cockpit (page d'accueil, depuis le 04/10/2026)

Une boutique importe ses commandes (export CSV Shopify, Etsy ou colonnes libres). Chaque produit est classé une fois sur la Cleo Legal API ; chaque ligne de commande est ensuite vérifiée pour son pays de livraison par les règles de la veille réglementaire, appliquées au code retenu. Chaque statut (prête, à vérifier, bloquée) renvoie à ce qui le fonde : la classification, un texte officiel, une réponse signée.

    node server.mjs                          # http://localhost:4318 (Node 22)
    node --test tests/conformite.test.mjs tests/csv.test.mjs tests/page.test.mjs tests/dossier.logique.test.mjs
    node essais/demo/generer.mjs             # régénère la boutique de démonstration

- **Vue d'ensemble** : répartition des lignes à expédier, carte des envois (encart Europe), échéances avec compte à rebours, journal signé.
- **Commandes** : tableau par ligne, onglets par état, filtres pays et échéance. Seules les lignes prêtes partent.
- **Produits** : matrice produit × destination ; un code se valide une fois, à six chiffres.
- **Questions** : questions du moteur, codes à valider, pièces exigées par un pays. Avant de répondre, chaque réponse montre combien de lignes elle débloque ou bloque.
- **Veille réglementaire** : `public/data/veille.json`, 11 textes officiels cités (GPSR, chargeur universel, jouets, droit fixe de 3 € de l'UE, fin du de minimis américain, CPSIA, FCC, PSE japonais, GST australienne, piles bouton, IATA lithium). Résumés rédigés par IA, à relire. « Simuler une annonce » publie un scénario fictif (hausse de droits à minuit à Washington, suspension en Australie), signalé comme tel partout.
- **Moteur de conformité** : `public/app/conformite.js`, pur, partagé navigateur et tests.
- **Données de démonstration** : la station d'accueil rejoue une réponse réelle de l'API enregistrée le 04/10/2026 ; sans clé d'API, les autres produits utilisent des réponses illustratives, marquées comme telles. Avec la clé, tout est classé en direct. Illustrations de produits dessinées pour l'app ; drapeaux du paquet flag-icons (MIT).
- **Classer un produit** (`#/dossier`, aussi depuis la barre de la vue d'ensemble) : on dépose une photo, une étiquette ou un pictogramme (lecture par Claude sur Bedrock), on colle l'adresse d'une fiche produit (`POST /api/url`, `lib/page.mjs` : données schema.org, Open Graph et tableaux recopiés tels quels, sans modèle ; hôtes privés refusés, y compris après redirection ; une boutique qui refuse les robots est signalée, jamais contournée), ou on écrit quelques lignes. Puis le parcours complet du dossier historique : lecture des pièces, contradictions, tours du moteur, question au marchand, règle encodée, décisions proches, épreuves, obligations, autres destinations, dossier lisible, validation signée qui remonte dans le cockpit.
- **Arbre d'interprétation** (`#/arbre`) : même moteur (`public/arbre-moteur.js`), édition signée, rejeu sur les 87 décisions, code généré, journal. Ouvert depuis un dossier, il reprend ses critères.
- **Hors ligne** (sans `CLEO_API_KEY`) : six réponses réelles enregistrées le 04/10/2026 (`public/data/enregistrees.json`) sont rejouées quand les pièces envoyées sont exactement les mêmes, et l'écran le dit ; sinon une réponse illustrative du catalogue de démonstration, sinon une erreur explicite. Sans accès Bedrock, la lecture des photos, des pièces et des critères est signalée comme non faite.
- Les anciennes adresses `/classer` et `/arbre` redirigent vers `#/dossier` et `#/arbre`.

## Dossier de classification (`/classer`)

Une fiche produit et une destination en entrée. En sortie, un graphe de décision : candidats, candidats écartés, question au marchand, nouvelle évaluation, proposition avec ses textes et ses décisions officielles proches, puis validation par une personne habilitée et retour du code sur la fiche.

Tout ce qui s'affiche à droite vient d'un appel en direct à `POST /v2/customs/classifications` de la Cleo Legal API. Rien n'est écrit à l'avance.

    node server.mjs          # http://localhost:4318
    node sonde.mjs           # parcours complet dans un navigateur, captures sonde-*.png

La clé d'API vit dans `.env` (`CLEO_API_KEY=...`), lue par le serveur, jamais envoyée au navigateur. Les validations s'écrivent dans `catalogue.json`, en local seulement : l'app n'enregistre rien dans l'API (`persist` n'est pas envoyé, la route `/review` n'est pas branchée).

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
