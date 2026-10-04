# Mini app de classification douanière

Une fiche produit et une destination en entrée. En sortie, un graphe de décision : candidats, candidats écartés, question au marchand, nouvelle évaluation, proposition avec ses textes et ses décisions officielles proches, puis validation par une personne habilitée et retour du code sur la fiche.

Tout ce qui s'affiche à droite vient d'un appel en direct à `POST /v2/customs/classifications` de la Cleo Legal API. Rien n'est écrit à l'avance.

    node server.mjs          # http://localhost:4318
    node sonde.mjs           # parcours complet dans un navigateur, captures sonde-*.png

La clé d'API vit dans `.env` (`CLEO_API_KEY=...`), lue par le serveur, jamais envoyée au navigateur. Les validations s'écrivent dans `catalogue.json`, en local seulement : l'app n'enregistre rien dans l'API (`persist` n'est pas envoyé, la route `/review` n'est pas branchée).
