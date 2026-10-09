# Tester Mollie depuis votre PC Windows

Le propriétaire a confirmé le 9 octobre 2026 que la clé Mollie et l’adresse publique ne sont pas encore configurées sur son PC. Cette procédure prépare un paiement **de test**, sans prélèvement réel, avant l’hébergement définitif.

Le tunnel Cloudflare rend temporairement le site de votre PC accessible depuis Internet. Il permet à Mollie de joindre son webhook et d’ouvrir la page de retour. Il ne déplace pas `fashionafrobraids.fr`, ne remplace pas l’hébergement permanent et fonctionne uniquement tant que le PC, le serveur du site et le tunnel restent actifs. Fermer le tunnel à la fin des essais.

## 1. Mettre à jour le projet et ajouter la clé de test

Arrêter l’ancien serveur avec **Ctrl+C**. [Télécharger la dernière version](https://github.com/kJean-Jaures/Fashionafrobraids/archive/refs/heads/codex/fashion-afro-braids-preview.zip), extraire dans un nouveau dossier, puis y recopier **`.env.local` et `data`** depuis l’ancien dossier. Garder une sauvegarde. Cette version permet au domaine exact du tunnel de charger les éléments du site en développement.

Dans le [tableau de bord Mollie](https://my.mollie.com), chercher **Développeurs → Clés API**, sur le profil du salon. Copier la **clé de test**, qui commence par `test_`, localement. Si elle n’est pas encore disponible, terminer les informations demandées par Mollie ; ne pas remplacer la clé de test par une clé réelle.

Ouvrir le fichier privé `.env.local`. Conserver les lignes du mot de passe administrateur et de Resend. Ajouter ces lignes, ou modifier celles qui existent déjà :

```dotenv
MOLLIE_API_KEY=
MOLLIE_MODE=test
PAYMENT_PROVIDER=mollie
```

Coller la clé de test **juste après `MOLLIE_API_KEY=`**, sur la même ligne, puis enregistrer le fichier. Ne jamais envoyer la clé ni une capture de ce fichier dans le chat et ne pas publier ce fichier sur GitHub.

Lancer **`Demarrer-le-site.cmd`**, laisser sa fenêtre ouverte et relever le port affiché dans **« Le site est prêt »**. Dans l’administration, sélectionner **Carte et Apple Pay · Mollie** dans **Paramètres → Paiement de l’acompte**, puis enregistrer. Une ancienne sélection en base garde priorité sur `PAYMENT_PROVIDER`.

## 2. Créer un lien HTTPS temporaire

Ouvrir **Terminal / PowerShell** depuis le menu Windows. Installer l’outil Cloudflare depuis le catalogue Windows :

```powershell
winget install --id Cloudflare.cloudflared --exact
```

Suivre les demandes de l’installateur. Fermer puis rouvrir ce terminal après l’installation pour actualiser le chemin des commandes.

Dans cette seconde fenêtre, lancer :

```powershell
cloudflared tunnel --url http://127.0.0.1:3000 --protocol http2
```

**Si le site utilise un autre port, remplacer `3000` par le port affiché par le serveur.** Garder cette fenêtre ouverte. L’outil affiche une adresse commençant par `https://` et se terminant par `.trycloudflare.com`. Copier uniquement cette adresse, sans les bordures du cadre affiché.

Cette méthode utilise un Quick Tunnel d’essai, sans transférer le domaine à Cloudflare ni créer un tunnel de production. La disponibilité du service reste à vérifier depuis le PC ; aucune connexion publique réelle n’a été lancée dans l’environnement Codex pour cette procédure.

## 3. Relier cette adresse au site

Dans `.env.local`, ajouter ou modifier la ligne :

```dotenv
PUBLIC_SITE_URL=
```

Coller **l’adresse HTTPS réellement affichée par Cloudflare juste après le signe `=`**, puis enregistrer. Ne pas utiliser l’adresse Squarespace actuelle : elle ne joint pas ce nouveau site.

Arrêter **uniquement la fenêtre du serveur du site** avec Ctrl+C, puis relancer le site sur **le même port**. Garder le terminal Cloudflare ouvert. Le fichier `Demarrer-le-site.cmd` utilise le port 3000 par défaut ; pour un autre port, ouvrir un terminal dans le dossier du projet et utiliser `npm run local -- --port=3001` en remplaçant `3001` par le port du tunnel.

Ouvrir ensuite **l’adresse HTTPS du tunnel dans le navigateur** et se reconnecter à `/admin` si nécessaire. La connexion de l’administration et les rendez-vous mémorisés dans le navigateur sont propres à chaque adresse ; la base du salon reste la même.

Vérifier **Paramètres → Connexions & confirmations** : Mollie doit afficher **Configuration présente** et **Mode test**. Cela vérifie la présence des réglages ; le premier paiement doit encore valider la clé auprès de Mollie et la communication réelle.

## 4. Effectuer une nouvelle réservation de test

Créer un nouveau rendez-vous depuis le lien HTTPS, puis cliquer sur **Payer l’acompte · 10 €**. La page hébergée Mollie doit s’ouvrir. Utiliser le scénario de paiement de test proposé par Mollie, sans paiement réel. Les anciens rendez-vous créés en virement gardent leur QR code.

Vérifier que le retour affiche le rendez-vous confirmé et que l’e-mail arrive une seule fois. Vérifier aussi un essai refusé ou annulé. La confirmation exige toujours un statut `paid` relu auprès de l’API Mollie ; revenir sur le site ou cliquer sur un bouton ne prouve pas un paiement.

Les tests de clé API ne prouvent pas Apple Pay sur un appareil réel. Apple Pay nécessite l’activation chez Mollie, un appareil compatible et une vérification ultérieure après activation du compte. Le lanceur local garde les encaissements réels désactivés.

Quand le tunnel est arrêté puis relancé, son adresse peut changer. Mettre à jour `PUBLIC_SITE_URL`, redémarrer le serveur, puis utiliser une nouvelle réservation de test. Une ancienne session de paiement conserve sa précédente adresse de retour.

En cas d’erreur, relever le message affiché par le site ou les dernières lignes des terminaux en masquant les secrets. Ne pas effacer `.env.local` ou `data`. Le tunnel n’assure pas les rappels quand le PC est éteint : l’exploitation du salon demandera un hébergement permanent et la tâche planifiée existante.

## Références

- [Cloudflare : Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/), lien fourni par le README officiel de cloudflared.
- [Outil officiel cloudflared](https://github.com/cloudflare/cloudflared).
- [Connexion Mollie et vérification des paiements](mollie-apple-pay.md).

Le README et le code de création des Quick Tunnels officiels ont été consultés avec TLS vérifié. La compatibilité du serveur avec le domaine HTTPS configuré est vérifiée séparément. L’installation Windows, l’adresse publique effective, le premier paiement distant et la réception de son e-mail restent à effectuer sur le PC du salon.
