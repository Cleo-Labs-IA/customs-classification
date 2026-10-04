# Synthèse de l'arbre de référence

Fichier produit : `public/data/arbre.json` (9 critères, 27 nœuds : 10 questions, 9 codes, 8 sorties hors périmètre).
Sources lues : `proposition-a.json`, `proposition-b.json`, `public/data/textes.json`, `candidats.json` (87 décisions : 74 US_CBP, 13 règlements UE).

## Ce qui vient de chaque proposition

**Structure retenue : celle de B.** Ses critères sont des faits que l'on lit sur une fiche technique (batterie, conversion du courant, puce active, prises secteur, port réseau), là où A posait deux conclusions de droit comme questions : `pluralite_fonctions` (« l'une domine-t-elle ») dont deux branches sur trois menaient au même nœud, et `fonction_principale` dont les valeurs reprenaient les libellés des positions (convertir = 8504, stocker = 8507). L'ordre de B suit aussi les décisions : fonction principale d'abord (note 3 de la section XVI), faits physiques ensuite.

Gardé de B : la racine à cinq fonctions avec la sortie explicite « aucune dominante », `genere_electricite` (N319727), `batterie_integree` avant `convertit_courant` (N323399 : une station d'énergie à sorties secteur reste au 8507), `prises_secteur_sortie` (N356452), `electronique_active` (N316909, N303514), `liaison_reseau` en trois degrés (H328693, 32017R1166), `appareil_hote`.

Greffé de A :
- la question sur l'appareil hôte avant le 8473 30 (nœud `q10`) : B y envoyait directement toute « extension d'ordinateur », A exigeait que l'hôte soit un ordinateur (position 8473, note 2 b) de la section XVI) ;
- la valeur `fibre_optique` et la définition stricte du bloc de fiches (sans interrupteur ni fusible) dans `construction_passive` ;
- les bases de A, plus complètes : règle 6 sur chaque code, note 6 E) du chapitre 84 et note 2 a) de la section XVI sous le 8504 40, note 6 D) 2) sous le 8517 62 ;
- les motifs rédigés de A pour les codes 8504 40, 8507 60, 8544 42, 8536 69, 8471 80.

Écarté :
- de A, le découpage `role_unite` (8471 60, 8471 70, 8471 80) : aucune des 87 décisions ne tombe au 8471 60 ni au 8471 70, le découpage ne serait pas rejouable ;
- de A, la sortie « traitement » : N352984 classe le boîtier graphique externe au 8473 30, repris par la valeur `porter_completer` ;
- de B, la valeur `accessoire_ordinateur` à la racine, qui était une conclusion (« accessoire ») : réécrite en fait (`porter_completer`) suivie de la question sur l'hôte.

## Points de droit ouverts (les modifications proposées aux juristes)

1. **`q1`, fonction principale d'un objet composite.** Lecture retenue : le chargeur logé dans une plante, un cadre photo ou un range-stylos reste un chargeur (H343160, N305957, N305600), le caractère essentiel étant électrique. Autre lecture : l'objet d'accueil l'emporte, comme le tapis de souris à charge par induction classé accessoire d'ordinateur (N306782) ; la note 3 ne viserait que des fonctions de machines, pas un objet décoratif. Textes : `s16-n3`, `rgi-3b`, `rgi-1`.

2. **`q2`, chargeur qui produit son électricité.** Lecture retenue : sortie hors périmètre, analyse au cas par cas. Autre lecture : brancher `oui` sur `c850440`, comme la borne de charge solaire à batterie lithium (N319727, 8504 40), ou au contraire sur le 8507 si la batterie est tenue pour la fonction principale. Textes : `s16-n3`, `h8504`, `h8507`, `rgi-3c`.

3. **`q3`, batterie externe : accumulateur ou convertisseur.** Lecture retenue : la batterie décide, y compris pour une station d'énergie à onduleur et sorties secteur (N323399, H298118), ses circuits étant des composants auxiliaires. Autre lecture : l'onduleur et les convertisseurs dépassent ce que la note 3 du chapitre 85 appelle « auxiliaire » ; la station devient une machine composite dont la fonction principale se discute entre 8504 et 8507. Textes : `c85-n3`, `h8507`, `h8504`, `s16-n3`.

4. **`q8`, port réseau d'une station d'accueil et convertisseurs de liaison.** Lecture retenue : un port Ethernet parmi d'autres ne fait pas un appareil de réseau (H328693, H337673, H348342, 8471 80) ; seul l'appareil dont la liaison est l'apport relève du 8517 62 (N289786, N316909). Autre lecture, soutenue par les importateurs dans ces mêmes décisions : tout appareil qui transmet des données est exclu du 8471 par la note 6 D) 2), hub USB et adaptateur d'affichage compris. Textes : `c84-n6d2`, `c84-n6c`, `h8517`, `s16-n3`.

5. **`q9`, répartiteur ou convertisseur vidéo : 8543 70 ou 8471 80.** Lecture retenue : destiné à des appareils audio ou vidéo en général, il a une fonction propre (32014R0457, 32017R1166) ; destiné à l'ordinateur, c'est une unité (N292574). Autre lecture : un même adaptateur HDMI sert indifféremment un ordinateur ou un téléviseur ; le test « exclusivement ou principalement » de la note 6 C) 1) peut faire basculer dans un sens ou dans l'autre selon la preuve de l'usage. Textes : `c84-n6c`, `c84-n6e`, `h8543`, `h8471`.

6. **`q10` et `q5`, complément de charge face à une position nommée.** Lecture retenue : le support ou le tapis qui charge aussi suit l'ordinateur au 8473 30 (N306782, N349898), et la rallonge à ports USB sort vers le 8537 (N356452). Autre lecture : la note 2 a) de la section XVI classe « dans tous les cas » dans sa propre position un article qui est en lui-même un convertisseur du 8504, ce qui ramènerait ces deux familles au 8504 40. Textes : `s16-n2a`, `s16-n2b`, `h8473`, `h8504`, `h8536`.

## Vérification

- `verifier(arbre)` du moteur `public/arbre-moteur.js` : `[]`.
- Identifiants `base` absents de `textes.json` : 0 ; nœuds question ou code sans base : 0.
- Témoins rejoués avec `evaluer()` sur des faits lus dans les décisions, code attendu = code publié : 20/20 (13 codes reproduits, 7 décisions hors des codes de l'arbre arrivées en sortie hors périmètre).
- Limite : `candidats.json` ne porte pas encore les valeurs de critères par décision ; `rejouer()` sur les 87 décisions reste à faire une fois l'annotation produite avec les identifiants de critères de cet arbre.
