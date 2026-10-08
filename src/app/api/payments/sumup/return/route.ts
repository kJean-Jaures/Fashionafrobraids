import { NextRequest, NextResponse } from "next/server";
import { readBooking } from "@/lib/domain";
import { verifySumUpPayment } from "@/lib/sumup-payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, rateLimit } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    rateLimit(request, "sumup-return", 100, 3600000);
    const id = request.nextUrl.searchParams.get("bookingId") || "";
    const access = request.nextUrl.searchParams.get("access") || "";
    await readBooking(id, access);
    let payment = "pending";
    try {
      const status = await verifySumUpPayment(id, access);
      payment = status === "confirmed" ? "success" : status === "cancelled" ? "review" : "pending";
      if (status === "confirmed") await deliverNotifications();
    } catch { payment = "error"; }
    const url = new URL("/reservation/" + encodeURIComponent(id), process.env.PUBLIC_SITE_URL || request.url);
    url.searchParams.set("token", access); url.searchParams.set("payment", payment);
    return NextResponse.redirect(url, 303);
  } catch (error) { return errorResponse(error); }
}
