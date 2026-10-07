import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { cancelBookingAdmin, moveBooking } from "@/lib/domain";
import { readBody, errorResponse } from "@/lib/http";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request); const id = (await context.params).id;
    const input = z.discriminatedUnion("action", [z.object({ action: z.literal("cancel") }), z.object({ action: z.literal("move"), date: z.string(), time: z.string(), employeeId: z.string() })]).parse(await readBody(request));
    if (input.action === "cancel") await cancelBookingAdmin(id); else await moveBooking(id, input.date, input.time, input.employeeId);
    return NextResponse.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
