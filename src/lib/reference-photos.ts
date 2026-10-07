import type { GalleryPhoto, Service } from "./catalog";

// Photos publiées dans la galerie du site fourni par le propriétaire.
// Ne pas associer les portraits génériques aux prestations sans correspondance.
export const referencePhotoLabel = "Photo du catalogue fourni par le salon";
export const referencePhotos = [
  { id: "reference-spiral-cornrows", title: "Spiral cornrows", category: "Cornrows", file: "reference-spiral-cornrows.jpeg", serviceId: "spiral-cornrows", source: "https://images.squarespace-cdn.com/content/v1/691370c1269cbc666cd6c47c/764e4a13-0fb9-493c-b58e-d1ae8a2345b9/WhatsApp+Image+2025-11-12+at+12.35.11.jpeg" },
  { id: "reference-twists-homme", title: "Vanilles homme", category: "Hommes", file: "reference-twists-homme.jpeg", serviceId: "twists-homme", source: "https://images.squarespace-cdn.com/content/v1/691370c1269cbc666cd6c47c/7fe7b9a1-c652-43c7-b0f0-d276469412e2/WhatsApp+Image+2025-11-12+at+12.33.15.jpeg" },
  { id: "reference-torsades-motif", title: "Torsades avec motif", category: "Twists", file: "reference-torsades-motif.jpeg", source: "https://images.squarespace-cdn.com/content/v1/691370c1269cbc666cd6c47c/479b9038-8850-41e1-9612-a78e4f9f6bc9/WhatsApp+Image+2025-11-12+at+12.27.19.jpeg" },
  { id: "reference-coupe-homme", title: "Coupe homme", category: "Hommes", file: "reference-coupe-homme.jpeg", serviceId: "coupe-homme", source: "https://images.squarespace-cdn.com/content/v1/691370c1269cbc666cd6c47c/21cd6f8f-d399-42e7-8dc5-9222e071ef04/WhatsApp+Image+2025-11-12+at+12.40.45.jpeg" },
];
export const referenceGallery: GalleryPhoto[] = referencePhotos.map(photo => ({
  id: photo.id, title: photo.title, category: photo.category, image: `/images/${photo.file}`, position: "center", active: true, illustrative: false,
}));
export function withReferencePhoto(service: Service): Service {
  const photo = referencePhotos.find(photo => photo.serviceId === service.id);
  if (!photo) return service;
  const image = `/images/${photo.file}`;
  return { ...service, image, imageSource: referencePhotoLabel,
    variants: service.variants.map(variant => ({ ...variant, image, imageSource: referencePhotoLabel })),
  };
}
