import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

await mkdir("data", { recursive: true });
try {
  await readFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await writeFile(".env.local", `# Configuration locale privée.\nADMIN_PASSWORD=${randomBytes(32).toString("base64url")}\n`, { flag: "wx", mode: 0o600 });
}
console.log("Configuration locale prête. Le mot de passe de gestion se trouve dans .env.local (non versionné).");
