import type { Booking } from "./domain";
import { paymentProvider } from "./payment-config";
import { checkoutSession } from "./payments";
import { sumupCheckoutSession } from "./sumup-payments";

export function bookingCheckoutSession(booking: Booking & { token: string }) {
  return paymentProvider() === "sumup" ? sumupCheckoutSession(booking) : checkoutSession(booking);
}
