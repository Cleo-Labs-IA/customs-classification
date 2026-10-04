#!/bin/bash
# Mise en ligne sur Vercel (équipe cleo-academys-projects), à lancer par Naomie.
# Pose dans le projet Vercel : la clé de la Cleo Legal API (.env), l'accès Bedrock
# du profil AWS par défaut de ce Mac, et un code d'accès pour la page. Puis déploie.
set -euo pipefail
cd "$(dirname "$0")"
S=cleo-academys-projects
vercel link --yes --project cleo-customs-classifier --scope "$S"
[ -f .code-acces ] || { openssl rand -base64 9 | tr '+/' 'xy' > .code-acces; chmod 600 .code-acces; }
put() { vercel env rm "$1" production --yes --scope "$S" >/dev/null 2>&1 || true; printf %s "$2" | vercel env add "$1" production --scope "$S" >/dev/null; echo "posé : $1"; }
put CLEO_API_KEY "$(grep '^CLEO_API_KEY=' .env | cut -d= -f2-)"
put BEDROCK_ACCESS_KEY_ID "$(aws configure get aws_access_key_id)"
put BEDROCK_SECRET_ACCESS_KEY "$(aws configure get aws_secret_access_key)"
put APP_CODE "$(cat .code-acces)"
put NODEJS_HELPERS 0
vercel deploy --prod --yes --scope "$S"
echo
echo "Code d'accès de la page : $(cat .code-acces)"
