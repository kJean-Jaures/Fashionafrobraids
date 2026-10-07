import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (!/^upload-[a-f0-9-]{36}\.webp$/.test(name)) return new NextResponse(null, { status: 404 });
  try {
    // Les uploads appartiennent au disque persistant ; ils ne doivent pas être inclus dans le build.
    const file = await readFile(/* turbopackIgnore: true */ resolve(process.env.UPLOAD_DIR || "data/uploads", name));
    return new NextResponse(new Uint8Array(file), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
