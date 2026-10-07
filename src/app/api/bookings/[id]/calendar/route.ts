import { NextRequest, NextResponse } from "next/server";
import { readBooking, DomainError } from "@/lib/domain";
import { getSettings } from "@/lib/db";
import { errorResponse } from "@/lib/http";
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r/g, "");
const date = (epoch: number) => new Date(epoch).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const booking = await readBooking((await context.params).id, request.nextUrl.searchParams.get("token") || "");
    if (booking.status !== "confirmed") throw new DomainError("Seul un rendez-vous confirmé peut être ajouté au calendrier.", 409);
    const settings = await getSettings();
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fashion Afro Braids//Reservation//FR", "BEGIN:VEVENT", `UID:${booking.id}@fashionafrobraids.fr`, `DTSTAMP:${date(Date.now())}`, `DTSTART:${date(booking.start_time)}`, `DTEND:${date(booking.end_time)}`, `SUMMARY:${escape(booking.data.service + " · Fashion Afro Braids")}`, `LOCATION:${escape(settings.address)}`, `DESCRIPTION:${escape("Référence : " + booking.id + "\nTéléphone : " + settings.phone)}`, "END:VEVENT", "END:VCALENDAR"];
    return new NextResponse(lines.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${booking.id}.ics"`, "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
