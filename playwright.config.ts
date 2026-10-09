import { defineConfig } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3100", headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] }, trace: "retain-on-failure", screenshot: "only-on-failure" },
  reporter: "list",
  webServer: { command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100/api/catalog", timeout: 90000, reuseExistingServer: false, env: { DATA_DIR: join(tmpdir(), `fab-e2e-${process.pid}`), UPLOAD_DIR: join(tmpdir(), `fab-e2e-uploads-${process.pid}`), DATABASE_URL: "", ADMIN_PASSWORD: "test-only-password-32-characters", RESEND_API_KEY: "", EMAIL_FROM: "", CRON_SECRET: "test-only-cron-secret-32-characters", PAYPAL_CLIENT_ID: "", PAYPAL_CLIENT_SECRET: "", PAYPAL_WEBHOOK_ID: "", PAYMENT_PROVIDER: "bank_transfer", MOLLIE_API_KEY: "", MOLLIE_MODE: "test", SUMUP_API_KEY: "", SUMUP_MERCHANT_CODE: "", SUMUP_MODE: "test" } }
});
