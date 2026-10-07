import appointments from "./reference-data/goodhair-appointments.json";
import { posterServices } from "./poster-catalog";
import type { Service } from "./catalog";

// Estimations demandées par le salon : durée publiée d’une prestation proche,
// augmentée pour la finesse, la longueur et les finitions. Ce ne sont pas des
// durées publiées dans le calendrier de référence.
type Estimate = { serviceId: string; variantId: string; referenceId: number; extraMinutes: number };
const rows: [string, number, [string, number][]][] = [
  ["knotless", 85576228, [["3-1", 30], ["3-2", 45]]],
  ["boho-knotless", 85575979, [["medium-1", 30], ["medium-2", 45], ["small-1", 40], ["small-2", 55], ["micro-1", 55], ["micro-2", 70]]],
  ["criss-cross-knotless", 85575979, [["standard-1", 20], ["standard-2", 35]]],
  ["french-curl", 85578357, [["small", 15], ["micro", 40]]],
  ["french-curl-bob", 85578330, [["small-epaule", 10], ["micro-epaule", 25], ["small-long", 20], ["micro-long", 35]]],
  ["fulani-knotless", 85577946, [["standard-1", 10], ["standard-2", 20]]],
  ["fulani-motif-knotless", 85577946, [["standard-1", 25], ["standard-2", 35]]],
  ["fulani-motifs-bob", 85577936, [["standard-1", 15], ["standard-2", 25]]],
  ["fulani-motifs-twist", 85577946, [["standard-1", 25], ["standard-2", 35]]],
  ["fulani-spiral-twist", 85577946, [["standard-1", 30], ["standard-2", 40]]],
  ["fulani-tribal", 85577946, [["standard-1", 30], ["standard-2", 45]]],
  ["knotless-boho-bob", 85576030, [["standard", 25]]],
  ["lemonade-twist", 85576586, [["standard-1", 25], ["standard-2", 40]]],
  ["spiral-cornrows", 85577850, [["standard-1", 25], ["standard-2", 40]]],
  ["twist-boho", 85576586, [["medium-1", 30], ["medium-2", 45], ["small-1", 40], ["small-2", 55], ["micro-1", 55], ["micro-2", 70], ["micro-3", 85]]],
  ["twist-boho-bob", 85576565, [["standard", 20]]],
];
export const durationEstimates: Estimate[] = rows.flatMap(([serviceId, referenceId, variants]) => variants.map(([variantId, extraMinutes]) => ({ serviceId, variantId, referenceId, extraMinutes })));
export function withEstimatedDurations(service: Service): Service {
  let changed = false;
  const variants = service.variants.map(variant => {
    const estimate = durationEstimates.find(item => item.serviceId === service.id && item.variantId === variant.id);
    const previous = posterServices.find(item => item.id === service.id)?.variants.find(item => item.id === variant.id);
    const source = appointments.find(item => item.id === estimate?.referenceId);
    const duration = source && estimate ? Math.ceil((source.duration + estimate.extraMinutes) / 5) * 5 : 0;
    // Conserver les durées publiées et les personnalisations administratives.
    if (!estimate || !previous || !duration || variant.referenceId || variant.bookable !== false || ![previous.duration, duration].includes(variant.duration) || !(variant.estimatedDuration ?? service.estimatedDuration)) return variant;
    changed = true;
    return { ...variant, duration, estimatedDuration: true, bookable: true };
  });
  return changed ? { ...service, variants, bookingEnabled: true, estimatedDuration: variants.some(variant => variant.estimatedDuration ?? service.estimatedDuration) } : service;
}
