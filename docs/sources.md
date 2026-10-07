# Provenance des contenus

Consultation du site public https://fashionafrobraids.fr le 7 octobre 2026.

Les avis de Léa Kim, Myriam, Omar Badji et Pierre Yole sont repris de la page d’accueil. Aucun score numérique n’était affiché, donc aucune note numérique n’est ajoutée.

Les visuels suivants sont repris du site actuel et optimisés en WebP, sans retrait de leurs marques ou signatures. Ils ne sont pas présentés comme une preuve de réalisation au salon. Les modèles exacts de produits restent à valider.

- `bonnet-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/ec3c0efa-9898-46f6-8c9c-2412fd195555/IMG_5946.jpeg
- `wig-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/08e8deb6-b223-4955-a466-478dbd812630/IMG_4219.jpeg
- `extensions-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/7d4bc404-58b8-4c55-9ac4-b05cb211e861/IMG_4211.jpeg
- `beads-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/8cac5cd8-7469-4cf9-8ded-fc7cdd9acf82/Tracy+165+PCS+Hair+Jewelry+for+Locs+Silver+Gold+Hair+Cuffs+for+Braids+Dreadlocks+Accessories+Hair+Coils+Rings+Adornment+Imitation+Wood+Hair+Tube+Beads+Decorations%2C+Gold%2CSilver%2C+165+Piece+Set.jpg
- `salon-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/5f659c88-cc01-478e-b4d6-aebdfbe07c16/IMG_5653.png
- `texture-current.webp` : https://images.squarespace-cdn.com/content/v1/69b13c8b3b59132328b848c1/2049d901-cfc5-4cf7-8814-b84e6721b2e9/t%C3%A9l%C3%A9chargement+%283%29.jpg

`hero.webp` et `gallery.webp` sont des portraits d’inspiration générés pour cette première version. Les illustrations SVG initiales sont conservées comme choix de remplacement.

L’adresse, le téléphone, les catégories de prestations et les quatre prix produits ont été vérifiés sur la page d’accueil. Les horaires divergent entre le bandeau (08 h 30) et le contact (08 h 00) du site existant : le nouveau planning utilise 08 h 30–20 h, comme demandé. Le catalogue complémentaire suit la grille initiale transmise dans la conversation et reste indicatif.


## Affiche et logo fournis par le salon

Le fichier `Grey Black Clean Minimalist Price List Fashion Brand Flyer A4 Document .pdf` (trois pages) et la photo jointe du logo ont été fournis par le propriétaire. Le logo original est conservé dans `public/images/logo-fashion-afro-braids.jpg`. Une version PNG avec transparence a été créée à la demande du propriétaire pour supprimer le fond blanc extérieur. Le cercle noir du logo est conservé. Le site utilise `logo-fashion-afro-braids.png` et les icônes SVG incorporent ce PNG sans rectangle de fond. Le fichier JPG original reste conservé comme source.

Les 24 fichiers `poster-*.jpeg` sont les photographies extraites de cette affiche, sans retouche ni retrait de signatures. Elles sont présentées comme des visuels de l’affiche, sans leur attribuer une provenance photographique non vérifiée.

Les tarifs ont été relevés sur les pages rendues : le PDF contient aussi des couches textuelles masquées qui ne correspondent pas toutes à la page visible. Seul le contenu visible a été retenu. Les 17 familles, leurs variantes et les quatre suppléments sont enregistrés dans `src/lib/poster-catalog.ts`, puis importés en base lors d’une migration unique. L’intitulé « Fulani TRIAL Knotless » de l’affiche est normalisé en « Fulani Tribal Knotless ». Les longueurs indiquées pour « Fulani motifs Bob » sont conservées telles qu’affichées.

Aucune durée ne figure sur l’affiche : les durées restent estimées et administrables. Le supplément boho 2× et le supplément 3× sont exclusifs. Aucune longueur ni aucun tarif absent de l’affiche n’est ajouté aux styles identifiés comme vérifiés.
