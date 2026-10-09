import { NextRequest, NextResponse } from "next/server";
import { readBooking } from "@/lib/domain";
import { verifyMolliePayment } from "@/lib/mollie-payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, rateLimit } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    rateLimit(request, "mollie-return", 100, 3600000);
    const id = request.nextUrl.searchParams.get("bookingId") || "";
    const access = request.nextUrl.searchParams.get("access") || "";
    await readBooking(id, access);
    let payment = "pending";
    try {
      const status = await verifyMolliePayment(id, access);
      const booking = await readBooking(id, access);
      payment = status === "confirmed" ? "success" : booking.data.paymentReviewRequired ? "review" : status === "cancelled" ? "cancelled" : "pending";
      if (status === "confirmed") await deliverNotifications();
    } catch { payment = "error"; }
    const url = new URL("/reservation/" + encodeURIComponent(id), process.env.PUBLIC_SITE_URL || request.url);
    url.searchParams.set("token", access); url.searchParams.set("payment", payment);
    const response = NextResponse.redirect(url, 303);
    response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return errorResponse(error); }
}
