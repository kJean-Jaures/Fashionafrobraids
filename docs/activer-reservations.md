# Activer les réservations du salon

Dans `/admin`, ouvrir **Préparer les réservations**. Cet espace réunit les connexions, les prestations à vérifier, l’équipe et les consignes. « Configuré » signifie que les paramètres sont présents ; il faut encore vérifier le fonctionnement réel avec les fournisseurs.

Pour comprendre les rubriques et préparer l’équipe, consulter [le guide d’utilisation de l’administration](guide-administration.md).

## Préparer les connexions avant la mise en ligne

Le propriétaire a choisi carte bancaire et Apple Pay, avec réception des encaissements sur son compte à La Banque Postale. Il a confirmé la création de son compte SumUp le **8 octobre 2026**. La validation du profil, l’activation des paiements en ligne, le compte de versement et les identifiants de test restent à vérifier. L’intégration utilise une page de paiement hébergée et ne collecte pas les cartes dans le site.

Le choix a été reconfirmé le **8 octobre 2026** après comparaison avec le virement manuel. Aucun e-mail d’instructions de paiement ou de réservation en attente n’est envoyé. Le serveur vérifie l’encaissement de l’acompte auprès de SumUp, confirme le rendez-vous, envoie la confirmation puis programme le rappel. Cette validation n’attend pas le versement ultérieur de SumUp sur le compte à La Banque Postale ; ses délais dépendent du compte marchand. Aucun bouton de validation manuelle de virement n’est ajouté à ce parcours.

Le test doit utiliser un profil marchand **Sandbox**, distinct du profil d’encaissement réel. Une adresse **HTTPS joignable depuis Internet** doit renvoyer vers cette nouvelle application pour recevoir les callbacks. Un lien HTTPS temporaire vers le serveur local peut servir aux essais. Ne pas utiliser le domaine encore relié au site Squarespace comme s’il servait déjà la nouvelle application.

Sur le PC, les paramètres sont ajoutés au fichier privé `.env.local` existant, puis le serveur est redémarré. Sur l’hébergeur ou dans le cloud, utiliser les variables sécurisées. Conserver `.env.local` et le dossier `data` lors des mises à jour. Le fichier et les réglages du PC ne sont pas copiés automatiquement dans le cloud.

Le propriétaire a confirmé l’accès à l’administration et la réception du test e-mail local le **8 octobre 2026**. Les confirmations et rappels sont activés avec un délai de 24 h, mais le parcours de paiement et l’exécution permanente des rappels restent à vérifier. Aucun paiement réel ni test distant SumUp n’a été effectué.

## Carte bancaire et Apple Pay avec SumUp

1. Dans le compte du salon déjà créé sur [SumUp](https://www.sumup.com/fr-fr/paiements-en-ligne/), vérifier les informations du salon et renseigner le compte de réception à La Banque Postale **chez SumUp**, puis faire valider le profil. Vérifier auprès de SumUp l’activation des paiements en ligne, les frais et les délais de versement. Le nouveau site utilise un paiement en ligne.
2. Dans le tableau de bord SumUp, ouvrir les **réglages développeur → Sandboxes** et créer un profil marchand Sandbox. La [documentation de test](https://developer.sumup.com/online-payments/testing/) décrit aussi l’inscription à un compte développeur qui démarre avec un Sandbox.
3. Pour ce profil, relever le **code marchand** et créer sa **clé API privée** dans **For Developers → Toolkit → API Keys**. La clé publique ne suffit pas. [Guide officiel des clés](https://developer.sumup.com/tools/authorization/api-keys/).
4. Dans les paramètres privés du serveur, compléter :

   ```dotenv
   PAYMENT_PROVIDER=sumup
   SUMUP_API_KEY=VOTRE_CLE_PRIVEE_DU_PROFIL_SANDBOX
   SUMUP_MERCHANT_CODE=CODE_DU_MEME_PROFIL
   SUMUP_MODE=test
   PUBLIC_SITE_URL=https://ADRESSE_DE_CETTE_APPLICATION
   ```

   Remplacer ces exemples localement ou dans les variables sécurisées. La clé et les coordonnées bancaires ne doivent être ni envoyées dans le chat, ni ajoutées aux captures, ni mises dans Git. Redémarrer le serveur après modification.
5. Réserver avec une adresse e-mail autorisée et payer sur la page SumUp avec une **carte de test de sa documentation**, sans fonds réels. Vérifier : montant **10,00 EUR**, retour à la réservation, état « Confirmé », solde au salon, confirmation e-mail, callback même sans retour du navigateur et absence de double envoi. Vérifier aussi un paiement refusé ou abandonné. Ne pas utiliser une vraie carte en supposant que la variable `test` seule simule la banque : le serveur vérifie le profil `sandbox` auprès de SumUp avant la création du checkout.
6. Après validation complète, sélectionner le profil réel validé, créer sa propre clé, remplacer son code marchand, passer `SUMUP_MODE=live` et utiliser `DEMO_MODE=false` sur le site public. La démonstration bloque le mode Live. Vérifier Apple Pay sur un appareil, navigateur et carte compatibles ; les tests simulés du projet ne valident pas un paiement Apple Pay réel.

Le [Hosted Checkout officiel](https://developer.sumup.com/online-payments/checkouts/hosted-checkout/) fournit la page de paiement carte et wallets. Le callback est défini automatiquement lors de chaque checkout, à `/api/payments/sumup/webhook`, via `return_url`. Un callback public n’est jamais pris comme preuve : le serveur relit le checkout puis la transaction avec la clé privée. Les frais de SumUp ne changent pas le solde client : les 10 € d’acompte sont déduits intégralement du prix de la prestation.

Le créneau est retenu **35 minutes**, avec une expiration identique du checkout. Sans connexion, le bouton de paiement reste désactivé. Un paiement tardif ne peut pas doubler un créneau ; s’il ne peut plus confirmer le rendez-vous, l’administration le signale pour examen et la cliente est invitée à contacter le salon sans repayer.

L’acompte n’est pas remboursable si la cliente annule. Cette règle est conservée avec la réservation. Une annulation par le salon ou un paiement encaissé sans rendez-vous confirmé doit être examiné directement auprès du prestataire ; aucun remboursement automatique n’est déclenché.

### Option PayPal existante

L’intégration PayPal et l’historique sont conservés. Pour la sélectionner, utiliser `PAYMENT_PROVIDER=paypal`, les identifiants marchands `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=sandbox`, ainsi que `PUBLIC_SITE_URL`. Son webhook reste `/api/payments/paypal/webhook`, événement `PAYMENT.CAPTURE.COMPLETED`. Le compte auparavant connecté à Squarespace n’a pas été vérifié ; ne pas supposer que sa connexion est transférée au nouveau site. Cette option n’est pas nécessaire au choix carte/Apple Pay SumUp.

## Planning et catalogue

- Les horaires actuels restent **08 h 30–20 h 00**, sept jours sur sept. Ils sont modifiables dans **Horaires & absences**.
- Les tarifs actuels ont été validés par le propriétaire. Les 41 durées manquantes utilisent maintenant des estimations identifiées, réservables et modifiables. Voir [la grille des estimations](durees-estimees.md). Pour une future modification, vérifier les prix et durées dans la liste de préparation. Le bouton **Vérifier** ouvre la prestation. Valider les tarifs par variante et décocher « Estimée » seulement après validation de la durée réelle ; ne pas convertir automatiquement toutes les durées importées en durées validées.
- Configurer les coiffeuses réelles, leurs prestations et horaires dans **Équipe**. La ressource initiale « Équipe du salon » représente une seule place simultanée ; la désactiver ou la remplacer avant d’ajouter les personnes réelles si elle faisait office de placeholder.
- Définir éventuellement une **pause entre deux clientes** de 0 à 120 minutes. Elle s’applique entre les rendez-vous d’une même coiffeuse, pas à la durée affichée ni au total à payer. La valeur initiale de 0 conserve les créneaux actuels.
- Fermer une journée ou bloquer une pause/congé via **Horaires & absences**. Une modification rendant un rendez-vous confirmé ou un paiement en cours incompatible est refusée : déplacer ou annuler le rendez-vous concerné d’abord. Les historiques ne sont pas réécrits.

## Confirmations et rappels e-mail

### Adresse de réponse et accès DNS

Le propriétaire a fourni **fashionafrobraidsoff@gmail.com**. Le site utilise cette adresse pour les réponses aux confirmations et rappels, via `Reply-To`. Elle est modifiable dans **Paramètres → E-mail**. Les nouvelles bases utilisent cette adresse ; les bases existantes sont complétées seulement si le champ est vide, sans remplacer une adresse déjà personnalisée.

Resend ne peut pas envoyer depuis gmail.com, domaine que le salon ne contrôle pas. Il faut vérifier un domaine du salon pour l’expédition, par exemple avec `Fashion Afro Braids <reservation@fashionafrobraids.fr>` comme `EMAIL_FROM` une fois ce domaine vérifié. Cette adresse d’envoi est un exemple, pas une connexion déjà activée. Les réponses arriveront sur le Gmail choisi.

Pour trouver les DNS :

1. Se connecter à [Squarespace Domains](https://account.squarespace.com/domains).
2. Sélectionner **fashionafrobraids.fr**, puis chercher **DNS / Paramètres DNS**. Les libellés peuvent varier selon la langue du compte.
3. Si le domaine n’apparaît pas, identifier le fournisseur où il a été acheté : les DNS peuvent être gérés ailleurs même si le site est construit avec Squarespace.
4. Dans Resend, ajouter le domaine, puis reporter exactement les enregistrements de vérification fournis dans ses DNS. Conserver les enregistrements actuels du site et de la messagerie.
5. Attendre que Resend indique le domaine vérifié, puis renseigner les variables sécurisées ci-dessous et tester la réception avec une adresse autorisée.

Le **8 octobre 2026**, les captures du propriétaire ont confirmé l’accès aux DNS Squarespace, l’ajout des trois enregistrements demandés par Resend, puis le statut **Verified** du domaine `fashionafrobraids.fr`, autorisé à envoyer. Une clé avec la permission **Sending access** a aussi été créée. Le propriétaire a ensuite montré la réception du test dans Gmail, ce qui valide l’envoi depuis son site local. Les confirmations après paiement et les rappels automatiques restent à vérifier. Ces réglages ont été réalisés par le propriétaire. Le domaine continue d’héberger le site Squarespace.

### Connecter le site local et vérifier l’envoi

Dans le dossier du site qui contient `package.json`, ajouter au fichier privé `.env.local` :

```dotenv
RESEND_API_KEY=VOTRE_CLE_PRIVEE
EMAIL_FROM="Fashion Afro Braids <reservation@fashionafrobraids.fr>"
```

Remplacer `VOTRE_CLE_PRIVEE` localement par la clé créée. Ajouter les lignes au fichier existant, puis redémarrer le serveur ; le fichier du PC n’est pas transmis automatiquement à l’environnement cloud. Garder la clé privée. En cas de mise à jour du code, conserver le fichier `.env.local` et les données du dossier `data`.

1. Ouvrir **Espace salon**. Le mot de passe est la valeur de `ADMIN_PASSWORD` dans `.env.local`, à saisir uniquement dans le formulaire de connexion.
2. Ouvrir **Paramètres → Connexions & confirmations**. « Configuré » indique que le serveur a chargé les deux variables. Si « À connecter » reste affiché, vérifier le fichier du dossier réellement démarré et redémarrer cette copie du site.
3. Vérifier l’adresse E-mail enregistrée du salon : actuellement `fashionafrobraidsoff@gmail.com`.
4. Cliquer sur **Envoyer un e-mail de test**. Ce bouton envoie un seul message explicitement identifié comme test à l’adresse enregistrée du salon. Il n’utilise pas les réservations ni les e-mails clientes en attente.
5. Vérifier le message dans Gmail, y compris les courriers indésirables, et son suivi dans **Resend → Emails**. « Resend a accepté » signifie que le fournisseur a accepté la demande ; la réception doit être constatée dans la boîte de destination.

L’envoi de test est réservé à l’administrateur, limité à cinq demandes sur dix minutes par serveur, et utilise le même transport Resend que les confirmations et rappels. Il ne valide pas encore le paiement PayPal ni l’exécution automatique des rappels. Les essais complets de confirmation après acompte et de rappel suivent les étapes ci-dessous.

### Activer et vérifier les envois

1. Préparer le domaine ou l’expéditeur dans [Resend](https://resend.com/domains), puis ajouter `RESEND_API_KEY` et `EMAIL_FROM` dans les variables sécurisées du serveur. L’expéditeur doit être autorisé par Resend.
2. Dans **Préparer les réservations**, activer les confirmations et rappels, choisir le délai de rappel (1 à 168 heures, 24 h par défaut) et saisir les consignes réellement appliquées au salon. Aucune consigne métier n’est inventée par défaut.
3. Configurer une valeur aléatoire robuste pour `CRON_SECRET` dans les variables sécurisées du serveur.
4. Faire appeler par une tâche planifiée **toutes les cinq minutes** `GET https://VOTRE-DOMAINE/api/cron/reminders`, avec l’en-tête `Authorization: Bearer VOTRE_CRON_SECRET`. Saisir la valeur dans le gestionnaire de secrets du planificateur ; ne pas la mettre dans l’URL, un dépôt ou une capture.
5. Vérifier dans l’espace de préparation le **dernier passage observé** et les comptes d’envoi/échec. La présence du secret seule ne prouve pas que la tâche tourne. Vérifier aussi la réception avec votre propre adresse lors d’un essai autorisé avant ouverture aux clientes.

Les confirmations contiennent la coiffure, la date, l’heure, la fin prévue, le montant total, l’acompte payé, le solde et les consignes. Un rappel n’est programmé que si son heure est encore à venir lors de la réservation ; un rendez-vous proche ne reçoit pas un second message immédiat. Les changements de délai ou consignes recalculent les rappels futurs non envoyés. Un rappel déjà envoyé n’est pas renvoyé. Les messages annulés et ceux de rendez-vous passés ne sont pas envoyés tardivement.

Les échecs sont réessayés jusqu’à trois tentatives et restent visibles. **Envoyer les e-mails dus** déclenche l’envoi de vrais messages lorsque le fournisseur est configuré ; ce bouton n’est pas un simple test de connexion.

## Avant l’ouverture publique

Utiliser une base PostgreSQL et un stockage de photos persistants adaptés à l’hébergement. Le déploiement Render de démonstration et les données temporaires servent aux essais. Voir [README](../README.md) et [le guide d’hébergement](apercu-en-ligne.md). Aucune configuration externe, réception d’e-mail ni transaction réelle n’est réputée validée par les seuls tests simulés du projet.
