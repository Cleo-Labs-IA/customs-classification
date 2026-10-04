# Obligations et droits : ce que l'API rend vraiment

Mesure du 4 octobre 2026, à partir de 11:20 UTC, sur `https://api.legaldata.cleolabs.co`.
Produit : « USB-C power adapter, 65 W wall charger, AC 100-240 V input, DC output, for laptops and phones ».
Origine CN, destinations FR, US et GB, valeur 1000 USD, `persist: false`, aucun appel d'écriture.
Réponses brutes, avec code HTTP, durée et identifiant de requête : `essais/modules/obligations-raw/` (28 fichiers : 16 de la première mesure, 12 de la seconde, décrite plus bas).
Un appel par case : ce sont des constats sur un essai, pas des taux de réussite.

## Les deux chemins

| Chemin | Appel | Réponses |
|---|---|---|
| A, tout-en-un | `POST /v2/compliance/check` (description, pas de code en entrée : le schéma ne l'accepte pas) | 4 appels, 4 réponses HTTP 200, 0 classification établie |
| B, code connu 850440 | `GET /v2/customs/obligations`, `GET /v2/customs/duties`, `POST /v2/customs/landed-cost`, `GET /v2/catalog/regulations-by-hs` | 12 appels, 12 réponses HTTP 200 |

Le chemin retenu dans `lib/obligations.mjs` est B dès qu'un code SH6 est fourni. Sans code, la fonction appelle A et écarte tout ce que l'API calcule tant que la classification n'est pas dite `classified`, non provisoire, sans code provisoire. Le mot `classified` vient de la réponse elle-même (`decision.provisional_code.reason` : « returned needs_information, not classified ») ; aucune réponse réelle avec ce statut n'a été observée.

## Chemin A : `POST /v2/compliance/check`

| Route | Durée | Classification | Obligations | Droits | Coût |
|---|---|---|---|---|---|
| CN→FR | 19,4 s | expirée (`timed_out_steps: ["classification"]`). Code de repli 853669 (prises et fiches), que l'API décrit elle-même comme « not a true classification » | 5, toutes `inferred: true`, sans document ni URL, calculées sur 853669 | ligne trouvée mais `duty_pct: null` (0 à 2,3 % selon la ligne) | total 1227,60 USD marqué partiel, calculé sur le mauvais code |
| CN→US | 18,1 s | expirée. Code de repli 8504409571 | 4, toutes `inferred: true` | `not_seeded` pour cette ligne nationale | pas de total |
| CN→GB | 13,7 s | expirée. Aucun code (`"No matching tariff code found"`) | étape sautée | étape sautée | étape sautée |
| CN→US, second essai | 9,0 s | étape « ok » mais `provisional: true`, statut `needs_information`, autre ligne nationale (8504407007) | 4, toutes `inferred: true` | `not_seeded` | pas de total |

Constats :
- La classification a expiré 3 fois sur 3 au premier passage, comme le matin. Le quatrième appel a abouti, sur un code que l'API dit provisoire.
- Pour la France, le code de repli est faux de chapitre (8536 au lieu de 8504) et l'API rend quand même des obligations, un droit et un coût dessus. Le bloc `decision.readiness` vaut `blocked`.
- Deux appels identiques pour les États-Unis ont rendu deux lignes nationales différentes (8504409571 puis 8504407007).
- Avec une ligne nationale à 10 chiffres, l'API n'a aucun droit pour les États-Unis, alors qu'elle en a un au niveau 850440 (chemin B).
- Aucune obligation n'a de document source : `regulation_doc_id: null` et `url: null` partout, `obligations.source: "inferred"`.

## Chemin B : points d'accès séparés, code 850440

| Composante | CN→FR | CN→US | CN→GB |
|---|---|---|---|
| Obligations (`/v2/customs/obligations`) | 5,3 s. 4 obligations, toutes `inferred: true`, sans document ni URL | 5,5 s. 4 obligations, idem | 6,9 s. 5 obligations, idem. Elles citent le marquage CE et des directives de l'UE pour le Royaume-Uni |
| Catalogue (`/v2/catalog/regulations-by-hs`) | 0,3 s. 0 réglementation | 0,3 s. 2 (UL 2056, UL 62368-1, autorité CPSC), sans URL de texte | 0,3 s. 1 (UK Electrical Equipment (Safety) Regulations 2016, autorité OPSS), sans URL de texte |
| Taux de droit (`/v2/customs/duties`) | 0,4 s. 0 % sur les 10 lignes du 850440. Source `eu-taric-xi`, niveau « mirror » (lu sur le service tarifaire d'Irlande du Nord, pas sur TARIC), URL fournie, en vigueur depuis le 2026-01-01 | 0,3 s. 0 % sur 5 lignes. Source `hts-usa`, niveau « official », URL fournie, en vigueur depuis le 2026-05-26 | 0,3 s. 0 % sur 10 lignes. Source `uk-tariff`, niveau « official », URL fournie, en vigueur depuis le 2026-05-26 |
| Coût (`/v2/customs/landed-cost`) | 0,8 s. 1200,00 USD, marqué partiel. TVA 20 % = 200 USD, sourcée (ec-vat-rates, URL). Manquent : accises, antidumping | 0,6 s. 1034,83 USD, marqué partiel. MPF 33,58 USD et HMF 1,25 USD, sourcés (19 CFR 24.23 et 24.24). Manquent : taux préférentiel, accises, antidumping | 0,5 s. Pas de total. TVA inconnue (l'API signale que le 0 % enregistré vient d'une mesure conditionnelle). Manquent : taux préférentiel, taxes à l'importation, TVA, antidumping |

Ce qui est sourcé : le taux de base (identifiant de source, URL, date d'effet) et chaque taxe du coût (identifiant, URL).
Ce qui ne l'est pas : toutes les obligations. Celles de `/v2/customs/obligations` sont déduites par un modèle ; celles du catalogue ont un nom d'autorité et un domaine, pas de lien vers le texte.

Constats :
- Rien n'a expiré sur ce chemin.
- Les obligations déduites changent d'un appel à l'autre : pour CN→FR, le chemin A cite la directive RoHS, le chemin B ne la cite pas et ajoute une déclaration en douane.
- Le taux est lu sur toutes les lignes nationales du 850440 ; l'API renvoie le libellé d'une ligne arbitraire (« For use in civil aircraft » pour l'UE, « Speed drive controllers for electric motors » pour les États-Unis). Ce libellé n'est pas repris dans la sortie normalisée.
- Les droits additionnels sont vides (`anti_dumping_pct: null`, `special_duty_basis: null`) : la réponse ne dit rien des surtaxes américaines visant l'origine Chine, ni comme composante, ni comme manque. Le total CN→US ne doit donc pas être lu comme un coût complet.
- Le fret et l'assurance ne sont pas envoyés (la fonction ne les reçoit pas) : l'API compte 0.
- Ces points d'accès n'acceptent pas de date : le paramètre `date` ne peut être honoré que sur le chemin A. Sur le chemin B, le module refuse le taux si la date demandée (à défaut, le jour de l'appel) tombe hors de la période de validité rendue par l'API, et dit que le taux à la date demandée n'est pas établi.

## Seconde mesure : trois autres codes, après la relecture contradictoire

Même jour, 11:33 UTC, chemin B, origine CN, valeur 1000 USD. 12 appels, 12 réponses HTTP 200. Un appel par case.

| Composante | 853669 → FR (prises électriques) | 999999 → FR (code qui n'existe pas) | 850760 → US (accumulateurs lithium-ion) |
|---|---|---|---|
| Obligations | 0,5 s. 5 obligations, toutes `inferred: true`, sans document ni URL | 3,5 s. `data: []`, `coverage_status: not_seeded` | 0,3 s. 5 obligations, toutes `inferred: true` |
| Catalogue | 0,4 s. 19 textes. Famille `machinery-industrial-components`, `sous_type: null` | 0,3 s. 11 textes. Famille `art-antiques`, `sous_type: null` | 0,2 s. 5 textes. `sous_type: lithium-batteries` |
| Taux de droit | 0,6 s. `duty_pct: null`, de 0 % à 2,3 % sur 8 lignes | 0,5 s. `not_seeded` | 0,2 s. 3,4 % sur 1 ligne, source `hts-usa` |
| Coût | 0,9 s. `total_landed_usd: 1227.6`, `duty_usd: 23`, TVA 204,6, alors que `components_missing` contient `duty_not_determinable_at_hs6`. `duty_range` : 1200 à 1227,6 | 0,6 s. Pas de total, `resolution.matched: none` | 0,6 s. 1068,83 USD, marqué partiel |

Constats :
- Le catalogue rend des textes pour un code qui n'existe pas (999999 : ivoire, CITES, biens culturels). Il rattache le code à une famille, puis rend tous les textes de la famille. Quand `sous_type` est `null`, les textes n'ont aucun rapport établi avec le produit (853669 : matières nucléaires, appareils de levage, ordinateur quantique).
- 10 intitulés sur 11 (999999) et 16 sur 19 (853669) contiennent un tiret cadratin, ainsi que plusieurs noms d'autorité.
- Pour 853669, le total de l'API est le haut de sa propre fourchette : 1000 + 23 de droit à 2,3 % + 204,6 de TVA calculée sur ce droit. Le bas de la fourchette (1200) est 1000 + 0 + 200.
- Pour 850760, `line_count` vaut 1 : la plage SH6 se réduit à une ligne, donc la ligne est connue.

Ce que le module en fait (vérifié par appels réels après correction, 4 routes) :
- 999999 → FR : 0 obligation, 0 texte du catalogue (11 écartés et comptés), ni droit ni coût.
- 853669 → FR : 5 obligations, 0 texte du catalogue (19 écartés et comptés), pas de taux unique, pas de total ; la fourchette 1200 à 1227,6 USD est rendue à part, le droit et la TVA sont marqués inconnus.
- 850760 → US : taux 3,4 %, ligne exacte connue, total partiel 1068,83 USD (1000 + 34 + 33,58 + 1,25), 5 textes du catalogue listés à part, applicabilité non établie.
- Aucun tiret cadratin et aucune trace de la clé dans les 4 sorties.

## Ce que « sourcée » veut dire, et ce qui a été mesuré

Une obligation n'est dite sourcée que si l'adresse donnée par l'API est une adresse https d'un domaine officiel reconnu par le module (europa.eu, gouv.fr, gov.uk, .gov), si le texte a été téléchargé, et si la référence de l'obligation s'y retrouve mot pour mot. Le passage retrouvé est rendu.

- Sur les 23 obligations des 5 jeux de réponses réelles qui en contiennent (850440 vers FR, US, GB : 4, 4 et 5 ; 853669 vers FR : 5 ; 850760 vers US : 5 ; 999999 vers FR n'en rend aucune), l'API ne donne aucune adresse : 0 obligation sourcée sur 23. Le téléchargement n'a donc jamais été déclenché par une réponse réelle.
- Le téléchargement a été essayé à la main sur 3 adresses officielles choisies par nous, une fois chacune : legislation.gov.uk a rendu 14 132 caractères de texte et la référence a été retrouvée ; eur-lex.europa.eu a rendu 159 caractères et ecfr.gov 1 182 caractères, sans la référence (pages d'attente pour les robots). Dans ces deux cas l'obligation resterait non sourcée : le contrôle échoue du côté prudent.
- Ce contrôle établit que le document cite la référence. Il n'établit pas que l'obligation s'applique au produit.
- Un intitulé d'obligation faux mais bien formé ne peut pas être détecté par le module : il sort, non sourcé, avec la mention « à vérifier dans le texte officiel ».

## Contrôle hors API du taux de base

Pour ne pas juger l'API avec l'API, deux lignes ont été relues sur le service tarifaire public britannique (`trade-tariff.service.gov.uk`, versions `xi` et `uk`) : 8504406090 et 8504409590 portent « Third country duty 0.00 % » dans les deux versions. Les 10 lignes feuilles du 850440 listées par ce service correspondent au `line_count: 10` de l'API. Ce contrôle couvre 2 lignes sur 10 pour l'UE et le Royaume-Uni ; rien n'a été relu hors API pour les États-Unis.

## Ce que le produit peut promettre aujourd'hui

- « Combien de droit de base » : oui avec un code SH6, sourcé, en moins d'une seconde.
- « Combien ça coûte » : un total partiel pour FR et US quand le droit est le même sur toutes les lignes du code, toujours accompagné de ce qui manque ; une fourchette quand le droit dépend de la ligne (853669 vers FR) ; rien pour GB.
- « Puis-je expédier » : non. Aucune obligation n'est rattachée à un texte ; elles restent des pistes à vérifier.
