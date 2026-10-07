import type { Extra, Service, Variant } from "./catalog";

// Tarifs transcrits des trois pages VISIBLES de l’affiche fournie par le salon.
// Les durées ne figurent pas sur l’affiche : ce sont des estimations de planning.
const image = (name: string) => "/images/poster-" + name + ".jpeg";
const supplements: Extra[] = [
  { id: "curls", label: "Boucles aux pointes", price: 500, duration: 30 },
  { id: "beads", label: "Ajout de perles", price: 500, duration: 15 },
];
const bohoSupplements: Extra[] = [
  ...supplements,
  { id: "volume-2x", label: "Volume boho · ajout 2×", price: 1000, duration: 30, exclusiveGroup: "boho-volume" },
  { id: "volume-3x", label: "Volume boho · ajout 3×", price: 1500, duration: 45, exclusiveGroup: "boho-volume" },
];
const variant = (id: string, size: string, length: string, euros: number, duration: number, photo: string): Variant => ({ id, size, length, price: euros * 100, duration, image: image(photo) });
const pair = (size: string, prices: [number, number], duration: number, photo: string, prefix = size.toLowerCase()) => [
  variant(prefix + "-1", size, "Milieu du dos", prices[0], duration, photo),
  variant(prefix + "-2", size, "Bas du dos", prices[1], duration + 30, photo),
];
const service = (id: string, name: string, category: string, variants: Variant[], boho = false): Service => ({
  id, name, category, description: "Choisissez votre variante et votre longueur pour personnaliser cette coiffure du catalogue du salon.",
  image: variants[0].image!, active: true, quoteOnly: false, hairIncluded: false, estimatedDuration: true, pricingVerified: true,
  variants, options: boho ? bohoSupplements : supplements, deposit: { type: "fixed", value: 1000 },
});
export const posterServices: Service[] = [
  service("knotless", "Knotless Braids", "Knotless", [
    ...pair("Medium", [60, 75], 300, "knotless-medium", "1"),
    ...pair("Small", [70, 85], 360, "knotless-small", "2"),
    ...pair("Micro", [85, 100], 450, "knotless-micro", "3"),
  ]),
  service("boho-knotless", "Knotless Boho", "Boho", [
    ...pair("Medium", [70, 85], 300, "knotless-boho-medium"),
    ...pair("Small", [75, 90], 360, "knotless-boho-small"),
    ...pair("Micro", [85, 90], 450, "knotless-boho-micro"),
  ], true),
  service("twist-boho", "Twist Boho", "Boho", [
    ...pair("Medium", [75, 95], 300, "twist-boho-medium"),
    ...pair("Small", [80, 95], 360, "twist-boho-small"),
    ...pair("Micro", [95, 115], 420, "twist-boho-micro"),
    variant("micro-3", "Micro", "Fesses", 120, 480, "twist-boho-micro"),
  ], true),
  service("fulani-knotless", "Fulani simple Knotless", "Fulani", pair("Standard", [60, 80], 240, "fulani-simple-knotless")),
  service("fulani-motif-knotless", "Fulani motif Knotless", "Fulani", pair("Standard", [85, 115], 270, "fulani-motif-knotless")),
  service("spiral-cornrows", "Spiral Cornrows", "Cornrows", pair("Standard", [65, 75], 180, "spiral-cornrows")),
  service("criss-cross-knotless", "Criss Cross Knotless", "Knotless", pair("Standard", [90, 115], 300, "criss-cross-knotless")),
  service("fulani-tribal", "Fulani Tribal Knotless", "Fulani", pair("Standard", [85, 100], 300, "fulani-tribal-knotless")),
  service("lemonade-twist", "Lemonade Twist", "Twists", pair("Standard", [85, 90], 300, "lemonade-twist")),
  service("fulani-motifs-twist", "Fulani motifs Twist", "Fulani", pair("Standard", [80, 90], 300, "fulani-motifs-twist")),
  service("fulani-spiral-twist", "Fulani spiral Twist", "Fulani", pair("Standard", [85, 95], 300, "fulani-spiral-twist")),
  service("fulani-motifs-bob", "Fulani motifs Bob", "Fulani", pair("Standard", [90, 110], 240, "fulani-motifs-bob")),
  service("french-curl-bob", "French Curl Bob", "French Curl", [
    variant("small-epaule", "Small", "Carré épaule", 85, 300, "french-curl-bob-epaule"),
    variant("micro-epaule", "Micro", "Carré épaule", 100, 420, "french-curl-bob-epaule"),
    variant("small-long", "Small", "Bob long", 85, 330, "french-curl-bob-long"),
    variant("micro-long", "Micro", "Bob long", 100, 450, "french-curl-bob-long"),
  ]),
  service("french-curl", "French Curl", "French Curl", [
    variant("small", "Small", "18–24 pouces", 100, 360, "french-curl"),
    variant("micro", "Micro", "18–24 pouces", 115, 450, "french-curl"),
  ]),
  service("knotless-boho-bob", "Knotless Boho Bob", "Boho", [variant("standard", "Standard", "Carré épaule", 70, 270, "knotless-boho-bob")], true),
  service("twist-boho-bob", "Twist Boho Bob", "Boho", [variant("standard", "Standard", "Carré épaule", 70, 270, "twist-boho-bob")], true),
  service("knotless-bob", "Knotless Bob", "Knotless", [variant("standard", "Standard", "Carré épaule", 60, 240, "knotless-bob")]),
];
