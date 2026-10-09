# Activer les réservations du salon

Dans `/admin`, ouvrir **Préparer les réservations**. Cet espace réunit les connexions, les prestations à vérifier, l’équipe et les consignes. « Configuré » signifie que les paramètres sont présents ; il faut encore vérifier le fonctionnement réel avec les fournisseurs.

Pour comprendre les rubriques et préparer l’équipe, consulter [le guide d’utilisation de l’administration](guide-administration.md).

## Virement directement sur le compte du salon

Le choix final du **9 octobre 2026** est le virement direct sur le compte à La Banque Postale, avec vérification humaine de la réception. Le site ne consulte pas la banque. Le compte SumUp créé auparavant et ses clés ne sont pas nécessaires à ce parcours.

1. Ouvrir **Administration → Paramètres → Virement direct sur votre compte** (également disponible dans **Préparer les réservations**).
2. Sélectionner **Virement bancaire · vérification par le salon**. Renseigner le bénéficiaire tel qu’il figure sur le compte, l’IBAN, le BIC facultatif et le délai de paiement. Le délai initial est **24 heures**, réglable de 1 à 72 h, limité au début du rendez-vous. Enregistrer. Le choix admin prend priorité sur une ancienne variable serveur SumUp.
3. Sans bénéficiaire et IBAN valide, le bouton de réservation avec acompte reste désactivé. L’IBAN est normalisé et contrôlé, mais le propriétaire doit vérifier lui-même le compte destinataire et les frais éventuels de sa banque. Ne pas envoyer les coordonnées dans le chat. Elles restent dans la base privée et les réservations concernées.
4. La cliente enregistre sa demande, puis consulte le **QR code de virement**, les coordonnées, le montant **10 €**, la référence et l’échéance sur sa page privée. Une application bancaire compatible peut scanner le QR ou importer son image après **Enregistrer le QR code** ; sinon, les coordonnées restent utilisables. Elle vérifie et valide le virement dans sa banque. Le scan ou le téléchargement ne confirme jamais le paiement. **Aucun e-mail d’instructions ou de paiement en attente n’est envoyé.** Elle doit conserver ce lien. Le solde affiché est le prix total moins les 10 €.
5. Après avoir constaté la réception complète sur son compte, le salon ouvre **Rendez-vous → Virements à vérifier**, clique **Acompte reçu**, coche son attestation, ajoute éventuellement la référence bancaire, puis clique **Valider et confirmer**.
6. Le serveur revérifie le créneau, confirme le rendez-vous, transmet la confirmation au service e-mail et prépare le rappel. La date de validation et la référence bancaire sont conservées. La réception de l’e-mail doit être vérifiée dans la boîte cliente ; en cas d’échec, contrôler Resend et utiliser **Envoyer les e-mails dus** après correction.
7. À expiration, le planning libère le créneau sans attendre un cron. Si un virement tardif est reçu et que le créneau est encore libre, le salon peut confirmer. Si le créneau est occupé, l’acompte est enregistré pour examen, sans confirmation. **Choisir un autre créneau** permet de déplacer et confirmer ce rendez-vous avec le même acompte, sans demander un second paiement. Un rendez-vous explicitement annulé nécessite une vérification avec la cliente.

Le test utilise uniquement des coordonnées de test et une validation simulée dans une base distincte. Ne pas effectuer de virement réel depuis l’aperçu de démonstration. La réception réelle, la confirmation e-mail et le rappel restent à essayer avec le salon avant ouverture commerciale. Le test d’envoi Resend a déjà été reçu sur le PC du propriétaire le **8 octobre 2026** ; cela ne prouve pas que le déclencheur permanent de rappel tourne.

## Connexions SumUp et PayPal facultatives

Les anciennes réservations et leurs callbacks restent compatibles. Pour choisir un paiement en ligne ultérieurement, sélectionner ce mode dans l’administration et fournir les identifiants privés du serveur. SumUp utilise `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_MODE=test`, puis `live` après validation, avec `PUBLIC_SITE_URL` HTTPS pointant vers ce nouveau site. Le serveur exige un profil Sandbox pour les essais et bloque le mode Live en démonstration. PayPal utilise ses identifiants marchands et son webhook existants. Aucune de ces connexions n’est requise pour le virement direct. Ne pas utiliser le domaine encore connecté à Squarespace comme s’il servait déjà la nouvelle application.

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
