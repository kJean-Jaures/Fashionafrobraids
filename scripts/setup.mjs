import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

await mkdir("data", { recursive: true });
let content;
try {
  content = await readFile(".env.local", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  content = "# Configuration locale privée.\n";
  await writeFile(".env.local", content, { flag: "wx", mode: 0o600 });
}
const settings = parseEnv(content);
if (!settings.ADMIN_PASSWORD) {
  const generated = randomBytes(32).toString("base64url");
  const assignment = [...content.matchAll(/^([ \t]*(?:export[ \t]+)?ADMIN_PASSWORD[ \t]*=)[^\r\n]*/gm)].at(-1);
  if (assignment) {
    const start = assignment.index;
    await writeFile(".env.local", content.slice(0, start) + assignment[1] + generated + content.slice(start + assignment[0].length));
  } else {
    const newline = content.includes("\r\n") ? "\r\n" : "\n";
    const prefix = content.length && !content.endsWith("\n") ? newline : "";
    await appendFile(".env.local", `${prefix}ADMIN_PASSWORD=${generated}${newline}`);
  }
}
console.log("Configuration locale prête. Le mot de passe de gestion se trouve dans .env.local (non versionné).");
