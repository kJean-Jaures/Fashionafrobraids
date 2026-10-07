# Utiliser l’espace salon Fashion Afro Braids

L’administration est le tableau de bord privé du salon. Elle permet de gérer les rendez-vous et le contenu du site avec des formulaires, sans modifier le code.

## Se connecter

Ouvrir l’aperçu du site et cliquer sur **Espace salon** dans le pied de page, ou ouvrir sa page `/admin`.

Pour l’aperçu local, le mot de passe est créé lors du démarrage dans le fichier privé `.env.local`, à la ligne `ADMIN_PASSWORD`. Ce fichier se trouve dans le dossier du projet, près de `package.json`. L’ouvrir avec un éditeur de texte et utiliser le mot de passe uniquement dans la page de connexion. Ne pas l’envoyer dans le chat, le publier ou le mettre dans Git.

L’espace utilise actuellement un accès administrateur commun par mot de passe. Ajouter une coiffeuse dans **Équipe** crée une ressource du planning ; cela ne crée pas un compte de connexion individuel.

## Comprendre les rubriques

| Rubrique | Utilisation |
| --- | --- |
| Rendez-vous | Consulter les clientes, dates, heures de fin, prestations, coiffeuses et acomptes. Filtrer, déplacer un rendez-vous confirmé ou annuler. |
| Préparer les réservations | Vérifier l’état des paiements, e-mails et rappels. Choisir le délai de rappel et les consignes de visite. |
| Prestations | Ajouter ou modifier une coiffure, ses photos, variantes, prix, durées, suppléments et acompte. Masquer une prestation temporairement. |
| Équipe | Ajouter les vraies coiffeuses, les prestations qu’elles réalisent et leurs horaires. |
| Horaires & absences | Modifier les heures d’ouverture ou bloquer une pause, un congé ou une fermeture. |
| Produits & stocks | Gérer les articles de la boutique, leurs photos, prix et quantités disponibles. |
| Commandes | Voir les commandes avec retrait au salon et mettre leur statut à jour. |
| Galerie | Ajouter, modifier ou masquer une photo. Identifier les photos d’inspiration. |
| Avis | Publier ou masquer des avis authentiques. |
| Messages | Consulter les demandes reçues depuis le formulaire de contact et les marquer comme lues. |
| Paramètres | Modifier les coordonnées, réseaux sociaux, informations légales et certains réglages de réservation. |

## Avant les premières réservations

1. Dans **Équipe**, remplacer la ressource générique « Équipe du salon » par les coiffeuses réelles. Une ressource active représente une place dans le planning : conserver la ressource générique en plus de deux coiffeuses créerait une troisième place. La désactiver si elle ne représente personne de plus.
2. Définir les prestations et disponibilités de chaque coiffeuse. Sans horaires personnalisés, elle hérite de ceux du salon. Sans sélection de prestations, elle est considérée disponible pour toutes les prestations.
3. Vérifier les horaires du salon : actuellement **08 h 30–20 h 00, sept jours sur sept**. Bloquer les absences connues.
4. Dans **Préparer les réservations**, choisir les confirmations, rappels et consignes. Le rappel est actuellement prévu **24 heures avant**, réglable de 1 à 168 heures.
5. Renseigner les stocks réels. Les produits avec un stock nul ne peuvent pas être commandés.
6. Compléter les coordonnées et informations légales dans **Paramètres**.

Une modification d’horaires ou d’équipe incompatible avec un rendez-vous existant est refusée. Il faut d’abord déplacer ou annuler le rendez-vous concerné.

## Paiements et confirmations

La connexion PayPal se prépare avec les comptes et variables sécurisées du serveur ; les clés privées ne sont pas saisies dans l’administration. Voir [le guide d’activation](activer-reservations.md).

Une réservation avec acompte devient **Confirmée** après vérification du paiement. Exemple pour une prestation de 80 € : 10 € encaissés à la réservation, puis 70 € à régler au salon. Un rendez-vous « Acompte en attente » ne signifie pas que le paiement est acquis.

L’acompte n’est pas remboursable si la cliente annule. Annuler depuis l’administration libère le créneau et arrête les messages futurs ; cela ne déclenche pas un remboursement PayPal. Si le salon annule ou si un paiement a été reçu sans rendez-vous confirmé, examiner la situation directement dans PayPal.

Les commandes de la boutique utilisent actuellement le paiement au retrait au salon. La connexion PayPal concerne les acomptes de réservation.

## E-mails et rappels

Cocher « Envoyer un e-mail de confirmation » ou « Envoyer un rappel » définit le comportement souhaité ; cela ne connecte pas le fournisseur d’e-mails.

Pour que les messages partent, le service d’envoi doit être configuré et l’expéditeur vérifié. Les rappels nécessitent également une tâche automatique. « Configuré » indique la présence des paramètres, pas la preuve de réception d’un message.

L’adresse **fashionafrobraidsoff@gmail.com**, fournie par le propriétaire, reçoit les réponses aux confirmations et rappels. La modifier dans **Paramètres → E-mail** change cette adresse de réponse. L’adresse d’expédition est distincte : Resend exige un domaine vérifié et ne permet pas d’expédier au nom de gmail.com. Une adresse comme `reservation@fashionafrobraids.fr` reste un exemple à vérifier avant utilisation ; la configuration d’envoi n’est pas encore active.

Dans la préparation, le **dernier passage observé** permet de vérifier que la tâche de rappel fonctionne réellement. Le bouton **Envoyer les e-mails dus** envoie les messages déjà en attente quand le fournisseur est connecté ; ce n’est pas un bouton d’envoi à une adresse de test arbitraire.

Pour un essai avant ouverture, utiliser uniquement une réservation de test avec une adresse dont le propriétaire a autorisé l’utilisation. Vérifier la réception de la confirmation et du rappel, puis l’arrêt des rappels après annulation. Un rendez-vous réservé après l’heure prévue du rappel ne reçoit pas un deuxième message immédiat.
