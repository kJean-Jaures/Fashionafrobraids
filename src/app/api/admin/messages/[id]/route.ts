import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readBody, errorResponse } from "@/lib/http";
import { db } from "@/lib/db";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { try { requireAdmin(request); await readBody(request); await (await db()).query("UPDATE messages SET read=TRUE WHERE id=$1", [(await context.params).id]); return NextResponse.json({ saved: true }); } catch (error) { return errorResponse(error); } }
