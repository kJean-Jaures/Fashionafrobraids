import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { db, closeDatabase, one, publicCatalog, getSettings } from "../src/lib/db";
import { initialSettings, initialServices, canBookVariant, durationIsEstimated, priceIsVerified, type Service, type Employee } from "../src/lib/catalog";
import { referenceAppointments } from "../src/lib/acuity-catalog";
import { retiredServiceIds, retiredReferenceIds, retiredGalleryIds } from "../src/lib/catalogue-selection";
import { pinterestPhotoLabel, pinterestPhotos } from "../src/lib/pinterest-service-photos";
import { availability, createBooking, readBooking, cancelBooking, createOrder, readOrder, updateOrder, createBlock, moveBooking, selection, receiveBankTransfer } from "../src/lib/domain";
import { saveContent, removeContent, saveSettings } from "../src/lib/admin";
import { addDays, parisDate, timestamp, localTimeToEpoch } from "../src/lib/time";
import { bookingSchema, orderSchema } from "../src/lib/validation";
import { deliverNotifications, sendTestEmail } from "../src/lib/notifications";
import { handlePaymentWebhook, checkoutSession, captureBookingPayment } from "../src/lib/payments";
import { bookingReadiness } from "../src/lib/booking-readiness";
import { depositPolicy, depositCancellationNotice } from "../src/lib/booking-policy";
import { durationEstimates } from "../src/lib/duration-estimates";
import { posterServices } from "../src/lib/poster-catalog";
import { bookingCheckoutSession } from "../src/lib/booking-payments";
import { bookingPaymentsConfigured, sumupConfigured } from "../src/lib/payment-config";
import { handleSumUpWebhook, sumupCheckoutSession, verifySumUpPayment } from "../src/lib/sumup-payments";
import { bankTransferQrPayload, BankTransferQrError } from "../src/lib/bank-transfer-qr";
import jsQR from "jsqr";
import sharp from "sharp";

let directory: string;
const future = () => addDays(parisDate(), 5);
const booking = (patch = {}) => bookingSchema.parse({ serviceId: "knotless", variantId: "1-1", date: future(), time: "08:30", name: "Cliente Test", email: "test@example.com", phone: "0612345678", consent: true, ...patch });
const order = (items = [{ productId: "bonnet", quantity: 1 }], patch = {}) => orderSchema.parse({ name: "Cliente Test", email: "test@example.com", phone: "0612345678", consent: true, requestId: randomUUID(), items, ...patch });
before(async () => { directory = await mkdtemp(join(tmpdir(), "fab-domain-tests-")); process.env.DATA_DIR = directory; delete process.env.DATABASE_URL; delete process.env.RESEND_API_KEY; delete process.env.PAYPAL_CLIENT_SECRET; await db(); });
beforeEach(async () => {
  for (const name of ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID", "PAYPAL_MODE", "PUBLIC_SITE_URL", "RESEND_API_KEY", "EMAIL_FROM", "SUMUP_API_KEY", "SUMUP_MERCHANT_CODE", "SUMUP_MODE", "PAYMENT_PROVIDER", "DEMO_MODE"]) delete process.env[name];
  const connection = await db();
  for (const table of ["notifications", "bookings", "orders", "blocks", "payment_events"]) await connection.query(`DELETE FROM ${table}`);
  await connection.query("DELETE FROM automation_runs");
  await connection.query("DELETE FROM content WHERE collection='employees' AND id<>'salon'");
  await saveContent("employees", { id: "salon", name: "Équipe du salon", active: true, serviceIds: [], schedule: null });
  await connection.query("UPDATE inventory SET stock=10");
  await saveSettings(initialSettings);
  // Fixture de cinq heures pour tester le planning indépendamment des durées du salon.
  // La durée réelle de 65 minutes et la règle d’acompte sont testées séparément.
  const fixture = structuredClone(initialServices.find(item => item.id === "knotless")!);
  fixture.variants.find(variant => variant.id === "1-1")!.duration = 300;
  await saveContent("services", { ...fixture, deposit: { type: "none", value: 0 } });
});
after(async () => { await closeDatabase(); await rm(directory, { recursive: true, force: true }); });

test("le catalogue charge les catégories et les quatre produits fournis", async () => {
  const catalog = await publicCatalog(); assert.ok(catalog.services.length > 60); assert.equal(catalog.products.length, 4); assert.equal(catalog.settings.address, initialSettings.address); assert.equal(catalog.settings.pricingApproved, true);
});
test("rouvrir la base conserve les réservations et le stock modifié", async () => {
  const saved = await createBooking(booking());
  await (await db()).query("UPDATE inventory SET stock=7 WHERE product_id='bonnet'");
  await closeDatabase();
  const restored = await readBooking(saved.id, saved.token);
  assert.equal(restored.start_time, saved.start_time);
  assert.equal(restored.status, saved.status);
  assert.equal((await publicCatalog()).products.find(product => product.id === "bonnet")!.stock, 7);
});
test("variante et options recalculent prix et durée côté serveur", async () => {
  const service = (await one<Service>("services", "knotless"))!;
  const picked = selection(service, "1-1", ["curls", "beads"]);
  assert.equal(picked.price, 7000); assert.equal(picked.duration, 345);
  assert.throws(() => selection(service, "1-1", ["curls", "curls"])); assert.throws(() => selection(service, "1-1", ["invented"]));
});
test("deux réservations concurrentes ne peuvent pas occuper la même coiffeuse", async () => {
  const result = await Promise.allSettled([createBooking(booking()), createBooking(booking())]);
  assert.equal(result.filter(r => r.status === "fulfilled").length, 1); assert.equal(result.filter(r => r.status === "rejected").length, 1);
  const slots = await availability("knotless", "1-1", future());
  assert.ok(!slots.includes("08:30")); assert.ok(!slots.includes("13:00")); assert.ok(slots.includes("13:30"));
});
test("une réservation de cinq heures libère seulement les créneaux après sa fin", async () => {
  const service = (await one<Service>("services", "knotless"))!; service.variants.find(v => v.id === "1-1")!.duration = 300; await saveContent("services", service);
  const saved = await createBooking(booking({ time: "10:00" })); assert.equal(saved.end_time - saved.start_time, 300 * 60000);
  const slots = await availability("knotless", "1-1", future()); assert.ok(!slots.includes("14:30")); assert.ok(slots.includes("15:00"));
});
test("deux coiffeuses autorisent deux rendez-vous simultanés, pas trois", async () => {
  await saveContent("employees", { id: "second", name: "Coiffeuse Test", active: true, serviceIds: ["knotless"], schedule: null });
  const results = await Promise.allSettled([createBooking(booking()), createBooking(booking()), createBooking(booking())]); assert.equal(results.filter(r => r.status === "fulfilled").length, 2);
  const assignments = results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof createBooking>>>).value.employee_id); assert.equal(new Set(assignments).size, 2);
});
test("horaires fermés et pause empêchent les rendez-vous qui chevauchent la période", async () => {
  await createBlock(null, timestamp(future(), "12:00"), timestamp(future(), "13:00"), "Pause");
  const slots = await availability("knotless", "1-1", future()); assert.ok(!slots.includes("08:30")); assert.ok(slots.includes("13:00"));
  const settings = structuredClone(initialSettings); settings.schedule[String(new Date(`${future()}T12:00:00Z`).getUTCDay())].closed = true; await saveSettings(settings);
  assert.deepEqual(await availability("knotless", "1-1", future()), []);
});
test("les heures de Paris suivent les passages à l’heure d’été et d’hiver", () => {
  assert.equal(new Date(localTimeToEpoch("2026-07-07", 8, 30)).toISOString(), "2026-07-07T06:30:00.000Z");
  assert.equal(new Date(localTimeToEpoch("2026-12-07", 8, 30)).toISOString(), "2026-12-07T07:30:00.000Z");
});
test("un lien privé invalide est rejeté et une annulation libère le créneau", async () => {
  const saved = await createBooking(booking()); await assert.rejects(readBooking(saved.id, "a".repeat(43)));
  assert.equal((await readBooking(saved.id, saved.token)).data.service, "Knotless Braids");
  await cancelBooking(saved.id, saved.token); assert.ok((await availability("knotless", "1-1", future())).includes("08:30"));
});
test("le déplacement vérifie les collisions et conserve la réservation initiale en cas d’échec", async () => {
  const first = await createBooking(booking()); const second = await createBooking(booking({ time: "13:30" }));
  await assert.rejects(moveBooking(second.id, future(), "08:30", "salon")); assert.equal((await readBooking(second.id, second.token)).start_time, second.start_time);
  await assert.rejects(createBlock(null, first.start_time, first.end_time, "Fermeture"));
});
test("le stock ne peut pas devenir négatif et la commande est calculée côté serveur", async () => {
  await (await db()).query("UPDATE inventory SET stock=1 WHERE product_id='bonnet'");
  const results = await Promise.allSettled([createOrder(order()), createOrder(order())]); assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  const saved = (results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof createOrder>>>).value;
  assert.equal(saved.data.total, 1000); assert.equal((await readOrder(saved.id, saved.token)).data.items[0].quantity, 1);
  await updateOrder(saved.id, "cancelled"); assert.equal((await publicCatalog()).products.find(p => p.id === "bonnet")!.stock, 1);
  await assert.rejects(updateOrder(saved.id, "cancelled")); assert.equal((await publicCatalog()).products.find(p => p.id === "bonnet")!.stock, 1);
});
test("une rupture sur le second produit annule toute la réduction de stock", async () => {
  await (await db()).query("UPDATE inventory SET stock=0 WHERE product_id='perles'");
  await assert.rejects(createOrder(order([{ productId: "bonnet", quantity: 2 }, { productId: "perles", quantity: 1 }])));
  assert.equal((await publicCatalog()).products.find(p => p.id === "bonnet")!.stock, 10);
});
test("un identifiant de commande répété ne décrémente pas deux fois le stock", async () => {
  const input = order(); await createOrder(input); await assert.rejects(createOrder(input)); assert.equal((await publicCatalog()).products.find(p => p.id === "bonnet")!.stock, 9);
});
test("un acompte sans connexion de paiement bloque proprement la réservation", async () => {
  const service = (await one<Service>("services", "knotless"))!; service.deposit = { type: "percent", value: 25 }; await saveContent("services", service);
  await assert.rejects(createBooking(booking()), /n’est pas encore configuré/); assert.ok((await availability("knotless", "1-1", future())).includes("08:30"));
});
test("les e-mails sont mis en attente sans annoncer un envoi non effectué", async () => {
  const saved = await createBooking(booking()); const queued = await (await db()).query("SELECT * FROM notifications WHERE booking_id=$1", [saved.id]); assert.equal(queued.rows.length, 2);
  assert.deepEqual(await deliverNotifications(), { sent: 0, failed: 0, configured: false });
});
test("une suppression de catalogue persiste après fermeture et réouverture de la base", async () => {
  await removeContent("services", "shampoing"); await closeDatabase(); assert.equal(await one("services", "shampoing"), undefined);
});

test("l’envoi e-mail suit les réponses du fournisseur et ne renvoie pas la confirmation déjà envoyée", async () => {
  const saved = await createBooking(booking()); process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
  const originalFetch = globalThis.fetch; let requests = 0;
  globalThis.fetch = async (url, options) => { assert.equal(String(url), "https://api.resend.com/emails"); const payload = JSON.parse(String(options?.body)); assert.deepEqual(payload.to, ["test@example.com"]); assert.equal(payload.from, "salon@example.com"); assert.equal(payload.reply_to, initialSettings.email); requests++; return new Response('{}', { status: 201 }); };
  try { assert.deepEqual(await deliverNotifications(), { sent: 1, failed: 0, configured: true }); assert.deepEqual(await deliverNotifications(), { sent: 0, failed: 0, configured: true }); assert.equal(requests, 1); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal((await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1 AND status='sent'", [saved.id])).rows.length, 1);
});
test("le test d’envoi exige une configuration et une adresse salon avant de contacter le fournisseur", async () => {
  let requests = 0; const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { requests++; throw new Error("Aucun appel attendu"); };
  try {
    await assert.rejects(sendTestEmail(), error => error instanceof Error && error.message.includes("RESEND_API_KEY"));
    process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
    await saveSettings({ ...initialSettings, email: "" });
    await assert.rejects(sendTestEmail(), /adresse e-mail du salon/);
    assert.equal(requests, 0);
  } finally { globalThis.fetch = originalFetch; }
});
test("le test d’envoi cible le salon sans confirmer de rendez-vous ni envoyer les notifications en attente", async () => {
  const saved = await createBooking(booking());
  process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
  const originalFetch = globalThis.fetch; let requests = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    const payload = JSON.parse(String(options?.body));
    assert.deepEqual(payload.to, [initialSettings.email]);
    assert.equal(payload.from, "salon@example.com");
    assert.equal(payload.reply_to, initialSettings.email);
    assert.match(payload.subject, /Test d’envoi/); assert.match(payload.text, /e-mail de test/);
    assert.ok(new Headers(options?.headers).get("Idempotency-Key"));
    requests++; return Response.json({ id: "simulated-test-email" }, { status: 201 });
  };
  try { assert.deepEqual(await sendTestEmail(), { accepted: true, recipient: initialSettings.email }); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal(requests, 1);
  const notifications = (await (await db()).query<{ status: string }>("SELECT status FROM notifications WHERE booking_id=$1", [saved.id])).rows;
  assert.equal(notifications.length, 2); assert.ok(notifications.every(item => item.status === "pending"));
  assert.equal((await (await db()).query("SELECT id FROM bookings")).rows.length, 1);
});
test("un fournisseur qui refuse le test ne produit pas une confirmation de succès", async () => {
  process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "Simulated unauthorized key" }, { status: 401 });
  try { await assert.rejects(sendTestEmail(), /L’envoi de test a échoué/); }
  finally { globalThis.fetch = originalFetch; }
});
test("les réponses au rappel utilisent l’adresse actualisée du salon et une adresse vide est omise", async () => {
  const saved = await createBooking(booking());
  const connection = await db();
  await connection.query("UPDATE notifications SET status='sent' WHERE booking_id=$1 AND kind LIKE 'confirmation-%'", [saved.id]);
  await connection.query("UPDATE notifications SET due_at=$2 WHERE booking_id=$1 AND kind LIKE 'reminder-%'", [saved.id, Date.now() - 60000]);
  await saveSettings({ ...initialSettings, email: "reponses@example.com" });
  process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
  const originalFetch = globalThis.fetch; const payloads: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, options) => { payloads.push(JSON.parse(String(options?.body))); return Response.json({ id: "simulated-email" }); };
  try {
    assert.deepEqual(await deliverNotifications(), { sent: 1, failed: 0, configured: true });
    assert.equal(payloads[0].reply_to, "reponses@example.com");
    assert.equal(payloads[0].subject, "Votre rendez-vous approche");
    await saveSettings({ ...initialSettings, email: "" });
    await createBooking(booking({ time: "13:30" }));
    assert.deepEqual(await deliverNotifications(), { sent: 1, failed: 0, configured: true });
    assert.equal(Object.hasOwn(payloads[1], "reply_to"), false);
  } finally { globalThis.fetch = originalFetch; }
});
test("l’adresse fournie complète une ancienne base sans écraser une adresse personnalisée ni les rendez-vous", async () => {
  const saved = await createBooking(booking());
  await saveSettings({ ...initialSettings, email: "" });
  await (await db()).query("DELETE FROM migration_history WHERE id='salon-reply-email-20261007'");
  await closeDatabase();
  assert.equal((await getSettings()).email, "fashionafrobraidsoff@gmail.com");
  assert.equal((await readBooking(saved.id, saved.token)).status, saved.status);
  await saveSettings({ ...initialSettings, email: "autre@example.com" });
  await (await db()).query("DELETE FROM migration_history WHERE id='salon-reply-email-20261007'");
  await closeDatabase();
  assert.equal((await getSettings()).email, "autre@example.com");
});
function paypalTestConfig() {
  process.env.PAYMENT_PROVIDER = "paypal";
  process.env.PAYPAL_CLIENT_ID = "test-only-client-id"; process.env.PAYPAL_CLIENT_SECRET = "test-only-client-secret";
  process.env.PAYPAL_WEBHOOK_ID = "test-only-webhook-id"; process.env.PAYPAL_MODE = "sandbox"; process.env.PUBLIC_SITE_URL = "https://example.com";
}
async function pendingPayment() {
  paypalTestConfig();
  const service = (await one<Service>("services", "knotless"))!; service.deposit = { type: "fixed", value: 1000 }; await saveContent("services", service);
  const saved = await createBooking(booking());
  await (await db()).query("UPDATE bookings SET data=data || $2::jsonb WHERE id=$1", [saved.id, JSON.stringify({ paymentProvider: "paypal", paypalOrderId: "ORDER-TEST" })]);
  return saved;
}
function paymentEvent(amount = "10.00", orderId = "ORDER-TEST", currency = "EUR") {
  const payload = JSON.stringify({ id: "event-" + randomUUID(), event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "CAPTURE-TEST", status: "COMPLETED", amount: { currency_code: currency, value: amount }, supplementary_data: { related_ids: { order_id: orderId } } } });
  const headers = new Headers({ "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api-m.sandbox.paypal.com/certificates/test", "paypal-transmission-id": "test", "paypal-transmission-sig": "valid-test-signature", "paypal-transmission-time": new Date().toISOString() });
  return { payload, headers };
}
async function mockPayPal<T>(operation: (requests: { url: string; body: Record<string, unknown> }[]) => Promise<T>, signature = "SUCCESS", amount = "10.00") {
  const original = globalThis.fetch; const requests: { url: string; body: Record<string, unknown> }[] = [];
  globalThis.fetch = async (url, options) => {
    const address = String(url); const body = options?.body ? (address.endsWith("/token") ? {} : JSON.parse(String(options.body))) : {};
    requests.push({ url: address, body });
    assert.ok(address.startsWith("https://api-m.sandbox.paypal.com/"));
    let result: unknown;
    if (address.endsWith("/token")) result = { access_token: "test-only-access-token" };
    else if (address.endsWith("verify-webhook-signature")) result = { verification_status: signature };
    else if (address.endsWith("/capture")) result = { id: "ORDER-TEST", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "CAPTURE-TEST", status: "COMPLETED", amount: { currency_code: "EUR", value: amount } }] } }] };
    else if (address.endsWith("/ORDER-TEST")) result = { id: "ORDER-TEST", status: "APPROVED" };
    else if (address.endsWith("/v2/checkout/orders")) result = { id: "ORDER-TEST", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-TEST" }] };
    else throw new Error("Requête PayPal inattendue");
    return Response.json(result);
  };
  try { return await operation(requests); } finally { globalThis.fetch = original; }
}
test("un webhook PayPal vérifié confirme exactement 10 € une seule fois", async () => {
  const saved = await pendingPayment(); const event = paymentEvent();
  await assert.rejects(handlePaymentWebhook(event.payload, new Headers()), /Signature/);
  await mockPayPal(async () => { await assert.rejects(handlePaymentWebhook(event.payload, event.headers), /Signature/); }, "FAILURE");
  await mockPayPal(async () => { await handlePaymentWebhook(event.payload, event.headers); await handlePaymentWebhook(event.payload, event.headers); });
  const confirmed = await readBooking(saved.id, saved.token); assert.equal(confirmed.status, "confirmed"); assert.equal(confirmed.data.depositPaid, true); assert.equal(confirmed.data.deposit, 1000);
  assert.equal((await (await db()).query("SELECT * FROM payment_events")).rows.length, 1);
  assert.equal((await (await db()).query("SELECT * FROM notifications WHERE booking_id=$1", [saved.id])).rows.length, 2);
});
test("la règle d’acompte non remboursable est conservée avec la réservation et ses confirmations", async () => {
  const saved = await pendingPayment();
  assert.equal(saved.data.depositPolicy, depositPolicy);
  const event = paymentEvent();
  await mockPayPal(async () => { await handlePaymentWebhook(event.payload, event.headers); });
  const confirmed = await readBooking(saved.id, saved.token);
  assert.equal(confirmed.data.deposit, 1000);
  assert.equal(confirmed.data.depositPolicy, depositPolicy);
  const messages = await (await db()).query<{ body: string }>("SELECT body FROM notifications WHERE booking_id=$1", [saved.id]);
  assert.equal(messages.rows.length, 2);
  for (const message of messages.rows) assert.ok(message.body.includes(depositCancellationNotice));
  await assert.rejects(cancelBooking(saved.id, saved.token), /n’est pas remboursable/);
  const unchanged = await readBooking(saved.id, saved.token);
  assert.equal(unchanged.status, "confirmed");
  assert.equal(unchanged.data.depositPaid, true);
  assert.equal(unchanged.data.paypalCaptureId, "CAPTURE-TEST");
});
test("un montant ou une devise PayPal incorrects ne confirment pas la réservation", async () => {
  const saved = await pendingPayment();
  await mockPayPal(async () => {
    for (const event of [paymentEvent("1.00"), paymentEvent("10.00", "ORDER-TEST", "USD"), paymentEvent("10.001")]) await assert.rejects(handlePaymentWebhook(event.payload, event.headers), /[Mm]ontant/);
  });
  assert.equal((await readBooking(saved.id, saved.token)).status, "pending_payment");
});
test("un paiement tardif ne crée pas de double réservation", async () => {
  const saved = await pendingPayment(); await (await db()).query("UPDATE bookings SET expires_at=$2 WHERE id=$1", [saved.id, Date.now() - 1000]);
  await saveContent("services", { ...initialServices.find(item => item.id === "cornrows")!, deposit: { type: "none", value: 0 } });
  await createBooking(booking({ serviceId: "cornrows", variantId: "standard" })); const event = paymentEvent();
  await mockPayPal(async () => { await handlePaymentWebhook(event.payload, event.headers); });
  const late = await readBooking(saved.id, saved.token); assert.equal(late.status, "cancelled"); assert.equal(late.data.depositPaid, true);
});
test("la page PayPal encaisse 10 €, lie la commande et vérifie la capture avant confirmation", async () => {
  const saved = await pendingPayment();
  await mockPayPal(async requests => {
    const url = await checkoutSession(saved); assert.ok(url.startsWith("https://www.sandbox.paypal.com/"));
    const creation = requests.find(item => item.url.endsWith("/v2/checkout/orders"))!.body;
    assert.deepEqual((creation.purchase_units as { amount: unknown }[])[0].amount, { currency_code: "EUR", value: "10.00" });
    assert.equal((await readBooking(saved.id, saved.token)).status, "pending_payment");
    await assert.rejects(captureBookingPayment(saved.id, "x".repeat(43), "ORDER-TEST"));
    await assert.rejects(captureBookingPayment(saved.id, saved.token, "OTHER-ORDER"), /correspond/);
    await captureBookingPayment(saved.id, saved.token, "ORDER-TEST"); await captureBookingPayment(saved.id, saved.token, "ORDER-TEST");
    assert.equal(requests.filter(item => item.url.endsWith("/capture")).length, 1);
  });
  const confirmed = await readBooking(saved.id, saved.token); assert.equal(confirmed.status, "confirmed"); assert.equal(confirmed.data.paypalCaptureId, "CAPTURE-TEST"); assert.equal(confirmed.data.price - confirmed.data.deposit, 5000);
});
test("le retour du navigateur seul et un autre paiement ne valident pas l’acompte", async () => {
  const saved = await pendingPayment();
  await mockPayPal(async () => { await assert.rejects(captureBookingPayment(saved.id, saved.token, "ORDER-TEST"), /montant/); }, "SUCCESS", "9.99");
  const unrelated = paymentEvent("10.00", "OTHER-ORDER"); await mockPayPal(async () => handlePaymentWebhook(unrelated.payload, unrelated.headers));
  assert.equal((await readBooking(saved.id, saved.token)).data.depositPaid, false);
});
test("les 17 familles de l’affiche reprennent tous les prix fournis et l’acompte fixe", () => {
  const expected: Record<string, number[]> = {
    knotless: [60,75,70,85,85,100], "boho-knotless": [70,85,75,90,85,90], "twist-boho": [75,95,80,95,95,115,120],
    "fulani-knotless": [60,80], "fulani-motif-knotless": [85,115], "spiral-cornrows": [65,75], "criss-cross-knotless": [90,115],
    "fulani-tribal": [85,100], "lemonade-twist": [85,90], "fulani-motifs-twist": [80,90], "fulani-spiral-twist": [85,95], "fulani-motifs-bob": [90,110],
    "french-curl-bob": [85,100,85,100], "french-curl": [100,115], "knotless-boho-bob": [70], "twist-boho-bob": [70], "knotless-bob": [60],
  };
  const verified = initialServices.filter(service => service.pricingVerified); assert.equal(verified.length, 17);
  for (const service of verified) { assert.deepEqual(service.variants.filter(variant => priceIsVerified(service, variant)).map(v => v.price / 100), expected[service.id]); assert.equal(service.hairIncluded, false); }
  assert.ok(initialServices.every(service => service.deposit.type === "fixed" && service.deposit.value === 1000));
});
test("les suppléments de volume boho sont exclusifs et les boucles coûtent 5 €", () => {
  const original = initialServices.find(s => s.id === "boho-knotless")!;
  const service = { ...original, bookingEnabled: true, variants: original.variants.map(variant => ({ ...variant, bookable: true })) };
  assert.equal(selection(service, "medium-1", ["curls", "beads", "volume-2x"]).price, 9000);
  assert.throws(() => selection(service, "medium-1", ["volume-2x", "volume-3x"]), /un seul/);
});
test("les variantes retenues du catalogue public reprennent leurs durées et leurs images", () => {
  const variants = initialServices.filter(service => service.active).flatMap(service => service.variants);
  assert.equal(new Set(variants.map(variant => variant.referenceId).filter(Boolean)).size, 94);
  for (const source of referenceAppointments.filter(source => !retiredReferenceIds.includes(source.id))) {
    const imported = variants.filter(variant => variant.referenceId === String(source.id));
    assert.ok(imported.length > 0);
    for (const variant of imported) { assert.equal(variant.duration, source.duration); if (source.sourceImage) assert.equal(variant.image, source.image); else { assert.ok(variant.imageLink?.startsWith("https://www.pinterest.com/pin/")); assert.notEqual(variant.image, source.image); } assert.equal(variant.estimatedDuration, false); }
  }
});
test("les Knotless Medium réservent 65 minutes et ne dépassent pas la fermeture à 20 h", async () => {
  const service = structuredClone(initialServices.find(service => service.id === "knotless")!);
  service.deposit = { type: "none", value: 0 }; await saveContent("services", service);
  const saved = await createBooking(booking({ time: "10:00" }));
  assert.equal(saved.end_time, timestamp(future(), "11:05"));
  const slots = await availability("knotless", "1-1", future());
  assert.equal(slots[0], "08:30"); assert.ok(!slots.includes("11:00")); assert.ok(slots.includes("11:30"));
  assert.ok(slots.includes("18:30")); assert.ok(!slots.includes("19:00")); assert.ok(!slots.includes("20:00"));
  await assert.rejects(createBooking(booking({ time: "19:00" })), /disponible/);
  const last = await createBooking(booking({ time: "18:30" })); assert.equal(last.end_time, timestamp(future(), "19:35"));
});
test("les prestations retirées disparaissent sans effacer leurs rendez-vous historiques", async () => {
  const legacy = { ...structuredClone(initialServices.find(service => service.id === "cornrows-homme")!), id: "coupe-homme", name: "Dégradé & barbe", options: [], deposit: { type: "none" as const, value: 0 } };
  await saveContent("services", legacy);
  const saved = await createBooking(booking({ serviceId: legacy.id, variantId: legacy.variants[0].id }));
  await (await db()).query("DELETE FROM migration_history WHERE id='fashion-catalogue-selection-20261007'");
  await closeDatabase();
  const catalog = await publicCatalog();
  for (const id of retiredServiceIds) assert.equal(await one("services", id), undefined);
  assert.ok(catalog.gallery.every(photo => !retiredGalleryIds.includes(photo.id)));
  const history = await readBooking(saved.id, saved.token);
  assert.equal(history.data.service, "Dégradé & barbe");
  assert.equal(history.start_time, saved.start_time); assert.equal(history.end_time, saved.end_time);
  await assert.rejects(availability("coupe-homme", legacy.variants[0].id, future()), /prestation/i);
  await closeDatabase(); assert.equal(await one("services", "coupe-homme"), undefined);
});
test("les variantes sans photo utilisent une inspiration Pinterest identifiée", () => {
  const variants = initialServices.filter(service => service.active).flatMap(service => service.variants);
  assert.ok(variants.every(variant => variant.image && variant.image !== "/images/photo-a-ajouter.svg"));
  const inspirations = variants.filter(variant => variant.imageLink);
  assert.equal(inspirations.length, 41);
  for (const variant of inspirations) {
    assert.equal(variant.imageSource, pinterestPhotoLabel);
    assert.ok(pinterestPhotos.some(photo => photo.pin === variant.imageLink && photo.image === variant.image));
  }
});
test("l’import Pinterest remplit les photos manquantes et conserve les modifications du salon", async () => {
  const historical = await createBooking(booking());
  const service = (await one<Service>("services", "tissage-ouvert"))!;
  service.image = "/images/photo-a-ajouter.svg"; service.imageLink = undefined;
  service.variants[0] = { ...service.variants[0], image: service.image, imageLink: undefined, price: 12500, duration: 120 };
  service.deposit = { type: "fixed", value: 1000 }; service.active = false;
  await saveContent("services", service);
  const custom = (await one<Service>("services", "curly-soin"))!;
  custom.image = "/images/fashion-original-8.jpg"; custom.imageLink = undefined;
  custom.variants = custom.variants.map(variant => ({ ...variant, image: custom.image, imageLink: undefined, imageSource: "Photo du salon" }));
  await saveContent("services", custom);
  const storedCustom = (await one<Service>("services", custom.id))!;
  await (await db()).query("UPDATE inventory SET stock=7 WHERE product_id='bonnet'");
  await (await db()).query("DELETE FROM migration_history WHERE id='pinterest-photos-20261007'");
  await closeDatabase();
  const imported = (await one<Service>("services", service.id))!;
  assert.ok(imported.variants[0].imageLink?.startsWith("https://www.pinterest.com/pin/"));
  assert.equal(imported.variants[0].price, 12500); assert.equal(imported.variants[0].duration, 120);
  assert.deepEqual(imported.deposit, service.deposit); assert.equal(imported.active, false);
  assert.deepEqual((await one<Service>("services", custom.id))!.variants, storedCustom.variants);
  assert.equal((await publicCatalog()).products.find(product => product.id === "bonnet")!.stock, 7);
  assert.equal((await readBooking(historical.id, historical.token)).end_time, historical.end_time);
  imported.variants[0].image = "/images/fashion-original-4.jpg"; imported.variants[0].imageLink = undefined;
  await saveContent("services", imported); await closeDatabase();
  assert.equal((await one<Service>("services", imported.id))!.variants[0].image, "/images/fashion-original-4.jpg");
});
test("Micro utilise une estimation identifiée qui bloque toute sa durée et respecte la fermeture", async () => {
  const service = (await one<Service>("services", "knotless"))!;
  const medium = service.variants.find(variant => variant.id === "1-2")!;
  const micro = service.variants.find(variant => variant.id === "3-1")!;
  assert.equal(durationIsEstimated(service, medium), false);
  assert.equal(durationIsEstimated(service, micro), true); assert.equal(canBookVariant(service, micro), true);
  assert.equal(micro.duration, 95); assert.equal(micro.referenceId, undefined);
  const saved = await createBooking(booking({ variantId: "3-1", time: "10:00" }));
  assert.equal(saved.end_time - saved.start_time, 95 * 60000);
  assert.equal(saved.data.durationEstimated, true);
  const slots = await availability("knotless", "3-1", future());
  assert.ok(!slots.includes("11:00")); assert.ok(slots.includes("12:00"));
  assert.ok(slots.includes("18:00")); assert.ok(!slots.includes("18:30"));
  await assert.rejects(createBooking(booking({ variantId: "3-1", time: "18:30" })), /disponible/);
  const messages = await (await db()).query<{ body: string }>("SELECT body FROM notifications WHERE booking_id=$1", [saved.id]);
  assert.ok(messages.rows.every(message => message.body.includes("Durée : environ 1 h 35 min")));
});
test("les durées manquantes deviennent des estimations réservables sans modifier les prix", () => {
  assert.equal(durationEstimates.length, 41);
  for (const estimate of durationEstimates) {
    const service = initialServices.find(item => item.id === estimate.serviceId)!;
    const variant = service.variants.find(item => item.id === estimate.variantId)!;
    const original = posterServices.find(item => item.id === service.id)!.variants.find(item => item.id === variant.id)!;
    assert.equal(variant.price, original.price);
    assert.equal(variant.referenceId, undefined);
    assert.equal(durationIsEstimated(service, variant), true);
    assert.equal(canBookVariant(service, variant), true);
    assert.ok(variant.duration >= 75 && variant.duration <= 150);
  }
});
test("la migration des estimations conserve les rendez-vous et les durées personnalisées puis ne se répète pas", async () => {
  const saved = await createBooking(booking());
  const service = (await one<Service>("services", "knotless"))!;
  service.variants = service.variants.map(variant => variant.id === "3-1" ? { ...variant, duration:450, bookable:false, estimatedDuration:true } : variant);
  await saveContent("services", service);
  const custom = (await one<Service>("services", "boho-knotless"))!;
  custom.variants[0] = { ...custom.variants[0], duration:125, bookable:false };
  custom.active = false;
  await saveContent("services", custom);
  await (await db()).query("UPDATE inventory SET stock=7 WHERE product_id='bonnet'");
  await (await db()).query("DELETE FROM migration_history WHERE id='fashion-duration-estimates-prices-approved-20261007'");
  await closeDatabase();
  const updated = (await one<Service>("services", "knotless"))!;
  assert.equal(updated.variants.find(variant => variant.id === "3-1")!.duration, 95);
  assert.equal(updated.variants.find(variant => variant.id === "3-1")!.bookable, true);
  assert.equal((await one<Service>("services", custom.id))!.variants[0].duration, 125);
  assert.equal((await one<Service>("services", custom.id))!.variants[0].bookable, false);
  assert.equal((await one<Service>("services", custom.id))!.active, false);
  assert.equal((await readBooking(saved.id, saved.token)).end_time, saved.end_time);
  assert.equal((await publicCatalog()).products.find(product => product.id === "bonnet")!.stock, 7);
  updated.variants.find(variant => variant.id === "3-1")!.duration = 120;
  await saveContent("services", updated);
  await saveSettings({ ...initialSettings, pricingApproved:false });
  await closeDatabase();
  assert.equal((await one<Service>("services", "knotless"))!.variants.find(variant => variant.id === "3-1")!.duration, 120);
  assert.equal((await getSettings()).pricingApproved, false);
});
test("le catalogue complet migre une seule fois sans modifier les rendez-vous existants", async () => {
  const saved = await createBooking(booking());
  const service = (await one<Service>("services", "knotless"))!;
  service.variants[0].price = 6500; service.variants[0].duration = 350;
  service.deposit = { type: "fixed", value: 1000 }; service.active = false;
  await saveContent("services", service);
  // Ancienne base incohérente : préparer directement la fixture, car l’admin
  // actuel refuse à raison des horaires qui excluent un rendez-vous existant.
  const settings = structuredClone(initialSettings); settings.schedule["1"].start = "09:00";
  await (await db()).query("UPDATE settings SET data=$1::jsonb WHERE id='salon'", [JSON.stringify(settings)]);
  await (await db()).query("UPDATE inventory SET stock=7 WHERE product_id='bonnet'");
  await (await db()).query("DELETE FROM migration_history WHERE id='goodhair-full-catalogue-20261007'");
  await closeDatabase();
  const imported = (await one<Service>("services", "knotless"))!;
  assert.equal(imported.variants[0].price, 6500); assert.equal(imported.variants[0].duration, 65);
  assert.equal(imported.variants[0].image, "/images/acuity-85575979.jpg"); assert.equal(imported.active, false); assert.deepEqual(imported.deposit, service.deposit);
  assert.equal((await readBooking(saved.id, saved.token)).end_time, saved.end_time);
  const catalog = await publicCatalog(); assert.deepEqual(catalog.settings.schedule, initialSettings.schedule); assert.equal(catalog.products.find(product => product.id === "bonnet")!.stock, 7);
  imported.variants[0].duration = 90; imported.variants[0].price = 7000; await saveContent("services", imported);
  const untouchedDay = String((new Date(`${future()}T12:00:00Z`).getUTCDay() + 1) % 7);
  settings.schedule["1"] = { ...initialSettings.schedule["1"] };
  settings.schedule[untouchedDay].start = "10:00"; await saveSettings(settings); await closeDatabase();
  const updated = (await one<Service>("services", "knotless"))!;
  assert.equal(updated.variants[0].duration, 90); assert.equal(updated.variants[0].price, 7000);
  assert.equal((await publicCatalog()).settings.schedule[untouchedDay].start, "10:00");
});
test("l’import des photos conserve tarifs, durées, acompte et historique puis respecte les modifications admin", async () => {
  const saved = await createBooking(booking());
  const original = (await one<Service>("services", "spiral-cornrows"))!;
  const edited = structuredClone(original);
  edited.image = "/images/poster-spiral-cornrows.jpeg";
  edited.variants = edited.variants.map(variant => ({ ...variant, image: edited.image, duration: 195, price: 6800 }));
  edited.deposit = { type: "fixed", value: 1000 }; edited.active = false;
  await saveContent("services", edited);
  await (await db()).query("DELETE FROM migration_history WHERE id='reference-photos-20261007'");
  await closeDatabase();
  const imported = (await one<Service>("services", "spiral-cornrows"))!;
  assert.equal(imported.image, "/images/reference-spiral-cornrows.jpeg");
  assert.ok(imported.variants.every(variant => variant.image === imported.image && variant.duration === 195 && variant.price === 6800));
  assert.equal(imported.active, false); assert.deepEqual(imported.deposit, edited.deposit);
  assert.equal((await readBooking(saved.id, saved.token)).end_time, saved.end_time);
  imported.image = "/images/poster-spiral-cornrows.jpeg";
  imported.variants[0].duration = 210;
  await saveContent("services", imported); await closeDatabase();
  const reopened = (await one<Service>("services", "spiral-cornrows"))!;
  assert.equal(reopened.image, imported.image); assert.equal(reopened.variants[0].duration, 210);
  assert.equal(reopened.imageSource, original.imageSource);
  await saveContent("services", original);
});
test("l’import de l’affiche conserve l’historique et les futures modifications admin", async () => {
  const saved = await createBooking(booking());
  const connection = await db();
  await connection.query("UPDATE bookings SET data=jsonb_set(data,'{price}','9500'::jsonb) WHERE id=$1", [saved.id]);
  const old = (await one<Service>("services", "knotless"))!; old.variants[0].price = 9900; old.active = false; await saveContent("services", old);
  await connection.query("DELETE FROM migration_history WHERE id='poster-paypal-deposit-20261007'");
  await closeDatabase();
  const imported = (await one<Service>("services", "knotless"))!;
  assert.equal(imported.variants[0].price, 6000); assert.equal(imported.active, false); assert.equal(imported.deposit.value, 1000);
  assert.equal((await readBooking(saved.id, saved.token)).data.price, 9500);
  imported.variants[0].price = 6500; await saveContent("services", imported); await closeDatabase();
  assert.equal((await one<Service>("services", "knotless"))!.variants[0].price, 6500);
});

test("le retour PayPal redirige vers le lien privé et ne confirme pas une commande étrangère", async () => {
  const { NextRequest } = await import("next/server");
  const { GET } = await import("../src/app/api/payments/paypal/return/route");
  const saved = await pendingPayment();
  const query = new URLSearchParams({ bookingId: saved.id, access: saved.token, token: "OTHER-ORDER" });
  const rejected = await GET(new NextRequest("https://example.com/api/payments/paypal/return?" + query));
  assert.equal(rejected.status, 303); assert.equal(new URL(rejected.headers.get("location")!).searchParams.get("payment"), "error");
  assert.equal((await readBooking(saved.id, saved.token)).status, "pending_payment");
  query.set("token", "ORDER-TEST");
  await mockPayPal(async () => {
    const confirmed = await GET(new NextRequest("https://example.com/api/payments/paypal/return?" + query));
    assert.equal(confirmed.status, 303); const location = new URL(confirmed.headers.get("location")!);
    assert.equal(location.origin, "https://example.com"); assert.equal(location.searchParams.get("token"), saved.token); assert.equal(location.searchParams.get("payment"), "success");
  });
  assert.equal((await readBooking(saved.id, saved.token)).status, "confirmed");
});

test("les nouvelles préférences gardent les horaires d’une ancienne base sans les modifier", async () => {
  const old = { ...initialSettings, name: "Salon personnalisé" } as Record<string, unknown>;
  for (const key of ["bookingBufferMinutes", "bookingInstructions", "confirmationEmail", "reminderEmail", "reminderHours"]) delete old[key];
  await (await db()).query("UPDATE settings SET data=$1::jsonb WHERE id='salon'", [JSON.stringify(old)]);
  const settings = await getSettings();
  assert.equal(settings.name, "Salon personnalisé"); assert.equal(settings.reminderHours, 24); assert.equal(settings.bookingBufferMinutes, 0); assert.equal(settings.bookingInstructions, "");
  assert.deepEqual(settings.schedule, initialSettings.schedule);
  assert.deepEqual((await (await db()).query<{ data: object }>("SELECT data FROM settings WHERE id='salon'")).rows[0].data, old);
});
test("la pause entre clientes est respectée pour réserver et déplacer, sans allonger la prestation", async () => {
  const service = (await one<Service>("services", "knotless"))!;
  service.variants[0].duration = 60; await saveContent("services", service);
  await saveSettings({ ...initialSettings, bookingBufferMinutes: 30 });
  const first = await createBooking(booking());
  assert.equal(first.end_time - first.start_time, 60 * 60000);
  const slots = await availability("knotless", "1-1", future());
  assert.equal(slots.includes("09:30"), false); assert.equal(slots.includes("10:00"), true);
  await assert.rejects(createBooking(booking({ time: "09:30" })), /n’est plus disponible/);
  const second = await createBooking(booking({ time: "10:00" }));
  await assert.rejects(moveBooking(second.id, future(), "09:30", "salon"), /n’est pas disponible/);
  await saveContent("employees", { id: "second", name: "Autre coiffeuse", active: true, serviceIds: ["knotless"], schedule: null });
  assert.ok((await availability("knotless", "1-1", future(), [], "second")).includes("08:30"));
});
test("changer horaires, affectation ou pause ne peut invalider les rendez-vous existants", async () => {
  const service = (await one<Service>("services", "knotless"))!;
  service.variants[0].duration = 60; await saveContent("services", service);
  const first = await createBooking(booking()); await createBooking(booking({ time: "09:30" }));
  const closed = structuredClone(initialSettings); closed.schedule[String(new Date(`${future()}T12:00:00Z`).getUTCDay())].closed = true;
  await assert.rejects(saveSettings(closed), /Déplacez-le ou annulez-le/);
  await assert.rejects(saveSettings({ ...initialSettings, bookingBufferMinutes: 15 }), /temps de pause/);
  const member = (await one<Employee>("employees", "salon"))!;
  await assert.rejects(saveContent("employees", { ...member, active: false }), /attribution/);
  await assert.rejects(saveContent("employees", { ...member, serviceIds: ["microlocks"] }), /attribution/);
  assert.deepEqual((await getSettings()).schedule, initialSettings.schedule);
  assert.equal((await getSettings()).bookingBufferMinutes, 0);
  assert.equal((await one<Employee>("employees", "salon"))!.active, true);
  assert.equal((await readBooking(first.id, first.token)).status, "confirmed");
});
test("les consignes, solde et délai de rappel sont enregistrés puis recalculés sans doubler les messages", async () => {
  await saveSettings({ ...initialSettings, bookingInstructions: "Apportez vos mèches choisies.", reminderHours: 48 });
  const saved = await createBooking(booking());
  const connection = await db();
  let rows = (await connection.query<{ kind: string; due_at: number; body: string }>("SELECT kind,due_at,body FROM notifications WHERE booking_id=$1", [saved.id])).rows;
  assert.equal(rows.length, 2);
  assert.match(rows[0].body, /Apportez vos mèches choisies/); assert.match(rows[0].body, /À régler au salon/); assert.match(rows[0].body, /fin prévue/);
  assert.equal(Number(rows.find(row => row.kind.startsWith("reminder-"))!.due_at), saved.start_time - 48 * 3600000);
  await saveSettings({ ...initialSettings, bookingInstructions: "Nouvelle consigne validée.", reminderHours: 72 });
  rows = (await connection.query<{ kind: string; due_at: number; body: string }>("SELECT kind,due_at,body FROM notifications WHERE booking_id=$1", [saved.id])).rows;
  assert.equal(rows.length, 2);
  const reminder = rows.find(row => row.kind.startsWith("reminder-"))!;
  assert.equal(Number(reminder.due_at), saved.start_time - 72 * 3600000); assert.match(reminder.body, /Nouvelle consigne/);
  await connection.query("UPDATE notifications SET status='sent' WHERE booking_id=$1 AND kind LIKE 'reminder-%'", [saved.id]);
  await saveSettings({ ...initialSettings, reminderHours: 24 });
  const sent = (await connection.query<{ status: string; due_at: number }>("SELECT status,due_at FROM notifications WHERE booking_id=$1 AND kind LIKE 'reminder-%'", [saved.id])).rows;
  assert.equal(sent.length, 1); assert.equal(sent[0].status, "sent"); assert.equal(Number(sent[0].due_at), saved.start_time - 72 * 3600000);
});
test("désactiver puis réactiver les rappels ne réenvoie pas les confirmations", async () => {
  const saved = await createBooking(booking()); const connection = await db();
  await saveSettings({ ...initialSettings, reminderEmail: false });
  assert.equal((await connection.query<{ status: string }>("SELECT status FROM notifications WHERE booking_id=$1 AND kind LIKE 'reminder-%'", [saved.id])).rows[0].status, "cancelled");
  await saveSettings({ ...initialSettings, reminderEmail: true });
  assert.equal((await connection.query<{ status: string }>("SELECT status FROM notifications WHERE booking_id=$1 AND kind LIKE 'reminder-%'", [saved.id])).rows[0].status, "pending");
  await saveSettings({ ...initialSettings, confirmationEmail: false, reminderEmail: false });
  assert.equal((await connection.query("SELECT id FROM notifications WHERE booking_id=$1 AND status='pending'", [saved.id])).rows.length, 0);
  const next = await createBooking(booking({ date: addDays(future(), 1) }));
  assert.equal((await connection.query("SELECT id FROM notifications WHERE booking_id=$1", [next.id])).rows.length, 0);
});
test("les messages de rendez-vous passés sont ignorés et deux envois concurrents ne doublent pas une confirmation", async () => {
  const old = await createBooking(booking()); const connection = await db();
  await connection.query("UPDATE bookings SET start_time=$2,end_time=$3 WHERE id=$1", [old.id, Date.now() - 2 * 3600000, Date.now() - 3600000]);
  await connection.query("UPDATE notifications SET due_at=$2 WHERE booking_id=$1", [old.id, Date.now() - 60000]);
  const current = await createBooking(booking({ date: addDays(future(), 1) }));
  process.env.RESEND_API_KEY = "test-only-key"; process.env.EMAIL_FROM = "salon@example.com";
  const originalFetch = globalThis.fetch; let sent = 0;
  globalThis.fetch = async (_url, options) => { const body = JSON.parse(String(options?.body)); assert.match(body.text, new RegExp(current.id)); sent++; return new Response('{}', { status: 201 }); };
  try { const results = await Promise.all([deliverNotifications(), deliverNotifications()]); assert.equal(results.reduce((sum, result) => sum + result.sent, 0), 1); assert.equal(sent, 1); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal((await connection.query("SELECT id FROM notifications WHERE booking_id=$1 AND status='cancelled'", [old.id])).rows.length, 2);
});
test("la préparation distingue configuration, prix validés et tâche de rappel réellement observée", () => {
  const service = structuredClone(initialServices.find(item => item.id === "knotless")!);
  service.variants[0].pricingVerified = false;
  const employees = [{ id: "salon", name: "Équipe du salon", active: true, serviceIds: [], schedule: null }];
  const settings = { ...initialSettings, pricingApproved: false };
  let ready = bookingReadiness([service], employees, settings, null);
  assert.equal(ready.payment.configured, false); assert.equal(ready.email.configured, false); assert.equal(ready.reminders.recent, false); assert.equal(ready.team.genericResource, true);
  assert.ok(ready.catalog.items.some(item => item.variantId === service.variants[0].id && item.pricePending));
  service.variants[0].pricingVerified = true;
  ready = bookingReadiness([service], employees, settings, { at: Date.now(), configured: true, sent: 1, failed: 0 });
  assert.equal(ready.reminders.recent, true);
  assert.equal(ready.catalog.items.some(item => item.variantId === service.variants[0].id && item.pricePending), false);
  assert.equal(bookingReadiness([service], employees, initialSettings, { at: Date.now(), configured: false, sent: 0, failed: 0 }).reminders.recent, false);
});

function sumupTestConfig() {
  process.env.PAYMENT_PROVIDER = "sumup"; process.env.SUMUP_API_KEY = "test-only-sumup-key";
  process.env.SUMUP_MERCHANT_CODE = "MTEST123"; process.env.SUMUP_MODE = "test"; process.env.PUBLIC_SITE_URL = "https://example.com";
}
async function pendingSumUp() {
  sumupTestConfig();
  const service = (await one<Service>("services", "knotless"))!;
  await saveContent("services", { ...service, deposit: { type: "fixed", value: 1000 } });
  return createBooking(booking());
}
const checkoutId = "b06322ef-4c67-44c3-bd87-354c2ee4fd77";
const transactionId = "3c0ce053-f55c-49d4-9d4c-e62c0fd56c7d";
async function mockSumUp(operation: (mock: { requests: { url: string; method: string; body: Record<string, unknown> }[]; changes: Record<string, unknown> }) => Promise<void>) {
  const original = globalThis.fetch;
  const requests: { url: string; method: string; body: Record<string, unknown> }[] = [];
  const changes: Record<string, unknown> = {};
  let reference = "";
  globalThis.fetch = async (url, options) => {
    const path = String(url); const method = options?.method || "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    requests.push({ url: path, method, body });
    assert.equal(new Headers(options?.headers).get("authorization"), "Bearer test-only-sumup-key");
    if (path === "https://api.sumup.com/v1/merchants/MTEST123") return Response.json({ merchant_code: "MTEST123", default_currency: "EUR", sandbox: changes.sandbox ?? true });
    if (path === "https://api.sumup.com/v0.1/checkouts" && method === "POST") {
      reference = String(body.checkout_reference);
      if (changes.creationError) return Response.json({}, { status: 503 });
      return Response.json({ id: checkoutId, checkout_reference: reference, amount: 10, currency: "EUR", merchant_code: "MTEST123", status: "PENDING", hosted_checkout_url: changes.url || "https://checkout.sumup.com/pay/" + checkoutId });
    }
    if (path === "https://api.sumup.com/v0.1/checkouts/" + checkoutId) return Response.json({
      id: checkoutId, checkout_reference: reference, amount: 10, currency: "EUR", merchant_code: "MTEST123", status: changes.paid ? "PAID" : "PENDING",
      transaction_id: transactionId, ...changes.checkout as object,
    });
    if (path === "https://api.sumup.com/v2.1/merchants/MTEST123/transactions?id=" + transactionId) return Response.json({ id: transactionId, status: "SUCCESSFUL", amount: 10, currency: "EUR", merchant_code: "MTEST123", ...changes.transaction as object });
    throw new Error("Appel fournisseur non simulé : " + path);
  };
  try { await operation({ requests, changes }); } finally { globalThis.fetch = original; }
}

test("le virement est choisi par défaut et l’option SumUp exige sa configuration", async () => {
  assert.equal((await publicCatalog()).bookingPaymentProvider, "bank_transfer");
  assert.equal(bookingPaymentsConfigured(), false);
  sumupTestConfig(); assert.equal(sumupConfigured(), true); assert.equal(bookingPaymentsConfigured(), true);
  process.env.DEMO_MODE = "true"; process.env.SUMUP_MODE = "live"; assert.equal(bookingPaymentsConfigured(), false);
  process.env.SUMUP_MODE = "test"; assert.equal(bookingPaymentsConfigured(), true);
  process.env.PAYMENT_PROVIDER = "inconnu"; assert.equal(bookingPaymentsConfigured(), false);
});

test("le mode SumUp test refuse un profil réel avant de créer un paiement", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes, requests }) => {
    changes.sandbox = false;
    await assert.rejects(sumupCheckoutSession(saved), /profil SumUp/);
    assert.equal(requests.some(request => request.method === "POST"), false);
  });
  assert.equal((await readBooking(saved.id, saved.token)).data.sumupCheckoutId, undefined);
});

test("le paiement hébergé SumUp réserve exactement 10 EUR avec expiration et retour privé", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ requests }) => {
    assert.equal(await bookingCheckoutSession(saved), "https://checkout.sumup.com/pay/" + checkoutId);
    const payload = requests.find(request => request.method === "POST")!.body;
    assert.equal(payload.amount, 10); assert.equal(payload.currency, "EUR"); assert.equal(payload.merchant_code, "MTEST123");
    assert.equal(payload.checkout_reference, saved.id); assert.deepEqual(payload.hosted_checkout, { enabled: true });
    assert.equal(payload.valid_until, new Date(saved.expires_at!).toISOString());
    assert.equal(payload.return_url, "https://example.com/api/payments/sumup/webhook");
    const redirect = new URL(String(payload.redirect_url)); assert.equal(redirect.searchParams.get("access"), saved.token);
    const updated = await readBooking(saved.id, saved.token);
    assert.equal(updated.status, "pending_payment"); assert.equal(updated.data.sumupCheckoutId, checkoutId);
    assert.equal(updated.data.sumupMode, "test"); assert.equal(updated.data.depositPaid, false);
    assert.equal((await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1", [saved.id])).rows.length, 0);
  });
});

test("un lien de paiement SumUp externe ou non sécurisé est refusé", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes }) => {
    for (const url of ["https://checkout.sumup.com.evil.test/pay/id", "http://checkout.sumup.com/pay/id", "https://user:password@checkout.sumup.com/pay/id"]) {
      changes.url = url; await assert.rejects(sumupCheckoutSession(saved), /Lien de paiement SumUp invalide/);
    }
  });
  assert.equal((await readBooking(saved.id, saved.token)).data.paymentUrl, undefined);
});

test("un callback SumUp seul ne confirme rien puis une transaction vérifiée confirme une seule fois", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes, requests }) => {
    await sumupCheckoutSession(saved);
    const event = JSON.stringify({ event_type: "CHECKOUT_STATUS_CHANGED", id: checkoutId, status: "PAID" });
    await handleSumUpWebhook(event);
    assert.equal((await readBooking(saved.id, saved.token)).data.depositPaid, false);
    assert.equal(requests.some(request => request.url.includes("/transactions?")), false);
    changes.paid = true;
    await Promise.all([handleSumUpWebhook(event), verifySumUpPayment(saved.id, saved.token)]);
    await handleSumUpWebhook(event);
  });
  const paid = await readBooking(saved.id, saved.token);
  assert.equal(paid.status, "confirmed"); assert.equal(paid.data.depositPaid, true); assert.equal(paid.data.sumupTransactionId, transactionId);
  assert.equal(paid.data.depositPolicy, depositPolicy); assert.equal(paid.data.price - paid.data.deposit, 5000);
  assert.equal((await (await db()).query("SELECT id FROM payment_events")).rows.length, 1);
  assert.equal((await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1", [saved.id])).rows.length, 2);
});

test("la vérification SumUp refuse montant, devise, marchand, référence et transaction incorrects", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes }) => {
    await sumupCheckoutSession(saved); changes.paid = true;
    for (const checkout of [{ amount: 9.99 }, { amount: 10.001 }, { currency: "USD" }, { merchant_code: "MAUTRE12" }, { checkout_reference: "AUTRE-RDV" }, { id: "AUTRE-CHECKOUT" }]) {
      changes.checkout = checkout; await assert.rejects(verifySumUpPayment(saved.id, saved.token));
    }
    changes.checkout = {};
    for (const transaction of [{ amount: 9.99 }, { currency: "USD" }, { merchant_code: "MAUTRE12" }, { id: "AUTRE-TRANSACTION" }, { status: "FAILED" }, { status: "REFUNDED" }]) {
      changes.transaction = transaction; await assert.rejects(verifySumUpPayment(saved.id, saved.token));
    }
  });
  assert.equal((await readBooking(saved.id, saved.token)).status, "pending_payment");
  assert.equal((await (await db()).query("SELECT id FROM payment_events")).rows.length, 0);
});

test("un paiement SumUp tardif avec conflit exige une vérification salon sans doubler le créneau", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes }) => {
    await sumupCheckoutSession(saved);
    await (await db()).query("UPDATE bookings SET expires_at=$2 WHERE id=$1", [saved.id, Date.now() - 1000]);
    await saveContent("services", { ...initialServices.find(item => item.id === "cornrows")!, deposit: { type: "none", value: 0 } });
    await createBooking(booking({ serviceId: "cornrows", variantId: "standard" }));
    changes.paid = true; await verifySumUpPayment(saved.id, saved.token);
  });
  const late = await readBooking(saved.id, saved.token);
  assert.equal(late.status, "cancelled"); assert.equal(late.data.depositPaid, true); assert.equal(late.data.paymentReviewRequired, true);
  assert.equal((await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1", [saved.id])).rows.length, 0);
});

test("un callback SumUp inconnu ou malformé ne contacte pas le fournisseur", async () => {
  await mockSumUp(async ({ requests }) => {
    await handleSumUpWebhook(JSON.stringify({ event_type: "FUTURE_EVENT", id: "unrelated" }));
    await handleSumUpWebhook(JSON.stringify({ event_type: "CHECKOUT_STATUS_CHANGED", id: randomUUID() }));
    await assert.rejects(handleSumUpWebhook("null"), /invalide/);
    await assert.rejects(handleSumUpWebhook(JSON.stringify({ event_type: "CHECKOUT_STATUS_CHANGED", id: "../me" })), /invalide/);
    assert.equal(requests.length, 0);
  });
});

test("le retour SumUp exige le lien privé et relit le paiement avant toute confirmation", async () => {
  const { NextRequest } = await import("next/server");
  const { GET } = await import("../src/app/api/payments/sumup/return/route");
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes }) => {
    await sumupCheckoutSession(saved);
    const query = new URLSearchParams({ bookingId: saved.id, access: "x".repeat(43), payment: "success" });
    assert.equal((await GET(new NextRequest("https://example.com/api/payments/sumup/return?" + query))).status, 404);
    query.set("access", saved.token);
    const pending = await GET(new NextRequest("https://example.com/api/payments/sumup/return?" + query));
    assert.equal(new URL(pending.headers.get("location")!).searchParams.get("payment"), "pending");
    assert.equal((await readBooking(saved.id, saved.token)).data.depositPaid, false);
    changes.paid = true;
    const success = await GET(new NextRequest("https://example.com/api/payments/sumup/return?" + query));
    assert.equal(success.status, 303);
    const location = new URL(success.headers.get("location")!);
    assert.equal(location.origin, "https://example.com"); assert.equal(location.searchParams.get("token"), saved.token);
    assert.equal(location.searchParams.get("payment"), "success");
  });
});

test("un échec de création SumUp annule la retenue sans envoyer de confirmation", async () => {
  sumupTestConfig();
  const service = (await one<Service>("services", "knotless"))!; await saveContent("services", { ...service, deposit: { type: "fixed", value: 1000 } });
  const { NextRequest } = await import("next/server"); const { POST } = await import("../src/app/api/bookings/route");
  await mockSumUp(async ({ changes }) => {
    changes.creationError = true;
    const response = await POST(new NextRequest("https://example.com/api/bookings", { method: "POST", headers: { origin: "https://example.com", host: "example.com", "Content-Type": "application/json" }, body: JSON.stringify(booking()) }));
    assert.equal(response.status, 502);
  });
  const rows = (await (await db()).query<{ status: string }>("SELECT status FROM bookings")).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].status, "cancelled");
  assert.equal((await (await db()).query("SELECT id FROM notifications")).rows.length, 0);
});

test("le callback SumUp confirmé déclenche une seule confirmation e-mail et conserve le rappel futur", async () => {
  const saved = await pendingSumUp();
  const { NextRequest } = await import("next/server");
  const { POST } = await import("../src/app/api/payments/sumup/webhook/route");
  let delivered = 0;
  await mockSumUp(async ({ changes }) => {
    await sumupCheckoutSession(saved); changes.paid = true;
    process.env.RESEND_API_KEY = "test-only-resend-key"; process.env.EMAIL_FROM = "salon@example.com";
    const paymentFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url) !== "https://api.resend.com/emails") return paymentFetch(url, options);
      const email = JSON.parse(String(options?.body));
      assert.deepEqual(email.to, ["test@example.com"]); assert.match(email.text, /Acompte payé : 10\s*€/); assert.ok(email.text.includes(depositCancellationNotice));
      delivered++; return Response.json({ id: "simulated-confirmation" }, { status: 201 });
    };
    try {
      for (let repeat = 0; repeat < 2; repeat++) {
        const response = await POST(new NextRequest("https://example.com/api/payments/sumup/webhook", { method: "POST", body: JSON.stringify({ event_type: "CHECKOUT_STATUS_CHANGED", id: checkoutId }) }));
        assert.equal(response.status, 204);
      }
    } finally { globalThis.fetch = paymentFetch; }
  });
  assert.equal(delivered, 1);
  const rows = (await (await db()).query<{ kind: string; status: string }>("SELECT kind,status FROM notifications WHERE booking_id=$1", [saved.id])).rows;
  assert.equal(rows.filter(row => row.kind.startsWith("confirmation-") && row.status === "sent").length, 1);
  assert.equal(rows.filter(row => row.kind.startsWith("reminder-") && row.status === "pending").length, 1);
});

test("SumUp accepte l’historique officiel sans transaction_id et refuse deux références contradictoires", async () => {
  const saved = await pendingSumUp();
  await mockSumUp(async ({ changes }) => {
    await sumupCheckoutSession(saved); changes.paid = true;
    changes.checkout = { transactions: [{ id: "OTHER-TRANSACTION", status: "SUCCESSFUL" }] };
    await assert.rejects(verifySumUpPayment(saved.id, saved.token), /transaction SumUp/);
    assert.equal((await readBooking(saved.id, saved.token)).data.depositPaid, false);
    changes.checkout = { transaction_id: undefined, transactions: [{ id: transactionId, status: "SUCCESSFUL" }] };
    assert.equal(await verifySumUpPayment(saved.id, saved.token), "confirmed");
  });
});

const testTransferSettings = { ...initialSettings, bookingPaymentMethod: 'bank_transfer' as const, bankTransferBeneficiary: 'Bénéficiaire de test', bankTransferIban: 'FR1420041010050500013M02606', bankTransferBic: 'PSSTFRPPXXX', bankTransferHoldHours: 24 };
async function transferFixture() {
  await saveSettings(testTransferSettings);
  const service = (await one<Service>('services', 'knotless'))!;
  await saveContent('services', { ...service, deposit: { type: 'fixed', value: 1000 } });
}
test('le virement valide son IBAN et le choix admin remplace une ancienne configuration SumUp', async () => {
  await assert.rejects(saveSettings({ ...testTransferSettings, bankTransferIban: 'FR1520041010050500013M02606' }));
  await saveSettings({ ...testTransferSettings, bankTransferIban: 'fr14 2004 1010 0505 0001 3m02 606' });
  process.env.PAYMENT_PROVIDER = 'sumup';
  const settings = await getSettings();
  assert.equal(settings.bankTransferIban, testTransferSettings.bankTransferIban);
  assert.equal(bookingReadiness([], [], settings, null).payment.provider, 'bank_transfer');
  assert.equal(bookingPaymentsConfigured(settings), true);
});
test('le catalogue public ne divulgue pas les coordonnées bancaires et les anciens réglages sont complétés', async () => {
  await transferFixture();
  const publicData = await publicCatalog();
  assert.equal(publicData.bookingPaymentProvider, 'bank_transfer'); assert.equal(publicData.bookingPaymentsEnabled, true);
  for (const key of ['bankTransferIban', 'bankTransferBic', 'bankTransferBeneficiary'] as const) assert.equal(publicData.settings[key], '');
  const previous = { ...initialSettings } as Record<string, unknown>;
  for (const key of ['bookingPaymentMethod', 'bankTransferIban', 'bankTransferBic', 'bankTransferBeneficiary', 'bankTransferHoldHours']) delete previous[key];
  await (await db()).query("UPDATE settings SET data=$1::jsonb WHERE id='salon'", [JSON.stringify(previous)]);
  assert.equal((await getSettings()).bankTransferHoldHours, 24); assert.equal((await getSettings()).bankTransferIban, '');
});
test('le virement retient le créneau 24 h sans checkout ni e-mail avant validation et conserve son IBAN', async () => {
  await transferFixture(); const before = Date.now(); const saved = await createBooking(booking());
  assert.equal(saved.status, 'pending_payment'); assert.equal(saved.data.depositPaid, false); assert.equal(saved.data.deposit, 1000);
  assert.ok(saved.expires_at! >= before + 24 * 3600000); assert.ok(saved.expires_at! <= Date.now() + 24 * 3600000);
  assert.equal(await bookingCheckoutSession(saved), null);
  assert.equal((await (await db()).query('SELECT id FROM notifications')).rows.length, 0);
  assert.ok(!(await availability('knotless', '1-1', future())).includes('08:30'));
  await saveSettings({ ...testTransferSettings, bankTransferIban: '', bankTransferHoldHours: 1 });
  assert.equal((await readBooking(saved.id, saved.token)).data.bankTransfer!.iban, testTransferSettings.bankTransferIban);
  assert.equal((await readBooking(saved.id, saved.token)).expires_at, saved.expires_at);
});
test('le délai de virement ne dépasse jamais le début du rendez-vous', async () => {
  await transferFixture(); await saveSettings({ ...testTransferSettings, bankTransferHoldHours: 72 });
  const nextDay = addDays(parisDate(), 1); const saved = await createBooking(booking({ date: nextDay }));
  assert.equal(saved.expires_at, saved.start_time);
});
test('deux validations de virement concurrentes enregistrent un acompte et une seule confirmation', async () => {
  await transferFixture(); const saved = await createBooking(booking());
  await Promise.all([receiveBankTransfer(saved.id, 'TEST-RECEPTION'), receiveBankTransfer(saved.id, 'DOUBLON')]);
  const restored = await readBooking(saved.id, saved.token);
  assert.equal(restored.status, 'confirmed'); assert.equal(restored.data.depositPaid, true);
  assert.ok(restored.data.bankTransferReceivedAt); assert.equal(restored.data.bankTransferReceiptReference, 'TEST-RECEPTION');
  assert.equal((await (await db()).query('SELECT id FROM payment_events')).rows.length, 1);
  const messages = (await (await db()).query<{kind:string;body:string}>('SELECT kind,body FROM notifications')).rows;
  assert.equal(messages.filter(message => message.kind.startsWith('confirmation-')).length, 1);
  assert.equal(messages.filter(message => message.kind.startsWith('reminder-')).length, 1);
  assert.ok(messages.every(message => !message.body.includes(testTransferSettings.bankTransferIban)));
  assert.match(messages[0].body, /Acompte payé : 10\s*€/);
});
test('un virement tardif confirme seulement si le créneau est encore libre', async () => {
  await transferFixture(); const saved = await createBooking(booking());
  await (await db()).query('UPDATE bookings SET expires_at=$2 WHERE id=$1', [saved.id, Date.now()-1]);
  assert.ok((await availability('knotless', '1-1', future())).includes('08:30'));
  assert.equal((await receiveBankTransfer(saved.id)).status, 'confirmed');
});
test('un virement tardif en conflit enregistre la réception sans faux rendez-vous puis permet un déplacement', async () => {
  await transferFixture(); const old = await createBooking(booking());
  await (await db()).query('UPDATE bookings SET expires_at=$2 WHERE id=$1', [old.id, Date.now()-1]);
  const next = await createBooking(booking({ name:'Autre cliente' }));
  assert.deepEqual(await receiveBankTransfer(old.id), { status:'cancelled', reviewRequired:true });
  assert.equal((await readBooking(old.id, old.token)).data.depositPaid, true);
  assert.equal((await readBooking(next.id, next.token)).status, 'pending_payment');
  assert.equal((await (await db()).query('SELECT id FROM notifications')).rows.length, 0);
  await assert.rejects(moveBooking(old.id, future(), '08:30', 'salon'));
  await moveBooking(old.id, addDays(future(), 1), '08:30', 'salon');
  const moved = await readBooking(old.id, old.token);
  assert.equal(moved.status, 'confirmed'); assert.equal(moved.data.paymentReviewRequired, false); assert.equal(moved.data.depositPaid, true);
  assert.equal((await (await db()).query('SELECT id FROM notifications')).rows.length, 2);
});
test('un rendez-vous annulé ou sans acompte ne peut pas être confirmé comme virement reçu', async () => {
  const noDeposit = await createBooking(booking()); await assert.rejects(receiveBankTransfer(noDeposit.id));
  await transferFixture(); const saved = await createBooking(booking({ time:'13:30' }));
  await cancelBooking(saved.id, saved.token); await assert.rejects(receiveBankTransfer(saved.id));
  assert.equal((await readBooking(saved.id, saved.token)).data.depositPaid, false);
});
test('seule la session salon peut valider un virement et le serveur envoie la confirmation après son attestation', async () => {
  await transferFixture(); const saved = await createBooking(booking());
  const { NextRequest } = await import('next/server'); const { PATCH } = await import('../src/app/api/admin/bookings/[id]/route');
  const { createSession } = await import('../src/lib/auth');
  process.env.ADMIN_PASSWORD = 'test-only-admin-password-32-characters';
  const cookie = 'fab_admin=' + createSession();
  const request = (body: object, authenticated=true) => new NextRequest('https://example.com/api/admin/bookings/' + saved.id, { method:'PATCH',headers:{origin:'https://example.com',host:'example.com','Content-Type':'application/json',...(authenticated ? {cookie} : {})},body:JSON.stringify(body) });
  const context = {params:Promise.resolve({id:saved.id})};
  assert.equal((await PATCH(request({action:'receive_transfer',received:true},false),context)).status,401);
  assert.equal((await PATCH(request({action:'receive_transfer',received:false}),context)).status,400);
  assert.equal((await (await db()).query('SELECT id FROM notifications')).rows.length,0);
  process.env.RESEND_API_KEY='test-only-resend';process.env.EMAIL_FROM='test@example.com';
  const previousFetch=globalThis.fetch;let sent=0;
  globalThis.fetch=async (url,options) => {
    assert.equal(String(url),'https://api.resend.com/emails');const email=JSON.parse(String(options?.body));
    assert.match(email.subject,/Votre rendez-vous/);assert.ok(!email.text.includes(testTransferSettings.bankTransferIban));
    sent++;return new Response(JSON.stringify({id:'test-only-mail'}),{status:200});
  };
  try {
    const response=await PATCH(request({action:'receive_transfer',received:true}),context);assert.equal(response.status,200);
    assert.equal((await response.json()).confirmationEmailStatus,'sent');
    await PATCH(request({action:'receive_transfer',received:true}),context);assert.equal(sent,1);
    assert.equal((await readBooking(saved.id,saved.token)).status,'confirmed');
  } finally {globalThis.fetch=previousFetch;delete process.env.ADMIN_PASSWORD;}
});

test('le QR SEPA encode UTF-8, montant exact et référence sans imposer un BIC', () => {
  const payload = bankTransferQrPayload({ beneficiary:'Équipe du salon', iban:'fr14 2004 1010 0505 0001 3m02 606', amount:1005, reference:'RDV-TEST-QR' });
  assert.deepEqual(payload.split('\n'), ['BCD','002','1','SCT','','Équipe du salon','FR1420041010050500013M02606','EUR10.05','','','RDV-TEST-QR']);
  const bic = bankTransferQrPayload({ beneficiary:'Salon', iban:testTransferSettings.bankTransferIban, bic:'psstfrppxxx', amount:1000, reference:'RDV-TEST' });
  assert.equal(bic.split('\n')[4], 'PSSTFRPPXXX'); assert.equal(bic.split('\n')[7], 'EUR10.00');
});
test('le QR refuse les montants invalides et les coordonnées qui dépassent le format SEPA', () => {
  const input = { beneficiary:'Salon', iban:testTransferSettings.bankTransferIban, amount:1000, reference:'RDV-TEST' };
  for (const patch of [{amount:0},{amount:-1},{amount:10.5},{amount:100000000000},{iban:'FR1520041010050500013M02606'},{bic:'INVALIDE!'},{beneficiary:'Salon\nEUR0.01'},{beneficiary:'S'.repeat(71)},{reference:'R'.repeat(141)},{reference:'RDV\r\nAUTRE'},{beneficiary:'É'.repeat(70),reference:'€'.repeat(100)}]) {
    assert.throws(() => bankTransferQrPayload({...input,...patch}), BankTransferQrError);
  }
});
test('le PNG privé est lisible et utilise le montant, la référence et les coordonnées conservées avec le rendez-vous', async () => {
  await transferFixture(); const saved = await createBooking(booking());
  await saveSettings({...testTransferSettings,bankTransferBeneficiary:'Autre bénéficiaire',bankTransferBic:''});
  const { NextRequest } = await import('next/server'); const { GET } = await import('../src/app/api/bookings/[id]/transfer-qr/route');
  const context = {params:Promise.resolve({id:saved.id})};
  const request = (query='') => new NextRequest(`https://example.com/api/bookings/${saved.id}/transfer-qr?token=${saved.token}${query}`);
  const png = await GET(request('&amount=1&iban=INVENTE&download=1'),context);
  assert.equal(png.status,200); assert.equal(png.headers.get('content-type'),'image/png');
  assert.equal(png.headers.get('cache-control'),'private, no-store'); assert.equal(png.headers.get('referrer-policy'),'no-referrer');
  assert.match(png.headers.get('content-disposition')!,new RegExp(`^attachment; filename="virement-${saved.id}\\.png"$`));
  const {data,info}=await sharp(Buffer.from(await png.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,480);assert.equal(info.height,480);
  const decoded = jsQR(new Uint8ClampedArray(data),info.width,info.height); assert.ok(decoded,'Le PNG doit être décodable par un lecteur QR indépendant');
  const fields=decoded.data.split('\n');assert.equal(fields[5],'Bénéficiaire de test');assert.equal(fields[6],testTransferSettings.bankTransferIban);assert.equal(fields[7],'EUR10.00');assert.equal(fields[10],saved.id);
  const after=await readBooking(saved.id,saved.token);assert.equal(after.status,'pending_payment');assert.equal(after.data.depositPaid,false);
  assert.equal((await (await db()).query('SELECT id FROM notifications')).rows.length,0);
});
test('le QR ne divulgue rien sans le lien privé et disparaît après expiration, annulation ou paiement', async () => {
  await transferFixture(); const saved=await createBooking(booking());
  const { NextRequest } = await import('next/server'); const { GET } = await import('../src/app/api/bookings/[id]/transfer-qr/route');
  const request = (token=saved.token) => new NextRequest(`https://example.com/api/bookings/${saved.id}/transfer-qr?token=${token}`);
  const context={params:Promise.resolve({id:saved.id})};
  for(const token of ['', 'incorrect', 'x'.repeat(43)]) {
    const response=await GET(request(token),context);assert.equal(response.status,404);assert.equal(response.headers.get('cache-control'),'private, no-store');
    assert.ok(!(await response.text()).includes(testTransferSettings.bankTransferIban));
  }
  await (await db()).query('UPDATE bookings SET expires_at=$2 WHERE id=$1',[saved.id,Date.now()-1]);
  assert.equal((await GET(request(),context)).status,409);
  await (await db()).query('UPDATE bookings SET expires_at=$2 WHERE id=$1',[saved.id,Date.now()+3600000]);
  await cancelBooking(saved.id,saved.token);assert.equal((await GET(request(),context)).status,409);
  const paid=await createBooking(booking());await receiveBankTransfer(paid.id);
  assert.equal((await GET(new NextRequest(`https://example.com/api/bookings/${paid.id}/transfer-qr?token=${paid.token}`),{params:Promise.resolve({id:paid.id})})).status,409);
});
test('des coordonnées non encodables gardent la réservation en attente avec un refus QR explicite', async () => {
  await transferFixture();await saveSettings({...testTransferSettings,bankTransferBeneficiary:'S'.repeat(71)});
  const saved=await createBooking(booking());
  const { NextRequest } = await import('next/server'); const { GET } = await import('../src/app/api/bookings/[id]/transfer-qr/route');
  const response=await GET(new NextRequest(`https://example.com/api/bookings/${saved.id}/transfer-qr?token=${saved.token}`),{params:Promise.resolve({id:saved.id})});
  assert.equal(response.status,400);assert.match((await response.json()).error,/coordonnées de votre réservation/);
  assert.equal((await readBooking(saved.id,saved.token)).status,'pending_payment');
});
