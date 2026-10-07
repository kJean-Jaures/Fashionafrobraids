import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveContent, removeContent } from "@/lib/admin";
import { errorResponse, readBody, assertSameOrigin } from "@/lib/http";
import { DomainError } from "@/lib/domain";
import type { Collection } from "@/lib/db";
const collectionName = (name: string) => { if (!["services", "products", "employees", "gallery", "reviews"].includes(name)) throw new DomainError("Collection inconnue.", 404); return name as Collection; };
type Context = { params: Promise<{ collection: string }> };
export async function PUT(request: NextRequest, context: Context) { try { requireAdmin(request); return NextResponse.json(await saveContent(collectionName((await context.params).collection), await readBody(request))); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: NextRequest, context: Context) { try { requireAdmin(request); assertSameOrigin(request); await removeContent(collectionName((await context.params).collection), request.nextUrl.searchParams.get("id") || ""); return NextResponse.json({ deleted: true }); } catch (error) { return errorResponse(error); } }
