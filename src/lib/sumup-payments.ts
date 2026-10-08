import { DomainError, hydrateBooking, readBooking, type Booking } from "./domain";
import { transaction, db, one, getSettings } from "./db";
import { sumupConfigured, sumupMode } from "./payment-config";
import { queueBookingEmails } from "./notifications";
import { scheduleContainsBooking } from "./time";
import type { Employee } from "./catalog";

type SumUpTransaction = { id?: string; status?: string; amount?: number; currency?: string; merchant_code?: string };
type SumUpCheckout = { id?: string; checkout_reference?: string; amount?: number; currency?: string; merchant_code?: string;
  status?: string; hosted_checkout_url?: string; transaction_id?: string; transactions?: SumUpTransaction[] };
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9-]{1,128}$/.test(value);

async function sumupRequest<T>(path: string, body?: unknown): Promise<T> {
  if (!sumupConfigured()) throw new DomainError("Le paiement par carte n’est pas encore activé. Contactez le salon.", 503);
  let response: Response;
  try {
    response = await fetch("https://api.sumup.com" + path, { method: body === undefined ? "GET" : "POST",
      headers: { Authorization: "Bearer " + process.env.SUMUP_API_KEY, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(15000) });
  } catch { throw new DomainError("Le service de paiement est momentanément indisponible. Réessayez plus tard.", 502); }
  if (!response.ok) throw new DomainError("SumUp n’a pas validé cette opération. Le salon doit vérifier la connexion de paiement.", 502);
  try { return await response.json() as T; }
  catch { throw new DomainError("La réponse du service de paiement est invalide.", 502); }
}

function amountInCents(amount: unknown, currency: unknown) {
  if (currency !== "EUR" || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) throw new DomainError("Montant SumUp invalide.");
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) throw new DomainError("Montant SumUp invalide.");
  return cents;
}
function validateCheckout(checkout: SumUpCheckout, booking: Booking, merchantCode: string, checkoutId?: string) {
  if (!validId(checkout.id) || (checkoutId && checkout.id !== checkoutId) || checkout.checkout_reference !== booking.id || checkout.merchant_code !== merchantCode)
    throw new DomainError("Ce paiement SumUp ne correspond pas à votre réservation.");
  if (amountInCents(checkout.amount, checkout.currency) !== booking.data.deposit) throw new DomainError("Le montant SumUp ne correspond pas à l’acompte attendu.");
}

export async function sumupCheckoutSession(booking: Booking & { token: string }) {
  const merchantCode = process.env.SUMUP_MERCHANT_CODE!;
  const merchant = await sumupRequest<{ merchant_code: string; default_currency: string; sandbox?: boolean }>("/v1/merchants/" + encodeURIComponent(merchantCode));
  if (merchant.merchant_code !== merchantCode || merchant.default_currency !== "EUR") throw new DomainError("Vérifiez le profil marchand SumUp et sa devise EUR.", 503);
  // Le mode test ne doit jamais pouvoir encaisser avec un profil réel, même si une clé réelle est ajoutée par erreur.
  if ((sumupMode() === "test" && merchant.sandbox !== true) || (sumupMode() === "live" && merchant.sandbox === true))
    throw new DomainError("Le profil SumUp ne correspond pas au mode choisi. Utilisez un profil Sandbox pour les essais.", 503);
  const site = new URL(process.env.PUBLIC_SITE_URL!).origin;
  const redirect = new URL("/api/payments/sumup/return", site);
  redirect.searchParams.set("bookingId", booking.id); redirect.searchParams.set("access", booking.token);
  const checkout = await sumupRequest<SumUpCheckout>("/v0.1/checkouts", {
    checkout_reference: booking.id, amount: booking.data.deposit / 100, currency: "EUR", merchant_code: merchantCode,
    description: "Acompte · " + booking.data.service, hosted_checkout: { enabled: true },
    valid_until: new Date(booking.expires_at!).toISOString(), redirect_url: redirect.href,
    return_url: site + "/api/payments/sumup/webhook",
  });
  validateCheckout(checkout, booking, merchantCode);
  let paymentUrl: URL;
  try { paymentUrl = new URL(checkout.hosted_checkout_url || ""); }
  catch { throw new DomainError("SumUp n’a pas fourni de lien de paiement valide.", 502); }
  if (paymentUrl.protocol !== "https:" || paymentUrl.hostname !== "checkout.sumup.com" || paymentUrl.port || paymentUrl.username || paymentUrl.password)
    throw new DomainError("Lien de paiement SumUp invalide.", 502);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const current = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [booking.id])).rows[0];
    if (!current || current.status !== "pending_payment" || Number(current.expires_at) <= Date.now() || current.data.sumupCheckoutId)
      throw new DomainError("Le délai de réservation a expiré ou un paiement a déjà été préparé.", 409);
    await connection.query("UPDATE bookings SET data=$2::jsonb WHERE id=$1", [booking.id, JSON.stringify({ ...current.data,
      paymentProvider: "sumup", sumupCheckoutId: checkout.id, sumupMerchantCode: merchantCode, sumupMode: sumupMode(), paymentUrl: paymentUrl.href })]);
  });
  return paymentUrl.href;
}

export async function verifySumUpBooking(booking: Booking) {
  if (booking.data.paymentProvider !== "sumup" || !validId(booking.data.sumupCheckoutId)) throw new DomainError("Aucun paiement SumUp n’est associé à ce rendez-vous.", 409);
  if (booking.data.depositPaid) return booking.status;
  const checkoutId = booking.data.sumupCheckoutId;
  const merchantCode = booking.data.sumupMerchantCode;
  if (!merchantCode || merchantCode !== process.env.SUMUP_MERCHANT_CODE || booking.data.sumupMode !== sumupMode())
    throw new DomainError("Le profil de paiement de ce rendez-vous doit être vérifié par le salon.", 503);
  const checkout = await sumupRequest<SumUpCheckout>("/v0.1/checkouts/" + encodeURIComponent(checkoutId));
  validateCheckout(checkout, booking, merchantCode, checkoutId);
  if (checkout.status !== "PAID") return "pending_payment";
  // Retrieve Checkout peut renvoyer transaction_id directement, ou un historique transactions.
  const successful = Array.isArray(checkout.transactions) ? checkout.transactions.filter(item => item.status === "SUCCESSFUL") : [];
  const transactionId = checkout.transaction_id ?? (successful.length === 1 ? successful[0].id : undefined);
  if (!validId(transactionId) || successful.length > 1 || (successful.length === 1 && successful[0].id !== transactionId))
    throw new DomainError("La transaction SumUp n’est pas encore vérifiée.", 502);
  const paid = await sumupRequest<SumUpTransaction>("/v2.1/merchants/" + encodeURIComponent(merchantCode) + "/transactions?id=" + encodeURIComponent(transactionId));
  if (paid.id !== transactionId || paid.status !== "SUCCESSFUL" || paid.merchant_code !== merchantCode || amountInCents(paid.amount, paid.currency) !== booking.data.deposit)
    throw new DomainError("La transaction SumUp ne correspond pas à l’acompte attendu.");
  return transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const row = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [booking.id])).rows[0];
    if (!row || row.data.sumupCheckoutId !== checkoutId || row.data.paymentProvider !== "sumup") throw new DomainError("Réservation introuvable.", 404);
    const current = hydrateBooking(row);
    if (current.data.depositPaid) return current.status;
    const eventId = "sumup:transaction:" + transactionId;
    if ((await connection.query("SELECT id FROM payment_events WHERE id=$1", [eventId])).rows.length) throw new DomainError("Cette transaction est déjà associée à un rendez-vous.", 409);
    const settings = await getSettings(connection); const buffer = settings.bookingBufferMinutes * 60000;
    const conflict = (await connection.query("SELECT id FROM bookings WHERE id<>$1 AND employee_id=$2 AND start_time<$4 AND end_time>$3 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$5)) LIMIT 1", [current.id, current.employee_id, current.start_time - buffer, current.end_time + buffer, Date.now()])).rows.length;
    const block = (await connection.query("SELECT id FROM blocks WHERE (employee_id IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 LIMIT 1", [current.employee_id, current.start_time, current.end_time])).rows.length;
    const employee = await one<Employee>("employees", current.employee_id, connection);
    const planningValid = employee?.active && (!employee.serviceIds.length || employee.serviceIds.includes(current.data.serviceId)) &&
      scheduleContainsBooking(settings.schedule, current.start_time, current.end_time) && (!employee.schedule || scheduleContainsBooking(employee.schedule, current.start_time, current.end_time));
    const confirmed = current.status !== "cancelled" && current.start_time > Date.now() && !conflict && !block && planningValid;
    const status = confirmed ? "confirmed" : "cancelled";
    const data = { ...current.data, depositPaid: true, sumupTransactionId: transactionId, paymentReviewRequired: !confirmed };
    await connection.query("UPDATE bookings SET status=$2,data=$3::jsonb WHERE id=$1", [current.id, status, JSON.stringify(data)]);
    await connection.query("INSERT INTO payment_events(id,created_at) VALUES($1,$2)", [eventId, Date.now()]);
    if (confirmed) await queueBookingEmails(connection, { ...current, status, data });
    return status;
  });
}

export async function verifySumUpPayment(id: string, privateToken: string) { return verifySumUpBooking(await readBooking(id, privateToken)); }

export async function handleSumUpWebhook(body: string) {
  let event: { event_type?: string; id?: string };
  try { event = JSON.parse(body); } catch { throw new DomainError("Notification SumUp invalide."); }
  if (!event || typeof event !== "object") throw new DomainError("Notification SumUp invalide.");
  if (event.event_type !== "CHECKOUT_STATUS_CHANGED") return;
  if (!validId(event.id)) throw new DomainError("Référence SumUp invalide.");
  const row = (await (await db()).query<Booking>("SELECT id,employee_id,start_time,end_time,status,expires_at,data,created_at FROM bookings WHERE data->>'paymentProvider'='sumup' AND data->>'sumupCheckoutId'=$1", [event.id])).rows[0];
  // Un callback public est un signal, jamais une preuve. La preuve vient des deux lectures API authentifiées.
  if (row) return verifySumUpBooking(hydrateBooking(row));
}
