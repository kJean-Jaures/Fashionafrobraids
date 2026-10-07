import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireAdmin } from "@/lib/auth";
import { DomainError } from "@/lib/domain";
import { errorResponse, assertSameOrigin } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request); assertSameOrigin(request);
    if (Number(request.headers.get("content-length")) > 9 * 1024 * 1024) throw new DomainError("La photo doit faire moins de 8 Mo.", 413);
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new DomainError("Choisissez une photo JPG, PNG ou WebP de moins de 8 Mo.");
    const content = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 30000000 }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer().catch(() => { throw new DomainError("Cette photo est illisible ou trop grande. Choisissez un autre fichier JPG, PNG ou WebP."); });
    const name = `upload-${randomUUID()}.webp`; const directory = process.env.UPLOAD_DIR || resolve("data/uploads"); await mkdir(directory, { recursive: true }); await writeFile(resolve(directory, name), content, { flag: "wx" });
    return NextResponse.json({ image: `/images/${name}` });
  } catch (error) { return errorResponse(error); }
}
