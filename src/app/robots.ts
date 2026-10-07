import type { MetadataRoute } from "next";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: (process.env.DEMO_MODE !== "true" && process.env.ALLOW_INDEXING === "true") ? "/" : [], disallow: (process.env.DEMO_MODE !== "true" && process.env.ALLOW_INDEXING === "true") ? ["/api/", "/admin", "/reservation/", "/commande/", "/mes-rendez-vous"] : "/" }, sitemap: `${process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "https://fashionafrobraids.fr"}/sitemap.xml` }; }
