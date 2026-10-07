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

Aucune durée ne figure sur l’affiche. Les variantes qui correspondent au calendrier Good Hair Family utilisent désormais sa durée exacte ; les autres affichent « Durée à confirmer » et nécessitent un contact avec le salon avant réservation. Le supplément boho 2× et le supplément 3× sont exclusifs. Aucune longueur ni aucun tarif absent de l’affiche n’est ajouté aux styles identifiés comme vérifiés.

## Catalogue Good Hair Family fourni par le propriétaire

Sources publiques consultées le 7 octobre 2026 :

- https://www.goodhairfamily.fr/rendezvous-5
- https://www.goodhairfamily.fr/carte-des-services
- https://www.goodhairfamily.fr/galerie
- https://app.acuityscheduling.com/schedule.php?owner=37488085&ref=sched_block

Le composant de réservation Squarespace utilise Acuity, avec l’identifiant public `37488085`. Son script officiel construit la dernière URL ci-dessus. L’adresse `squarespace-example-fr.as.me` présente dans le HTML est un exemple et n’a pas été utilisée comme calendrier source.

**Les 100 prestations actives du calendrier ont été relevées**, avec leur identifiant public, intitulé, catégorie, durée en minutes, tarif et photographie lorsqu’elle existe. Le relevé réduit à ces informations publiques est dans `src/lib/reference-data/goodhair-appointments.json`. Aucun identifiant privé du compte Acuity n’est conservé. Les correspondances entre familles et variantes sont dans `src/lib/acuity-catalog.ts`. Les minutes sont reprises exactement : 55, 59, 63, 65, 69, etc., sans arrondi ni reconstruction d’une durée de plusieurs heures.

**72 images sont importées à l’identique** : les 56 visuels présents dans les prestations Acuity et les 16 images de la galerie Squarespace, hors logo de Good Hair Family. Les URL d’origine figurent dans les deux fichiers JSON de `src/lib/reference-data`. Les fichiers locaux sont `acuity-*.jpg/png` et `goodhair-gallery-*.png/jpeg`. Ils sont utilisés dans le catalogue, les variantes, la réservation et la galerie paginée. Après la sélection décrite ci-dessous, 63 photos restent affichées dans la galerie. L’accueil privilégie les visuels du site Fashion Afro Braids. Les signatures éventuelles sont conservées. Les fichiers de galerie identifiés Firefly, Freepik ou comme visuels promotionnels sont signalés comme illustrations ; leur présence sur le site source ne suffit pas à les présenter comme des réalisations du salon.

Dans le relevé initial, 44 prestations étaient sans photographie. Après retrait de trois variantes sans photo appartenant aux services supprimés, les 41 restantes reçoivent les inspirations Pinterest documentées ci-dessous. Les photos déjà présentes ne sont pas remplacées. Les anciennes photographies de démonstration du catalogue non rapprochées d’une prestation réelle sont masquées. Les variantes Micro et Boho absentes du calendrier conservent les visuels et tarifs de l’affiche, avec une durée à confirmer et un lien vers le salon. La galerie complète remplace l’ancien import partiel de quatre photographies.

Les tarifs déjà enregistrés par le salon, dont les prix de l’affiche, sont conservés. Les tarifs des nouvelles variantes provenant du calendrier sont identifiés comme à valider pour Fashion Afro Braids. Les réparations de locks facturées à l’unité et les prestations dont le tarif est inférieur à l’acompte de 10 € nécessitent un contact avec le salon avant réservation.

Une migration unique met à jour les durées du catalogue et ses visuels, ajoute les nouvelles variantes et photos, puis fixe les sept jours du planning à **08 h 30–20 h 00**, conformément à la dernière demande du propriétaire. Elle conserve les rendez-vous existants et leurs durées historiques, les tarifs enregistrés, stocks, acomptes, statuts et photos ajoutées par le salon. Les modifications administratives ultérieures ne sont pas réécrites au redémarrage. Le moteur de disponibilités propose uniquement des départs permettant de terminer avant 20 h ; une prestation de 65 minutes ne peut donc pas démarrer à 19 h avec une fermeture à 20 h.

Les coordonnées de Good Hair Family ne sont pas reprises. Fashion Afro Braids conserve son logo, ses coordonnées, son identité rose/blanc/beige et son acompte de 10 €. L’import ne synchronise pas les rendez-vous ni les disponibilités privées Acuity : celles-ci restent gérées par l’application Fashion Afro Braids.

## Accueil Fashion Afro Braids et sélection du catalogue

Le 7 octobre 2026, l’accueil de https://fashionafrobraids.fr a été consulté à nouveau. Neuf fichiers sont conservés à l’identique dans `fashion-original-*` : le visuel de présentation de la marque, les portraits et coiffures publiés, les images de soins et de l’univers du salon. Les URL exactes et les textes alternatifs de la source figurent dans `src/lib/reference-data/fashion-home-images.json`. L’avatar anonyme de la source n’a pas été retenu.

L’accueil reprend ces images, la palette rose/blanc/beige, des cadres arrondis et la citation publiée « Chaque cheveu raconte une histoire, notre art est de la sublimer. », signée Pauline Fashion. Les visuels sont présentés comme ceux du site existant ; cela ne certifie pas qu’ils représentent tous des réalisations ou des photographies du salon. Les horaires restent 08 h 30–20 h conformément à la demande du propriétaire.

Le propriétaire a demandé la suppression complète de Contours, Dégradé & barbe, Coupe à sec et Coupe des pointes. `src/lib/catalogue-selection.ts` identifie les quatre services, leurs six variantes Acuity et leurs visuels de galerie associés. Une migration unique supprime leurs entrées de catalogue et de galerie sur les anciennes bases. Le catalogue public, la réservation, les fiches et le sitemap ne les proposent plus. Les rendez-vous historiques conservent leur intitulé, prix, durée et lien de gestion. Le relevé source des 100 prestations reste intact pour la traçabilité ; 94 variantes de cette source sont conservées dans le catalogue.

## Photos Pinterest pour les variantes sans image

À la demande du propriétaire, les recherches publiques Pinterest ont porté sur les vanilles Jumbo et Small, les vanilles au carré, les tresses homme, le Silk Press, les soins et shampoings, les Finger Coils, les différents tissages, les locks au crochet, les départs de locks et les microlocks. Dix-huit images ont été sélectionnées après contrôle visuel de leur correspondance avec les prestations. Elles remplissent les 41 variantes restantes sans photo ; les variantes de longueur utilisent une inspiration proche du style, sans garantir une longueur identique à celle du modèle.

Les images sont téléchargées à l’identique depuis `i.pinimg.com`, sans retouche ni retrait de texte ou signature. Elles restent identifiées **« Photo d’inspiration · Pinterest »**, avec un lien vers l’épingle sur chaque fiche. Elles ne sont pas présentées comme des réalisations de Fashion Afro Braids. Les URL d’épingles et des fichiers d’origine, liens de source lorsqu’ils existent, titres, noms des profils Pinterest, recherches et correspondances se trouvent dans `src/lib/reference-data/pinterest-service-images.json`. La mention d’un profil Pinterest ne constitue pas une attribution d’auteur vérifiée ni une licence de réutilisation.

`src/lib/pinterest-service-photos.ts` remplit seulement les images absentes ou les placeholders. La migration `pinterest-photos-20261007` est unique, conserve les photos déjà présentes ou ajoutées par le salon, ainsi que les tarifs, durées, acomptes, stocks, statuts et rendez-vous. Les modifications administratives après cette importation ne sont pas réécrites au redémarrage. Ces fichiers sont locaux : le visiteur n’a pas besoin de Pinterest pour afficher les photos.
