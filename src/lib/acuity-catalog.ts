import appointments from "./reference-data/goodhair-appointments.json";
import gallery from "./reference-data/goodhair-gallery.json";
import type { GalleryPhoto, Service, Variant } from "./catalog";
import { referencePhotos } from "./reference-photos";
import { retiredServiceIds, retiredReferenceIds, retiredGalleryIds } from "./catalogue-selection";

export const referenceAppointments = appointments;
export const missingPhoto = "/images/photo-a-ajouter.svg";
export const acuityPhotoLabel = "Visuel du catalogue de réservation du salon";
type Definition = { id: string; name: string; category: string; ids: number[]; sizes?: string[]; lengths?: string[]; choiceLabel?: string; hairNote?: string };
const noHair = "Sans ajout de mèches.";
const definitions: Definition[] = [
  { id: "knotless", name: "Knotless Braids", category: "Knotless", ids: [85575979,85576107,85576228,85576278,85576030,85576135,85576177,85576331,85576376,85576432,85576461,85576518], sizes: ["Medium","Medium","Small","Small","Medium","Medium","Small","Small","Jumbo","Jumbo","Jumbo","Jumbo"], lengths: ["Milieu du dos","Bas du dos","Milieu du dos","Bas du dos","Carré","Fesses","Carré","Fesses","Carré","Milieu du dos","Bas du dos","Fesses"] },
  { id: "knotless-bob", name: "Knotless Bob", category: "Knotless", ids: [85576030], sizes: ["Standard"], lengths: ["Carré épaule"] },
  { id: "vanilles", name: "Vanilles", category: "Twists", ids: [85576565,85576586,85576605,85577391,85577664,85577717,85577743,85577764,85577461,85577484,85577592,85577621], sizes: ["Medium","Medium","Medium","Medium","Jumbo","Jumbo","Jumbo","Jumbo","Small","Small","Small","Small"], lengths: ["Carré","Milieu du dos","Bas du dos","Fesses","Carré","Milieu du dos","Bas du dos","Fesses","Carré","Milieu du dos","Bas du dos","Fesses"] },
  { id: "fulani", name: "Fulani", category: "Fulani", ids: [85577936,85577946,85577976,85578000] },
  { id: "french-curls", name: "French Curls", category: "French Curl", ids: [85578330,85578357] },
  { id: "ponytail-braids", name: "Ponytail Braids", category: "Braids", ids: [85578046] },
  { id: "invisible-locks", name: "Invisible Locks", category: "Locks", ids: [85578520,85578570,85578607] },
  { id: "soft-locs", name: "Soft Locks", category: "Locks", ids: [85578660,85578705,85578738] },
  { id: "cornrows-extensions", name: "Nattes collées avec mèches", category: "Cornrows", ids: [85577824,85577850,85577894], sizes: ["2 nattes","4 à 6 nattes","14 nattes et plus"], lengths: ["Standard","Standard","Standard"], choiceLabel: "Nombre de nattes" },
  { id: "crochet", name: "Crochet Braids", category: "Extensions", ids: [85578148] },
  { id: "tissage-ouvert", name: "Tissage ouvert", category: "Tissages", ids: [85578166] },
  { id: "tissage-ferme", name: "Tissage fermé", category: "Tissages", ids: [85578199] },
  { id: "tissage-closure", name: "Tissage avec closure", category: "Tissages", ids: [85578180] },
  { id: "tissage-ligne", name: "Ligne de tissage", category: "Tissages", ids: [85578086] },
  { id: "tissage-retrait", name: "Retrait de tissage", category: "Tissages", ids: [85578129] },
  { id: "tissage-fulani", name: "Demi-tête + Fulani", category: "Tissages", ids: [85578233] },
  { id: "tissage-ponytail", name: "Demi-tête + Ponytail", category: "Tissages", ids: [85578276] },
  { id: "brushing", name: "Shampoing, soin & brushing", category: "Soins", ids: [85580734,85580772,85580820], lengths: ["Cheveux courts","Cheveux mi-longs","Cheveux longs"], hairNote: noHair },
  { id: "shampoing-sechage", name: "Shampoing & séchage", category: "Soins", ids: [85580870], hairNote: noHair },
  { id: "shampoing-brushing", name: "Shampoing & brushing", category: "Soins", ids: [85580944,85580991,85581038], lengths: ["Cheveux courts","Cheveux mi-longs","Cheveux longs"], hairNote: noHair },
  { id: "lissage", name: "Lissage · Silk Press", category: "Lissage & coloration", ids: [85581123,85581157,85581230], lengths: ["Cheveux courts","Cheveux mi-longs","Cheveux longs"], hairNote: noHair },
  { id: "coupe-pointes", name: "Coupe des pointes", category: "Coupes", ids: [85581262,85580607], sizes: ["Avec brushing","Cheveux bouclés"], lengths: ["Standard","Standard"], choiceLabel: "Prestation", hairNote: noHair },
  { id: "curly-definition", name: "Shampoing & définition des boucles", category: "Curly & Nappy", ids: [85579856], hairNote: noHair },
  { id: "curly-finger", name: "Définition des boucles · Finger Coil / Finger Brush", category: "Curly & Nappy", ids: [85579921,85579997,85580009], lengths: ["Cheveux courts","Cheveux mi-longs","Cheveux longs"], hairNote: noHair },
  { id: "curly-soin", name: "Soin profond, hydratation & mise en forme", category: "Curly & Nappy", ids: [85580127,85580176,85580371], lengths: ["Cheveux courts","Cheveux mi-longs","Cheveux longs"], hairNote: noHair },
  { id: "permanente-afro", name: "Permanente Afro", category: "Curly & Nappy", ids: [85580560], hairNote: noHair },
  { id: "coupe-a-sec", name: "Coupe à sec", category: "Coupes", ids: [85580584], hairNote: noHair },
  { id: "chignon", name: "Chignon", category: "Événementiel", ids: [85581315], hairNote: noHair },
  { id: "vanilles-naturelles", name: "Vanilles sans mèches", category: "Twists", ids: [85578892], hairNote: noHair },
  { id: "tresses-naturelles", name: "Tresses sans mèches", category: "Braids", ids: [85578929], hairNote: noHair },
  { id: "cornrows", name: "Nattes collées simples sans mèches", category: "Cornrows", ids: [85578963], hairNote: noHair },
  { id: "barber-contours", name: "Contours", category: "Hommes", ids: [85579014,85579094], sizes: ["Sans barbe","Avec barbe"], lengths: ["Standard","Standard"], choiceLabel: "Finition", hairNote: noHair },
  { id: "coupe-enfant", name: "Coupe enfant · 3 à 13 ans", category: "Enfants", ids: [85579122], hairNote: noHair },
  { id: "coupe-homme", name: "Dégradé & barbe", category: "Hommes", ids: [85579143], hairNote: noHair },
  { id: "cornrows-homme", name: "Nattes collées homme", category: "Hommes", ids: [85579164,85579193], sizes: ["Sans rajout","Avec rajout"], lengths: ["Standard","Standard"], choiceLabel: "Style" },
  { id: "motifs-homme", name: "Nattes collées homme & motifs", category: "Hommes", ids: [85579216] },
  { id: "fulani-homme", name: "Fulani homme", category: "Hommes", ids: [85579230,85579306], sizes: ["Sans rajout","Avec rajout"], lengths: ["Standard","Standard"], choiceLabel: "Style" },
  { id: "braids-homme", name: "Tresses homme", category: "Hommes", ids: [85579257,85579326], sizes: ["Sans rajout","Avec rajout"], lengths: ["Standard","Standard"], choiceLabel: "Style" },
  { id: "twists-homme", name: "Vanilles homme", category: "Hommes", ids: [85579289,85579356], sizes: ["Sans rajout","Avec rajout"], lengths: ["Standard","Standard"], choiceLabel: "Style" },
  { id: "barrel-twist", name: "Barrel Twist", category: "Hommes", ids: [85579390] },
  { id: "locks-reparation", name: "Réparation & doublage de locks", category: "Locks", ids: [85579480,85579501], sizes: ["Réparation · prix par lock","Doublage · prix par lock"], lengths: ["Standard","Standard"], choiceLabel: "Intervention", hairNote: noHair },
  { id: "locks-coiffage", name: "Coiffage des locks après reprise", category: "Locks", ids: [85579591], hairNote: noHair },
  { id: "locks-reprise-twist", name: "Reprise racines en twist", category: "Locks", ids: [85579650], hairNote: noHair },
  { id: "locks-reprise-longueurs", name: "Reprise des longueurs au crochet aiguille", category: "Locks", ids: [85579665], hairNote: noHair },
  { id: "locks-reprise-crochet", name: "Reprise racines au crochet", category: "Locks", ids: [85579680], hairNote: noHair },
  { id: "locks-reprise-twist-crochet", name: "Reprise racines en twist & longueurs au crochet", category: "Locks", ids: [85579696], hairNote: noHair },
  { id: "microlocks-racines", name: "Reprise racines microlocks", category: "Locks", ids: [85579710], hairNote: noHair },
  { id: "locks-depart-twist", name: "Départ locks en twist ou coils", category: "Locks", ids: [85579723], hairNote: noHair },
  { id: "locks-reprise-complete", name: "Reprise racines & longueurs au crochet", category: "Locks", ids: [85579746], hairNote: noHair },
  { id: "microlocks-reprise-complete", name: "Reprise racines & longueurs microlocks", category: "Locks", ids: [85579767], hairNote: noHair },
  { id: "locks-depart-crochet", name: "Départ instantané au crochet", category: "Locks", ids: [85579786], hairNote: noHair },
  { id: "microlocks", name: "Microlocks", category: "Locks", ids: [85579805], hairNote: noHair },
];
const knotlessVariantIds: Record<number, string> = { 85575979: "1-1", 85576107: "1-2", 85576228: "2-1", 85576278: "2-2" };
export function withAcuityCatalogue(existing: Service[], provisionalIds: string[]): Service[] {
  const output = new Map(existing.filter(service => !retiredServiceIds.includes(service.id)).map(service => [service.id, service]));
  const mapped = new Set(definitions.map(definition => definition.id));
  for (const service of existing) {
    if (mapped.has(service.id)) continue;
    if (service.pricingVerified) output.set(service.id, { ...service, bookingEnabled: false, variants: service.variants.map(variant => ({ ...variant, bookable: false })) });
    else if (provisionalIds.includes(service.id) && /\/(hero|gallery)\.webp/.test(service.image)) output.set(service.id, { ...service, active: false });
  }
  for (const definition of definitions) {
    if (retiredServiceIds.includes(definition.id)) continue;
    const current = output.get(definition.id);
    const variants: Variant[] = definition.ids.map((sourceId, index) => {
      const source = appointments.find(appointment => appointment.id === sourceId)!;
      const id = definition.id === "knotless" ? knotlessVariantIds[sourceId] || `ref-${sourceId}` : index === 0 && current?.variants[0] ? current.variants[0].id : `ref-${sourceId}`;
      const previous = current?.variants.find(variant => variant.id === id);
      const price = previous?.price ?? source.price;
      return { id, size: definition.sizes?.[index] || "Standard", length: definition.lengths?.[index] || (definition.ids.length > 1 ? source.name : "Standard"),
        price, duration: source.duration, image: source.image, imageSource: source.sourceImage ? acuityPhotoLabel : "Photo à ajouter",
        referenceId: String(source.id), estimatedDuration: false, pricingVerified: previous?.pricingVerified ?? Boolean(previous && current?.pricingVerified),
        bookable: price >= 1000 && definition.id !== "locks-reparation",
      };
    });
    // Les variantes Micro de l’affiche n’existent pas sur la source : garder leur
    // tarif sans leur attribuer les durées ou photos d’une autre taille.
    if (definition.id === "knotless" && current) variants.push(...current.variants.filter(variant => !variants.some(item => item.id === variant.id)).map(variant => ({ ...variant, bookable: false, estimatedDuration: true })));
    const image = variants.find(variant => variant.image !== missingPhoto)?.image || missingPhoto;
    output.set(definition.id, { ...current, id: definition.id, name: definition.name, category: definition.category,
      description: current?.description || appointments.find(appointment => appointment.id === definition.ids[0])!.name,
      image, imageSource: image === missingPhoto ? "Photo à ajouter" : acuityPhotoLabel,
      active: current?.active ?? true, quoteOnly: false, hairIncluded: current?.hairIncluded ?? false, hairNote: definition.hairNote,
      choiceLabel: definition.choiceLabel, estimatedDuration: variants.some(variant => variant.estimatedDuration),
      pricingVerified: current?.pricingVerified ?? false, referenceCatalog: true, bookingEnabled: variants.some(variant => variant.bookable),
      variants, options: current?.options || [], deposit: current?.deposit || { type: "fixed", value: 1000 },
    });
  }
  return [...output.values()];
}
export const acuityGallery: GalleryPhoto[] = appointments.filter(appointment => appointment.sourceImage && !retiredReferenceIds.includes(appointment.id)).map(appointment => {
  const definition = definitions.find(definition => definition.ids.includes(appointment.id))!;
  const title = `${definition.name} · ${appointment.name}`;
  return { id: `acuity-${appointment.id}`, title: title.length > 120 ? appointment.name : title, category: definition.category, image: appointment.image, position: "center", active: true, illustrative: false };
});
export const completeReferenceGallery: GalleryPhoto[] = [...acuityGallery, ...gallery.map((photo, index) => ({
  id: photo.id, title: referencePhotos.find(reference => reference.source === photo.sourceImage)?.title || photo.title.slice(0, 120), category: index >= 3 ? "Galerie" : "Présentation", image: photo.image, position: "center", active: true,
  illustrative: /Firefly|freepik|Plan\+de\+travail|Prestation\+coiffure/.test(photo.sourceImage),
}))].filter(photo => !retiredGalleryIds.includes(photo.id));
