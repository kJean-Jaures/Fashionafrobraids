# Obtenir un aperçu interactif

Le projet inclut une configuration Render dans `render.yaml`. Cette configuration démarre le site et son serveur de réservation avec une base locale de démonstration. Le bandeau « Démonstration » distingue cet aperçu du salon ouvert aux clients.

## Créer le compte

Créer un compte sur [Render](https://render.com), puis se connecter avec GitHub. Donner accès uniquement au dépôt `kJean-Jaures/Fashionafrobraids` si Render propose une sélection de dépôts. Ne jamais communiquer son mot de passe GitHub ou Render dans le chat.

## Déployer

Dans Render, créer un **Blueprint** depuis le dépôt GitHub contenant le fichier `render.yaml`. Choisir la branche **`codex/fashion-afro-braids-preview`** et vérifier la configuration proposée avant de lancer le déploiement.

La configuration demande un service web de démonstration sur le plan `free`. Vérifier que cette offre est disponible et que le récapitulatif ne prévoit aucun coût avant de confirmer. La disponibilité et les conditions de l'offre dépendent de Render. Aucun domaine personnel n'est nécessaire : Render attribue une adresse HTTPS au service créé.

Si l'import Blueprint n'est pas proposé, créer un **Web Service**, choisir le dépôt et cette branche, avec le runtime **Node**. Utiliser les commandes de `render.yaml`, recopier ses variables non secrètes, et créer un mot de passe `ADMIN_PASSWORD` d'au moins 16 caractères dans la configuration sécurisée du service. Ne pas utiliser une valeur de test ni le copier dans le code.

Après le démarrage, ouvrir l'adresse HTTPS attribuée par Render. Elle permet de consulter le site depuis un ordinateur ou un téléphone et de tester la réservation. L'espace de gestion est accessible en ajoutant `/admin` à cette adresse. Avec un Blueprint, le mot de passe est généré par Render ; il se trouve dans les variables sécurisées du service.

## Limites de la démonstration

Les données et photos ajoutées dans cet aperçu peuvent disparaître lors d'un redémarrage ou d'un nouveau déploiement. Utiliser des informations de test. Les réservations saisies dans cet aperçu ne sont pas des rendez-vous réels du salon. Aucun compte PayPal ou e-mail n'est connecté.

Les stocks initiaux restent à zéro. Pour tester une commande, ouvrir l'administration et renseigner un stock de test dans Produits & stocks. Cela n'indique pas le stock réel du salon.

La connexion réelle à Render et l'accès par son adresse publique nécessitent le compte du propriétaire et restent à vérifier après le déploiement. Le code et les commandes ont été vérifiés dans l'environnement de développement ; cela ne prouve pas qu'un service Render existe déjà.

## Relancer le déploiement après l'erreur de mémoire

Les logs du premier déploiement montrent une compilation réussie, puis **Out of memory (used over 512Mi)** après le démarrage. L'erreur a été reproduite dans un conteneur Node.js 24.19.0 limité à 512 Mio sans swap.

La compilation prépare maintenant une base PostgreSQL locale vide dans `.next/local-postgres`. Au premier accès, le serveur la copie dans `DATA_DIR` ; une base déjà créée est conservée. Les buffers PostgreSQL sont réduits. En mode démonstration sans `DATABASE_URL`, `npm start` utilise la compilation WASM de base pour éviter les pointes de mémoire du compilateur d'optimisation. La connexion PostgreSQL externe garde les réglages Node habituels.

Les **20 tests métier** et **7 tests navigateur** ont réussi. Les sept parcours navigateur ont tourné sur la version de production dans le conteneur limité à **512 Mio**, avec les variables de démonstration Render. Le pic mesuré après ces parcours était d'environ **236 Mio**, sans arrêt pour manque de mémoire. Cela valide ce scénario de test ; le déploiement public Render reste à vérifier.

Dans Render, ouvrir **fashion-afro-braids-demo**, puis choisir **Manual Deploy → Deploy latest commit**. Garder la branche `codex/fashion-afro-braids-preview` et les variables du Blueprint, notamment `DEMO_MODE=true`. Les commandes de compilation et de démarrage restent celles de `render.yaml`.

Attendre l'état **Live**, puis ouvrir l'adresse HTTPS affichée par Render. Si le service n'apparaît pas, revenir au Blueprint et utiliser **Manual sync** pour reprendre sa création.

Pour voir le site sans hébergeur, suivre [le lancement sur votre ordinateur](apercu-local.md).

## Passer à une utilisation réelle

Avant l'ouverture, configurer une base PostgreSQL et le stockage persistant des photos, désactiver `DEMO_MODE`, puis valider les tarifs, durées, disponibilités et documents légaux. Voir le README pour les e-mails, rappels et acomptes. La configuration de démonstration ne doit pas servir d'agenda commercial.

Référence utilisée pour la configuration Node : [exemple Render publié par Next.js](https://github.com/nextjs/deploy-render).
