import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./domain";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Vérifiez les informations saisies." }, { status: 400 });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "La requête n’est pas valide." }, { status: 400 });
  console.error("Échec de l’opération", error instanceof Error ? error.message : "Erreur serveur");
  return NextResponse.json({ error: "Une erreur est survenue. Réessayez dans quelques instants." }, { status: 500 });
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && new URL(origin).host !== host) throw new DomainError("Cette requête n’est pas autorisée.", 403);
}

export async function readBody(request: NextRequest) {
  assertSameOrigin(request);
  if (Number(request.headers.get("content-length")) > 10000) throw new DomainError("Requête trop volumineuse.", 413);
  const body = await request.text();
  if (body.length > 10000) throw new DomainError("Requête trop volumineuse.", 413);
  return JSON.parse(body);
}

const attempts = new Map<string, { count: number; expiry: number }>();
export function rateLimit(request: NextRequest, scope: string, max: number, period: number) {
  const now = Date.now();
  if (attempts.size > 10000) for (const [key, value] of attempts) if (value.expiry <= now) attempts.delete(key);
  // Une limite globale par instance : ne pas se fier à des en-têtes IP fournis par le client.
  const key = scope;
  const entry = attempts.get(key);
  if (entry && entry.expiry > now) {
    if (entry.count >= max) throw new DomainError("Trop de tentatives. Réessayez dans quelques minutes.", 429);
    entry.count++;
  } else attempts.set(key, { count: 1, expiry: now + period });
}
