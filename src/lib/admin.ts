import { paypalConfigured } from "./paypal-config";
import { db, all, getSettings, transaction, type Collection, type Connection } from "./db";
import { DomainError, hydrateBooking, type Booking, type Order, type Block } from "./domain";
import { serviceSchema, productSchema, employeeSchema, gallerySchema, reviewSchema, settingsSchema } from "./validation";
import type { Product, Employee, Settings, Service } from "./catalog";
import { scheduleContainsBooking } from "./time";
import { syncUpcomingReminders } from "./notifications";
import { bookingReadiness } from "./booking-readiness";

export async function dashboard() {
  const connection = await db();
  const [services, products, employees, gallery, reviews, settings, bookings, orders, blocks, messages, notifications, stocks] = await Promise.all([
    all("services"), all("products"), all("employees"), all("gallery"), all("reviews"), connection.query<{ data: unknown }>("SELECT data FROM settings WHERE id='salon'"),
    connection.query<Booking>("SELECT id,employee_id,start_time,end_time,status,expires_at,data,created_at FROM bookings ORDER BY start_time DESC LIMIT 500"),
    connection.query<Order>("SELECT id,status,data,created_at FROM orders ORDER BY created_at DESC LIMIT 500"),
    connection.query<Block>("SELECT * FROM blocks ORDER BY start_time"), connection.query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 200"),
    connection.query("SELECT status,COUNT(*)::int AS count FROM notifications GROUP BY status"), connection.query<{ product_id: string; stock: number }>("SELECT * FROM inventory")
  ]);
  const normalizedSettings = await getSettings();
  const lastRun = (await connection.query<{ ran_at: number; data: { configured: boolean; sent: number; failed: number } }>("SELECT ran_at,data FROM automation_runs WHERE id='reminders'")).rows[0];
  return { services, products: (products as Product[]).map(product => ({ ...product, stock: stocks.rows.find(row => row.product_id === product.id)?.stock || 0 })), employees, gallery, reviews, settings: normalizedSettings, bookings: bookings.rows.map(hydrateBooking), orders: orders.rows.map(order => ({ ...order, created_at: Number(order.created_at) })), blocks: blocks.rows.map(block => ({ ...block, start_time: Number(block.start_time), end_time: Number(block.end_time) })), messages: messages.rows, notifications: notifications.rows, readiness: bookingReadiness(services as Service[], employees as Employee[], normalizedSettings, lastRun ? { at: Number(lastRun.ran_at), ...lastRun.data } : null), integrations: { email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), paypal: paypalConfigured(), externalPostgres: !!process.env.DATABASE_URL } };
}
async function assertPlanning(connection: Connection, settings: Settings, employee?: Employee) {
  const bookings = (await connection.query<Booking>("SELECT * FROM bookings WHERE end_time>$1 AND (status='confirmed' OR (status='pending_payment' AND expires_at>$1)) ORDER BY employee_id,start_time", [Date.now()])).rows.map(hydrateBooking);
  const staff = await all<Employee>("employees", connection);
  if (employee) { const index = staff.findIndex(item => item.id === employee.id); if (index >= 0) staff[index] = employee; else staff.push(employee); }
  let previous: Booking | undefined;
  for (const booking of bookings) {
    const member = staff.find(item => item.id === booking.employee_id);
    if (!scheduleContainsBooking(settings.schedule, booking.start_time, booking.end_time) || !member?.active || (member.schedule && !scheduleContainsBooking(member.schedule, booking.start_time, booking.end_time)) || (member.serviceIds.length && !member.serviceIds.includes(booking.data.serviceId))) throw new DomainError(`Le rendez-vous ${booking.id} ne respecte pas ces nouveaux horaires ou cette attribution. Déplacez-le ou annulez-le avant de modifier le planning.`, 409);
    if (previous?.employee_id === booking.employee_id && previous.end_time + settings.bookingBufferMinutes * 60000 > booking.start_time) throw new DomainError("Des rendez-vous existants ne permettent pas ce temps de pause. Déplacez-les avant d’augmenter la pause.", 409);
    previous = booking;
  }
}
export async function saveContent(collection: Collection, raw: unknown) {
  const schemas = { services: serviceSchema, products: productSchema, employees: employeeSchema, gallery: gallerySchema, reviews: reviewSchema };
  const value = schemas[collection].parse(raw);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    if (collection === "employees") await assertPlanning(connection, await getSettings(connection), value as Employee);
    await connection.query("INSERT INTO content(collection,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(collection,id) DO UPDATE SET data=EXCLUDED.data", [collection, value.id, JSON.stringify(value)]);
    if (collection === "products") await connection.query("INSERT INTO inventory(product_id,stock) VALUES($1,$2) ON CONFLICT(product_id) DO UPDATE SET stock=EXCLUDED.stock", [value.id, (value as Product).stock]);
  });
  return value;
}
export async function removeContent(collection: Collection, id: string) {
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    if (collection === "employees") {
      if ((await connection.query("SELECT id FROM bookings WHERE employee_id=$1 AND end_time>$2 AND status IN ('confirmed','pending_payment') LIMIT 1", [id, Date.now()])).rows.length) throw new DomainError("Cette coiffeuse a des rendez-vous à venir. Déplacez-les avant la suppression.", 409);
      await connection.query("DELETE FROM blocks WHERE employee_id=$1", [id]);
    }
    await connection.query("DELETE FROM content WHERE collection=$1 AND id=$2", [collection, id]);
  });
}
export async function saveSettings(raw: unknown) {
  const settings = settingsSchema.parse(raw);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const previous = await getSettings(connection);
    if (JSON.stringify(previous.schedule) !== JSON.stringify(settings.schedule) || previous.bookingBufferMinutes !== settings.bookingBufferMinutes) await assertPlanning(connection, settings);
    await connection.query("UPDATE settings SET data=$1::jsonb WHERE id='salon'", [JSON.stringify(settings)]);
    if (previous.reminderEmail !== settings.reminderEmail || previous.reminderHours !== settings.reminderHours || previous.bookingInstructions !== settings.bookingInstructions) await syncUpcomingReminders(connection, settings);
    if (!settings.confirmationEmail) await connection.query("UPDATE notifications SET status='cancelled' WHERE kind LIKE 'confirmation-%' AND status IN ('pending','failed')");
  });
  return settings;
}
