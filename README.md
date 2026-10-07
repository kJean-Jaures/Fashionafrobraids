# Fashion Afro Braids Paris

Site responsive et application web installable (PWA), créés à partir des consignes du salon. Le projet contient une réservation métier, une boutique avec retrait au salon et une administration protégée. Il n’est pas encore déployé sur le domaine du salon.

Aperçus de la version développée : [ordinateur](docs/apercu-ordinateur.png) · [téléphone](docs/apercu-mobile.png).

Pour voir le site sur votre ordinateur sans hébergeur, suivre le [guide local](docs/apercu-local.md). Pour un lien public interactif, suivre le [guide Render](docs/apercu-en-ligne.md). Le fichier `render.yaml` prépare un aperçu avec un bandeau de démonstration et un mot de passe administrateur généré par l'hébergeur. Le premier déploiement Render a échoué par manque de mémoire ; la correction est testée sous 512 Mio et le déploiement public doit être relancé.

## Démarrage

Node.js **24** et npm sont nécessaires. Le catalogue et la configuration locale sont initialisés automatiquement ; aucun compte externe n’est nécessaire pour développer les réservations et les commandes avec paiement au salon.

```bash
cd /workspace/Fashionafrobraids
npm ci --cache /workspace/.npm-cache
npm run setup
npm run dev
```

Le serveur utilise le port 3000. Le dépôt existant est déjà isolé dans l’environnement cloud : travailler dans ce checkout, sans créer de worktree.

`npm run setup` crée un mot de passe de gestion aléatoire dans **.env.local**, uniquement si ce fichier n’existe pas. Ce fichier privé n’est pas versionné. Ouvrir ce fichier localement pour obtenir ou remplacer le mot de passe, puis redémarrer le serveur après modification. Utiliser au moins 16 caractères. Aucun mot de passe, clé ou chaîne de connexion ne doit être ajouté à Git.

## Ce qui fonctionne

- Accueil rose, blanc et beige, navigation mobile, galerie filtrable avec lightbox, tarifs en accordéons, pages du salon et contact.
- Catalogue complet fourni dans les consignes : braids, knotless, boho, fulani, cornrows, twists, extensions, tissages, perruques, hommes, enfants, événementiel, soins, coupes, lissage et coloration.
- Variantes, longueurs, options et durées ; calcul des montants côté serveur ; réservation de toute la durée.
- Attribution à une coiffeuse disponible, plusieurs coiffeuses en parallèle, horaires du salon et horaires individuels, pauses, congés et fermetures.
- Protection transactionnelle contre les réservations qui se chevauchent ; déplacement vérifié et annulation.
- Confirmation privée, lien de gestion, export calendrier `.ics` et rendez-vous mémorisés sur l’appareil.
- Boutique, quantités, panier persistant, commande avec retrait gratuit et paiement au salon, stock vérifié et décrémenté atomiquement, remise en stock après annulation.
- Espace `/admin` : prestations, variantes, options, acomptes, produits, stocks, équipe, horaires, blocages, photos, avis, messages et commandes.
- Import des photos JPG/PNG/WebP, contrôle de taille et conversion WebP. Les photos importées sont servies par une route dédiée, y compris après un déploiement de production.
- Manifest, icônes et écran hors connexion. L’application s’installe sur l’écran d’accueil sur un site HTTPS. Les informations personnelles et les API ne sont pas mises en cache hors connexion.
- Métadonnées SEO, sitemap dynamique, robots et données structurées du salon. L’indexation publique est désactivée par défaut.

## Données de départ à valider

L’adresse **74 Avenue de Saint-Ouen, 75018 Paris**, le téléphone **+33 6 25 19 74 29** et les produits **bonnet 10 €, perruque 100 €, mèches 5 €, perles 5 €** proviennent des informations transmises dans la conversation. Ces informations ont ensuite été vérifiées sur le site public, devenu accessible après activation des domaines réseau. Les visuels des quatre produits, deux visuels de présentation et les quatre témoignages publiés ont été repris localement. Aucune note numérique n’était publiée : aucune note n’a été inventée.

Les horaires ont été harmonisés à **08 h 30–20 h, tous les jours**, comme demandé. Tous les jours restent modifiables dans l’administration.

Les prix des prestations sont une **grille initiale à valider**. Les durées sont des estimations de planification, à corriger selon la prestation et l’équipe. Les longueurs supplémentaires et suppléments suivent la grille initiale et doivent aussi être validés. L’avertissement public se retire dans Paramètres après validation.

Les stocks commencent à **zéro**, car aucune quantité réelle n’a été fournie. Dans Produits & stocks, renseigner les quantités, les modèles et les caractéristiques pour ouvrir les commandes. Aucun faux avis, chiffre de clientèle ou photo de réalisation n’est publié. Les portraits générés sont identifiés comme des inspirations. Les visuels produits proviennent du site actuel ; certains sont illustratifs et les modèles exacts restent à confirmer. Remplacer ces visuels par les photos du salon depuis l’administration. Un visuel d’ambiance du site actuel est repris dans la catégorie **Salon** ; il peut être remplacé par une photo validée du salon.

Le planning contient initialement une ressource **Équipe du salon**. Ajouter les vraies coiffeuses et leurs prestations dans Équipe pour représenter la capacité réelle ; désactiver la ressource initiale si elle ne correspond plus à une place disponible.

## PostgreSQL et persistance

La couche SQL utilise PostgreSQL :

- **Développement local :** PGlite, PostgreSQL embarqué, stocké dans `data/postgres`. Un seul processus serveur doit utiliser ce répertoire à la fois.
- **Production :** définir `DATABASE_URL` vers une base PostgreSQL. Le schéma est créé de manière idempotente au démarrage. Respecter la configuration TLS et les certificats du fournisseur ; ne pas désactiver leur vérification.

Le catalogue n’est initialisé qu’une fois. Les modifications et suppressions de l’administration persistent au redémarrage. Les réservations et commandes gardent un instantané du tarif et de la prestation, afin que les modifications du catalogue ne changent pas l’historique.

Les photos importées se trouvent dans `data/uploads`, ou dans `UPLOAD_DIR` si défini. Prévoir un disque persistant et une sauvegarde de ces fichiers. Une plateforme sans disque persistant nécessite une adaptation vers un stockage d’objets avant ouverture publique. Les données locales, les uploads, les fichiers privés et les rapports de tests sont exclus de Git.

## Confirmations et rappels e-mail

Les notifications sont enregistrées en base. Sans service configuré, elles restent en attente : la page de confirmation et l’export calendrier fonctionnent, mais aucun envoi d’e-mail n’est annoncé.

Pour activer les envois, configurer **RESEND_API_KEY** et **EMAIL_FROM** avec un expéditeur vérifié. Dans l’environnement cloud, le domaine nécessaire est `api.resend.com`. La clé doit être fournie dans les paramètres sécurisés ou chez l’hébergeur, jamais dans le chat ou le dépôt.

Configurer une tâche planifiée, par exemple toutes les cinq minutes, qui appelle `GET /api/cron/reminders` avec l’en-tête `Authorization: Bearer <CRON_SECRET>`. Définir `CRON_SECRET` de façon sécurisée. Le traitement envoie les confirmations dues et les rappels **24 heures avant** le rendez-vous. Les rendez-vous pris moins de 24 heures avant n’ont pas de rappel anticipé. L’administration permet aussi de déclencher les envois dus.

Les envois sont réessayés jusqu’à trois tentatives. La clé d’idempotence évite les doublons chez le fournisseur. Les tâches interrompues peuvent être reprises après 15 minutes. Les tests de transport utilisent un fournisseur simulé ; aucun envoi réel n’a été vérifié sans compte configuré.

## Acomptes Stripe

Les règles d’acompte sont configurables par prestation : aucun, pourcentage ou montant fixe. Les clés sont facultatives tant que le règlement se fait au salon.

Pour activer les acomptes : configurer **STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET** et **PUBLIC_SITE_URL** avec l’adresse HTTPS du nouveau site. Enregistrer chez Stripe le webhook **`/api/payments/webhook`**, pour `checkout.session.completed` et `checkout.session.expired`. Utiliser les clés de test d’abord. Le domaine API nécessaire est `api.stripe.com`.

Le créneau est retenu **35 minutes** pendant le paiement. Le webhook signé vérifie le montant et la devise, traite les événements de manière idempotente et confirme la réservation après paiement. Une réservation expirée n’empêche plus les autres clients de réserver. Un paiement reçu trop tard ne peut pas créer de double réservation : le rendez-vous reste annulé, l’acompte payé est visible dans l’administration et doit être traité par le salon. Les remboursements se gèrent dans Stripe ; ils ne sont pas déclenchés par l’annulation d’un rendez-vous.

Une prestation avec acompte ne peut pas être réservée si Stripe n’est pas configuré. La connexion et le paiement réels devront être vérifiés avec le compte Stripe du salon avant leur activation publique. La boutique utilise actuellement le paiement au retrait ; le paiement boutique et la livraison ne sont pas activés.

## Vérifications

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Les tests métier et navigateur utilisent des bases temporaires distinctes, sans modifier les données du salon. Les tests navigateur démarrent la version de production sur le port 3100. Chromium est déjà disponible dans l’environnement cloud ; ailleurs, définir `CHROMIUM_PATH` ou installer un navigateur compatible avec Playwright.

Les contrôles couvrent le prix des variantes et options, les durées, les collisions, les coiffeuses parallèles, les horaires, pauses, annulations, déplacements, stocks, commandes, liens privés, changement d’heure, notifications, webhooks Stripe simulés, parcours mobile, administration, import de photos, contact, manifest et contrôles automatisés WCAG AA de l’accueil. Un contrôle automatique ne remplace pas une vérification manuelle exhaustive d’accessibilité.

Dans cet environnement : **20 tests métier et 7 tests navigateur réussis**, vérification TypeScript et compilation de production réussies. Les sept parcours navigateur ont aussi réussi en mode démonstration dans un conteneur limité à **512 Mio sans swap**, avec un pic d'environ **236 Mio**. Un contrôle complémentaire sur téléphone n’a détecté aucun débordement ni violation automatisée WCAG AA sur l’accueil, le catalogue, la fiche Knotless, la réservation, la boutique et le contact. Les intégrations PostgreSQL externe, Resend et paiement Stripe réel restent à vérifier avec les comptes du salon.

## Mise en ligne

```bash
npm ci
npm run build
npm start
```

Définir le mot de passe administrateur, la base PostgreSQL, le stockage persistant des photos et l’adresse HTTPS chez l’hébergeur. Ajouter les secrets des services choisis. Valider les tarifs, durées, stocks, capacité réelle, horaires et photos. Compléter la raison sociale, le SIRET, les coordonnées légales, l’hébergement, les conditions commerciales, de réservation et la politique de confidentialité. Les documents fournis sont des documents de travail clairement identifiés.

Passer `ALLOW_INDEXING=true` après validation. Tester les envois et paiements réels en mode test avant l’ouverture commerciale. L’installation PWA et l’authentification de gestion en production nécessitent HTTPS.

La configuration enregistrée dans les paramètres de l’environnement Codex contient les instructions d’installation et de démarrage. Sa publication crée l’environnement réutilisable ; elle **ne met pas le site en ligne sur fashionafrobraids.fr** et ne modifie pas Squarespace.
