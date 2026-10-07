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

Les données et photos ajoutées dans cet aperçu peuvent disparaître lors d'un redémarrage ou d'un nouveau déploiement. Utiliser des informations de test. Les réservations saisies dans cet aperçu ne sont pas des rendez-vous réels du salon. Aucun compte Stripe ou e-mail n'est connecté.

Les stocks initiaux restent à zéro. Pour tester une commande, ouvrir l'administration et renseigner un stock de test dans Produits & stocks. Cela n'indique pas le stock réel du salon.

La connexion réelle à Render et l'accès par son adresse publique nécessitent le compte du propriétaire et restent à vérifier après le déploiement. Le code et les commandes ont été vérifiés dans l'environnement de développement ; cela ne prouve pas qu'un service Render existe déjà.

## Passer à une utilisation réelle

Avant l'ouverture, configurer une base PostgreSQL et le stockage persistant des photos, désactiver `DEMO_MODE`, puis valider les tarifs, durées, disponibilités et documents légaux. Voir le README pour les e-mails, rappels et acomptes. La configuration de démonstration ne doit pas servir d'agenda commercial.

Référence utilisée pour la configuration Node : [exemple Render publié par Next.js](https://github.com/nextjs/deploy-render).
