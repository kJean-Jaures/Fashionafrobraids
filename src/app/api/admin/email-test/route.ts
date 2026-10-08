import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendTestEmail } from "@/lib/notifications";
import { assertSameOrigin, errorResponse, rateLimit } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    assertSameOrigin(request);
    rateLimit(request, "admin-email-test", 5, 10 * 60000);
    return NextResponse.json(await sendTestEmail());
  } catch (error) { return errorResponse(error); }
}
