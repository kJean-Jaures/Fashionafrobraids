import { NextRequest, NextResponse } from "next/server";
import { createBooking, cancelBookingAdmin } from "@/lib/domain";
import { bookingSchema } from "@/lib/validation";
import { readBody, errorResponse, rateLimit } from "@/lib/http";
import { bookingCheckoutSession } from "@/lib/booking-payments";
import { deliverNotifications } from "@/lib/notifications";
import { db } from "@/lib/db";
export async function POST(request: NextRequest) {
  try {
    rateLimit(request, "bookings", 100, 3600000);
    const input = bookingSchema.parse(await readBody(request));
    const booking = await createBooking(input);
    let paymentUrl: string | null = null;
    if (booking.data.deposit) {
      try { paymentUrl = await bookingCheckoutSession(booking); }
      catch (error) { await cancelBookingAdmin(booking.id); throw error; }
    }
    await deliverNotifications();
    const sent = await (await db()).query("SELECT id FROM notifications WHERE booking_id=$1 AND kind LIKE 'confirmation-%' AND status='sent'", [booking.id]);
    return NextResponse.json({ booking, paymentUrl, emailSent: sent.rows.length > 0 }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
