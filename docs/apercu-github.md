# Voir l'application directement depuis GitHub

**GitHub Codespaces** ouvre un environnement de développement dans votre navigateur. Vous pouvez y lancer l'application complète, avec la réservation, la boutique et l'administration, sans installer Node.js sur votre ordinateur.

1. Ouvrir [le projet sur la bonne branche](https://github.com/kJean-Jaures/Fashionafrobraids/tree/codex/fashion-afro-braids-preview).
2. Cliquer sur **Code → Codespaces → Create codespace on codex/fashion-afro-braids-preview**.
3. Attendre la préparation. La configuration `.devcontainer` installe Node.js 24 et Git, les dépendances du projet, puis crée la configuration locale privée.
4. Dans le terminal de Codespaces, lancer :

```bash
npm run dev
```

5. Attendre **Ready**, puis ouvrir l'onglet **Ports**. Sur la ligne **3000**, cliquer sur **Open in Browser**.

Le navigateur ouvre l'adresse HTTPS de ce Codespace. Conserver le port **privé** pour tester avec votre compte GitHub. Le bandeau « Démonstration » rappelle que les réservations sont des tests.

Pour ouvrir l'administration, ajouter `/admin` à cette adresse et utiliser le mot de passe créé dans `.env.local`, ligne `ADMIN_PASSWORD`. Garder ce fichier privé.

Cet aperçu utilise le quota **GitHub Codespaces** de votre compte ; vérifier la disponibilité du quota lors de la création. Arrêter le Codespace depuis GitHub lorsque vous avez terminé. Le site devient indisponible quand le Codespace s'arrête. Cela convient au développement et aux essais ; l'ouverture commerciale demande un hébergement permanent et une base persistante.

Les commandes du projet sont vérifiées dans l'environnement cloud. La création effective du Codespace et son adresse privée nécessitent le compte GitHub du propriétaire et restent à vérifier depuis celui-ci.

GitHub **Pages** héberge des sites statiques. Pour ce projet avec un serveur de réservation, utiliser **Codespaces** pour les essais, ou le [service Render](apercu-en-ligne.md) pour un lien d'hébergement.
