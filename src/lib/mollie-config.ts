export const mollieMode = () => process.env.MOLLIE_MODE || "test";

export function mollieConfigured() {
  if (!["test", "live"].includes(mollieMode()) || (process.env.DEMO_MODE === "true" && mollieMode() === "live")) return false;
  try {
    const site = new URL(process.env.PUBLIC_SITE_URL || "");
    return Boolean(process.env.MOLLIE_API_KEY && site.protocol === "https:" && !site.username && !site.password &&
      site.hostname !== "localhost" && site.hostname !== "127.0.0.1" && site.hostname !== "[::1]");
  } catch { return false; }
}
