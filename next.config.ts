import type { NextConfig } from "next";

const codespacesOrigin = process.env.CODESPACES === "true" && process.env.CODESPACE_NAME
  ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev"}`
  : undefined;

// Un tunnel de test a son propre domaine. Autoriser uniquement celui choisi
// dans la configuration privée, sans ouvrir les accès de développement à tous.
function publicDevelopmentOrigin() {
  if (process.env.NODE_ENV !== "development") return undefined;
  try {
    const site = new URL(process.env.PUBLIC_SITE_URL || "");
    return site.protocol === "https:" && !site.username && !site.password ? site.hostname : undefined;
  } catch { return undefined; }
}
const publicOrigin = publicDevelopmentOrigin();

const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", ...(codespacesOrigin ? [codespacesOrigin] : []), ...(publicOrigin ? [publicOrigin] : [])],
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Frame-Options", value: "DENY" }
      ] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }
    ];
  }
};
export default config;
