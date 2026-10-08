import { paypalConfigured } from "./paypal-config";

export type PaymentProvider = "sumup" | "paypal";
export const paymentProvider = (): PaymentProvider => process.env.PAYMENT_PROVIDER === "paypal" ? "paypal" : "sumup";
export const sumupMode = () => process.env.SUMUP_MODE || "test";

export function sumupConfigured() {
  if (!["test", "live"].includes(sumupMode()) || (process.env.DEMO_MODE === "true" && sumupMode() === "live")) return false;
  try {
    const site = new URL(process.env.PUBLIC_SITE_URL || "");
    return Boolean(process.env.SUMUP_API_KEY && /^[A-Z0-9]{6,32}$/.test(process.env.SUMUP_MERCHANT_CODE || "") &&
      site.protocol === "https:" && !site.username && !site.password);
  } catch { return false; }
}

export function bookingPaymentsConfigured() {
  if (process.env.PAYMENT_PROVIDER && !["sumup", "paypal"].includes(process.env.PAYMENT_PROVIDER)) return false;
  return paymentProvider() === "sumup" ? sumupConfigured() : paypalConfigured();
}

export function paymentConfiguration() {
  return { provider: paymentProvider(), configured: bookingPaymentsConfigured(),
    mode: paymentProvider() === "sumup" ? sumupMode() : process.env.PAYPAL_MODE || "sandbox" };
}
