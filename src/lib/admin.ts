import { db, all, transaction, type Collection } from "./db";
import { DomainError, hydrateBooking, type Booking, type Order, type Block } from "./domain";
import { serviceSchema, productSchema, employeeSchema, gallerySchema, reviewSchema, settingsSchema } from "./validation";
import type { Product } from "./catalog";

export async function dashboard() {
  const connection = await db();
  const [services, products, employees, gallery, reviews, settings, bookings, orders, blocks, messages, notifications, stocks] = await Promise.all([
    all("services"), all("products"), all("employees"), all("gallery"), all("reviews"), connection.query<{ data: unknown }>("SELECT data FROM settings WHERE id='salon'"),
    connection.query<Booking>("SELECT id,employee_id,start_time,end_time,status,expires_at,data,created_at FROM bookings ORDER BY start_time DESC LIMIT 500"),
    connection.query<Order>("SELECT id,status,data,created_at FROM orders ORDER BY created_at DESC LIMIT 500"),
    connection.query<Block>("SELECT * FROM blocks ORDER BY start_time"), connection.query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 200"),
    connection.query("SELECT status,COUNT(*)::int AS count FROM notifications GROUP BY status"), connection.query<{ product_id: string; stock: number }>("SELECT * FROM inventory")
  ]);
  return { services, products: (products as Product[]).map(product => ({ ...product, stock: stocks.rows.find(row => row.product_id === product.id)?.stock || 0 })), employees, gallery, reviews, settings: settings.rows[0].data, bookings: bookings.rows.map(hydrateBooking), orders: orders.rows.map(order => ({ ...order, created_at: Number(order.created_at) })), blocks: blocks.rows.map(block => ({ ...block, start_time: Number(block.start_time), end_time: Number(block.end_time) })), messages: messages.rows, notifications: notifications.rows, integrations: { email: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.PUBLIC_SITE_URL), externalPostgres: !!process.env.DATABASE_URL } };
}
export async function saveContent(collection: Collection, raw: unknown) {
  const schemas = { services: serviceSchema, products: productSchema, employees: employeeSchema, gallery: gallerySchema, reviews: reviewSchema };
  const value = schemas[collection].parse(raw);
  await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
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
    await connection.query("UPDATE settings SET data=$1::jsonb WHERE id='salon'", [JSON.stringify(settings)]);
  });
  return settings;
}
