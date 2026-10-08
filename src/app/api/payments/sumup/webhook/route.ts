import { NextRequest, NextResponse } from "next/server";
import { handleSumUpWebhook } from "@/lib/sumup-payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, rateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    rateLimit(request, "sumup-webhook", 2000, 3600000);
    const body = await request.text();
    if (body.length > 10000) return NextResponse.json({ error: "Notification trop volumineuse." }, { status: 413 });
    const status = await handleSumUpWebhook(body);
    if (status === "confirmed") await deliverNotifications();
    return new NextResponse(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
