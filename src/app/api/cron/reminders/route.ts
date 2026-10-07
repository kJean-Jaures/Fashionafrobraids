import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { deliverNotifications } from "@/lib/notifications";
import { db } from "@/lib/db";
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`); const actual = Buffer.from(request.headers.get("authorization") || "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const result = await deliverNotifications();
  await (await db()).query("INSERT INTO automation_runs(id,ran_at,data) VALUES('reminders',$1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET ran_at=EXCLUDED.ran_at,data=EXCLUDED.data", [Date.now(), JSON.stringify(result)]);
  return NextResponse.json(result);
}
