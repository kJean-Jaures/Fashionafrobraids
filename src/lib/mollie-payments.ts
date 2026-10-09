import { DomainError, hydrateBooking, readBooking, type Booking, type BookingData } from "./domain";
import { transaction, db, one, getSettings } from "./db";
import { mollieConfigured, mollieMode } from "./mollie-config";
import { queueBookingEmails } from "./notifications";
import { scheduleContainsBooking } from "./time";
import type { Employee } from "./catalog";

type Amount = { currency?: string; value?: string };
type MolliePayment = { id?: string; resource?: string; status?: string; mode?: string; profileId?: string; method?: string;
  amount?: Amount; amountRefunded?: Amount; amountChargedBack?: Amount; metadata?: { bookingId?: string; purpose?: string };
  _links?: { checkout?: { href?: string } } };
const paymentId = (value: unknown): value is string => typeof value === "string" && /^tr_[A-Za-z0-9]{5,64}$/.test(value);
const profileId = (value: unknown): value is string => typeof value === "string" && /^pfl_[A-Za-z0-9]{5,64}$/.test(value);

async function mollieRequest(path: string, body?: unknown, idempotencyKey?: string): Promise<MolliePayment> {
  if (!mollieConfigured()) throw new DomainError("Mollie n’est pas encore connecté. Contactez le salon pour réserver.", 503);
  let response: Response;
  try {
    response = await fetch("https://api.mollie.com/v2" + path, { method: body === undefined ? "GET" : "POST",
      headers: { Authorization: "Bearer " + process.env.MOLLIE_API_KEY, "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch { throw new DomainError("Le service de paiement est momentanément indisponible. Réessayez plus tard.", 502); }
  if (!response.ok) throw new DomainError("Mollie n’a pas validé cette opération. Le salon doit vérifier sa connexion et ses moyens de paiement.", 502);
  try { return await response.json() as MolliePayment; }
  catch { throw new DomainError("La réponse du service de paiement est invalide.", 502); }
}

function cents(amount: Amount | undefined) {
  if (amount?.currency !== "EUR" || typeof amount.value !== "string" || !/^\d{1,9}\.\d{2}$/.test(amount.value)) throw new DomainError("Montant Mollie invalide.");
  const [euros, decimals] = amount.value.split(".");
  return Number(euros) * 100 + Number(decimals);
}
function validatePayment(payment: MolliePayment, booking: Booking, expectedId?: string) {
  if (!payment || payment.resource !== "payment" || !paymentId(payment.id) || (expectedId && payment.id !== expectedId) ||
    !profileId(payment.profileId) || (booking.data.mollieProfileId && payment.profileId !== booking.data.mollieProfileId) ||
    payment.metadata?.bookingId !== booking.id || payment.metadata?.purpose !== "booking-deposit")
    throw new DomainError("Ce paiement Mollie ne correspond pas à votre réservation.");
  if (payment.mode !== mollieMode() || (booking.data.mollieMode && payment.mode !== booking.data.mollieMode))
    throw new DomainError("Le mode Mollie ne correspond pas à celui du rendez-vous. Le salon doit vérifier sa configuration.", 503);
  if (cents(payment.amount) !== booking.data.deposit) throw new DomainError("Le montant Mollie ne correspond pas à l’acompte attendu.");
  if ((payment.amountRefunded && cents(payment.amountRefunded) !== 0) || (payment.amountChargedBack && cents(payment.amountChargedBack) !== 0))
    throw new DomainError("Ce paiement a été remboursé ou contesté. Contactez le salon.", 409);
}

export async function mollieCheckoutSession(booking: Booking & { token: string }) {
  if (booking.data.paymentProvider !== "mollie" || booking.status !== "pending_payment" || !booking.expires_at || booking.expires_at <= Date.now())
    throw new DomainError("Ce rendez-vous ne peut pas recevoir un paiement Mollie.", 409);
  const site = new URL(process.env.PUBLIC_SITE_URL || "https://invalid.local").origin;
  const redirect = new URL("/api/payments/mollie/return", site);
  redirect.searchParams.set("bookingId", booking.id); redirect.searchParams.set("access", booking.token);
  // Le profil et le mode sont fixés par la clé API Mollie ; ne pas envoyer testmode/profileId.
  // Hosted Checkout collecte les données de carte/Apple Pay, jamais notre serveur.
  const payment = await mollieRequest("/payments", {
    amount: { currency: "EUR", value: (booking.data.deposit / 100).toFixed(2) },
    description: "Acompte · Fashion Afro Braids · " + booking.id, locale: "fr_FR",
    method: ["creditcard", "applepay"], redirectUrl: redirect.href,
    webhookUrl: site + "/api/payments/mollie/webhook",
    metadata: { bookingId: booking.id, purpose: "booking-deposit" },
  }, "fashion-deposit-" + booking.id);
  validatePayment(payment, booking);
  let checkout: URL;
  try { checkout = new URL(payment._links?.checkout?.href || ""); }
  catch { throw new DomainError("Mollie n’a pas fourni de lien de paiement valide.", 502); }
  if (checkout.protocol !== "https:" || checkout.hostname !== "www.mollie.com" || !checkout.pathname.startsWith("/checkout/") || checkout.port || checkout.username || checkout.password)
    throw new DomainError("Lien de paiement Mollie invalide.", 502);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const row = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [booking.id])).rows[0];
    if (!row || row.data.paymentProvider !== "mollie" || row.status !== "pending_payment" || Number(row.expires_at) <= Date.now() || row.data.molliePaymentId)
      throw new DomainError("Le délai de réservation a expiré ou un paiement a déjà été préparé.", 409);
    await connection.query("UPDATE bookings SET data=$2::jsonb WHERE id=$1", [booking.id, JSON.stringify({ ...row.data,
      molliePaymentId: payment.id, mollieProfileId: payment.profileId, mollieMode: payment.mode, molliePaymentStatus: payment.status, paymentUrl: checkout.href })]);
  });
  return checkout.href;
}

export async function verifyMollieBooking(booking: Booking) {
  if (booking.data.paymentProvider !== "mollie" || !paymentId(booking.data.molliePaymentId)) throw new DomainError("Aucun paiement Mollie n’est associé à ce rendez-vous.", 409);
  if (booking.data.depositPaid) return booking.status;
  const id = booking.data.molliePaymentId;
  const payment = await mollieRequest("/payments/" + encodeURIComponent(id));
  validatePayment(payment, booking, id);
  if (!["open", "pending", "authorized", "paid", "failed", "canceled", "expired"].includes(payment.status || "")) throw new DomainError("Statut Mollie invalide.", 502);
  return transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const row = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [booking.id])).rows[0];
    if (!row || row.data.paymentProvider !== "mollie" || row.data.molliePaymentId !== id) throw new DomainError("Réservation introuvable.", 404);
    const current = hydrateBooking(row);
    if (current.data.depositPaid) return current.status;
    const data: BookingData = { ...current.data, molliePaymentStatus: payment.status };
    if (payment.status !== "paid") {
      const terminal = ["failed", "canceled", "expired"].includes(payment.status!);
      const status = terminal ? "cancelled" : current.status;
      await connection.query("UPDATE bookings SET status=$2,data=$3::jsonb WHERE id=$1", [current.id, status, JSON.stringify(data)]);
      return status;
    }
    const eventId = "mollie:payment:" + id;
    if ((await connection.query("SELECT id FROM payment_events WHERE id=$1", [eventId])).rows.length) throw new DomainError("Ce paiement est déjà associé à un rendez-vous.", 409);
    const settings = await getSettings(connection); const buffer = settings.bookingBufferMinutes * 60000;
    const conflict = (await connection.query("SELECT id FROM bookings WHERE id<>$1 AND employee_id=$2 AND start_time<$4 AND end_time>$3 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$5)) LIMIT 1", [current.id, current.employee_id, current.start_time - buffer, current.end_time + buffer, Date.now()])).rows.length;
    const block = (await connection.query("SELECT id FROM blocks WHERE (employee_id IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 LIMIT 1", [current.employee_id, current.start_time, current.end_time])).rows.length;
    const employee = await one<Employee>("employees", current.employee_id, connection);
    const planningValid = employee?.active && (!employee.serviceIds.length || employee.serviceIds.includes(current.data.serviceId)) &&
      scheduleContainsBooking(settings.schedule, current.start_time, current.end_time) && (!employee.schedule || scheduleContainsBooking(employee.schedule, current.start_time, current.end_time));
    const confirmed = current.status !== "cancelled" && current.start_time > Date.now() && !conflict && !block && planningValid;
    const status = confirmed ? "confirmed" : "cancelled";
    data.depositPaid = true; data.paymentReviewRequired = !confirmed;
    if (payment.method) data.molliePaymentMethod = payment.method;
    await connection.query("UPDATE bookings SET status=$2,data=$3::jsonb WHERE id=$1", [current.id, status, JSON.stringify(data)]);
    await connection.query("INSERT INTO payment_events(id,created_at) VALUES($1,$2)", [eventId, Date.now()]);
    if (confirmed) await queueBookingEmails(connection, { ...current, status, data });
    return status;
  });
}
export async function verifyMolliePayment(id: string, token: string) { return verifyMollieBooking(await readBooking(id, token)); }

export async function handleMollieWebhook(body: string) {
  const values = new URLSearchParams(body); const id = values.get("id");
  if (values.getAll("id").length !== 1 || !paymentId(id)) throw new DomainError("Notification Mollie invalide.");
  const row = (await (await db()).query<Booking>("SELECT id,employee_id,start_time,end_time,status,expires_at,data,created_at FROM bookings WHERE data->>'paymentProvider'='mollie' AND data->>'molliePaymentId'=$1", [id])).rows[0];
  // Le callback public est un signal ; la preuve vient exclusivement de l’API authentifiée.
  if (row) return verifyMollieBooking(hydrateBooking(row));
}
