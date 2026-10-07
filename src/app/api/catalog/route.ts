import { NextResponse } from "next/server";
import { publicCatalog } from "@/lib/db";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json(await publicCatalog()); } catch (error) { return errorResponse(error); } }
