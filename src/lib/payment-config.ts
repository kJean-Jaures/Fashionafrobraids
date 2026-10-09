import { paypalConfigured } from "./paypal-config";
import { bankTransferConfigured } from "./bank-transfer-config";
import type { Settings } from "./catalog";
import { mollieConfigured, mollieMode } from "./mollie-config";

export type PaymentProvider = "bank_transfer" | "sumup" | "paypal" | "mollie";
export const paymentProvider = (settings?: Settings): PaymentProvider => settings?.bookingPaymentMethod ?? (process.env.PAYMENT_PROVIDER === "mollie" ? "mollie" : process.env.PAYMENT_PROVIDER === "paypal" ? "paypal" : process.env.PAYMENT_PROVIDER === "sumup" ? "sumup" : "bank_transfer");
export const sumupMode = () => process.env.SUMUP_MODE || "test";

export function sumupConfigured() {
  if (!["test", "live"].includes(sumupMode()) || (process.env.DEMO_MODE === "true" && sumupMode() === "live")) return false;
  try {
    const site = new URL(process.env.PUBLIC_SITE_URL || "");
    return Boolean(process.env.SUMUP_API_KEY && /^[A-Z0-9]{6,32}$/.test(process.env.SUMUP_MERCHANT_CODE || "") &&
      site.protocol === "https:" && !site.username && !site.password);
  } catch { return false; }
}

export function bookingPaymentsConfigured(settings?: Settings) {
  if (!settings?.bookingPaymentMethod && process.env.PAYMENT_PROVIDER && !["bank_transfer", "sumup", "paypal", "mollie"].includes(process.env.PAYMENT_PROVIDER)) return false;
  if (paymentProvider(settings) === "mollie") return mollieConfigured();
  if (paymentProvider(settings) === "bank_transfer") return bankTransferConfigured(settings);
  return paymentProvider(settings) === "sumup" ? sumupConfigured() : paypalConfigured();
}

export function paymentConfiguration(settings?: Settings) {
  return { provider: paymentProvider(settings), configured: bookingPaymentsConfigured(settings),
    mode: paymentProvider(settings) === "mollie" ? mollieMode() : paymentProvider(settings) === "bank_transfer" ? "manual" : paymentProvider(settings) === "sumup" ? sumupMode() : process.env.PAYPAL_MODE || "sandbox" };
}
