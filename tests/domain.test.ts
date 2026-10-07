import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { db, closeDatabase, one, publicCatalog } from "../src/lib/db";
import { initialSettings, initialServices, type Service } from "../src/lib/catalog";
import { availability, createBooking, readBooking, cancelBooking, createOrder, readOrder, updateOrder, createBlock, moveBooking, selection } from "../src/lib/domain";
import { saveContent, removeContent, saveSettings } from "../src/lib/admin";
import { addDays, parisDate, timestamp, localTimeToEpoch } from "../src/lib/time";
import { bookingSchema, orderSchema } from "../src/lib/validation";
import { deliverNotifications } from "../src/lib/notifications";
import Stripe from "stripe";
import { handlePaymentWebhook } from "../src/lib/payments";

let directory: string;
const future = () => addDays(parisDate(), 5);
const booking = (patch = {}) => bookingSchema.parse({ serviceId: "knotless", variantId: "1-1", date: future(), time: "08:30", name: "Cliente Test", email: "test@example.com", phone: "0612345678", consent: true, ...patch });
const order = (items = [{ productId: "bonnet", quantity: 1 }], patch = {}) => orderSchema.parse({ name: "Cliente Test", email: "test@example.com", phone: "0612345678", consent: true, requestId: randomUUID(), items, ...patch });
before(async () => { directory = await mkdtemp(join(tmpdir(), "fab-domain-tests-")); process.env.DATA_DIR = directory; delete process.env.DATABASE_URL; delete process.env.RESEND_API_KEY; delete process.env.STRIPE_SECRET_KEY; await db(); });
beforeEach(async () => {
  for (const name of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "PUBLIC_SITE_URL", "RESEND_API_KEY", "EMAIL_FROM"]) delete process.env[name];
  const connection = await db();
  for (const table of ["notifications", "bookings", "orders", "blocks", "payment_events"]) await connection.query(`DELETE FROM ${table}`);
  await connection.query("DELETE FROM content WHERE collection='employees' AND id<>'salon'");
  await connection.query("UPDATE inventory SET stock=10");
  await saveSettings(initialSettings);
  await saveContent("services", initialServices.find(item => item.id === "knotless"));
});
after(async () => { await closeDatabase(); await rm(directory, { recursive: true, force: true }); });

test("le catalogue charge les catégories et les quatre produits fournis", async () => {
  const catalog = await publicCatalog(); assert.ok(catalog.services.length > 60); assert.equal(catalog.products.length, 4); assert.equal(catalog.settings.address, initialSettings.address); assert.equal(catalog.settings.pricingApproved, false);
});
test("variante et options recalculent prix et durée côté serveur", async () => {
  const service = (await one<Service>("services", "knotless"))!;
  const picked = selection(service, "1-1", ["color", "beads"]);
  assert.equal(picked.price, 9500); assert.equal(picked.duration, 315);
  assert.throws(() => selection(service, "1-1", ["color", "color"])); assert.throws(() => selection(service, "1-1", ["invented"]));
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
test("un acompte sans connexion Stripe bloque proprement la réservation", async () => {
  const service = (await one<Service>("services", "knotless"))!; service.deposit = { type: "percent", value: 25 }; await saveContent("services", service);
  await assert.rejects(createBooking(booking()), /n’est pas encore activé/); assert.ok((await availability("knotless", "1-1", future())).includes("08:30"));
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
  globalThis.fetch = async (url, options) => { assert.equal(String(url), "https://api.resend.com/emails"); const payload = JSON.parse(String(options?.body)); assert.deepEqual(payload.to, ["test@example.com"]); requests++; return new Response('{}', { status: 201 }); };
  try { assert.deepEqual(await deliverNotifications(), { sent: 1, failed: 0, configured: true }); assert.deepEqual(await deliverNotifications(), { sent: 0, failed: 0, configured: true }); assert.equal(requests, 1); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal((await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1 AND status='sent'", [saved.id])).rows.length, 1);
});
async function pendingPayment() {
  process.env.STRIPE_SECRET_KEY = "sk_test_local_not_a_real_key"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_not_a_real_secret"; process.env.PUBLIC_SITE_URL = "https://example.com";
  const service = (await one<Service>("services", "knotless"))!; service.deposit = { type: "percent", value: 25 }; await saveContent("services", service); return createBooking(booking());
}
function signedEvent(id: string, amount: number) {
  const payload = JSON.stringify({ id: `evt_${randomUUID()}`, type: "checkout.session.completed", data: { object: { metadata: { bookingId: id }, payment_status: "paid", currency: "eur", amount_total: amount } } });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! }) };
}
test("un webhook signé confirme l’acompte une seule fois et rejette les signatures invalides", async () => {
  const saved = await pendingPayment(); const event = signedEvent(saved.id, 2000);
  await assert.rejects(handlePaymentWebhook(event.payload, "invalid-signature")); await handlePaymentWebhook(event.payload, event.signature); await handlePaymentWebhook(event.payload, event.signature);
  const confirmed = await readBooking(saved.id, saved.token); assert.equal(confirmed.status, "confirmed"); assert.equal(confirmed.data.depositPaid, true);
  assert.equal((await (await db()).query("SELECT * FROM payment_events")).rows.length, 1);
  assert.equal((await (await db()).query("SELECT * FROM notifications WHERE booking_id=$1", [saved.id])).rows.length, 2);
});
test("un montant Stripe incorrect ne confirme pas la réservation", async () => {
  const saved = await pendingPayment(); const event = signedEvent(saved.id, 100); await handlePaymentWebhook(event.payload, event.signature); assert.equal((await readBooking(saved.id, saved.token)).status, "pending_payment");
});
test("un paiement tardif ne crée pas de double réservation", async () => {
  const saved = await pendingPayment(); await (await db()).query("UPDATE bookings SET expires_at=$2 WHERE id=$1", [saved.id, Date.now() - 1000]);
  await createBooking(booking({ serviceId: "cornrows", variantId: "standard" })); const event = signedEvent(saved.id, 2000); await handlePaymentWebhook(event.payload, event.signature);
  const late = await readBooking(saved.id, saved.token); assert.equal(late.status, "cancelled"); assert.equal(late.data.depositPaid, true);
});
