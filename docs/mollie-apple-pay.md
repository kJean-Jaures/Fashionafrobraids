# Connecter Mollie et Apple Pay aux acomptes

Le compte Mollie du salon a été créé et son activation est en cours, selon le propriétaire le 9 octobre 2026. Le code prépare l’acompte de **10 €**, les paiements carte/Apple Pay sur la page hébergée Mollie, les confirmations et les rappels. Aucun encaissement réel ni Apple Pay sur appareil réel n’a été vérifié dans l’environnement de développement.

## Préparer la connexion

1. Terminer l’activation de Fashion Afro Braids chez Mollie et du compte bancaire destiné aux versements. Dans les moyens de paiement du profil du nouveau site, activer **cartes bancaires et Apple Pay**. La cliente n’a pas besoin d’un compte Mollie.
2. Dans `/admin`, ouvrir **Paramètres → Paiement de l’acompte**, sélectionner **Carte et Apple Pay · Mollie**, puis enregistrer. Ce choix en base prend priorité sur `PAYMENT_PROVIDER` ; une ancienne sélection « Virement bancaire » doit être changée ici. Les anciens rendez-vous conservent leur mode.
3. Dans les paramètres privés du serveur (ou `.env.local` pour une installation locale), ajouter la clé API **de test** dans `MOLLIE_API_KEY`. Définir `MOLLIE_MODE=test`, `PAYMENT_PROVIDER=mollie` et `PUBLIC_SITE_URL`, puis redémarrer. Ne jamais envoyer ni versionner les clés. Avec une clé API, le profil et le mode sont fixés par la clé ; le serveur contrôle aussi le mode de la réponse.
4. `PUBLIC_SITE_URL` doit être une adresse **HTTPS publique qui joint cette application**. Le webhook `/api/payments/mollie/webhook` doit être accessible à Mollie ; le retour navigateur est `/api/payments/mollie/return`. Une adresse localhost ne convient pas au webhook. Le domaine encore relié à Squarespace ne joint pas le nouveau site. Utiliser un hébergement de test HTTPS avant de déplacer le domaine. Aucun déploiement public ni changement DNS n’a été réalisé par cette intégration.

## Tester puis ouvrir les encaissements

- En mode test, utiliser les états simulés du checkout Mollie : payé, refusé, annulé et expiré. Une simple autorisation ou un retour navigateur ne confirme pas le rendez-vous.
- Vérifier la retenue du créneau, son rétablissement après refus et la confirmation unique après paiement. Le montant est recalculé côté serveur, indépendant des données envoyées par le navigateur.
- Vérifier la réception de l’e-mail de confirmation, puis le rappel via la tâche planifiée authentifiée existante. Aucun e-mail d’instructions ou de paiement en attente n’est envoyé.
- Les simulations ne prouvent ni un encaissement réel ni Apple Pay sur un véritable appareil. Après activation du compte et validation du parcours, utiliser la clé réelle avec `MOLLIE_MODE=live`, redémarrer et réaliser une vérification réelle autorisée sur appareil compatible avant l’ouverture. Le mode réel est bloqué si `DEMO_MODE=true`.

Apple Pay dépend du profil Mollie, de l’appareil, du navigateur et de la carte de la cliente ; la carte bancaire reste proposée. Les fonds passent par Mollie puis sont versés sur le compte bancaire enregistré, après ses frais : consulter [les tarifs](https://www.mollie.com/fr/pricing). Wero et Pay by Bank ne sont pas ajoutés à ce parcours ; ils nécessitent une disponibilité et une activation distinctes.

## Fonctionnement et incidents

Le serveur crée un paiement unique avec une clé d’idempotence propre au rendez-vous et demande `creditcard` et `applepay`. Hosted Checkout collecte les données de carte/Apple Pay : elles ne passent jamais par notre serveur. Le lien de checkout doit être HTTPS sur `www.mollie.com/checkout/`.

Le webhook officiel envoie l’identifiant du paiement en `application/x-www-form-urlencoded`. Ce signal public déclenche une lecture de l’API authentifiée ; aucun statut fourni par le client ou le callback ne prouve le paiement. Le serveur compare identifiant, référence, montant EUR exact, profil et mode à l’instantané conservé. Seul `paid` confirme. Les paiements remboursés ou contestés avant cette première validation sont refusés pour examen du salon. Le retour navigateur et le bouton privé **Vérifier le paiement** utilisent la même vérification.

Les validations concurrentes créent un seul événement de paiement, une confirmation et un rappel. Le refus, l’annulation ou l’expiration vérifiés libèrent le créneau. Une panne de création libère aussi la retenue locale. Après erreur de vérification, le site ne confirme rien ; la cliente peut revérifier sans demander un deuxième paiement.

Lorsqu’un paiement arrive après libération, les horaires, l’équipe, les blocages et les collisions sont revérifiés. Si le créneau n’est plus disponible ou si le rendez-vous a été annulé, l’acompte est enregistré avec **Créneau à vérifier**, sans faux rendez-vous ni confirmation. Le salon peut **Choisir un autre créneau**, en conservant le même acompte. Aucune annulation ne déclenche de remboursement automatique. L’acompte est déduit du total et n’est pas remboursable si la cliente annule ; un problème imputable au salon reste à traiter avec la cliente.

Dans Rendez-vous, la référence Mollie et le mode test/réel sont visibles. La confirmation peut être mise en attente si l’e-mail n’est pas configuré ou si l’envoi échoue ; consulter le statut des notifications. Les rappels nécessitent toujours un serveur actif et la tâche planifiée.

## Documentation consultée et limites des vérifications

- [Création de paiement Mollie](https://docs.mollie.com/reference/create-payment).
- [Types de création officiels du SDK](https://github.com/mollie/mollie-api-node/blob/master/src/binders/payments/parameters.ts).
- [Modèle de paiement officiel](https://github.com/mollie/mollie-api-node/blob/master/src/data/payments/data.ts).
- [Apple Pay chez Mollie](https://www.mollie.com/fr/payments/apple-pay).

Le code et les types du SDK officiel, ainsi que les pages publiques Mollie, ont été lus. L’accès direct à `docs.mollie.com` et `api.mollie.com` reste refusé par le proxy de l’environnement actuel malgré leur ajout au brouillon réseau, à publier. Les tests de ce développement utilisent des réponses simulées ; aucun identifiant réel n’est disponible dans le cloud. La clé et la configuration du PC du propriétaire restent privées et distinctes.
