# Fashion Afro Braids Paris

Site responsive et application web installable (PWA), créés à partir des consignes du salon. Le projet contient une réservation métier, une boutique avec retrait au salon et une administration protégée. Il n’est pas encore déployé sur le domaine du salon.

Aperçus de la version développée : [ordinateur](docs/apercu-ordinateur.png) · [téléphone](docs/apercu-mobile.png) · [nouveaux tarifs](docs/apercu-tarifs.png) · [fiche Knotless](docs/apercu-coiffure.png) · [photo Pinterest](docs/apercu-pinterest.png) · [préparation des réservations](docs/apercu-preparation.png).

Pour ouvrir l'application directement depuis GitHub, suivre le [guide Codespaces](docs/apercu-github.md). Pour ouvrir le vrai site sur votre ordinateur, télécharger et extraire le projet puis double-cliquer sur **Demarrer-le-site.cmd** sous Windows (Node.js 24 requis). Sur macOS/Linux, lancer **npm run local**. Voir le [guide local](docs/apercu-local.md). Pour un lien public interactif, suivre le [guide Render](docs/apercu-en-ligne.md). Le fichier `render.yaml` prépare un aperçu avec un bandeau de démonstration et un mot de passe administrateur généré par l'hébergeur. Le premier déploiement Render a échoué par manque de mémoire ; la correction est testée sous 512 Mio et le déploiement public doit être relancé.

## Démarrage

Les photos du catalogue, des fiches, de la galerie, de la réservation et de la boutique sont affichées en entier dans des cadres adaptés, avec une visionneuse sans recadrage. Des apparitions au défilement et des interactions discrètes enrichissent les pages. La préférence système de mouvement réduit désactive les animations.

Sur l’accueil, les visuels `fashion-original-1.png`, `fashion-original-2.jpg`, `fashion-original-3.jpg`, `fashion-original-8.jpg` et `fashion-original-10.png` remplissent leur emplacement sans marges ajoutées. Les photos de détail 3 et 8 sont également sans bordure ni ombre décorative. Les autres photos conservent leur présentation complète. Les titres, le menu mobile et les boutons bénéficient de transitions supplémentaires ; une fine barre indique la progression dans la page et un accès « Retour en haut » facilite la navigation, au-dessus du bouton de réservation sur téléphone.

La galerie se parcourt avec des boutons précédent/suivant et les flèches du clavier ; le compteur correspond à la catégorie affichée. La recherche de coiffures reconnaît plusieurs mots, les accents, les tailles et les longueurs. Sur téléphone, elle apparaît avant les catégories, avec un bouton d’effacement et une remise à zéro des filtres. Voir les aperçus [recherche mobile](docs/apercu-catalogue-mobile.png) et [navigation de galerie](docs/apercu-galerie-navigation.png).

L’espace administrateur comprend désormais **Préparer les réservations** : état de la connexion PayPal, envoi e-mail, dernier passage réellement observé de la tâche de rappel, tarifs et durées à vérifier par variante, équipe et consignes. Les connexions configurées restent à tester avec les comptes du salon. Voir [le guide d’activation](docs/activer-reservations.md).

Pour utiliser le tableau de bord au quotidien, consulter [le guide d’administration du salon](docs/guide-administration.md), avec les rubriques, l’accès local et les étapes de préparation de l’équipe.

Le délai de rappel est réglable de 1 à 168 heures (24 h par défaut), avec activation séparée des confirmations et rappels. Les e-mails incluent la fin prévue, l’acompte payé, le solde et les consignes saisies par le salon. Les rappels futurs non envoyés sont recalculés après modification ; ceux déjà envoyés sont conservés. Les messages de rendez-vous passés sont ignorés. La pause optionnelle entre deux clientes (0 à 120 minutes, 0 par défaut) est vérifiée lors du choix, de la réservation, du déplacement et d’une confirmation de paiement tardive. Les changements d’horaires ou d’équipe qui invalideraient un rendez-vous existant sont refusés. Les anciennes bases reçoivent les nouvelles valeurs par défaut à la lecture, sans écraser leurs données.

Node.js **24** et npm sont nécessaires. Le catalogue et la configuration locale sont initialisés automatiquement ; aucun compte externe n’est nécessaire pour développer le site. Les réservations publiques nécessitent le paiement de l’acompte PayPal ; la boutique conserve le règlement au retrait.

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

## Données du salon

L’adresse **74 Avenue de Saint-Ouen, 75018 Paris**, le téléphone **+33 6 25 19 74 29** et les produits **bonnet 10 €, perruque 100 €, mèches 5 €, perles 5 €** proviennent des informations transmises dans la conversation. Ces informations ont ensuite été vérifiées sur le site public, devenu accessible après activation des domaines réseau. Les visuels des quatre produits, deux visuels de présentation et les quatre témoignages publiés ont été repris localement. Aucune note numérique n’était publiée : aucune note n’a été inventée.

Les horaires ont été harmonisés à **08 h 30–20 h, tous les jours**, comme demandé. Tous les jours restent modifiables dans l’administration.

**17 familles de coiffures** reprennent les tarifs des trois pages de l’affiche fournie : Knotless, Knotless Boho, Twist Boho, Fulani, Spiral Cornrows, Criss Cross, Lemonade, French Curl et Bob. Les photos de l’affiche sont conservées sans modification ; le logo original est présent dans la navigation, le pied de page et les icônes de l’application. Les suppléments sont : boucles aux pointes 5 €, perles 5 €, volume boho 2× 10 € ou 3× 15 € (choix exclusif). Mèches non incluses. Les tarifs actuels sont validés par le propriétaire. Les durées correspondant au calendrier fourni sont reprises à la minute ; les 41 variantes absentes de la source utilisent des estimations basées sur les coiffures les plus proches, identifiées par « environ » et disponibles pour réserver. Voir [la grille et les sources des estimations](docs/durees-estimees.md). Chaque prestation a une validation tarifaire individuelle dans l’administration ; le réglage global valide l’ensemble.

Les stocks commencent à **zéro**, car aucune quantité réelle n’a été fournie. Dans Produits & stocks, renseigner les quantités, les modèles et les caractéristiques pour ouvrir les commandes. Aucun faux avis ni chiffre de clientèle n’est publié. Les visuels de la source identifiés comme générés ou promotionnels portent une indication d’illustration. Les visuels produits proviennent du site actuel ; certains sont illustratifs et les modèles exacts restent à confirmer. Remplacer ces visuels par les photos du salon depuis l’administration. **Les 100 prestations du calendrier Good Hair Family fourni par le propriétaire ont été relevées ; 94 variantes de cette source sont conservées avec leurs durées exactes et leurs correspondances par variante. Contours, Dégradé & barbe, Coupe à sec et Coupe des pointes ont été supprimés à la demande du salon, avec les visuels de galerie associés. Les 72 images du relevé initial sont stockées localement ; 63 restent visibles dans la galerie après retrait des visuels de coupes et contours. L’accueil reprend les images de fashionafrobraids.fr, ses cadres arrondis et son identité rose, blanche et beige. Les 41 variantes qui n’avaient pas d’image utilisent désormais 18 visuels Pinterest vérifiés visuellement et identifiés comme inspirations, avec un lien vers l’épingle d’origine. Les photos du calendrier, de l’affiche et les photos ajoutées par le salon sont conservées. Les anciens visuels de démonstration sont masqués. Les horaires sont 08 h 30–20 h 00 tous les jours, avec fin de prestation avant la fermeture. Une migration unique met aussi les anciennes bases à jour ; les rendez-vous historiques et les modifications administratives futures sont conservés.** Voir [la provenance](docs/sources.md).

Le planning contient initialement une ressource **Équipe du salon**. Ajouter les vraies coiffeuses et leurs prestations dans Équipe pour représenter la capacité réelle ; désactiver la ressource initiale si elle ne correspond plus à une place disponible.

## PostgreSQL et persistance

La couche SQL utilise PostgreSQL :

- **Développement local :** PGlite, PostgreSQL embarqué, stocké dans `data/postgres`. Un seul processus serveur doit utiliser ce répertoire à la fois.
- **Production :** définir `DATABASE_URL` vers une base PostgreSQL. Le schéma est créé de manière idempotente au démarrage. Respecter la configuration TLS et les certificats du fournisseur ; ne pas désactiver leur vérification.

Le catalogue est initialisé puis migré une seule fois pour importer l’affiche et régler les acomptes à 10 €. Les prix historiques des réservations et les stocks restent intacts. Les modifications et suppressions de l’administration persistent au redémarrage. Les réservations et commandes gardent un instantané du tarif et de la prestation, afin que les modifications du catalogue ne changent pas l’historique.

Les photos importées se trouvent dans `data/uploads`, ou dans `UPLOAD_DIR` si défini. Prévoir un disque persistant et une sauvegarde de ces fichiers. Une plateforme sans disque persistant nécessite une adaptation vers un stockage d’objets avant ouverture publique. Les données locales, les uploads, les fichiers privés et les rapports de tests sont exclus de Git.

## Confirmations et rappels e-mail

Les notifications sont enregistrées en base. Sans service configuré, elles restent en attente : la page de confirmation et l’export calendrier fonctionnent, mais aucun envoi d’e-mail n’est annoncé.

Pour activer les envois, configurer **RESEND_API_KEY** et **EMAIL_FROM** avec un expéditeur vérifié. Dans l’environnement cloud, le domaine nécessaire est `api.resend.com`. La clé doit être fournie dans les paramètres sécurisés ou chez l’hébergeur, jamais dans le chat ou le dépôt.

L’adresse de réponse du salon est **fashionafrobraidsoff@gmail.com**, fournie par le propriétaire. Elle est modifiable dans **Paramètres → E-mail** et transmise comme `Reply-To` pour les confirmations et rappels. L’expéditeur `EMAIL_FROM` reste une adresse d’un domaine vérifié dans Resend ; ne pas utiliser une adresse Gmail comme expéditeur Resend. Les anciennes bases reçoivent l’adresse fournie uniquement si leur champ E-mail est vide, sans remplacer une adresse personnalisée.

Configurer une tâche planifiée, par exemple toutes les cinq minutes, qui appelle `GET /api/cron/reminders` avec l’en-tête `Authorization: Bearer <CRON_SECRET>`. Définir `CRON_SECRET` de façon sécurisée. Le traitement envoie les confirmations dues et les rappels **24 heures avant** le rendez-vous. Les rendez-vous pris moins de 24 heures avant n’ont pas de rappel anticipé. L’administration permet aussi de déclencher les envois dus.

Les envois sont réessayés jusqu’à trois tentatives. La clé d’idempotence évite les doublons chez le fournisseur. Les tâches interrompues peuvent être reprises après 15 minutes. Les tests de transport utilisent un fournisseur simulé ; aucun envoi réel n’a été vérifié sans compte configuré.

## Acompte de 10 € avec PayPal

Chaque prestation est configurée avec un acompte fixe de **10 €**, déduit du prix total. Le solde est réglé au salon. L’administration peut ajuster cette règle par prestation. Aucun compte Stripe n’est utilisé.

Le compte **PayPal personnel doit être converti en Business**, ou un compte Business distinct doit être ouvert. Créer ensuite une application REST sur [PayPal Developer](https://developer.paypal.com/dashboard/) et renseigner dans les **variables sécurisées du serveur** :

- `PAYPAL_CLIENT_ID` et `PAYPAL_CLIENT_SECRET`, correspondant à l’application et au mode choisi ;
- `PAYPAL_MODE=sandbox` pour les tests, puis `live` pour les vrais paiements ;
- `PUBLIC_SITE_URL`, adresse HTTPS du nouveau site ;
- `PAYPAL_WEBHOOK_ID`, obtenu en enregistrant le webhook HTTPS `/api/payments/paypal/webhook` pour l’événement `PAYMENT.CAPTURE.COMPLETED`.

Le secret client est lu directement par le processus afin de construire l’authentification OAuth Basic. Ne pas utiliser un substitut de secret destiné uniquement à une injection dans un en-tête réseau. Ne jamais copier les identifiants dans le chat, Git ou les logs. API : `api-m.sandbox.paypal.com` en test et `api-m.paypal.com` en production.

Le client est redirigé vers la page sécurisée PayPal. Le paiement par carte sans compte PayPal dépend de l’éligibilité décidée par PayPal (pays, compte Business et client). Ce site ne garantit pas que cette option sera proposée à chaque client et ne stocke aucune donnée bancaire.

Le créneau est retenu **35 minutes**. Le retour navigateur capture la commande liée à la réservation et vérifie le montant exact en EUR. Le webhook est vérifié auprès de PayPal et récupère la confirmation même si le client ne revient pas sur le site. Les événements et captures sont idempotents. Une réservation ne devient confirmée qu’après paiement vérifié ; un paiement tardif ne peut pas créer de double réservation. L’acompte de **10 € n’est pas remboursable en cas d’annulation par la cliente**. Cette règle est affichée avant paiement, acceptée avec la politique de réservation et enregistrée pour les nouvelles réservations avec acompte ; les réservations historiques ne sont pas réécrites. Une annulation par le salon ou un paiement tardif encaissé sans créneau confirmé doit être examiné dans PayPal. Aucun remboursement automatique n’est déclenché.

Sans configuration PayPal complète, le bouton de paiement est désactivé et le site invite à appeler le salon. Aucune réservation gratuite ni paiement simulé ne sont validés à sa place. Tester un paiement **sandbox** avec un acheteur de test, vérifier la confirmation, le webhook, le solde et l’administration avant de passer en `live`. Le mode démonstration refuse les paiements `live`. Le paiement réel reste à vérifier avec le compte Business du salon. La boutique conserve le règlement au retrait.

## Vérifications

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Les tests métier et navigateur utilisent des bases temporaires distinctes, sans modifier les données du salon. Les tests navigateur démarrent la version de production sur le port 3100. Chromium est déjà disponible dans l’environnement cloud ; ailleurs, définir `CHROMIUM_PATH` ou installer un navigateur compatible avec Playwright.

Les contrôles couvrent le prix des variantes et options, les durées, les collisions, les coiffeuses parallèles, les horaires, pauses, annulations, déplacements, stocks, commandes, liens privés, changement d’heure, notifications, création et capture PayPal simulées, vérification des webhooks, parcours mobile, administration, import de photos, contact, manifest et contrôles automatisés WCAG AA de l’accueil. Un contrôle automatique ne remplace pas une vérification manuelle exhaustive d’accessibilité.

Dans cet environnement : **44 tests métier réussis et 16 parcours navigateur validés**, vérification TypeScript et compilation de production réussies. Les contrôles vérifient les 94 correspondances de durées conservées, les photos Pinterest et leurs sources, la suppression des prestations demandées sans effacer leur historique, la migration des anciennes bases, les collisions d’une prestation de 65 minutes, la fermeture à 20 h, les estimations de durée avec blocage complet du planning et la galerie complète. Ils couvrent aussi la pause entre clientes, les changements de planning incompatibles, le recalcul et l’arrêt des rappels, les messages périmés, les envois concurrents, les consignes sur mobile, la validation de tarif par variante et la protection du déclencheur automatique. Le lanceur local a aussi été vérifié face à un ancien serveur encore ouvert : il démarre et ouvre la nouvelle version sur un autre port.

La correction mémoire précédente a été vérifiée en mode démonstration sous **512 Mio sans swap** avant cet import complet d’images ; ce résultat ne constitue pas une mesure mémoire du nouveau catalogue. Les intégrations PostgreSQL externe, Resend et paiement PayPal réel restent à vérifier avec les comptes du salon.

## Mise en ligne

```bash
npm ci
npm run build
npm start
```

Définir le mot de passe administrateur, la base PostgreSQL, le stockage persistant des photos et l’adresse HTTPS chez l’hébergeur. Ajouter les secrets des services choisis. Les tarifs sont validés ; vérifier les stocks, la capacité réelle et les photos, puis affiner au besoin les durées estimées dans l’administration. Compléter la raison sociale, le SIRET, les coordonnées légales, l’hébergement, les conditions commerciales, de réservation et la politique de confidentialité. Les documents fournis sont des documents de travail clairement identifiés.

Passer `ALLOW_INDEXING=true` après validation. Tester les envois et paiements réels en mode test avant l’ouverture commerciale. L’installation PWA et l’authentification de gestion en production nécessitent HTTPS.

La configuration enregistrée dans les paramètres de l’environnement Codex contient les instructions d’installation et de démarrage. Sa publication crée l’environnement réutilisable ; elle **ne met pas le site en ligne sur fashionafrobraids.fr** et ne modifie pas Squarespace.

Les 16 parcours navigateur ont été relancés pour les derniers ajustements de l’accueil, de la galerie et de la recherche. Les contrôles automatisés d’accessibilité passent aussi sur la recherche et la visionneuse. Les tests métier ont été validés lors de la précédente modification du planning et n’ont pas été relancés pour ces seuls changements d’interface.
