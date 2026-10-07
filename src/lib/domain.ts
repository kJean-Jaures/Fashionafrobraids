import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Service, Product, Employee } from "./catalog";
import { db, transaction, all, one, getSettings, type Connection } from "./db";
import { possibleSlots, timestamp, validDate } from "./time";
import type { BookingInput, OrderInput } from "./validation";
import { queueBookingEmails } from "./notifications";

export class DomainError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const reference = (prefix: string) => `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
export type BookingData = {
  name: string; email: string; phone: string; note: string; serviceId: string;
  service: string; variantId: string; size: string; length: string; options: string[];
  price: number; duration: number; deposit: number; depositPaid: boolean; employee: string;
};
export type Booking = { id: string; employee_id: string; start_time: number; end_time: number; status: "confirmed" | "cancelled" | "pending_payment"; expires_at: number | null; data: BookingData; created_at: number };
export type OrderItem = { productId: string; name: string; quantity: number; price: number };
export type OrderData = { name: string; email: string; phone: string; total: number; items: OrderItem[] };
export type Order = { id: string; status: "awaiting_pickup" | "completed" | "cancelled"; data: OrderData; created_at: number };
export type Block = { id: string; employee_id: string | null; start_time: number; end_time: number; reason: string };
const hydrateBooking = (row: Booking): Booking => ({ ...row, start_time: Number(row.start_time), end_time: Number(row.end_time), created_at: Number(row.created_at), expires_at: row.expires_at ? Number(row.expires_at) : null });

export function selection(service: Service, variantId: string, optionIds: string[]) {
  const variant = service.variants.find(item => item.id === variantId);
  if (!variant || !service.active || service.quoteOnly) throw new DomainError("Cette prestation n’est pas réservable en ligne.");
  if (new Set(optionIds).size !== optionIds.length) throw new DomainError("Une option ne peut être sélectionnée qu’une fois.");
  const options = optionIds.map(id => { const option = service.options.find(item => item.id === id); if (!option) throw new DomainError("Cette option n’est pas disponible."); return option; });
  const price = variant.price + options.reduce((sum, option) => sum + option.price, 0);
  const duration = variant.duration + options.reduce((sum, option) => sum + option.duration, 0);
  const deposit = service.deposit.type === "none" ? 0 : service.deposit.type === "percent" ? Math.round(price * service.deposit.value / 100) : Math.min(price, service.deposit.value);
  return { variant, options, price, duration, deposit };
}
async function busy(connection: Connection, staff: string, start: number, end: number, exclude = "") {
  const overlapping = await connection.query("SELECT id FROM bookings WHERE employee_id=$1 AND id<>$5 AND start_time<$3 AND end_time>$2 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$4)) LIMIT 1", [staff, start, end, Date.now(), exclude]);
  if (overlapping.rows.length) return true;
  return (await connection.query("SELECT id FROM blocks WHERE (employee_id IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 LIMIT 1", [staff, start, end])).rows.length > 0;
}
export async function availability(serviceId: string, variantId: string, date: string, optionIds: string[] = [], employeeId = "any") {
  if (!validDate(date)) throw new DomainError("La date choisie n’est pas valide.");
  const service = await one<Service>("services", serviceId);
  if (!service) throw new DomainError("Cette prestation n’existe pas.");
  const selected = selection(service, variantId, optionIds);
  const connection = await db();
  const settings = await getSettings();
  const staff = (await all<Employee>("employees")).filter(item => item.active && (!item.serviceIds.length || item.serviceIds.includes(serviceId)) && (employeeId === "any" || employeeId === item.id));
  const slots = new Set<string>();
  for (const employee of staff) {
    for (const slot of possibleSlots(date, selected.duration, Date.now(), settings, employee.schedule)) {
      if (!await busy(connection, employee.id, slot.start, slot.end)) slots.add(slot.time);
    }
  }
  return [...slots].sort();
}

export async function createBooking(input: BookingInput) {
  const id = reference("RDV"); const token = randomBytes(32).toString("base64url");
  const result = await transaction(async connection => {
    // Ce verrou sérialise réservation, modification d’horaires et blocage de créneaux.
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const service = await one<Service>("services", input.serviceId, connection);
    if (!service) throw new DomainError("Cette prestation n’existe pas.");
    const selected = selection(service, input.variantId, input.optionIds);
    if (selected.deposit && (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.PUBLIC_SITE_URL)) throw new DomainError("L’acompte en ligne n’est pas encore activé. Appelez le salon pour réserver cette prestation.", 503);
    const settings = await getSettings(connection);
    const staff = (await all<Employee>("employees", connection)).filter(item => item.active && (!item.serviceIds.length || item.serviceIds.includes(service.id)) && (input.employeeId === "any" || input.employeeId === item.id));
    for (const employee of staff) {
      const slot = possibleSlots(input.date, selected.duration, Date.now(), settings, employee.schedule).find(slot => slot.time === input.time);
      if (!slot || await busy(connection, employee.id, slot.start, slot.end)) continue;
      const data: BookingData = { name: input.name, email: input.email, phone: input.phone, note: input.note, serviceId: service.id, service: service.name, variantId: selected.variant.id, size: selected.variant.size, length: selected.variant.length, options: selected.options.map(option => option.label), price: selected.price, duration: selected.duration, deposit: selected.deposit, depositPaid: false, employee: employee.name };
      const status = selected.deposit ? "pending_payment" : "confirmed";
      // Stripe impose au moins 30 minutes ; une marge évite l’expiration pendant la création de session.
      const expiry = selected.deposit ? Date.now() + 35 * 60000 : null;
      await connection.query("INSERT INTO bookings(id,token_hash,employee_id,start_time,end_time,status,expires_at,data,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)", [id, hashToken(token), employee.id, slot.start, slot.end, status, expiry, JSON.stringify(data), Date.now()]);
      const booking: Booking = { id, employee_id: employee.id, start_time: slot.start, end_time: slot.end, status, expires_at: expiry, data, created_at: Date.now() };
      if (!selected.deposit) await queueBookingEmails(connection, booking);
      return booking;
    }
    throw new DomainError("Ce créneau n’est plus disponible. Choisissez un autre horaire.", 409);
  });
  return { ...result, token };
}
export async function readBooking(id: string, token: string) {
  if (token.length < 30 || token.length > 100) throw new DomainError("Lien de réservation invalide.", 404);
  const row = (await (await db()).query<Booking>("SELECT id,employee_id,start_time,end_time,status,expires_at,data,created_at FROM bookings WHERE id=$1 AND token_hash=$2", [id, hashToken(token)])).rows[0];
  if (!row) throw new DomainError("Réservation introuvable ou lien invalide.", 404);
  return hydrateBooking(row);
}
export async function cancelBooking(id: string, token: string) {
  const booking = await readBooking(id, token);
  if (booking.start_time <= Date.now()) throw new DomainError("Ce rendez-vous a déjà commencé. Contactez le salon.", 409);
  if (booking.data.depositPaid) throw new DomainError("Un acompte a été versé. Contactez le salon pour l’annulation et les conditions de remboursement.", 409);
  await cancelBookingAdmin(id);
  return { ...booking, status: "cancelled" };
}
export async function cancelBookingAdmin(id: string) {
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const found = (await connection.query("SELECT id FROM bookings WHERE id=$1", [id])).rows.length;
    if (!found) throw new DomainError("Rendez-vous introuvable.", 404);
    await connection.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [id]);
    await connection.query("UPDATE notifications SET status='cancelled' WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
  });
}
export async function moveBooking(id: string, date: string, time: string, employeeId: string) {
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const row = (await connection.query<Booking>("SELECT * FROM bookings WHERE id=$1", [id])).rows[0];
    if (!row || row.status !== "confirmed") throw new DomainError("Ce rendez-vous ne peut pas être déplacé.", 409);
    const employee = await one<Employee>("employees", employeeId, connection);
    if (!employee?.active || (employee.serviceIds.length && !employee.serviceIds.includes(row.data.serviceId))) throw new DomainError("Cette coiffeuse ne réalise pas cette prestation.");
    const slot = possibleSlots(date, row.data.duration, Date.now(), await getSettings(connection), employee.schedule).find(slot => slot.time === time);
    if (!slot || await busy(connection, employee.id, slot.start, slot.end, id)) throw new DomainError("Ce créneau n’est pas disponible.", 409);
    await connection.query("UPDATE bookings SET employee_id=$2,start_time=$3,end_time=$4,data=$5::jsonb WHERE id=$1", [id, employee.id, slot.start, slot.end, JSON.stringify({ ...row.data, employee: employee.name })]);
    await connection.query("DELETE FROM notifications WHERE booking_id=$1 AND status<>'sent'", [id]);
    await queueBookingEmails(connection, { ...hydrateBooking(row), employee_id: employee.id, start_time: slot.start, end_time: slot.end, data: { ...row.data, employee: employee.name } });
  });
}
export async function createBlock(employeeId: string | null, start: number, end: number, reason: string) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new DomainError("Vérifiez les dates du blocage.");
  const id = randomUUID();
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    if (employeeId && !await one<Employee>("employees", employeeId, connection)) throw new DomainError("Coiffeuse introuvable.");
    const conflicts = await connection.query("SELECT id FROM bookings WHERE ($1::text IS NULL OR employee_id=$1) AND start_time<$3 AND end_time>$2 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$4)) LIMIT 1", [employeeId, start, end, Date.now()]);
    if (conflicts.rows.length) throw new DomainError("Un rendez-vous existe sur cette période. Déplacez-le ou annulez-le avant de bloquer.", 409);
    await connection.query("INSERT INTO blocks(id,employee_id,start_time,end_time,reason) VALUES($1,$2,$3,$4,$5)", [id, employeeId, start, end, reason]);
  });
  return id;
}
export async function createOrder(input: OrderInput) {
  if (new Set(input.items.map(item => item.productId)).size !== input.items.length) throw new DomainError("Le panier contient des doublons.");
  const id = reference("CMD"); const token = randomBytes(32).toString("base64url");
  const data = await transaction(async connection => {
    if ((await connection.query("SELECT id FROM orders WHERE request_id=$1", [input.requestId])).rows.length) throw new DomainError("Cette commande est déjà enregistrée.", 409);
    const items: OrderItem[] = [];
    for (const item of [...input.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const product = await one<Product>("products", item.productId, connection);
      if (!product?.active) throw new DomainError("Un produit n’est plus disponible.");
      const updated = await connection.query("UPDATE inventory SET stock=stock-$2 WHERE product_id=$1 AND stock>=$2 RETURNING stock", [product.id, item.quantity]);
      if (!updated.rows.length) throw new DomainError(`Stock insuffisant pour ${product.name}.`, 409);
      items.push({ productId: product.id, name: product.name, quantity: item.quantity, price: product.price });
    }
    const data: OrderData = { name: input.name, email: input.email, phone: input.phone, items, total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) };
    await connection.query("INSERT INTO orders(id,request_id,token_hash,status,data,created_at) VALUES($1,$2,$3,'awaiting_pickup',$4::jsonb,$5)", [id, input.requestId, hashToken(token), JSON.stringify(data), Date.now()]);
    return data;
  });
  return { id, token, data, status: "awaiting_pickup" };
}
export async function readOrder(id: string, token: string) {
  if (token.length < 30 || token.length > 100) throw new DomainError("Lien de commande invalide.", 404);
  const row = (await (await db()).query<Order>("SELECT id,status,data,created_at FROM orders WHERE id=$1 AND token_hash=$2", [id, hashToken(token)])).rows[0];
  if (!row) throw new DomainError("Commande introuvable ou lien invalide.", 404);
  return { ...row, created_at: Number(row.created_at) };
}
export async function updateOrder(id: string, status: Order["status"]) {
  await transaction(async connection => {
    const row = (await connection.query<Order>("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [id])).rows[0];
    if (!row) throw new DomainError("Commande introuvable.", 404);
    if (row.status !== "awaiting_pickup") throw new DomainError("Cette commande est déjà terminée ou annulée.", 409);
    if (status === "cancelled") for (const item of row.data.items) await connection.query("UPDATE inventory SET stock=stock+$2 WHERE product_id=$1", [item.productId, item.quantity]);
    await connection.query("UPDATE orders SET status=$2 WHERE id=$1", [id, status]);
  });
}
export { hydrateBooking, timestamp };
