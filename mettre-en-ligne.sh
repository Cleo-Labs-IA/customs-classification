#!/bin/bash
# Mise en ligne sur Vercel (équipe cleo-academys-projects), à lancer par Naomie.
# Pose dans le projet Vercel : la clé de la Cleo Legal API (.env), l'accès Bedrock
# du profil AWS par défaut de ce Mac. Retire le code d'accès. Puis déploie.
set -euo pipefail
cd "$(dirname "$0")"
S=cleo-academys-projects
vercel link --yes --project cleo-customs-classifier --scope "$S"
put() { vercel env rm "$1" production --yes --scope "$S" >/dev/null 2>&1 || true; printf %s "$2" | vercel env add "$1" production --scope "$S" >/dev/null; echo "posé : $1"; }
put CLEO_API_KEY "$(grep '^CLEO_API_KEY=' .env | cut -d= -f2-)"
put BEDROCK_ACCESS_KEY_ID "$(aws configure get aws_access_key_id)"
put BEDROCK_SECRET_ACCESS_KEY "$(aws configure get aws_secret_access_key)"
# Page ouverte, sans code d'accès (demande de Naomie du 04/10/2026).
vercel env rm APP_CODE production --yes --scope "$S" >/dev/null 2>&1 || true; echo "retiré : APP_CODE"
put NODEJS_HELPERS 0
vercel deploy --prod --yes --scope "$S"
echo
echo "Page ouverte sans code : https://cleo-customs-classifier.vercel.app"
