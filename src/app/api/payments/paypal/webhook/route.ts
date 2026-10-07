import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 100000) return NextResponse.json({ error: "Notification trop volumineuse." }, { status: 413 });
    await handlePaymentWebhook(body, request.headers);
    await deliverNotifications();
    return NextResponse.json({ received: true });
  } catch (error) { return errorResponse(error); }
}
