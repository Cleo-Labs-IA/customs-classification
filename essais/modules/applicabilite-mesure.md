# Applicabilité des décisions : mesures du 4 octobre 2026 (après relecture adverse)

Module : `lib/applicabilite.mjs`. Tests : `tests/applicabilite.test.mjs`.
Modèle : celui de `app.mjs` (Bedrock, `global.anthropic.claude-sonnet-5-5` par défaut). Aucun chiffre ci-dessous n'est estimé : tout vient des exécutions listées. Les mesures de la première version (avant relecture) sont remplacées par celles-ci.

## Commandes

```
APPLICABILITE_SORTIE=<fichier> node --test tests/applicabilite.test.mjs      # tout, dont le test en direct
APPLICABILITE_HORS_LIGNE=1 node --test tests/applicabilite.test.mjs          # sans réseau ni modèle
```

| Exécution | Tests | Réussis | Échecs | Sautés | Durée |
|---|---|---|---|---|---|
| Nouveau fichier de tests contre l'ancien module (avant correction), hors ligne | 23 | 6 | 16 | 1 | 7,3 s |
| Nouveau fichier de tests contre le module corrigé, hors ligne | 23 | 22 | 0 | 1 | 0,3 s |
| Nouveau fichier de tests contre le module corrigé, avec le test en direct | 23 | 23 | 0 | 0 | 20,0 s |

Les mesures complémentaires (répétitions, décision révoquée, décision britannique, décision absente) viennent d'un script jetable qui appelle `applicabilite()` en direct, sans faux réseau ni faux modèle.

## Ce que les sources officielles rendent réellement

| Source | Adresse lue | Constat |
|---|---|---|
| CBP, texte | `https://rulings.cbp.gov/api/ruling/N304568` | HTTP 200, texte de 4 222 caractères ; la réponse porte `rulingNumber: "N304568"`, que le module compare à l'identifiant demandé |
| CBP, statut | `https://rulings.cbp.gov/api/ruling/N304568` | `revokedBy: null`, `modifiedBy: null` : cette route ne renseigne pas le statut |
| CBP, statut | `https://rulings.cbp.gov/api/search?term=N090938&collection=ALL` | `revokedBy: ["H097658"]` : le statut se lit ici |
| CBP, statut | même recherche pour N304568 | `revokedBy: []`, `modifiedBy: []`, `operationallyRevoked: false` |
| CBP, absente | `https://rulings.cbp.gov/api/ruling/N999999` | HTTP 404 |
| HMRC | `https://www.tax.service.gov.uk/search-for-advance-tariff-rulings/ruling/600011214` | HTTP 200 ; titre et `h1` « Information for ruling 600011214 », que le module compare à l'identifiant ; champs : Start date, Expiry date, Commodity code, Description, Keywords, Justification ; aucun champ de révocation ni de modification |

## Défauts relevés par la relecture, rejoués avant et après correction

Chaque scénario a été rejoué hors ligne (faux réseau, faux modèle) sur l'ancien module puis sur le module corrigé.

| No | Scénario | Avant | Après |
|---|---|---|---|
| 1a | Peluche, citation « to » des deux côtés | `applicable`, 0 rejet | `non_verifiable`, 1 rejet |
| 1b | « This product is not a power supply adapter », citation « power supply adapter » | `applicable` | `non_verifiable`, 1 rejet |
| 2 | Recherche CBP en erreur 500, ou sans la décision | `applicable`, `revoquee: null` | `partiellement`, la réserve est dans le motif |
| 2 | Toute décision britannique valide | `applicable` | `partiellement` |
| 3 | Page britannique sans « Expiry date » | `applicable`, rien dans le motif | `partiellement`, motif « La date de fin de validité de la décision n'a pas pu être lue » |
| 4 | Destination omise | `meme_juridiction: false`, « n'est pas la douane du pays de destination » | `meme_juridiction: null`, « Pays de destination non indiqué ou non reconnu » |
| 4 | Destination « USA » | même phrase fausse | `meme_juridiction: true`, aucune réserve |
| 5 | Explication « Relève de la position 8504. », « Classé au 85.04 et non au 95.03. », « Code 85 04 40 70. » | conservées | retirées et comptées (`explications_retirees`) |
| 6 | Erreur du modèle contenant un code et « 95 % » | recopiée dans le motif | « Comparaison non effectuée : le modèle de lecture n'a pas rendu de réponse exploitable. » |
| 7 | Identifiant UK999999999, adresse d'une autre page | `applicable` sous cet identifiant | `non_verifiable`, « l'adresse fournie ne correspond pas à la page officielle de cet identifiant » |
| 8 | 40 fois le même point commun | « 40 points communs vérifiés » | 1 point commun, `doublons: 39` |
| 9 | `decision: null`, `produit: null`, caractéristique `undefined` | 3 exceptions `TypeError` | 3 `non_verifiable` motivés |
| 10 | Caractéristique `null`, citation « null » | `applicable` | `non_verifiable`, « Aucune pièce du produit » |
| 11 | `modifiedBy: null` | `modifiee_par: []`, `applicable` | `modifiee_par: null`, `partiellement` |
| 12 | Identifiant « n090938 » avec une espace (en direct) | 404, « la source officielle ne connaît pas cette décision » | décision lue, `id: N090938`, `revoquee: true` |
| 13 | `url: javascript:...`, `official_code: <b>9999</b>`, `ruling_date: "><script>` | rendus tels quels | adresse recalculée depuis l'identifiant, code et date à `null` |
| 14 | Citation « external POWER supply » sur « İİİ External power supply » | rendue « ernal power supply », 0 rejet | rejetée, 1 rejet |
| 15 | « Expiry date » = « 01/09/2020 » | `date_fin: 2020-01-09` | `date_fin: null`, validité dite inconnue |
| 16 | Réseau en panne (`fetch failed`) | motif « fetch failed », 3 appels, 3 604 ms | motif « la source officielle est injoignable », 3 appels, 1 802 ms |
| 17 | Description et décision de 2 000 000 caractères | 4 000 086 caractères remis au modèle | 0 caractère remis au modèle, refus motivé |

## Règles appliquées par le code après correction

- Une citation est gardée seulement si elle est retrouvée au caractère près, casse comprise, qu'elle ne coupe aucun mot, qu'elle compte au moins deux mots, cinq lettres ou chiffres et un mot porteur. Un fait déclaré se cite en entier.
- Un point commun est refusé quand la phrase d'un seul des deux côtés porte une négation.
- Doublons retirés et comptés ; six points communs et six différences au plus ; le reste est compté dans `au_dela_du_plafond`.
- « applicable » exige : un point commun sur la fonction, aucune différence, une décision dont on sait qu'elle n'est ni révoquée ni modifiée, et, pour la source britannique, une date de fin lue et non dépassée. Tout inconnu donne « partiellement » avec la raison.
- L'explication d'une différence (texte du modèle, sans citation) est retirée dès qu'elle contient un chiffre ou un chevron.
- Plafonds avant l'envoi au modèle : 20 000 caractères par pièce, 40 caractéristiques de 500 caractères, 60 000 caractères pour le texte de la décision. Au-delà, refus motivé, pas de troncature.

## Test en direct : N304568 (alimentation externe 65 W pour machines de traitement de l'information)

### Face à un chargeur USB-C

Description fournie : « USB-C power adapter for laptops, external wall charger, 65 W maximum output, 20 V DC, sold in retail box with a detachable USB-C cable. » Destination : US.

- Verdict : `partiellement`
- Motif : « 3 points communs vérifiés et 2 différences à lever avant de s'appuyer sur la décision. »
- Décision : `revoquee: false`, `modifiee_par: []`, `texte_disponible: true`, `meme_juridiction: true`
- Citations jetées : 0. Hors critères : 0. Doublons : 0. Explications retirées : 0. Durée : 9,2 s.

Points communs vérifiés (citation du produit / citation de la décision) :

1. Fonction : « USB-C power adapter for laptops » / « power supply adapter for use with automatic data processing (ADP) machines »
2. Rôle électrique ou de données : « external wall charger » / « The power supply adapter is an external type »
3. Rôle électrique ou de données : « 65 W maximum output » / « has a maximum output of 65 Watts »

Différences vérifiées, aucune marquée décisive :

1. Rôle électrique ou de données : « 65 W maximum output, 20 V DC » / « an output of 19 VDC »
2. Présentation à la vente : aucune citation du produit / « is packaged with a North American and European plug »

### Face à une peluche (témoin négatif)

Description fournie : « Plush toy bear, 30 cm, polyester fabric and polyester fibre filling, for children from 3 years, no battery and no electronic component. » Destination : US.

- Verdict : `non_applicable`
- Motif (passe 1) : « 1 différence vérifiée porte sur un critère qui décide du classement : la décision vise une autre marchandise. »
- Points communs : 0. Différences : 3, dont 1 décisive. Citations jetées : 0. Durée : 8,9 s.

## Répétitions (3 passes en direct de chaque cas, module corrigé)

| Passe | Chargeur : verdict, communs, différences, décisives, jetées, secondes | Peluche : idem |
|---|---|---|
| 1 | partiellement, 3, 2, 0, 0, 9,2 | non_applicable, 0, 3, 1, 0, 8,9 |
| 2 | partiellement, 3, 2, 0, 0, 7,9 | non_applicable, 0, 3, 2, 0, 8,1 |
| 3 | partiellement, 3, 2, 0, 0, 7,5 | non_applicable, 0, 2, 2, 0, 10,0 |

Verdict identique sur 3 passes sur 3 pour chacun des deux cas. Le nombre de différences et de différences décisives varie d'une passe à l'autre pour la peluche.

## Autres cas mesurés en direct (une passe chacun, module corrigé)

| Cas | Verdict | Faits mesurés |
|---|---|---|
| N304568, même chargeur, destination FR | partiellement | `meme_juridiction: false` ; le motif ajoute que la décision est celle de la douane américaine ; 8,0 s |
| N304568, même chargeur, destination omise | partiellement | `meme_juridiction: null` ; motif « Pays de destination non indiqué ou non reconnu » ; 7,9 s |
| « n090938 » avec une espace (révoquée par H097658) face à un coffret de scies cloches | partiellement | décision lue sous `N090938`, `revoquee: true`, `revoquee_par: ["H097658"]`, 3 points communs, 3 différences ; 11,0 s |
| UK600011214 face à un hub USB-C 6-en-1, destination GB | partiellement | `revoquee: null`, `modifiee_par: null`, `date_fin: 2027-09-01`, `expiree: false`, 3 points communs, 1 différence ; le motif dit que la révocation et la modification ne peuvent pas être connues ; 8,9 s |
| UK600011215 avec l'adresse de 600011214 | non_verifiable | refus avant tout appel réseau ; 0 s |
| N999999 (n'existe pas) | non_verifiable | `texte_disponible: false`, « la source officielle ne connaît pas cette décision (réponse 404) » ; 0,4 s, modèle non appelé |

## Limites constatées

- Sur les 11 appels en direct avec modèle de cette série, 0 citation a été jetée, 0 doublon, 0 explication retirée : ces rejets sont prouvés par les tests hors ligne (réponses fabriquées à la main), pas par une exécution en direct.
- Le code vérifie que chaque citation existe au caractère près, en mots entiers, et refuse un point commun nié d'un seul côté. Il ne vérifie toujours pas que les deux citations d'un point commun disent la même chose. Exemple mesuré dans cette série : « 2 USB-A data ports » rapproché de « USB 3.0 ports and SD/TF card reader can be used simultaneously to transfer data to a hard drive ».
- Le contrôle de négation est une liste de mots (anglais et français) cherchée dans la phrase de la citation. Il peut refuser un point commun légitime dont la phrase contient une négation sans rapport ; il ne voit pas une négation placée dans une autre phrase.
- Le caractère décisif d'une différence vient du modèle. Le code ne le retient que si la différence est citée des deux côtés.
- Une décision britannique ne peut plus sortir « applicable » : la page officielle ne publie ni révocation ni modification. C'est voulu.
- Une explication légitime qui contient un chiffre (par exemple une puissance) est retirée elle aussi : le code ne sait pas distinguer un chiffre d'un code tarifaire dans un texte sans citation.
- Les citations sont du texte brut qui reproduit la source, chevrons compris. Le module ne les échappe pas (elles ne seraient plus mot pour mot) ; l'affichage doit le faire. `echapper()` est exporté à cet effet.
- Non mesuré : le comportement du vrai modèle sur des pièces proches des plafonds de taille, et le défaut de `locate()` lui-même, qui reste dans `app.mjs` (le module le contourne par une égalité stricte).
- Échantillon : 2 produits sur N304568 répétés 3 fois, plus 6 cas en une passe. Ce n'est pas un taux de réussite.
