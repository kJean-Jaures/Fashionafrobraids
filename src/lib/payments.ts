import { DomainError, hydrateBooking, readBooking, type Booking } from "./domain";
import { transaction, getSettings } from "./db";
import { queueBookingEmails } from "./notifications";
import { paypalConfigured } from "./paypal-config";

type Amount = { currency_code: string; value: string };
type Capture = { id: string; status: string; amount: Amount; supplementary_data?: { related_ids?: { order_id?: string } } };
type PayPalOrder = { id: string; status: string; links?: { rel: string; href: string }[]; purchase_units?: { payments?: { captures?: Capture[] } }[] };
type PayPalEvent = { id: string; event_type: string; resource: Capture };
const endpoint = () => process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function accessToken() {
  if (!paypalConfigured()) throw new DomainError("Le paiement PayPal n’est pas encore activé. Contactez le salon.", 503);
  const credentials = Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET).toString("base64");
  let response: Response;
  try { response = await fetch(endpoint() + "/v1/oauth2/token", { method: "POST", headers: { Authorization: "Basic " + credentials, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(20000) }); }
  catch { throw new DomainError("PayPal est momentanément indisponible. Réessayez plus tard.", 502); }
  if (!response.ok) throw new DomainError("La connexion PayPal doit être vérifiée par le salon.", 503);
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new DomainError("La connexion PayPal a échoué.", 502);
  return result.access_token;
}
async function paypalRequest<T>(path: string, token: string, body?: unknown, requestId?: string): Promise<T> {
  let response: Response;
  try { response = await fetch(endpoint() + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
  }); } catch { throw new DomainError("PayPal est momentanément indisponible. Réessayez plus tard.", 502); }
  if (!response.ok) throw new DomainError("PayPal n’a pas validé cette opération. Aucun rendez-vous n’est confirmé sans paiement vérifié.", 502);
  return response.json() as Promise<T>;
}
function approvalURL(order: PayPalOrder) {
  const link = order.links?.find(item => ["payer-action", "approve"].includes(item.rel))?.href;
  if (!link) throw new DomainError("PayPal n’a pas fourni de lien de paiement.", 502);
  const url = new URL(link);
  const allowed = process.env.PAYPAL_MODE === "live" ? ["www.paypal.com", "paypal.com"] : ["www.sandbox.paypal.com", "sandbox.paypal.com"];
  if (url.protocol !== "https:" || !allowed.includes(url.hostname) || url.username || url.password) throw new DomainError("Lien PayPal invalide.", 502);
  return url.href;
}
export async function checkoutSession(booking: Booking & { token: string }) {
  const token = await accessToken();
  const site = new URL(process.env.PUBLIC_SITE_URL!).origin;
  const confirmation = site + "/reservation/" + booking.id + "?token=" + encodeURIComponent(booking.token);
  const returnURL = site + "/api/payments/paypal/return?bookingId=" + booking.id + "&access=" + encodeURIComponent(booking.token);
  const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", token, {
    intent: "CAPTURE",
    purchase_units: [{ reference_id: booking.id, custom_id: booking.id, description: "Acompte · " + booking.data.service,
      amount: { currency_code: "EUR", value: (booking.data.deposit / 100).toFixed(2) } }],
    payment_source: { paypal: { experience_context: { brand_name: "Fashion Afro Braids Paris", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", landing_page: "BILLING", return_url: returnURL, cancel_url: confirmation + "&payment=cancelled" } } },
  }, booking.id);
  if (!/^[A-Z0-9-]{1,64}$/.test(order.id || "")) throw new DomainError("Référence de paiement PayPal invalide.", 502);
  const paymentUrl = approvalURL(order);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const current = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [booking.id])).rows[0];
    if (!current || current.status !== "pending_payment" || Number(current.expires_at) <= Date.now()) throw new DomainError("Le délai de réservation a expiré.", 409);
    await connection.query("UPDATE bookings SET data=$2::jsonb WHERE id=$1", [booking.id, JSON.stringify({ ...current.data, paymentProvider: "paypal", paypalOrderId: order.id, paymentUrl })]);
  });
  return paymentUrl;
}
function cents(amount: Amount) {
  if (amount?.currency_code !== "EUR" || typeof amount.value !== "string" || !/^\d+(\.\d{1,2})?$/.test(amount.value)) throw new DomainError("Montant PayPal invalide.");
  const [euros, fraction = ""] = amount.value.split(".");
  const value = Number(euros) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(value)) throw new DomainError("Montant PayPal invalide.");
  return value;
}
async function completePayment(orderId: string, capture: Capture, eventId: string) {
  if (!capture.id || capture.status !== "COMPLETED") throw new DomainError("Le paiement de l’acompte n’est pas terminé.");
  const amount = cents(capture.amount);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    if ((await connection.query("SELECT id FROM payment_events WHERE id=$1", [eventId])).rows.length) return;
    const booking = (await connection.query<Booking>("SELECT * FROM bookings WHERE data->>'paypalOrderId'=$1 FOR UPDATE", [orderId])).rows[0];
    if (booking && !booking.data.depositPaid) {
      if (amount !== booking.data.deposit || amount <= 0) throw new DomainError("Le montant PayPal ne correspond pas à l’acompte attendu.");
      const buffer = (await getSettings(connection)).bookingBufferMinutes * 60000;
      const conflict = (await connection.query("SELECT id FROM bookings WHERE id<>$1 AND employee_id=$2 AND start_time<$4 AND end_time>$3 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$5)) LIMIT 1", [booking.id, booking.employee_id, Number(booking.start_time) - buffer, Number(booking.end_time) + buffer, Date.now()])).rows.length;
      const block = (await connection.query("SELECT id FROM blocks WHERE (employee_id IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 LIMIT 1", [booking.employee_id, booking.start_time, booking.end_time])).rows.length;
      const data = { ...booking.data, depositPaid: true, paypalCaptureId: capture.id };
      const status = !conflict && !block && booking.status !== "cancelled" ? "confirmed" : "cancelled";
      await connection.query("UPDATE bookings SET status=$2,data=$3::jsonb WHERE id=$1", [booking.id, status, JSON.stringify(data)]);
      if (status === "confirmed") await queueBookingEmails(connection, { ...hydrateBooking(booking), status, data });
    }
    await connection.query("INSERT INTO payment_events(id,created_at) VALUES($1,$2)", [eventId, Date.now()]);
  });
}
export async function captureBookingPayment(bookingId: string, privateToken: string, orderId: string) {
  const booking = await readBooking(bookingId, privateToken);
  if (!orderId || booking.data.paypalOrderId !== orderId) throw new DomainError("Ce paiement ne correspond pas à votre réservation.");
  if (booking.data.depositPaid) return;
  if (booking.status !== "pending_payment" || !booking.expires_at || booking.expires_at <= Date.now()) throw new DomainError("Le délai de paiement a expiré. Contactez le salon.", 409);
  const token = await accessToken();
  // Relecture avant capture : permet de récupérer un paiement déjà capturé lorsque
  // le navigateur a perdu la réponse, sans encaisser deux fois.
  const existing = await paypalRequest<PayPalOrder>("/v2/checkout/orders/" + orderId, token);
  if (existing.id !== orderId) throw new DomainError("Référence de paiement invalide.");
  const order = existing.status === "COMPLETED" ? existing : await paypalRequest<PayPalOrder>("/v2/checkout/orders/" + orderId + "/capture", token, {}, "capture-" + bookingId);
  const captures = order.purchase_units?.flatMap(unit => unit.payments?.captures || []) || [];
  if (order.id !== orderId || order.status !== "COMPLETED" || captures.length !== 1) throw new DomainError("Le paiement PayPal n’est pas encore confirmé.");
  await completePayment(orderId, captures[0], "paypal:capture:" + captures[0].id);
}
export async function handlePaymentWebhook(body: string, headers: Headers) {
  let event: PayPalEvent;
  try { event = JSON.parse(body); } catch { throw new DomainError("Notification PayPal invalide."); }
  if (!event.id || typeof event.id !== "string" || event.id.length > 200) throw new DomainError("Notification PayPal invalide.");
  const required = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"];
  if (required.some(name => !headers.get(name))) throw new DomainError("Signature PayPal manquante.");
  const verification = await paypalRequest<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", await accessToken(), {
    auth_algo: headers.get(required[0]), cert_url: headers.get(required[1]), transmission_id: headers.get(required[2]),
    transmission_sig: headers.get(required[3]), transmission_time: headers.get(required[4]), webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event,
  });
  if (verification.verification_status !== "SUCCESS") throw new DomainError("Signature PayPal invalide.");
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") return;
  const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
  if (!orderId) throw new DomainError("Référence de commande PayPal manquante.");
  await completePayment(orderId, event.resource, "paypal:event:" + event.id);
}
