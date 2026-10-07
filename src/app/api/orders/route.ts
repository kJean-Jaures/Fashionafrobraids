import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/domain";
import { orderSchema } from "@/lib/validation";
import { readBody, errorResponse, rateLimit } from "@/lib/http";
export async function POST(request: NextRequest) { try { rateLimit(request, "orders", 100, 3600000); return NextResponse.json(await createOrder(orderSchema.parse(await readBody(request))), { status: 201 }); } catch (error) { return errorResponse(error); } }
