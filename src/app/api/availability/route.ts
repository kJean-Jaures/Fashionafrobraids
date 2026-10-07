import { NextRequest, NextResponse } from "next/server";
import { availability } from "@/lib/domain";
import { errorResponse } from "@/lib/http";
export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    return NextResponse.json({ slots: await availability(p.get("service") || "", p.get("variant") || "", p.get("date") || "", (p.get("options") || "").split(",").filter(Boolean), p.get("employee") || "any") });
  } catch (error) { return errorResponse(error); }
}
