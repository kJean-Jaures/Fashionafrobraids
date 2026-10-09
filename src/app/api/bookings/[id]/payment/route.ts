import { NextRequest, NextResponse } from "next/server";
import { readBooking } from "@/lib/domain";
import { verifyMolliePayment } from "@/lib/mollie-payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, readBody, rateLimit } from "@/lib/http";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    rateLimit(request, "mollie-recheck", 100, 3600000);
    const id = (await context.params).id; const body = await readBody(request);
    const token = typeof body.token === "string" ? body.token : "";
    const status = await verifyMolliePayment(id, token);
    if (status === "confirmed") await deliverNotifications();
    return NextResponse.json(await readBooking(id, token), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
