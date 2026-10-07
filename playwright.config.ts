import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3100", headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  reporter: "list",
  webServer: { command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100/api/catalog", timeout: 90000, reuseExistingServer: false, env: { DATA_DIR: join(tmpdir(), `fab-e2e-${process.pid}`), UPLOAD_DIR: join(tmpdir(), `fab-e2e-uploads-${process.pid}`), DATABASE_URL: "", ADMIN_PASSWORD: "test-only-password-32-characters", RESEND_API_KEY: "", PAYPAL_CLIENT_ID: "", PAYPAL_CLIENT_SECRET: "", PAYPAL_WEBHOOK_ID: "" } }
});
