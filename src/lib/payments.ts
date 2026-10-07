import Stripe from "stripe";
import { DomainError, hydrateBooking, type Booking } from "./domain";
import { transaction } from "./db";
import { queueBookingEmails } from "./notifications";

const stripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new DomainError("Le paiement en ligne n’est pas activé.", 503);
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};
export async function checkoutSession(booking: Booking & { token: string }) {
  const base = process.env.PUBLIC_SITE_URL;
  if (!base || !base.startsWith("https://")) throw new DomainError("Configurez l’adresse HTTPS publique pour activer le paiement.", 503);
  const returnURL = `${base}/reservation/${booking.id}?token=${encodeURIComponent(booking.token)}`;
  const session = await stripeClient().checkout.sessions.create({
    mode: "payment", customer_email: booking.data.email,
    line_items: [{ price_data: { currency: "eur", unit_amount: booking.data.deposit, product_data: { name: `Acompte · ${booking.data.service}` } }, quantity: 1 }],
    metadata: { bookingId: booking.id, deposit: String(booking.data.deposit) },
    expires_at: Math.floor(booking.expires_at! / 1000), success_url: returnURL, cancel_url: returnURL,
  }, { idempotencyKey: booking.id });
  return session.url;
}
export async function handlePaymentWebhook(body: string, signature: string) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) throw new DomainError("Webhook non configuré.", 503);
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch { throw new DomainError("Signature Stripe invalide.", 400); }
  if (!["checkout.session.completed", "checkout.session.expired"].includes(event.type)) return;
  const session = event.data.object as Stripe.Checkout.Session;
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    if ((await connection.query("SELECT id FROM payment_events WHERE id=$1", [event.id])).rows.length) return;
    const booking = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [session.metadata?.bookingId || ""])).rows[0];
    if (booking) {
      if (event.type === "checkout.session.expired") await connection.query("UPDATE bookings SET status='cancelled' WHERE id=$1 AND status='pending_payment'", [booking.id]);
      else if (session.payment_status === "paid" && session.amount_total === booking.data.deposit && session.currency === "eur" && !booking.data.depositPaid) {
        const conflict = (await connection.query("SELECT id FROM bookings WHERE id<>$1 AND employee_id=$2 AND start_time<$4 AND end_time>$3 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$5)) LIMIT 1", [booking.id, booking.employee_id, booking.start_time, booking.end_time, Date.now()])).rows.length;
        const block = (await connection.query("SELECT id FROM blocks WHERE (employee_id IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 LIMIT 1", [booking.employee_id, booking.start_time, booking.end_time])).rows.length;
        const data = { ...booking.data, depositPaid: true };
        const status = !conflict && !block && booking.status !== "cancelled" ? "confirmed" : "cancelled";
        await connection.query("UPDATE bookings SET status=$2,data=$3::jsonb WHERE id=$1", [booking.id, status, JSON.stringify(data)]);
        if (status === "confirmed") await queueBookingEmails(connection, { ...hydrateBooking(booking), status, data });
      }
    }
    await connection.query("INSERT INTO payment_events(id,created_at) VALUES($1,$2)", [event.id, Date.now()]);
  });
}
