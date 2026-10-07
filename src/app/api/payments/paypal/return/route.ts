import { NextRequest, NextResponse } from "next/server";
import { captureBookingPayment } from "@/lib/payments";
import { readBooking } from "@/lib/domain";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, rateLimit } from "@/lib/http";
export async function GET(request: NextRequest) {
  try {
    rateLimit(request, "paypal-return", 50, 3600000);
    const id = request.nextUrl.searchParams.get("bookingId") || "";
    const access = request.nextUrl.searchParams.get("access") || "";
    await readBooking(id, access);
    let payment = "success";
    try {
      await captureBookingPayment(id, access, request.nextUrl.searchParams.get("token") || "");
      await deliverNotifications();
    } catch { payment = "error"; }
    const url = new URL("/reservation/" + encodeURIComponent(id), process.env.PUBLIC_SITE_URL || request.url);
    url.searchParams.set("token", access);
    url.searchParams.set("payment", payment);
    return NextResponse.redirect(url, 303);
  } catch (error) { return errorResponse(error); }
}
