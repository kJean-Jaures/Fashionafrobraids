import { posterServices } from "./poster-catalog";
import { referenceGallery, withReferencePhoto } from "./reference-photos";
import { completeReferenceGallery, withAcuityCatalogue } from "./acuity-catalog";
import { withPinterestPhotos } from "./pinterest-service-photos";
import { withEstimatedDurations } from "./duration-estimates";
export type Variant = { id: string; size: string; length: string; price: number; duration: number; image?: string; imageSource?: string; imageLink?: string; referenceId?: string; estimatedDuration?: boolean; pricingVerified?: boolean; bookable?: boolean };
export type Extra = { id: string; label: string; price: number; duration: number; exclusiveGroup?: string; estimatedDuration?: boolean };
export type Deposit = { type: "none" | "percent" | "fixed"; value: number };
export type Service = {
  id: string; name: string; category: string; description: string; image: string; imageSource?: string; imageLink?: string;
  active: boolean; quoteOnly: boolean; hairIncluded: boolean; estimatedDuration: boolean; pricingVerified?: boolean;
  variants: Variant[]; options: Extra[]; deposit: Deposit;
  referenceCatalog?: boolean; bookingEnabled?: boolean; choiceLabel?: string; hairNote?: string;
};
export type Product = { id: string; name: string; category: string; description: string; price: number; stock: number; image: string; size: string; active: boolean };
export type ScheduleDay = { closed: boolean; start: string; end: string };
export type WeeklySchedule = Record<string, ScheduleDay>;
export type Employee = { id: string; name: string; active: boolean; serviceIds: string[]; schedule: WeeklySchedule | null };
export type GalleryPhoto = { id: string; title: string; category: string; image: string; position: string; active: boolean; illustrative: boolean };
export type Review = { id: string; name: string; text: string; rating: number; active: boolean };
export type Settings = {
  name: string; address: string; phone: string; email: string; timezone: string;
  pricingApproved: boolean; bookingDays: number; advanceMinutes: number;
  bookingBufferMinutes: number; bookingInstructions: string;
  confirmationEmail: boolean; reminderEmail: boolean; reminderHours: number;
  bookingPaymentMethod: "bank_transfer" | "sumup" | "paypal" | "mollie" | null;
  bankTransferIban: string; bankTransferBeneficiary: string; bankTransferBic: string; bankTransferHoldHours: number;
  schedule: WeeklySchedule; instagram: string; tiktok: string; facebook: string;
  legalName: string; siret: string; legalEmail: string;
};
export const salon = { name: "Fashion Afro Braids Paris", timezone: "Europe/Paris", address: "74 Avenue de Saint-Ouen, 75018 Paris", phone: "+33 6 25 19 74 29" };
export const initialSettings: Settings = {
  ...salon, email: "fashionafrobraidsoff@gmail.com", pricingApproved: true, bookingDays: 60, advanceMinutes: 120,
  bookingBufferMinutes: 0, bookingInstructions: "", confirmationEmail: true, reminderEmail: true, reminderHours: 24,
  bookingPaymentMethod: null, bankTransferIban: "", bankTransferBeneficiary: "", bankTransferBic: "", bankTransferHoldHours: 24,
  schedule: Object.fromEntries(Array.from({ length: 7 }, (_, day) => [String(day), { closed: false, start: "08:30", end: "20:00" }])),
  instagram: "", tiktok: "", facebook: "", legalName: "", siret: "", legalEmail: ""
};
const extras: Extra[] = [
  { id: "color", label: "Couleur", price: 1000, duration: 0 },
  { id: "beads", label: "Perles", price: 500, duration: 15 },
  { id: "curls", label: "Finition bouclée", price: 1000, duration: 30 }
];
const base = (id: string, name: string, category: string, price: number, duration: number, description: string): Service => ({
  id, name, category, description, image: category === "Perruques" || category === "Tissages" ? "/images/gallery.webp#right" : category === "Cornrows" || category === "Hommes" || category === "Enfants" ? "/images/gallery.webp#left" : "/images/hero.webp",
  active: true, quoteOnly: false, hairIncluded: false, estimatedDuration: true,
  variants: [{ id: "standard", size: "Standard", length: "Standard", price: price * 100, duration }],
  options: [], deposit: { type: "fixed", value: 1000 }
});
function braid(id: string, name: string, category: string) {
  const service = base(id, name, category, 60, 210, "Une coiffure protectrice réalisée avec précision, adaptée à votre style et à votre texture de cheveux.");
  service.variants = ["Large", "Medium", "Small", "Micro"].flatMap((size, index) => ["Épaules", "Milieu du dos", "Bas du dos", "Fesses"].map((length, li) => ({
    id: `${index}-${li}`, size, length, price: (60 + index * 10 + li * 10 + (index === 3 ? 10 : 0)) * 100,
    duration: [210, 270, 330, 420][index] + li * 30
  })));
  service.options = extras;
  return service;
}
const groups: [string, [string, string, number, number][]][] = [
  ["Boho", [["boho-large", "Boho Braids Large", 80, 240], ["boho-medium", "Boho Braids Medium", 90, 300], ["boho-small", "Boho Braids Small", 110, 420], ["boho-knotless", "Boho Knotless", 100, 330]]],
  ["Fulani", [["fulani", "Fulani classique", 70, 210], ["fulani-knotless", "Fulani avec Knotless", 80, 240], ["fulani-perles", "Fulani avec perles", 85, 240], ["fulani-tribal", "Fulani + Tribal", 90, 300]]],
  ["Cornrows", [["cornrows", "Cornrows simples", 30, 90], ["cornrows-motifs", "Cornrows avec motifs", 40, 150], ["cornrows-extensions", "Cornrows + extensions", 50, 180], ["stitch", "Stitch Braids", 50, 180], ["stitch-extensions", "Stitch Braids avec extensions", 60, 180]]],
  ["Twists", [["havana", "Havana Twist", 70, 300], ["senegalese", "Senegalese Twist", 70, 300], ["passion", "Passion Twist", 80, 300], ["spring", "Spring Twist", 80, 300], ["marley", "Marley Twist", 80, 360]]],
  ["Extensions", [["crochet", "Crochet Braids", 70, 180], ["faux-locs", "Faux Locs", 90, 300], ["butterfly", "Butterfly Locs", 90, 300], ["soft-locs", "Soft Locs", 100, 300], ["goddess", "Goddess Braids", 80, 240], ["tribal", "Tribal Braids", 90, 300]]],
  ["Tissages", [["tissage-ouvert", "Tissage ouvert", 80, 150], ["tissage-ferme", "Tissage fermé", 90, 180], ["tissage-closure", "Tissage avec closure", 100, 180], ["tissage-frontal", "Tissage avec frontal", 120, 210], ["tissage-coiffure", "Pose tissage + coiffure", 130, 240]]],
  ["Perruques", [["pose-perruque", "Pose de perruque", 40, 90], ["perruque-coiffure", "Pose perruque + coiffure", 50, 120], ["personnalisation", "Personnalisation perruque", 30, 90], ["lace", "Lace / Closure", 50, 120], ["frontal", "Frontal", 60, 120], ["wig-premium", "Wig install premium", 80, 150]]],
  ["Hommes", [["cornrows-homme", "Cornrows homme", 30, 90], ["braids-homme", "Braids homme", 40, 120], ["stitch-homme", "Stitch Braids homme", 40, 120], ["twists-homme", "Twists homme", 40, 120], ["nattes-homme", "Nattes simples homme", 25, 60], ["motifs-homme", "Coiffure homme + motifs", 40, 150]]],
  ["Enfants", [["nattes-enfant", "Nattes simples enfant", 25, 60], ["braids-enfant", "Braids enfant", 35, 120], ["knotless-enfant", "Knotless enfant", 45, 150], ["cornrows-enfant", "Cornrows enfant", 30, 90], ["perles-enfant", "Coiffure enfant avec perles", 35, 120]]],
  ["Événementiel", [["mariage", "Coiffure mariage", 100, 180], ["ceremonie", "Coiffure cérémonie", 80, 150], ["shooting", "Coiffure shooting photo", 80, 150], ["anniversaire", "Coiffure anniversaire", 60, 120], ["personnalisee", "Coiffure personnalisée", 0, 120]]],
  ["Soins", [["shampoing", "Shampoing", 15, 30], ["hydratant", "Soin hydratant", 25, 45], ["profond", "Soin profond", 30, 60], ["bain-huile", "Bain d’huile", 25, 45], ["brushing", "Soin + brushing", 40, 90], ["consultation", "Consultation capillaire", 20, 30]]],
  ["Coupes", [["coupe", "Coupe simple", 20, 30], ["coupe-coiffure", "Coupe + coiffure", 30, 60], ["coupe-homme", "Coupe homme", 20, 30], ["coupe-enfant", "Coupe enfant", 15, 30]]],
  ["Lissage & coloration", [["defrisage", "Défrisage", 50, 120], ["lissage", "Lissage", 60, 150], ["coloration", "Coloration", 50, 120], ["coloration-coiffure", "Coloration + coiffure", 70, 180], ["coloration-perso", "Coloration personnalisée", 0, 150]]]
];
const descriptions: Record<string, string> = {
  Boho: "La précision des tresses et le mouvement des boucles pour une allure libre et solaire.",
  Fulani: "Des lignes graphiques et des tresses élégantes, inspirées des traditions et de votre personnalité.",
  Cornrows: "Des lignes précises, des motifs qui vous ressemblent. Un classique à réinventer.",
  Twists: "Une coiffure protectrice tout en mouvement, adaptée à vos envies.",
  Extensions: "Jouez avec la longueur, le volume et les textures pour créer votre style.",
  Tissages: "Une pose soignée et une finition personnalisée pour sublimer votre chevelure.",
  Perruques: "Pose et personnalisation de votre perruque. La perruque est vendue séparément.",
  Hommes: "Une coiffure précise adaptée à votre style et à la longueur de vos cheveux.",
  Enfants: "Un moment tout doux, une coiffure adaptée et une attention particulière aux plus jeunes.",
  Événementiel: "Une coiffure pensée pour votre événement. Contactez-nous pour préparer votre moment.",
  Soins: "Un moment pour prendre soin de vos cheveux et de votre cuir chevelu.",
  Coupes: "Une coupe adaptée à vos envies et à votre texture de cheveux.",
  "Lissage & coloration": "Une prestation personnalisée après échange sur vos cheveux et vos attentes."
};
const provisionalServices: Service[] = [braid("knotless", "Knotless Braids", "Knotless"), braid("box-braids", "Box Braids", "Box Braids"), ...groups.flatMap(([category, items]) => items.map(([id, name, price, duration]) => {
  const item = base(id, name, category, price, duration, descriptions[category]);
  item.quoteOnly = price === 0;
  if (["Boho", "Twists", "Extensions", "Fulani"].includes(category)) item.options = extras;
  if (category === "Enfants") item.variants = ["0–5 ans", "6–12 ans", "13–17 ans"].map((size, index) => ({ ...item.variants[0], id: String(index), size }));
  return item;
}))];
export const provisionalServiceIds = provisionalServices.map(service => service.id).filter(id => !posterServices.some(service => service.id === id));
export const initialServices: Service[] = withAcuityCatalogue([...posterServices, ...provisionalServices.filter(item => !posterServices.some(poster => poster.id === item.id))].map(withReferencePhoto), provisionalServiceIds).map(withPinterestPhotos).map(withEstimatedDurations);
export const initialProducts: Product[] = [
  { id: "bonnet", name: "Bonnet en satin", category: "Accessoires", description: "Un essentiel tout doux pour protéger votre coiffure pendant la nuit.", price: 1000, stock: 0, image: "/images/bonnet-current.webp", size: "Modèles et disponibilité à confirmer", active: true },
  { id: "perruque", name: "Perruque", category: "Perruques", description: "Choisissez votre nouvelle allure. Modèles et caractéristiques à préciser avec le salon.", price: 10000, stock: 0, image: "/images/wig-current.webp", size: "Modèle à préciser", active: true },
  { id: "meches", name: "Mèches", category: "Mèches", description: "Pour accompagner votre prochaine coiffure. Longueurs et coloris à préciser.", price: 500, stock: 0, image: "/images/extensions-current.webp", size: "Coloris et longueur à préciser", active: true },
  { id: "perles", name: "Perles pour cheveux", category: "Accessoires", description: "La touche finale pour personnaliser vos tresses.", price: 500, stock: 0, image: "/images/beads-current.webp", size: "Conditionnement à préciser", active: true }
];
export const starterGallery: GalleryPhoto[] = [
  { id: "inspiration-knotless", title: "Knotless, naturellement", category: "Knotless", image: "/images/hero.webp", position: "center", active: true, illustrative: true },
  { id: "inspiration-cornrows", title: "La précision des cornrows", category: "Cornrows", image: "/images/gallery.webp", position: "left", active: true, illustrative: true },
  { id: "inspiration-boho", title: "L’esprit boho", category: "Braids", image: "/images/gallery.webp", position: "center", active: true, illustrative: true },
  { id: "inspiration-wig", title: "Volume & mouvement", category: "Perruques", image: "/images/gallery.webp", position: "right", active: true, illustrative: true },
  { id: "salon-current", title: "Ambiance du salon · visuel du site actuel", category: "Salon", image: "/images/salon-current.webp", position: "center", active: true, illustrative: true },
  { id: "texture-current", title: "Textures & caractère", category: "Extensions", image: "/images/texture-current.webp", position: "center", active: true, illustrative: true }
];
export const initialGallery: GalleryPhoto[] = [...completeReferenceGallery, ...referenceGallery.map(photo => ({ ...photo, active: false })), ...starterGallery.map(photo => ({ ...photo, active: false }))];
// Témoignages repris du site public le 7 octobre 2026. Aucune note numérique n’est publiée sur la source.
export const initialReviews: Review[] = [
  { id: "lea-kim", name: "Léa Kim", text: "Salon très propre et récent, ce qui est agréable. Les coiffures sont exécutées très rapidement puisque la coiffeuse est toujours accompagnée d’une autre pour tresser une seule personne.", rating: 0, active: true },
  { id: "myriam", name: "Myriam", text: "Je suis venue par hasard dans ce salon propre avec une bonne ambiance je suis très satisfaite de la coiffeuse qui m’a accueillie et m’a fait de très belles tresses, je vous encourage à continuer dans votre chemin, bisous.", rating: 0, active: true },
  { id: "omar-badji", name: "Omar Badji", text: "Hyper satisfait de mon passage dans ce salon. Je reviendrai sans hésiter.", rating: 0, active: true },
  { id: "pierre-yole", name: "Pierre Yole", text: "Super salon l’accueil est toujours au top et les coiffeuses sont très professionnelles ma fille et moi ressortons toujours satisfaites je recommande vivement.", rating: 0, active: true }
];
export const money = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
export const durationLabel = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h` : ""}${minutes % 60 ? ` ${minutes % 60} min` : ""}`.trim();
export const servicePrice = (service: Service) => Math.min(...service.variants.map(variant => variant.price));
export const canBookVariant = (service: Service, variant: Variant) => !service.quoteOnly && service.bookingEnabled !== false && variant.bookable !== false;
export const canBookService = (service: Service) => service.variants.some(variant => canBookVariant(service, variant));
export const hasKnownDuration = (service: Service, variant: Variant) => !(variant.estimatedDuration ?? service.estimatedDuration) || canBookVariant(service, variant);
export const priceIsVerified = (service: Service, variant: Variant) => variant.pricingVerified ?? Boolean(service.pricingVerified);
export const durationIsEstimated = (service: Service, variant: Variant, options: Extra[] = []) => (variant.estimatedDuration ?? service.estimatedDuration) || options.some(option => option.duration > 0 && option.estimatedDuration !== false);
