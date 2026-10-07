import { z } from "zod";

const customer = {
  name: z.string().trim().min(2, "Indiquez votre nom complet.").max(100),
  email: z.email("Indiquez une adresse e-mail valide.").max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().regex(/^\+?[\d\s().-]{8,25}$/, "Indiquez un numéro de téléphone valide."),
  consent: z.literal(true, { error: "Votre accord est nécessaire pour enregistrer vos coordonnées." })
};

export const bookingSchema = z.object({
  ...customer,
  serviceId: z.string().min(1).max(50),
  variantId: z.string().min(1).max(50),
  optionIds: z.array(z.string().max(50)).max(20).default([]),
  employeeId: z.string().max(60).default("any"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().trim().max(500).default("")
});

export const orderSchema = z.object({
  ...customer,
  requestId: z.uuid(),
  items: z.array(z.object({ productId: z.string().max(50), quantity: z.number().int().min(1).max(10) })).min(1).max(20)
});
export type BookingInput = z.infer<typeof bookingSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const image = z.string().regex(/^\/images\/[a-zA-Z0-9_.-]+(?:#(?:left|right|center))?$/);
const day = z.object({ closed: z.boolean(), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine(value => value.closed || value.end > value.start, "L’heure de fin doit être après le début.");
export const scheduleSchema = z.record(z.string(), day).refine(value => Array.from({ length: 7 }, (_, index) => String(index)).every(index => index in value), "Les sept jours doivent être renseignés.");
export const serviceSchema = z.object({
  id, name: z.string().trim().min(2).max(100), category: z.string().trim().min(2).max(60), description: z.string().max(1000), image,
  active: z.boolean(), quoteOnly: z.boolean(), hairIncluded: z.boolean(), estimatedDuration: z.boolean(),
  pricingVerified: z.boolean().default(false),
  variants: z.array(z.object({ id, size: z.string().max(60), length: z.string().max(60), price: z.number().int().min(0).max(200000), duration: z.number().int().min(15).max(690), image: image.optional() })).min(1).max(60),
  options: z.array(z.object({ id, label: z.string().min(1).max(60), price: z.number().int().min(0).max(50000), duration: z.number().int().min(0).max(180), exclusiveGroup: id.optional() })).max(20),
  deposit: z.object({ type: z.enum(["none", "percent", "fixed"]), value: z.number().int().min(0).max(200000) }).refine(value => value.type !== "percent" || value.value <= 100, "Un pourcentage ne peut pas dépasser 100 %.")
}).refine(value => new Set(value.variants.map(v => v.id)).size === value.variants.length && new Set(value.options.map(v => v.id)).size === value.options.length, "Les variantes et options doivent avoir des identifiants uniques.");
export const productSchema = z.object({ id, name: z.string().trim().min(2).max(100), category: z.string().min(1).max(60), description: z.string().max(1000), price: z.number().int().min(0).max(200000), stock: z.number().int().min(0).max(100000), image, size: z.string().max(100), active: z.boolean() });
export const employeeSchema = z.object({ id, name: z.string().trim().min(2).max(100), active: z.boolean(), serviceIds: z.array(z.string().max(80)).max(200), schedule: scheduleSchema.nullable() });
export const gallerySchema = z.object({ id, title: z.string().min(1).max(120), category: z.string().min(1).max(60), image, position: z.enum(["left", "center", "right"]), active: z.boolean(), illustrative: z.boolean() });
export const reviewSchema = z.object({ id, name: z.string().min(1).max(100), text: z.string().min(5).max(2000), rating: z.number().int().min(0).max(5), active: z.boolean() });
const optionalUrl = z.union([z.literal(""), z.url().refine(value => value.startsWith("https://"), "Une URL HTTPS est nécessaire.")]);
export const settingsSchema = z.object({
  name: z.string().min(2).max(100), address: z.string().min(5).max(200), phone: z.string().min(8).max(30),
  email: z.union([z.literal(""), z.email()]), timezone: z.literal("Europe/Paris"), pricingApproved: z.boolean(),
  bookingDays: z.number().int().min(1).max(365), advanceMinutes: z.number().int().min(0).max(10080), schedule: scheduleSchema,
  instagram: optionalUrl, tiktok: optionalUrl, facebook: optionalUrl,
  legalName: z.string().max(200), siret: z.string().max(30), legalEmail: z.union([z.literal(""), z.email()])
});
export const contactSchema = z.object({ name: customer.name, email: customer.email, phone: z.string().max(30).default(""), subject: z.string().min(2).max(100), message: z.string().trim().min(10).max(3000), consent: customer.consent });
