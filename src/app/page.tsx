import { Home } from "@/components/home";
import { getSettings } from "@/lib/db";
export default async function Page() {
  const settings = await getSettings();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const json = { "@context": "https://schema.org", "@type": "HairSalon", name: settings.name, telephone: settings.phone, address: { "@type": "PostalAddress", streetAddress: "74 Avenue de Saint-Ouen", postalCode: "75018", addressLocality: "Paris", addressCountry: "FR" }, url: process.env.PUBLIC_SITE_URL || "https://fashionafrobraids.fr", openingHoursSpecification: Object.entries(settings.schedule).filter(([, d]) => !d.closed).map(([day, d]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[+day], opens: d.start, closes: d.end })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, "\\u003c") }}/><Home/></>;
}
