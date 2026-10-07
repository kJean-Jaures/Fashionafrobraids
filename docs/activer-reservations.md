# Activer les réservations du salon

Dans `/admin`, ouvrir **Préparer les réservations**. Cet espace réunit les connexions, les prestations à vérifier, l’équipe et les consignes. « Configuré » signifie que les paramètres sont présents ; il faut encore vérifier le fonctionnement réel avec les fournisseurs.

Pour comprendre les rubriques et préparer l’équipe, consulter [le guide d’utilisation de l’administration](guide-administration.md).

## Préparer les connexions avant la mise en ligne

La préparation peut se faire avant l’ouverture publique : utiliser PayPal **Sandbox**, un expéditeur e-mail vérifié et une réservation de test. Aucun paiement réel n’est nécessaire pour vérifier le parcours Sandbox. Le compte marchand de test Sandbox et les comptes PayPal destinés aux vrais encaissements sont distincts ; un compte Business est nécessaire pour recevoir les paiements réels du salon.

Pour recevoir la notification automatique de PayPal, l’application de test doit disposer d’une adresse **HTTPS joignable depuis Internet**. Un lien HTTPS temporaire qui renvoie vers l’application locale peut servir aux essais. L’adresse locale de l’ordinateur ne peut pas être utilisée directement comme webhook. Ne pas utiliser le domaine encore relié à Squarespace comme s’il servait déjà cette nouvelle application.

Les confirmations peuvent être envoyées depuis l’application locale une fois Resend et l’expéditeur configurés. Pour les rappels, le serveur et le mécanisme d’envoi doivent être actifs au moment prévu ; un ordinateur fermé n’envoie pas de rappel. Pendant les essais, les e-mails dus peuvent être déclenchés depuis l’administration sur une base contenant uniquement des réservations de test autorisées. La tâche planifiée sera nécessaire pour un fonctionnement permanent.

Sur le PC du propriétaire, les variables sont ajoutées au fichier privé `.env.local`, puis le serveur est redémarré. Dans le cloud ou chez l’hébergeur, utiliser les paramètres sécurisés. Ne jamais transmettre les valeurs dans le chat ou Git.

État vérifié le **8 octobre 2026** dans l’environnement de développement : administration protégée et accessible après connexion ; confirmations et rappels activés avec un délai de 24 h ; PayPal, fournisseur d’e-mails et tâche de rappel encore non configurés. Aucun encaissement ni envoi réel n’a été validé. Les exigences de configuration sont déjà déclarées dans le brouillon cloud.

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

L’accès aux réglages DNS n’est pas encore confirmé par le propriétaire. Aucun enregistrement DNS ni routage du site actuel n’a été modifié.

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
