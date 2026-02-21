# Commissions Loyoly

Calculateur de commissions Sales — déployé sur Vercel.

## Déploiement initial

1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
2. Crée un nouveau repo GitHub, upload ce dossier
3. Dans Vercel → "Add New Project" → importe le repo
4. Vercel détecte automatiquement React → clique "Deploy"
5. Ton URL est prête en ~2 minutes

## Mise à jour des données chaque mois

Les données HubSpot sont dans `src/App.jsx`, dans la constante `HUBSPOT_DATA`.

Claude met à jour ce fichier automatiquement. Pour redéployer :
- Si connecté à GitHub : push le fichier mis à jour → Vercel redéploie automatiquement
- Sinon : re-uploader le dossier sur Vercel

## Accès

Partage l'URL Vercel avec ton Chief of Staff. Peut être embedé dans Notion via un bloc `/embed`.
