import { spawn } from "node:child_process";
import { constants } from "node:os";
import { resolve } from "node:path";

// The demo uses PostgreSQL compiled to WASM. Its optimizing compiler creates
// a large memory spike, even after startup. Baseline compilation keeps the
// free 512 MiB preview running; deployments using external PostgreSQL keep
// Node's default settings.
const flags = process.env.DEMO_MODE === "true" && !process.env.DATABASE_URL
  ? ["--liftoff-only", "--wasm-num-compilation-tasks=1", "--max-old-space-size=128"]
  : [];
const child = spawn(process.execPath, [
  ...flags, resolve("node_modules/next/dist/bin/next"), "start",
  "--hostname", "0.0.0.0", ...process.argv.slice(2),
], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", error => {
  console.error("Unable to start the web server:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 128 + constants.signals[signal] : 1);
});
