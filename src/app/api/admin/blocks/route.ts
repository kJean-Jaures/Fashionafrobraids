import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createBlock } from "@/lib/domain";
import { db } from "@/lib/db";
import { readBody, errorResponse, assertSameOrigin } from "@/lib/http";
export async function POST(request: NextRequest) { try { requireAdmin(request); const input = z.object({ employeeId: z.string().nullable(), start: z.number(), end: z.number(), reason: z.string().min(2).max(200) }).parse(await readBody(request)); return NextResponse.json({ id: await createBlock(input.employeeId, input.start, input.end, input.reason) }, { status: 201 }); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: NextRequest) { try { requireAdmin(request); assertSameOrigin(request); await (await db()).query("DELETE FROM blocks WHERE id=$1", [request.nextUrl.searchParams.get("id") || ""]); return NextResponse.json({ deleted: true }); } catch (error) { return errorResponse(error); } }
