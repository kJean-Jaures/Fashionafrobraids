import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogueVersion } from "../src/lib/catalogue-version.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const portArgument = process.argv.slice(2).find(value => value.startsWith("--port="));
let port = portArgument ? Number(portArgument.slice(7)) : 3000;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("Choisissez un port entre 1024 et 65535."); process.exit(1);
}
if (Number(process.versions.node.split(".")[0]) !== 24) {
  console.error("Installez Node.js 24 depuis https://nodejs.org, puis relancez ce fichier."); process.exit(1);
}
let address = "http://localhost:" + port;
let probeAddress = "http://127.0.0.1:" + port;
const demoEnvironment = { ...process.env, DEMO_MODE: "true", ALLOW_INDEXING: "false" };

async function currentCatalogue() {
  try {
    const response = await fetch(probeAddress + "/api/catalog", { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.settings?.timezone === "Europe/Paris" && data.settings?.name === "Fashion Afro Braids Paris" && Array.isArray(data.services) && Array.isArray(data.products) && typeof data.bookingPaymentsEnabled === "boolean" ? data : null;
  } catch { return null; }
}
async function ready() { return (await currentCatalogue())?.catalogueVersion === catalogueVersion; }
function portAvailable(candidate = port) {
  return new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.once("error", error => error.code === "EADDRINUSE" ? resolvePromise(false) : reject(error));
    probe.listen(candidate, "127.0.0.1", () => probe.close(() => resolvePromise(true)));
  });
}
function npm(args) {
  // Arguments fixes : aucune donnée client n’est interpolée dans une commande shell.
  const executable = process.platform === "win32" ? "cmd.exe" : "npm";
  const argv = process.platform === "win32" ? ["/d", "/s", "/c", "npm " + args.join(" ")] : args;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, argv, { cwd: root, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolvePromise() : reject(new Error("La commande npm " + args.join(" ") + " a échoué.")));
  });
}
function openBrowser() {
  console.log("\nLe site est prêt : " + address);
  if (process.env.LOCAL_PREVIEW_NO_OPEN === "1") return;
  const [command, args] = process.platform === "win32" ? ["explorer.exe", [address]] : process.platform === "darwin" ? ["open", [address]] : ["xdg-open", [address]];
  const browser = spawn(command, args, { detached: true, stdio: "ignore" });
  browser.once("error", () => console.log("Ouvrez cette adresse dans votre navigateur : " + address));
  browser.unref();
}
async function main() {
  console.log("Fashion Afro Braids · aperçu local sur votre ordinateur\n");
  // Prépare aussi un fichier existant qui ne contient encore que les clés e-mail.
  // Le script ne dépend que de Node et conserve les valeurs déjà enregistrées.
  await npm(["run", "setup"]);
  if (await ready()) { openBrowser(); return; }
  if (await currentCatalogue()) {
    // Un ancien ZIP peut encore servir le port 3000. Ouvrir la nouvelle copie
    // sans arrêter ce serveur ni réutiliser silencieusement ses anciens contenus.
    let available;
    for (let candidate = port + 1; candidate <= Math.min(port + 10, 65535); candidate++) {
      if (await portAvailable(candidate)) { available = candidate; break; }
    }
    if (!available) throw new Error("Fermez l’ancienne fenêtre du site, puis relancez cette version.");
    port = available; address = "http://localhost:" + port; probeAddress = "http://127.0.0.1:" + port;
    console.log("Une ancienne version du site est encore ouverte. Cette nouvelle version utilisera le port " + port + ".");
  }
  if (!await portAvailable()) {
    // L’application peut être en train de compiler dans une autre fenêtre.
    for (let attempt = 0; attempt < 8; attempt++) {
      if (await ready()) { openBrowser(); return; }
      await new Promise(resolvePromise => setTimeout(resolvePromise, 1000));
    }
    throw new Error("Le port " + port + " est déjà utilisé. Fermez l’autre serveur ou choisissez un autre port avec npm run local -- --port=3001.");
  }
  if (!existsSync(resolve(root, "node_modules/next/dist/bin/next"))) await npm(["ci", "--no-audit", "--no-fund"]);
  else {
    // Contrôle la compatibilité des dépendances après une mise à jour du projet.
    try { await npm(["ls", "--depth=0"]); }
    catch { await npm(["ci", "--no-audit", "--no-fund"]); }
  }
  console.log("\nPréparation du site… Gardez cette fenêtre ouverte. Ctrl+C pour arrêter.\n");
  const child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, stdio: "inherit", env: demoEnvironment });
  let exited = false;
  const stopped = new Promise((resolvePromise, reject) => {
    child.once("error", error => { exited = true; reject(error); });
    child.once("exit", (code, signal) => { exited = true; code === 0 || signal ? resolvePromise() : reject(new Error("Le serveur s’est arrêté avec une erreur.")); });
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  // Le serveur doit répondre réellement avant d’ouvrir le navigateur.
  await Promise.race([stopped, (async () => {
    const deadline = Date.now() + 120000;
    while (!exited && Date.now() < deadline) {
      if (await ready()) { openBrowser(); return; }
      await new Promise(resolvePromise => setTimeout(resolvePromise, 750));
    }
    if (!exited) { child.kill("SIGTERM"); throw new Error("Le serveur met trop de temps à répondre. Consultez les messages ci-dessus."); }
  })()]);
  await stopped;
}
try { await main(); } catch (error) { console.error("\n" + error.message); process.exitCode = 1; }
