# Bilan des corrections appliquées à l'arbre et aux fiches (4 octobre 2026)

Limite à garder en tête : cet arbre est rédigé par IA à partir des textes et n'a pas été relu par un déclarant en douane. Les corrections ci-dessous le sont aussi. Le taux de décisions reproduites mesure la cohérence entre l'arbre et des fiches annotées par IA ; il ne prouve pas que l'arbre est juste.

Fichiers modifiés : `public/data/arbre.json`, `essais/arbre/annot/annot-01.json` à `annot-05.json`. Fichiers régénérés par `assembler.mjs` : `public/data/decisions.json`, `essais/arbre/rejeu.json`. Scripts ajoutés : `appliquer-corrections.mjs` (toutes les corrections, rejouable) et `chiffres-bilan.mjs` (les chiffres de ce bilan).

    node essais/arbre/appliquer-corrections.mjs   # arbre : 9 critères, 28 nœuds
    node essais/arbre/assembler.mjs               # structure saine, 293 citations lues, 293 gardées, 0 retirée
    node essais/arbre/chiffres-bilan.mjs          # verifier : []

## Chiffres avant et après

| | Total | Reproduit | Contredit | Non tranché | Hors périmètre |
|---|---|---|---|---|---|
| Avant, toutes sources | 87 | 14 | 0 | 67 | 6 |
| Après, toutes sources | 87 | 38 | 1 | 35 | 13 |
| Avant, règlements UE | 13 | 3 | 0 | 9 | 1 |
| Après, règlements UE | 13 | 8 | 0 | 3 | 2 |
| Avant, CBP États-Unis | 74 | 11 | 0 | 58 | 5 |
| Après, CBP États-Unis | 74 | 30 | 1 | 32 | 11 |

Source : `rejeu.json` avant (copie prise avant toute modification) et après, calculés par `rejouer()` du moteur. `verifier()` renvoie `[]` avant et après. Arbre : 9 critères avant et après, 27 nœuds avant, 28 après (plafonds 12 et 28).

**Le chiffre à lire avec prudence est le 38.** Sur ces 38 décisions reproduites, 12 le sont sur des faits que le texte énonce explicitement à chaque question du chemin (1 règlement UE, 11 CBP). Les 26 autres passent par au moins une valeur déduite : une absence lue dans la description de composition (« consists of », « comprised of »), une source de courant, ou un nom de produit que le critère range lui-même sous une réponse. Avant correction, la même convention existait sans être marquée : sur les 14, 11 reposaient sur des faits explicites, dont N352984 qui était circulaire.

La hausse de 14 à 38 vient donc surtout de fiches complétées, pas d'un arbre devenu meilleur. Les modifications de l'arbre n'ont fait gagner aucune décision ; elles en ont fait perdre une (N352984, passée de reproduite à hors périmètre).

Chaque valeur annotée porte maintenant un champ `appui` : 213 `explicite`, 42 `composition`, 26 `alimentation`, 12 `terme` (293 valeurs). La page `/arbre` affiche 38/87 sans cette distinction : elle n'a pas été modifiée.

## Règle écrite pour les fiches

Une valeur n'entre dans une fiche que si un passage mot pour mot du texte la porte, selon l'un de quatre appuis :

- `explicite` : le passage énonce le fait.
- `composition` : le passage est la phrase où la décision décrit de quoi l'article est fait ou équipé ; l'élément absent de cette description vaut « non » ou « aucune ».
- `alimentation` : le passage dit d'où l'article tire son courant, d'où « ne produit pas son électricité ».
- `terme` : le passage nomme l'article par un mot que la question ou l'aide du critère range elle-même sous cette réponse (hub, station d'accueil, modem, charge par induction).

Refusé : toute valeur tirée d'un raisonnement sur l'usage, d'un nom de produit hors de ces termes, ou d'une énumération ouverte (« and various other elements »).

## Modifications de l'arbre, avec leurs textes

1. **En-tête.** « SH 2022 » remplacé par « Nomenclature combinée 2026 (règlement d'exécution (UE) 2025/1926) » : tous les textes du référentiel viennent de ce règlement. Textes : `rgi-1`, `rgi-6`, `sh850760`, `sh847130`.
2. **q1, pourquoi et base.** Réécrit sur la note 3 de la section XVI et la règle 3 b), avec la réserve « sauf contexte contraire » ; mention des « décisions » retirée ; la limite est écrite dans le nœud (la règle 1 passe avant, un produit à fonction unique n'a pas de fonction principale à établir). Base : `s16-n3`, `s16-n5`, `rgi-1`, `rgi-3`, `rgi-3a`, `rgi-3b`.
3. **Critère fonction_principale.** Question ramenée à ce que la fiche annonce en premier ; retrait des trois conclusions de droit logées dans les libellés (« même si le chargeur est logé dans un objet décoratif », « la charge ou les ports n'étant qu'un complément », « aucune ne l'emporte ») et de l'aide qui dictait la réponse. Textes : `s16-n3`, `rgi-3b`, `rgi-3c`.
4. **Valeur porter_completer.** Retrait de « loger » (le 8473 exclut housses et étuis) et de « boîtier d'extension de calcul », parenthèse écrite d'après la seule décision N352984. Textes : `h8473`, `c84-n6c`, `c84-n6c-al2`.
5. **h_aucune.** Motif réécrit (note 8 du chapitre 84 pour une machine, règle 3 c) seulement après 3 a) et 3 b)) ; base ajoutée : `c84-n8-al2`, `rgi-3a`, `rgi-3b`, `rgi-3c`.
6. **q2 et h_generateur.** Pourquoi réécrit sans les affirmations que la note 3 ne porte pas ; la « douane américaine » devient la décision N319727, nommée ; note 2 du chapitre 85 citée. Base : `s16-n3`, `h8504`, `h8507`, `c85-n2`.
7. **q3, critère batterie_integree, c850780, h_piles.** Nouvelle valeur `rechargeable_nommee` (plomb, nickel-cadmium, nickel-hydrure métallique) qui sort de l'arbre : le 8507 80 est la sous-position résiduelle et la règle 6 compare les sous-positions de même niveau. Les sous-positions 8507 10, 20, 30 et 50 ont été vérifiées dans `nc2026.txt` (lignes 46966 à 47005). Textes : `sh850780`, `rgi-6`, `h8507`. La limite sur l'onduleur est écrite dans le pourquoi de q3 (`c85-n3`, `s16-n3`).
8. **c850760.** « son câble » retiré, condition de la note 3 du chapitre 85 ajoutée. Textes : `c85-n3`, `h8507`, `sh850760`.
9. **q4, critère convertit_courant, nouvelle sortie h_transformateur.** Le critère passe de oui/non à trois réponses (non, convertisseur, transformateur) : la position 8504 distingue transformateurs, convertisseurs statiques et bobines, et seul le convertisseur va au 8504 40. Textes : `h8504`, `sh850440`, `rgi-6`. Le critère a été réannoté dans les cinq fichiers : 21 « oui » deviennent `convertisseur`, 2 « non » restent `non`, chaque citation relue (toutes décrivent alternatif vers continu, continu vers continu ou induction ; aucune un simple transformateur).
10. **c850440.** `s16-n2a` retiré de la base (la note 2 ne traite que des parties) ; motif appuyé sur la note 6 E) du chapitre 84. Textes : `s16-n2`, `s16-n2a`, `c84-n6e`.
11. **q5 et h_multiprise.** « Les décisions retiennent » remplacé par la décision N356452, nommée ; il est écrit que le texte du 8537 manque au référentiel. Textes : `h8536`, `s16-n3`, `h8504`.
12. **q6.** Pourquoi réécrit sur les libellés du 8544 et du 8536 ; fin de phrase sur l'unité d'ordinateur et `c84-n6c` retirés. Textes : `h8544`, `h8536`.
13. **Critère construction_passive et h_cable.** « dont chaque fibre est gainée individuellement » ajouté, « à fils de cuivre » retiré ; base donnée à h_cable et absence des sous-positions 8544 20, 30 et 70 écrite. Textes : `h8544`, `sh85444x`, `rgi-6`.
14. **q8 et critère liaison_reseau.** Libellés ramenés à des interfaces que l'on compte ; pourquoi réécrit sur la note 6 D) ; il est écrit que la frontière 8471/8517 retenue vient de décisions (H348342, N292574) et non du texte, et que N289786 lit la note dans l'autre sens. Base : `c84-n6d`, `c84-n6d2`, `s16-n3`, `h8517`.
15. **c851762.** Motif repris sur le libellé (recevoir, convertir et émettre, ou régénérer), renvoi au 8517 69 et réserve des positions 8443, 8525, 8527, 8528. Base : ajout de `sh851769`.
16. **q9, q10 et critère appareil_hote.** Les trois conditions de la note 6 C) sont citées ; « à défaut » remplacé par la note 6 E) ; nouvelle valeur `mixte` (ordinateurs et autres appareils) qui sort de l'arbre aux deux questions. Textes : `c84-n6c`, `c84-n6e`. Critère relu dans les cinq fichiers : aucune fiche existante ne passe à `mixte`.
17. **c847180.** « remplit les trois conditions » devient « à condition de remplir » ; la primauté de la note 6 D) et le motif d'écart des 8471 50, 60 et 70 sont écrits ; la lecture est déclarée comme un choix d'interprétation. Base : ajout de `c84-n6d`, `sh847150`, `sh847160`, `sh847170`.
18. **c854370.** Le motif dit ce qui écarte le 8536 (règlement (UE) n° 457/2014), le 8517 62 et le 8471. Base : ajout de `h8536`, `h8517`, `sh851762`.
19. **q10 et c847330.** Pourquoi repris sur le libellé (positions 8470 à 8472, housses exclues, 8473 30 pour le 8471) ; il est écrit que la note 2 ne joue que sous réserve de la note 1 et ne traite que des parties, et que l'arbre ne contrôle pas la note 1. `c84-n6c` et `s16-n3` retirés. Base : `h8473`, `sh847330`, `s16-n1`, `s16-n1g`, `s16-n2`, `s16-n2b`.
20. **h_hote.** Motif étendu aux appareils audio ou vidéo et aux usages mixtes, avec la règle de la note 2 b) et les positions 8522 et 8529. Base : `s16-n2b`, `s16-n1p`, `h8517`, `h8543`.

## Modifications des fiches

42 valeurs ajoutées ou remplacées, 1 retirée, 23 valeurs de `convertit_courant` converties. Toutes les citations sont retrouvées mot pour mot par `assembler.mjs`.

- Faits explicites ajoutés : 32016R0615#1 (aucune fonction principale), H348342 (pas de liaison réseau), N334999 (aucun appareil électrique dans le boîtier), H322074 (fonction principale : chauffer), N301141 (émetteurs intégrés).
- Absences lues dans la description de composition : 32017R1465#1, 32016R0666#1, 32012R1110#1, 32014R0457#1 et #2, N359212, N356502, N356452, N356371, N349433, N343619, N328742, N325987, H319416, N306841, N298750, N298534 (trois critères), N296103, N292574, N290926, N290028, N290026.
- Source de courant : N323399, N288408.
- Terme rangé par le critère : H348342 (hub), H328693, H337673, N307285 (stations d'accueil).
- 32018R1785#1 : `liaison_reseau` retiré, le câble n'a ni interface ni émetteur-récepteur.
- H273383 : citation de `liaison_reseau` remplacée par la phrase du raisonnement.
- N352984 : `fonction_principale` passe de `porter_completer` à `autre`. La valeur ne tenait que par la parenthèse retirée de l'arbre.
- N289786 : la fiche mêlait l'adaptateur Ethernet et l'adaptateur HDMI. Elle porte maintenant sur l'adaptateur VGA, l'un des deux que les motifs de la décision visent. Résultat : contredit.

## Constats non appliqués, et pourquoi

Revue des textes :

- **Poser un fait avant q1 (« plusieurs fonctions ou composants ? »).** Constat confirmé contre `rgi-1` et `s16-n3`. Non appliqué : la question exigerait de chaque décision qu'elle dise que le produit n'a qu'une fonction, ce que presque aucune ne dit, et les deux chaînes de questions physiques devraient être fusionnées. C'est une refonte, à décider par un juriste. La limite est écrite dans q1.
- **Remplacer fonction_principale par des faits observables.** Appliqué en partie (libellés, aide). Le critère reste : la note 3 fait de la fonction principale le test, et un nouveau jeu de critères demanderait de réannoter les 87 décisions.
- **Découper les accumulateurs en sorties 8507 20, 30 et 50, et ajouter leurs textes au référentiel.** `textes.json` n'était pas dans le périmètre de cette passe. Solution retenue : sortie hors périmètre. Même raison pour les positions 8501, 8541, 8506, 8537 et les sous-positions 8544 20, 30 et 70 : leur absence est écrite dans les motifs.
- **Question sur l'onduleur après la batterie (q3).** Non appliqué : la liste de la note 3 du chapitre 85 est ouverte (« such as »), et la seule décision du lot à sorties secteur (N323399) retient le 8507 60. La distinction n'est pas dans les motifs officiels. La limite est écrite dans q3.
- **Deux questions avant q10 (matière de l'article, échange de données).** Plafond de 28 nœuds atteint. La limite est écrite dans q10 et dans c847330.
- **Retirer « commute » du critère electronique_active.** L'autre branche de la correction proposée a été retenue (pourquoi de q6 réécrit, `c84-n6c` retiré).

Revue du rejeu :

- **Valeur « raccorder » à q1** (N303514, N339123). Constat confirmé : « its sole function is to make electrical connections ». Non appliqué : une seule décision énonce cette fonction, la valeur aurait été une branche écrite pour elle.
- **Envoyer « aucune_dominante » vers q7 pour un câble** (N300797, N299351). Cas particulier ; refusé.
- **Valeurs par déduction, refusées :** 32017R1166#1 (appareil hôte non nommé), N306782 (l'ordinateur n'est pas nommé), N343619 et N284202 (CBP ne dit pas quelle fonction l'emporte), N285505 et N284052 (« modem » ne dit rien de la puce au sens du critère), N281995 et N282047 (aucun passage sur la batterie ni sur la conversion), N301143 (énumération d'une seule face de l'appareil), H287462 (énumération ouverte), N328742 (passage proposé écarté, un autre passage de composition retenu).
- **Scinder N289786 en trois fiches.** `candidats.json` ne porte qu'un identifiant et n'était pas dans le périmètre. L'adaptateur Ethernet de cette décision serait reproduit (8517 62) ; il n'est pas compté.
- **Réannoter les 87 avec la règle unique.** Fait pour les constats de la revue et pour le marquage `appui` des valeurs existantes ; pas de relecture complète des 87 textes.
- **Recharger les 15 textes coupés à 7 000 caractères.** Non fait : les sources ne sont pas dans le périmètre.
- **Constats « texte muet » (20 décisions)** : rien à ajouter, la revue le dit elle-même.

## Décision contredite restante

- **N289786** (CBP, 2017, officiel 8517 62, arbre 8471 80). Divergence réelle : CBP exclut du 8471 les adaptateurs d'affichage VGA et HDMI par la note 5 D) ii) du chapitre 84 (aujourd'hui note 6 D) 2)), alors que l'arbre suit H348342, N292574 et H337673, qui classent hubs et adaptateurs d'affichage au 8471 80. La valeur `liaison_reseau = aucune` de cette fiche repose sur une description de composition.

## Ce que l'arbre ne tranche toujours pas

- 35 décisions non tranchées : 12 s'arrêtent à q2 (production d'électricité), 8 à q1 (fonction annoncée), 8 à q3 (batterie), 4 à q6 (électronique), 2 à l'appareil hôte (q9, q10), 1 à q8. Les décisions constatent rarement une absence.
- 13 sorties hors périmètre. Pour 7, le code officiel est hors des codes de l'arbre (8537 10 deux fois, 8536 50, 8506 10, 8544 30 deux fois, 8544 20). Pour 6, le code officiel est un code de l'arbre que l'arbre n'atteint pas : N360577 et N298752 (8517 62, aucune fonction dominante), H322074 et N305975 (8543 70, chauffe-mains), N352984 (8473 30, boîtier graphique), N319727 (8504 40, borne solaire).
- Édition : les décisions de 2017 à 2019 citent la note 5 du chapitre 84 (aujourd'hui note 6) et « headings 8469 to 8472 » ; aucun écart de code à six chiffres relevé par la revue.

## À savoir pour la suite

- Les scripts `annot/construire-*.mjs` reconstruisent les fiches d'origine : après les avoir relancés, relancer `appliquer-corrections.mjs`.
- `synthese.md` décrit encore l'arbre à 27 nœuds et n'a pas été mis à jour.
- La sonde navigateur sur `http://localhost:4318/arbre` charge les 87 décisions, affiche 38/87 reproduites, 1 contredite, 35 non tranchées, 13 hors périmètre, sans erreur de console.
