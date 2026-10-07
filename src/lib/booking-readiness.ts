import { canBookVariant, durationIsEstimated, priceIsVerified, type Employee, type Service, type Settings } from "./catalog";
import { paypalConfigured } from "./paypal-config";

export type ReminderRun = { at: number; configured: boolean; sent: number; failed: number };
export function bookingReadiness(services: Service[], employees: Employee[], settings: Settings, lastRun: ReminderRun | null) {
  const staff = employees.filter(employee => employee.active);
  const items = services.filter(service => service.active && !service.quoteOnly).flatMap(service => service.variants.map(variant => ({
    serviceId: service.id, name: service.name, variantId: variant.id,
    label: [variant.size, variant.length].filter(value => value && value !== "Standard").join(" · ") || "Standard",
    price: variant.price, duration: variant.duration,
    pricePending: !settings.pricingApproved && !priceIsVerified(service, variant),
    durationPending: durationIsEstimated(service, variant),
    staffMissing: canBookVariant(service, variant) && !staff.some(employee => !employee.serviceIds.length || employee.serviceIds.includes(service.id)),
  }))).filter(item => item.pricePending || item.durationPending || item.staffMissing);
  return {
    payment: { configured: paypalConfigured(), mode: process.env.PAYPAL_MODE === "live" ? "live" : "sandbox", demo: process.env.DEMO_MODE === "true" },
    email: { configured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) },
    reminders: { secretConfigured: Boolean(process.env.CRON_SECRET), lastRun, recent: Boolean(lastRun?.configured && lastRun.at > Date.now() - 30 * 60000) },
    catalog: { items, pricesPending: items.filter(item => item.pricePending).length, durationsPending: items.filter(item => item.durationPending).length, staffMissing: items.filter(item => item.staffMissing).length },
    team: { count: staff.length, genericResource: staff.some(employee => employee.id === "salon" && employee.name === "Équipe du salon") },
  };
}
export type BookingReadiness = ReturnType<typeof bookingReadiness>;
