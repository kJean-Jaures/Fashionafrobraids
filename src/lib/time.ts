import { salon, initialSettings, type Settings, type WeeklySchedule } from "./catalog";
export function parisDate(time: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: salon.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}
export function localTimeToEpoch(date: string, hour: number, minute = 0) {
  const target = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`).getTime();
  let epoch = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: salon.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(epoch));
    const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
    epoch += target - Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  }
  return epoch;
}
export function timestamp(date: string, time: string) { const [h, m] = time.split(":").map(Number); return localTimeToEpoch(date, h, m); }
export function scheduleContainsBooking(schedule: WeeklySchedule, start: number, end: number) {
  const date = parisDate(new Date(start));
  const day = schedule[String(new Date(`${date}T12:00:00Z`).getUTCDay())];
  return Boolean(day && !day.closed && start >= timestamp(date, day.start) && end <= timestamp(date, day.end));
}
const minutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
export function possibleSlots(date: string, duration: number, now = Date.now(), settings: Settings = initialSettings, employeeSchedule: WeeklySchedule | null = null) {
  if (!validDate(date)) return [];
  const today = parisDate(new Date(now));
  if (date < today || date > addDays(today, settings.bookingDays)) return [];
  const weekday = String(new Date(`${date}T12:00:00Z`).getUTCDay());
  const day = settings.schedule[weekday]; const staffDay = employeeSchedule?.[weekday];
  if (!day || day.closed || staffDay?.closed) return [];
  const startMinute = Math.max(minutes(day.start), staffDay ? minutes(staffDay.start) : 0);
  const endMinute = Math.min(minutes(day.end), staffDay ? minutes(staffDay.end) : 24 * 60);
  const slots: { time: string; start: number; end: number }[] = [];
  for (let minute = startMinute; minute + duration <= endMinute; minute += 30) {
    const start = localTimeToEpoch(date, Math.floor(minute / 60), minute % 60);
    if (start < now + settings.advanceMinutes * 60000) continue;
    slots.push({ time: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`, start, end: start + duration * 60000 });
  }
  return slots;
}
export const formatDate = (epoch: number) => new Intl.DateTimeFormat("fr-FR", { timeZone: salon.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date(epoch));
export const formatTime = (epoch: number) => new Intl.DateTimeFormat("fr-FR", { timeZone: salon.timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(epoch));
