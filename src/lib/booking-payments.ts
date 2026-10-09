import type { Booking } from "./domain";
import { paymentProvider } from "./payment-config";
import { checkoutSession } from "./payments";
import { sumupCheckoutSession } from "./sumup-payments";
import { mollieCheckoutSession } from "./mollie-payments";

export function bookingCheckoutSession(booking: Booking & { token: string }) {
  const provider = booking.data.paymentProvider || paymentProvider();
  if (provider === "bank_transfer") return null;
  if (provider === "mollie") return mollieCheckoutSession(booking);
  return provider === "sumup" ? sumupCheckoutSession(booking) : checkoutSession(booking);
}
