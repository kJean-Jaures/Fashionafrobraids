import { createHash, createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { DomainError } from "./domain";

export const ADMIN_COOKIE = "fab_admin";
function password() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.length < 16) throw new DomainError("Configurez un ADMIN_PASSWORD d’au moins 16 caractères sur le serveur pour activer la gestion.", 503);
  return value;
}
export function authenticate(value: string) {
  const expected = createHash("sha256").update(password()).digest();
  const actual = createHash("sha256").update(value).digest();
  return timingSafeEqual(expected, actual);
}
const sign = (payload: string) => createHmac("sha256", password()).update(payload).digest("base64url");
export function createSession() {
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + 8 * 3600000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookie) throw new DomainError("Connectez-vous pour accéder à la gestion.", 401);
  const [payload, signature, extra] = cookie.split(".");
  if (extra || !payload || !signature) throw new DomainError("Session invalide.", 401);
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw new DomainError("Session invalide.", 401);
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!Number.isFinite(session.expires) || session.expires < Date.now()) throw new Error();
  } catch { throw new DomainError("Session expirée. Reconnectez-vous.", 401); }
}
