# Voir le site sur son ordinateur

Cette méthode fonctionne sur votre ordinateur Windows, macOS ou Linux. Elle ne nécessite aucun compte d'hébergement. Le site reste accessible tant que le terminal est ouvert.

### Windows : ouvrir le site en double-cliquant

1. Installer **Node.js 24 LTS** depuis [nodejs.org](https://nodejs.org). Une fois Node.js installé, fermer puis rouvrir le terminal si nécessaire.
2. [Télécharger le projet en ZIP](https://github.com/kJean-Jaures/Fashionafrobraids/archive/refs/heads/codex/fashion-afro-braids-preview.zip), puis **extraire tout le dossier**. Ne pas lancer le fichier à l’intérieur de l’archive ZIP.
3. Dans le dossier extrait qui contient `package.json`, double-cliquer sur **`Demarrer-le-site.cmd`**.
4. Laisser la fenêtre ouverte. Le premier lancement installe les dépendances, prépare la configuration privée, démarre le serveur et **ouvre le vrai site dans le navigateur** lorsque le catalogue répond.

Le lanceur affiche l’adresse locale du site. Cette adresse fonctionne **sur l’ordinateur où le fichier a été lancé**. Une adresse locale d’un serveur cloud ne permet pas d’ouvrir ce serveur depuis votre PC.

Le lanceur active le mode démonstration : cet aperçu permet de parcourir le catalogue et les tarifs, utiliser le panier et ouvrir l’administration. Le virement peut être essayé avec des coordonnées de test dans l’administration et une validation simulée « Acompte reçu » ; n’effectuer aucun virement réel depuis cet aperçu. Les données restent sur votre ordinateur.

### Voir la dernière mise à jour

Fermer l’ancienne fenêtre du serveur avec **Ctrl+C**, puis télécharger à nouveau le ZIP ci-dessus et l’extraire dans un **nouveau dossier**. Avant de lancer ce nouveau dossier, copier depuis l’ancien le fichier privé **`.env.local`** et le dossier **`data`** : ils conservent le mot de passe, les réglages e-mail, les rendez-vous et les photos ajoutées. Garder aussi une sauvegarde de l’ancien dossier. Lancer ensuite `Demarrer-le-site.cmd`. Les changements ne s’installent pas dans une ancienne archive déjà extraite. Une mise à jour Git du dossier existant conserve également ces fichiers privés.

### L’écran « Un moment hors connexion » apparaît

Cet écran signifie que le navigateur n’a pas pu joindre le serveur lors du chargement. Sur votre ordinateur, cela peut arriver quand la fenêtre du serveur est fermée ou quand l’onglet utilise un ancien port ; cela ne prouve pas une panne de votre connexion Internet.

1. Relancer **`Demarrer-le-site.cmd`** depuis le dossier extrait le plus récent et garder la fenêtre ouverte.
2. Attendre **« Le site est prêt »**, puis ouvrir exactement l’adresse affichée. Ne pas réutiliser un favori avec un ancien port.
3. Si le serveur est prêt mais que la page de secours reste affichée, fermer les anciens onglets du site et essayer l’adresse affichée dans une fenêtre privée. Cela permet de vérifier si le cache du navigateur intervient, sans effacer vos données.
4. Si l’adresse affichée avec `localhost` échoue, essayer `127.0.0.1` avec **le même port**. Cette adresse ouvre la même base du salon, mais le panier, la connexion administrateur et les liens de rendez-vous mémorisés dans le navigateur sont propres à chaque adresse.

Les nouveaux aperçus n’installent plus le cache hors connexion sur les adresses locales. Une première ouverture réussie de la version mise à jour retire aussi l’ancien worker du site et ses caches ; elle conserve le panier et les rendez-vous mémorisés.

Si la fenêtre affiche une erreur ou se ferme avant **« Le site est prêt »**, communiquer les dernières lignes du terminal en masquant les clés, mots de passe et coordonnées bancaires. Ne pas supprimer `.env.local` ou `data` pour résoudre ce problème.

### macOS, Linux ou terminal Windows

Ouvrir un terminal dans le dossier extrait, puis lancer :

```bash
npm run local
```

Node.js 24 est nécessaire. Cette commande prépare le projet, démarre le serveur et ouvre le navigateur. Elle réutilise un serveur Fashion Afro Braids déjà lancé uniquement si sa version de catalogue correspond à cette copie du projet. Si une ancienne copie tourne encore, elle démarre la nouvelle version sur un port libre et affiche son adresse.

Si un autre logiciel utilise le port 3000 :

```bash
npm run local -- --port=3001
```

Pour développer avec vos réglages habituels, les commandes manuelles restent disponibles :

```bash
npm ci
npm run setup
npm run dev
```

Les modifications de développement apparaissent dans le navigateur. Pour arrêter le serveur, utiliser **Ctrl+C** dans le terminal.

Le mot de passe de gestion est créé dans le fichier privé `.env.local`, à la ligne `ADMIN_PASSWORD`. Il permet d'ouvrir `/admin`. Les données restent dans `data/postgres` et les photos ajoutées dans `data/uploads`. Ces fichiers sont exclus de Git.

Si `.env.local` existe déjà avec les réglages e-mail, le lanceur complète maintenant uniquement le mot de passe absent ou vide. Les autres réglages et un mot de passe existant sont conservés. Lire le mot de passe localement et le saisir uniquement dans l’administration ; garder ce fichier hors des captures d’écran. Pour une ancienne version du lanceur, ajouter une ligne `ADMIN_PASSWORD=` suivie d’un mot de passe personnel unique d’au moins 16 caractères, puis redémarrer le site.

Les stocks commencent à zéro : renseigner un stock de test dans l'administration pour essayer une commande. Sans configuration Resend, aucun e-mail réel n’est envoyé. Le site n’effectue aucun virement : la réception est attestée manuellement par le salon.

## GitHub et lien public

GitHub héberge le code source. **GitHub Pages** peut publier un site statique, mais ne peut pas exécuter le serveur Next.js, les API de réservation et la base de données de ce projet.

**GitHub Codespaces** permet de lancer toute l'application directement dans le navigateur, sans installation sur votre ordinateur. Suivre [le guide Codespaces](apercu-github.md).

Pour un lien public vers l'application complète, suivre [l'aperçu Render](apercu-en-ligne.md). Le service est relié au dépôt GitHub : après une correction du code, il suffit de déployer le dernier commit depuis Render.
