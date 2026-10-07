import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { deliverNotifications } from "@/lib/notifications";
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`); const actual = Buffer.from(request.headers.get("authorization") || "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  return NextResponse.json(await deliverNotifications());
}
