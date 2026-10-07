import sources from "./reference-data/pinterest-service-images.json";
import type { Service } from "./catalog";

export const pinterestPhotoLabel = "Photo d’inspiration · Pinterest";
export const pinterestPhotos = sources;
export function withPinterestPhotos(service: Service): Service {
  let changed = false;
  const variants = service.variants.map(variant => {
    // Conserver les photos du calendrier, de l’affiche et celles ajoutées par le salon.
    if (variant.image && variant.image !== "/images/photo-a-ajouter.svg") return variant;
    const photo = sources.find(photo => photo.targets.some(target => target.serviceId === service.id && (!target.size || target.size === variant.size) && (!target.length || target.length === variant.length)));
    if (!photo) return variant;
    changed = true;
    return { ...variant, image: photo.image, imageSource: pinterestPhotoLabel, imageLink: photo.pin };
  });
  if (!changed) return service;
  const photo = variants.find(variant => variant.image && variant.image !== "/images/photo-a-ajouter.svg");
  return { ...service, variants, ...(service.image === "/images/photo-a-ajouter.svg" && photo ? { image: photo.image!, imageSource: photo.imageSource, imageLink: photo.imageLink } : {}) };
}
