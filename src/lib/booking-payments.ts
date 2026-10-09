import type { Booking } from "./domain";
import { paymentProvider } from "./payment-config";
import { checkoutSession } from "./payments";
import { sumupCheckoutSession } from "./sumup-payments";

export function bookingCheckoutSession(booking: Booking & { token: string }) {
  const provider = booking.data.paymentProvider || paymentProvider();
  if (provider === "bank_transfer") return null;
  return provider === "sumup" ? sumupCheckoutSession(booking) : checkoutSession(booking);
}
