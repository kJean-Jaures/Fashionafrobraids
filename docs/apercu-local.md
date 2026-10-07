# Voir le site sur son ordinateur

Cette méthode fonctionne sur votre ordinateur Windows, macOS ou Linux. Elle ne nécessite aucun compte d'hébergement. Le site reste accessible tant que le terminal est ouvert.

1. Installer **Node.js 24 LTS** depuis [nodejs.org](https://nodejs.org).
2. Ouvrir [le projet sur GitHub](https://github.com/kJean-Jaures/Fashionafrobraids/tree/codex/fashion-afro-braids-preview), puis choisir **Code → Download ZIP** et décompresser le dossier.
3. Ouvrir un terminal dans ce dossier, celui qui contient `package.json`, puis exécuter les commandes suivantes dans l'ordre :

```bash
npm ci
npm run setup
npm run dev
```

4. Attendre **Ready**, puis ouvrir sur ce même ordinateur l'adresse **Local** affichée par le terminal. Le catalogue, la réservation, la boutique et l'administration fonctionnent avec une base locale.

Les modifications de développement apparaissent dans le navigateur. Pour arrêter le serveur, utiliser **Ctrl+C** dans le terminal.

Le mot de passe de gestion est créé dans le fichier privé `.env.local`, à la ligne `ADMIN_PASSWORD`. Il permet d'ouvrir `/admin`. Les données restent dans `data/postgres` et les photos ajoutées dans `data/uploads`. Ces fichiers sont exclus de Git.

Les stocks commencent à zéro : renseigner un stock de test dans l'administration pour essayer une commande. Sans configuration Resend ou Stripe, aucun e-mail réel ni paiement d'acompte n'est effectué.

## GitHub et lien public

GitHub héberge le code source. **GitHub Pages** peut publier un site statique, mais ne peut pas exécuter le serveur Next.js, les API de réservation et la base de données de ce projet.

Pour un lien public vers l'application complète, suivre [l'aperçu Render](apercu-en-ligne.md). Le service est relié au dépôt GitHub : après une correction du code, il suffit de déployer le dernier commit depuis Render.
