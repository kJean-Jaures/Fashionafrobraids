import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateOrder } from "@/lib/domain";
import { readBody, errorResponse } from "@/lib/http";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { requireAdmin(request); const input = z.object({ status: z.enum(["completed", "cancelled"]) }).parse(await readBody(request)); await updateOrder((await context.params).id, input.status); return NextResponse.json({ saved: true }); } catch (error) { return errorResponse(error); } }
