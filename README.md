# Mini app de classification douanière

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
