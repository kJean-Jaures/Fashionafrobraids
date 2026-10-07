import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
for (const size of [192, 512]) await sharp("public/icon.svg").resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
await sharp("public/icon.svg").resize(340, 340).extend({ top: 86, bottom: 86, left: 86, right: 86, background: "#F6ECE4" }).png().toFile("public/icons/maskable-512.png");
console.log("Icônes PWA générées.");
