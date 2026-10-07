import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, authenticate, createSession } from "@/lib/auth";
import { DomainError } from "@/lib/domain";
import { errorResponse, readBody, rateLimit, assertSameOrigin } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    rateLimit(request, "admin-login", 10, 600000);
    const input = z.object({ password: z.string().max(200) }).parse(await readBody(request));
    if (!authenticate(input.password)) throw new DomainError("Mot de passe incorrect.", 401);
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE, createSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 8 * 3600 });
    return response;
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: NextRequest) { try { assertSameOrigin(request); const response = NextResponse.json({ authenticated: false }); response.cookies.delete(ADMIN_COOKIE); return response; } catch (error) { return errorResponse(error); } }
