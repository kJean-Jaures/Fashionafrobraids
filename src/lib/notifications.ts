import { randomUUID } from "node:crypto";
import type { Connection } from "./db";
import { db, transaction, getSettings } from "./db";
import { money, durationLabel, type Settings } from "./catalog";
import { formatDate, formatTime } from "./time";
import type { Booking } from "./domain";

function bookingEmail(booking: Booking, settings: Settings) {
  const detail = [booking.data.service, booking.data.size, booking.data.length].filter(value => value && value !== "Standard").join(" · ");
  const paid = booking.data.depositPaid ? booking.data.deposit : 0;
  return `Bonjour ${booking.data.name},\n\n${detail}\n${formatDate(booking.start_time)} à ${formatTime(booking.start_time)}\nDurée : ${durationLabel(booking.data.duration)} · fin prévue à ${formatTime(booking.end_time)}\nTotal : ${money(booking.data.price)}\nAcompte payé : ${money(paid)}\nÀ régler au salon : ${money(booking.data.price - paid)}\nRéférence : ${booking.id}\n\n${settings.name}\n${settings.address}\n${settings.phone}${settings.bookingInstructions ? `\n\nPour préparer votre visite\n${settings.bookingInstructions}` : ""}\n\nÀ bientôt au salon !`;
}
async function queueReminder(connection: Connection, booking: Booking, settings: Settings, updateUnsent = false) {
  if (!settings.reminderEmail || booking.status !== "confirmed" || booking.start_time <= Date.now()) return;
  // Un RDV réservé après l’heure du rappel ne reçoit pas un second message immédiat.
  const due = booking.start_time - settings.reminderHours * 3600000;
  if (due < Date.now()) return;
  await connection.query(`INSERT INTO notifications(id,booking_id,kind,recipient,subject,body,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(booking_id,kind) ${updateUnsent ? "DO UPDATE SET due_at=EXCLUDED.due_at,body=CASE WHEN notifications.attempts=0 THEN EXCLUDED.body ELSE notifications.body END,status=CASE WHEN notifications.attempts>0 THEN 'failed' ELSE 'pending' END WHERE notifications.status IN ('pending','failed','cancelled')" : "DO NOTHING"}`, [randomUUID(), booking.id, `reminder-${booking.start_time}`, booking.data.email, "Votre rendez-vous approche", bookingEmail(booking, settings), due]);
}
export async function queueBookingEmails(connection: Connection, booking: Booking) {
  if (booking.status !== "confirmed" || booking.start_time <= Date.now()) return;
  const settings = await getSettings(connection);
  if (settings.confirmationEmail) await connection.query("INSERT INTO notifications(id,booking_id,kind,recipient,subject,body,due_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(booking_id,kind) DO NOTHING", [randomUUID(), booking.id, `confirmation-${booking.start_time}`, booking.data.email, "Votre rendez-vous Fashion Afro Braids", bookingEmail(booking, settings), Date.now()]);
  await queueReminder(connection, booking, settings);
}
export async function syncUpcomingReminders(connection: Connection, settings: Settings) {
  await connection.query("UPDATE notifications SET status='cancelled' WHERE kind LIKE 'reminder-%' AND status IN ('pending','failed')");
  if (!settings.reminderEmail) return;
  const bookings = (await connection.query<Booking>("SELECT * FROM bookings WHERE status='confirmed' AND start_time>$1", [Date.now()])).rows;
  for (const booking of bookings) await queueReminder(connection, { ...booking, start_time: Number(booking.start_time), end_time: Number(booking.end_time) }, settings, true);
}
type Notification = { id: string; recipient: string; subject: string; body: string; attempts: number };
export async function deliverNotifications() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: 0, failed: 0, configured: false };
  const entries = await transaction(async connection => {
    await connection.query("SELECT id FROM settings WHERE id='salon' FOR UPDATE");
    const settings = await getSettings(connection);
    await connection.query("UPDATE notifications SET status='failed' WHERE status='sending' AND claimed_at<$1", [Date.now() - 15 * 60000]);
    await connection.query("UPDATE notifications SET status='cancelled' WHERE status IN ('pending','failed') AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id=notifications.booking_id AND b.status='confirmed' AND b.start_time>$1)", [Date.now()]);
    if (!settings.confirmationEmail) await connection.query("UPDATE notifications SET status='cancelled' WHERE kind LIKE 'confirmation-%' AND status IN ('pending','failed')");
    if (!settings.reminderEmail) await connection.query("UPDATE notifications SET status='cancelled' WHERE kind LIKE 'reminder-%' AND status IN ('pending','failed')");
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
