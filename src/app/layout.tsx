import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "./globals.css";
import { publicCatalog } from "@/lib/db";
import { SiteProvider } from "@/components/provider";
import { Header, Footer } from "@/components/navigation";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "https://fashionafrobraids.fr"),
  title: { default: "Fashion Afro Braids Paris | Coiffure Afro & Braids Paris 18e", template: "%s | Fashion Afro Braids Paris" },
  description: "Fashion Afro Braids, salon de coiffure afro à Paris 18e spécialisé en braids, knotless, tresses, extensions, perruques et soins capillaires. Réservez votre rendez-vous.",
  applicationName: "Fashion Afro Braids", manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Fashion Afro Braids" },
  icons: { icon: "/icon.svg", apple: "/images/logo-fashion-afro-braids.jpg" },
  openGraph: { type: "website", locale: "fr_FR", siteName: "Fashion Afro Braids Paris", title: "L’art de sublimer vos cheveux.", description: "Coiffure afro, braids et soins capillaires à Paris 18e.", images: [{ url: "/images/hero.webp", width: 1024, height: 1536 }] },
  robots: { index: process.env.DEMO_MODE !== "true" && process.env.ALLOW_INDEXING === "true", follow: process.env.DEMO_MODE !== "true" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F6ECE4" };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const catalog = await publicCatalog();
  const demo = process.env.DEMO_MODE === "true";
  return <html lang="fr"><body className={demo ? "demo-mode" : undefined}><SiteProvider catalog={catalog}><Header/>{demo && <aside className="demo-notice" aria-label="Version de démonstration">Démonstration · Réservations de test uniquement.</aside>}<main id="contenu">{children}</main><Footer/></SiteProvider></body></html>;
}
