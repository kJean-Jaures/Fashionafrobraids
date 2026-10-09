import { NextRequest, NextResponse } from "next/server";
import { handleMollieWebhook } from "@/lib/mollie-payments";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, rateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    rateLimit(request, "mollie-webhook", 2000, 3600000);
    const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (type !== "application/x-www-form-urlencoded") return NextResponse.json({ error: "Format de notification invalide." }, { status: 415 });
    const body = await request.text();
    if (body.length > 10000) return NextResponse.json({ error: "Notification trop volumineuse." }, { status: 413 });
    const status = await handleMollieWebhook(body);
    if (status === "confirmed") await deliverNotifications();
    return new NextResponse(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
