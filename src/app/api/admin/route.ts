import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dashboard } from "@/lib/admin";
import { errorResponse } from "@/lib/http";
export async function GET(request: NextRequest) { try { requireAdmin(request); return NextResponse.json(await dashboard()); } catch (error) { return errorResponse(error); } }
