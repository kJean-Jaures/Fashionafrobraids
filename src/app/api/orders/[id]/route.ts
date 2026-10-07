import { NextRequest, NextResponse } from "next/server";
import { readOrder } from "@/lib/domain";
import { errorResponse } from "@/lib/http";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { return NextResponse.json(await readOrder((await context.params).id, request.nextUrl.searchParams.get("token") || "")); } catch (error) { return errorResponse(error); } }
