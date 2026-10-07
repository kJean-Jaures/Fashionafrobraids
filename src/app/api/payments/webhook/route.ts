import { NextRequest, NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/lib/payments";
import { errorResponse } from "@/lib/http";
export async function POST(request: NextRequest) { try { await handlePaymentWebhook(await request.text(), request.headers.get("stripe-signature") || ""); return NextResponse.json({ received: true }); } catch (error) { return errorResponse(error); } }
