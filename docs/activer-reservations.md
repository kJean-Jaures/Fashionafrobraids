# Activer les réservations du salon

Dans `/admin`, ouvrir **Préparer les réservations**. Cet espace réunit les connexions, les prestations à vérifier, l’équipe et les consignes. « Configuré » signifie que les paramètres sont présents ; il faut encore vérifier le fonctionnement réel avec les fournisseurs.

## Acompte de 10 € avec PayPal

L’intégration utilise PayPal Checkout. Un compte **PayPal Business** est nécessaire ; le compte personnel actuel doit être converti ou remplacé par un compte Business par le propriétaire. Cette opération n’est pas effectuée par le site.

1. Depuis [PayPal](https://www.paypal.com/fr/business), préparer le compte Business.
2. Dans [PayPal Developer](https://developer.paypal.com/dashboard/applications), créer une application Sandbox.
3. Ajouter le webhook HTTPS `https://VOTRE-DOMAINE/api/payments/paypal/webhook` pour l’événement `PAYMENT.CAPTURE.COMPLETED`. `VOTRE-DOMAINE` est à remplacer par le domaine où cette application est réellement déployée, pas un site Squarespace encore en service.
4. Dans les variables sécurisées de l’hébergeur, renseigner `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=sandbox` et `PUBLIC_SITE_URL=https://VOTRE-DOMAINE`.
5. Effectuer une réservation avec un compte acheteur Sandbox distinct. Vérifier le montant de **10,00 EUR**, le passage de « Acompte en attente » à « Confirmé », le solde au salon, le retour navigateur et le webhook. Vérifier qu’un événement répété ne confirme ni n’encaisse deux fois.
6. Lorsque le test est validé, configurer les identifiants et le webhook Live, passer `PAYPAL_MODE=live` et utiliser `DEMO_MODE=false` sur le véritable site public. La démonstration bloque les paiements Live.

Le créneau est retenu 35 minutes pendant le paiement. Sans configuration PayPal, aucun acompte n’est encaissé et aucune réservation avec acompte n’est confirmée gratuitement. Un client peut être orienté vers le téléphone du salon. L’acompte de **10 € n’est pas remboursable si la cliente annule**. La règle est affichée avant paiement et dans les confirmations des nouvelles réservations. Une annulation par le salon ou un paiement encaissé sans rendez-vous confirmé doit être examiné directement dans PayPal ; aucun remboursement automatique n’est déclenché.

Ne jamais mettre les identifiants dans le chat, les captures d’écran ou Git. Redémarrer le serveur après mise à jour de ses variables. Aucune clé de paiement n’est saisie dans le formulaire administrateur du site.

## Planning et catalogue

- Les horaires actuels restent **08 h 30–20 h 00**, sept jours sur sept. Ils sont modifiables dans **Horaires & absences**.
- Vérifier les prix et durées dans la liste de préparation. Le bouton **Vérifier** ouvre la prestation. Valider les tarifs par variante et décocher « Estimée » seulement après validation de la durée réelle ; ne pas convertir automatiquement toutes les durées importées en durées validées.
- Configurer les coiffeuses réelles, leurs prestations et horaires dans **Équipe**. La ressource initiale « Équipe du salon » représente une seule place simultanée ; la désactiver ou la remplacer avant d’ajouter les personnes réelles si elle faisait office de placeholder.
- Définir éventuellement une **pause entre deux clientes** de 0 à 120 minutes. Elle s’applique entre les rendez-vous d’une même coiffeuse, pas à la durée affichée ni au total à payer. La valeur initiale de 0 conserve les créneaux actuels.
- Fermer une journée ou bloquer une pause/congé via **Horaires & absences**. Une modification rendant un rendez-vous confirmé ou un paiement en cours incompatible est refusée : déplacer ou annuler le rendez-vous concerné d’abord. Les historiques ne sont pas réécrits.

## Confirmations et rappels e-mail

1. Préparer le domaine ou l’expéditeur dans [Resend](https://resend.com/domains), puis ajouter `RESEND_API_KEY` et `EMAIL_FROM` dans les variables sécurisées du serveur. L’expéditeur doit être autorisé par Resend.
2. Dans **Préparer les réservations**, activer les confirmations et rappels, choisir le délai de rappel (1 à 168 heures, 24 h par défaut) et saisir les consignes réellement appliquées au salon. Aucune consigne métier n’est inventée par défaut.
3. Configurer une valeur aléatoire robuste pour `CRON_SECRET` dans les variables sécurisées du serveur.
4. Faire appeler par une tâche planifiée **toutes les cinq minutes** `GET https://VOTRE-DOMAINE/api/cron/reminders`, avec l’en-tête `Authorization: Bearer VOTRE_CRON_SECRET`. Saisir la valeur dans le gestionnaire de secrets du planificateur ; ne pas la mettre dans l’URL, un dépôt ou une capture.
5. Vérifier dans l’espace de préparation le **dernier passage observé** et les comptes d’envoi/échec. La présence du secret seule ne prouve pas que la tâche tourne. Vérifier aussi la réception avec votre propre adresse lors d’un essai autorisé avant ouverture aux clientes.

Les confirmations contiennent la coiffure, la date, l’heure, la fin prévue, le montant total, l’acompte payé, le solde et les consignes. Un rappel n’est programmé que si son heure est encore à venir lors de la réservation ; un rendez-vous proche ne reçoit pas un second message immédiat. Les changements de délai ou consignes recalculent les rappels futurs non envoyés. Un rappel déjà envoyé n’est pas renvoyé. Les messages annulés et ceux de rendez-vous passés ne sont pas envoyés tardivement.

Les échecs sont réessayés jusqu’à trois tentatives et restent visibles. **Envoyer les e-mails dus** déclenche l’envoi de vrais messages lorsque le fournisseur est configuré ; ce bouton n’est pas un simple test de connexion.

## Avant l’ouverture publique

Utiliser une base PostgreSQL et un stockage de photos persistants adaptés à l’hébergement. Le déploiement Render de démonstration et les données temporaires servent aux essais. Voir [README](../README.md) et [le guide d’hébergement](apercu-en-ligne.md). Aucune configuration externe, réception d’e-mail ni transaction réelle n’est réputée validée par les seuls tests simulés du projet.
