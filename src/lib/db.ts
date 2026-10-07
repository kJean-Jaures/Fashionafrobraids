import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "pg";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { localPostgresOptions } from "./local-postgres-options.mjs";
import { posterServices } from "./poster-catalog";
import { paypalConfigured } from "./paypal-config";
import { initialServices, initialProducts, initialSettings, initialGallery, initialReviews, type Service, type Product, type Settings, type Employee, type GalleryPhoto, type Review } from "./catalog";

export type Collection = "services" | "products" | "employees" | "gallery" | "reviews";
export interface Connection { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }
type Runtime = { pool?: Pool; local?: PGlite; ready: Promise<void> };
const globalDB = globalThis as typeof globalThis & { fabDB?: Runtime };
const schema = `
 CREATE TABLE IF NOT EXISTS content (collection TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL, PRIMARY KEY(collection, id));
 CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, data JSONB NOT NULL);
 CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, employee_id TEXT NOT NULL,
  start_time BIGINT NOT NULL, end_time BIGINT NOT NULL, status TEXT NOT NULL,
  expires_at BIGINT, data JSONB NOT NULL, created_at BIGINT NOT NULL
 );
 CREATE INDEX IF NOT EXISTS booking_times ON bookings(employee_id, start_time, end_time, status);
 CREATE TABLE IF NOT EXISTS blocks (id TEXT PRIMARY KEY, employee_id TEXT, start_time BIGINT NOT NULL, end_time BIGINT NOT NULL, reason TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS inventory (product_id TEXT PRIMARY KEY, stock INTEGER NOT NULL CHECK(stock >= 0));
 CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, token_hash TEXT NOT NULL, status TEXT NOT NULL, data JSONB NOT NULL, created_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at BIGINT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE);
 CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, kind TEXT NOT NULL, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, due_at BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);
 ALTER TABLE notifications ADD COLUMN IF NOT EXISTS claimed_at BIGINT;
 CREATE UNIQUE INDEX IF NOT EXISTS notification_once ON notifications(booking_id, kind);
 CREATE TABLE IF NOT EXISTS payment_events (id TEXT PRIMARY KEY, created_at BIGINT NOT NULL);
 CREATE TABLE IF NOT EXISTS migration_history (id TEXT PRIMARY KEY);
`;
async function initialise(connection: Connection) {
  for (const statement of schema.split(";").filter(part => part.trim())) await connection.query(statement);
  if ((await connection.query("SELECT id FROM settings WHERE id='salon'")).rows.length) {
    if (!(await connection.query("SELECT id FROM migration_history WHERE id='site-import-20261007'")).rows.length) {
      for (const review of initialReviews) await connection.query("INSERT INTO content(collection,id,data) VALUES('reviews',$1,$2::jsonb) ON CONFLICT DO NOTHING", [review.id, JSON.stringify(review)]);
      for (const image of initialGallery.filter(item => item.id.endsWith("current"))) await connection.query("INSERT INTO content(collection,id,data) VALUES('gallery',$1,$2::jsonb) ON CONFLICT DO NOTHING", [image.id, JSON.stringify(image)]);
      const legacyImages: Record<string, string> = { bonnet: "/images/bonnet.svg", perruque: "/images/wig.svg", meches: "/images/extensions.svg", perles: "/images/beads.svg" };
      for (const product of initialProducts) await connection.query("UPDATE content SET data=jsonb_set(data,'{image}',$2::jsonb) WHERE collection='products' AND id=$1 AND data->>'image'=$3", [product.id, JSON.stringify(product.image), legacyImages[product.id]]);
      await connection.query("INSERT INTO migration_history(id) VALUES('site-import-20261007') ON CONFLICT DO NOTHING");
    }
    await migratePoster(connection);
    return;
  }
  for (const [collection, values] of Object.entries({ services: initialServices, products: initialProducts, gallery: initialGallery, reviews: initialReviews, employees: [{ id: "salon", name: "Équipe du salon", active: true, serviceIds: [], schedule: null }] })) {
    for (const value of values) await connection.query("INSERT INTO content(collection,id,data) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING", [collection, value.id, JSON.stringify(value)]);
  }
  for (const product of initialProducts) await connection.query("INSERT INTO inventory(product_id,stock) VALUES($1,$2) ON CONFLICT DO NOTHING", [product.id, product.stock]);
  await connection.query("INSERT INTO settings(id,data) VALUES('salon',$1::jsonb) ON CONFLICT DO NOTHING", [JSON.stringify(initialSettings)]);
  await connection.query("INSERT INTO migration_history(id) VALUES('site-import-20261007') ON CONFLICT DO NOTHING");
  await migratePoster(connection);
}
async function migratePoster(connection: Connection) {
  await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
  if ((await connection.query("SELECT id FROM migration_history WHERE id='poster-paypal-deposit-20261007'")).rows.length) return;
  // Une seule importation : les modifications ultérieures du salon restent intactes.
  // Les rendez-vous existants conservent leurs propres prix et durées historiques.
  for (const poster of posterServices) {
    const current = (await connection.query<{ data: Service }>("SELECT data FROM content WHERE collection='services' AND id=$1", [poster.id])).rows[0]?.data;
    const updated = { ...current, ...poster, active: current?.active ?? poster.active,
      variants: poster.variants.map(variant => ({ ...variant, duration: current?.variants.find(old => old.size === variant.size && old.length === variant.length)?.duration ?? variant.duration })) };
    await connection.query("INSERT INTO content(collection,id,data) VALUES('services',$1,$2::jsonb) ON CONFLICT(collection,id) DO UPDATE SET data=EXCLUDED.data", [poster.id, JSON.stringify(updated)]);
  }
  await connection.query("UPDATE content SET data=jsonb_set(data,'{deposit}','{\"type\":\"fixed\",\"value\":1000}'::jsonb) WHERE collection='services'");
  await connection.query("INSERT INTO migration_history(id) VALUES('poster-paypal-deposit-20261007')");
}
function runtime(): Runtime {
  if (globalDB.fabDB) return globalDB.fabDB;
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    const ready = (async () => {
      const client = await pool.connect();
      try { await client.query("BEGIN"); await initialise(client); await client.query("COMMIT"); }
      catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    })();
    globalDB.fabDB = { pool, ready };
  } else {
    const path = process.env.DATA_DIR || resolve(process.cwd(), "data/postgres");
    mkdirSync(path, { recursive: true });
    const template = resolve(process.cwd(), ".next/local-postgres");
    // Only bootstrap new local databases. Reopening a database must preserve
    // the catalogue, appointments and edits made in the administration.
    if (!existsSync(resolve(path, "PG_VERSION")) && existsSync(resolve(template, "PG_VERSION"))) {
      cpSync(template, path, { recursive: true, errorOnExist: true, force: false });
    }
    const local = new PGlite(path, localPostgresOptions);
    globalDB.fabDB = { local, ready: local.transaction(async connection => initialise(connection as Connection)) };
  }
  return globalDB.fabDB;
}
export async function db(): Promise<Connection> {
  const active = runtime(); await active.ready; return (active.pool || active.local) as Connection;
}
export async function transaction<T>(operation: (connection: Connection) => Promise<T>): Promise<T> {
  const active = runtime(); await active.ready;
  if (active.local) return active.local.transaction(async connection => operation(connection as Connection));
  const client: PoolClient = await active.pool!.connect();
  try { await client.query("BEGIN"); const value = await operation(client); await client.query("COMMIT"); return value; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
export async function all<T>(collection: Collection, connection?: Connection): Promise<T[]> {
  const result = await (connection || await db()).query<{ data: T }>("SELECT data FROM content WHERE collection=$1 ORDER BY id", [collection]); return result.rows.map(row => row.data);
}
export async function one<T>(collection: Collection, id: string, connection?: Connection): Promise<T | undefined> {
  return (await (connection || await db()).query<{ data: T }>("SELECT data FROM content WHERE collection=$1 AND id=$2", [collection, id])).rows[0]?.data;
}
export async function getSettings(connection?: Connection): Promise<Settings> {
  return (await (connection || await db()).query<{ data: Settings }>("SELECT data FROM settings WHERE id='salon'")).rows[0].data;
}
export async function publicCatalog() {
  const connection = await db();
  const [services, products, employees, gallery, reviews, settings, stocks] = await Promise.all([
    all<Service>("services"), all<Product>("products"), all<Employee>("employees"), all<GalleryPhoto>("gallery"), all<Review>("reviews"), getSettings(), connection.query<{ product_id: string; stock: number }>("SELECT product_id,stock FROM inventory")
  ]);
  return { services: services.filter(item => item.active).sort((a, b) => Number(Boolean(b.pricingVerified)) - Number(Boolean(a.pricingVerified))), products: products.filter(item => item.active).map(item => ({ ...item, stock: stocks.rows.find(row => row.product_id === item.id)?.stock || 0 })), employees: employees.filter(item => item.active).map(item => ({ id: item.id, name: item.name })), gallery: gallery.filter(item => item.active), reviews: reviews.filter(item => item.active), settings, bookingPaymentsEnabled: paypalConfigured() };
}
export type Catalog = Awaited<ReturnType<typeof publicCatalog>>;
export async function closeDatabase() {
  if (globalDB.fabDB?.local) await globalDB.fabDB.local.close();
  if (globalDB.fabDB?.pool) await globalDB.fabDB.pool.end();
  globalDB.fabDB = undefined;
}
