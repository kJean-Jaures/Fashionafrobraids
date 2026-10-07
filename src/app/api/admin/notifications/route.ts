import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deliverNotifications } from "@/lib/notifications";
import { errorResponse, assertSameOrigin } from "@/lib/http";
export async function POST(request: NextRequest) { try { requireAdmin(request); assertSameOrigin(request); return NextResponse.json(await deliverNotifications()); } catch (error) { return errorResponse(error); } }
