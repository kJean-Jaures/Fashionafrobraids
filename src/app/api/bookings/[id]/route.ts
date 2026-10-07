import { NextRequest, NextResponse } from "next/server";
import { readBooking, cancelBooking } from "@/lib/domain";
import { errorResponse, readBody } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  try { return NextResponse.json(await readBooking((await context.params).id, request.nextUrl.searchParams.get("token") || "")); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: NextRequest, context: Context) {
  try { const body = await readBody(request); return NextResponse.json(await cancelBooking((await context.params).id, typeof body.token === "string" ? body.token : "")); } catch (error) { return errorResponse(error); }
}
