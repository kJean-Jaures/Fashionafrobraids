import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveSettings } from "@/lib/admin";
import { readBody, errorResponse } from "@/lib/http";
export async function PUT(request: NextRequest) { try { requireAdmin(request); return NextResponse.json(await saveSettings(await readBody(request))); } catch (error) { return errorResponse(error); } }
