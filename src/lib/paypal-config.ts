export function paypalConfigured() {
  if (process.env.DEMO_MODE === "true" && process.env.PAYPAL_MODE === "live") return false;
  try {
    const site = new URL(process.env.PUBLIC_SITE_URL || "");
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID &&
      ["sandbox", "live"].includes(process.env.PAYPAL_MODE || "sandbox") && site.protocol === "https:" && !site.username && !site.password);
  } catch { return false; }
}
