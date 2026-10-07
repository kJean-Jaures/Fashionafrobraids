import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { contactSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { readBody, errorResponse, rateLimit } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    rateLimit(request, "contact", 50, 3600000);
    const data = contactSchema.parse(await readBody(request));
    await (await db()).query("INSERT INTO messages(id,data,created_at) VALUES($1,$2::jsonb,$3)", [randomUUID(), JSON.stringify(data), Date.now()]);
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
