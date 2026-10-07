import { randomUUID } from "node:crypto";
import type { Connection } from "./db";
import { db, transaction, getSettings } from "./db";
import { money } from "./catalog";
import { formatDate, formatTime } from "./time";
import type { Booking } from "./domain";

export async function queueBookingEmails(connection: Connection, booking: Booking) {
  const settings = await getSettings(connection);
  const description = `${booking.data.service} · ${booking.data.size} · ${booking.data.length}\n${formatDate(booking.start_time)} à ${formatTime(booking.start_time)}\nMontant : ${money(booking.data.price)}\nRéférence : ${booking.id}\n${settings.name} · ${settings.address}\n${settings.phone}`;
  for (const [kind, due, subject] of [["confirmation", Date.now(), "Votre rendez-vous Fashion Afro Braids"], ["reminder", booking.start_time - 24 * 3600000, "Votre rendez-vous approche"]] as const) {
    if (kind === "reminder" && due < Date.now()) continue;
    await connection.query("INSERT INTO notifications(id,booking_id,kind,recipient,subject,body,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(booking_id,kind) DO NOTHING", [randomUUID(), booking.id, `${kind}-${booking.start_time}`, booking.data.email, subject, `Bonjour ${booking.data.name},\n\n${description}\n\nÀ bientôt au salon !`, due]);
  }
}
type Notification = { id: string; recipient: string; subject: string; body: string; attempts: number };
export async function deliverNotifications() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: 0, failed: 0, configured: false };
  const entries = await transaction(async connection => {
    await connection.query("UPDATE notifications SET status='failed' WHERE status='sending' AND claimed_at<$1", [Date.now() - 15 * 60000]);
    const found = (await connection.query<Notification>("SELECT id,recipient,subject,body,attempts FROM notifications WHERE status IN ('pending','failed') AND attempts<3 AND due_at<=$1 ORDER BY due_at LIMIT 20 FOR UPDATE SKIP LOCKED", [Date.now()])).rows;
    for (const entry of found) await connection.query("UPDATE notifications SET status='sending',attempts=attempts+1,claimed_at=$2 WHERE id=$1", [entry.id, Date.now()]);
    return found;
  });
  let sent = 0; let failed = 0;
  for (const entry of entries) {
    try {
      const result = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": entry.id }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [entry.recipient], subject: entry.subject, text: entry.body }), signal: AbortSignal.timeout(10000) });
      if (!result.ok) throw new Error(`Fournisseur e-mail : ${result.status}`);
      await (await db()).query("UPDATE notifications SET status='sent',last_error=NULL WHERE id=$1", [entry.id]); sent++;
    } catch (error) {
      await (await db()).query("UPDATE notifications SET status='failed',last_error=$2 WHERE id=$1", [entry.id, error instanceof Error ? error.message : "Échec e-mail"]); failed++;
    }
  }
  return { sent, failed, configured: true };
}
