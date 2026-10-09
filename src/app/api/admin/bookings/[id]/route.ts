import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { cancelBookingAdmin, moveBooking, receiveBankTransfer } from "@/lib/domain";
import { deliverNotifications } from "@/lib/notifications";
import { db } from "@/lib/db";
import { readBody, errorResponse } from "@/lib/http";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireAdmin(request); const id = (await context.params).id;
    const input = z.discriminatedUnion("action", [z.object({ action: z.literal("cancel") }), z.object({ action: z.literal("move"), date: z.string(), time: z.string(), employeeId: z.string() }), z.object({ action: z.literal("receive_transfer"), received: z.literal(true), receiptReference: z.string().trim().max(100).default("") })]).parse(await readBody(request));
    if (input.action === "receive_transfer") {
      const result = await receiveBankTransfer(id, input.receiptReference);
      if (result.status === "confirmed") await deliverNotifications();
      const email = (await (await db()).query<{ status: string }>("SELECT status FROM notifications WHERE booking_id=$1 AND kind LIKE 'confirmation-%' ORDER BY due_at DESC LIMIT 1", [id])).rows[0];
      return NextResponse.json({ saved: true, ...result, confirmationEmailStatus: email?.status || "not_queued" });
    }
    if (input.action === "cancel") await cancelBookingAdmin(id); else await moveBooking(id, input.date, input.time, input.employeeId);
    if (input.action === "move") await deliverNotifications();
    return NextResponse.json({ saved: true });
  } catch (error) { return errorResponse(error); }
}
