import type { MetadataRoute } from "next";
import { all } from "@/lib/db";
import type { Service } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "https://fashionafrobraids.fr"; return ["", "/coiffures", "/tarifs", "/boutique", "/a-propos", "/contact", ...(await all<Service>("services")).filter(item => item.active).map(item => `/coiffures/${item.id}`)].map(path => ({ url: base + path, changeFrequency: "weekly", priority: path ? .7 : 1 })); }
