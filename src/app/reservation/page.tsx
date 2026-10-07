import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking";
export const metadata: Metadata = { title: "Prendre rendez-vous", robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<{ prestation?: string; variante?: string; options?: string }> }) { const params = await searchParams; return <BookingWizard initialService={params.prestation} initialVariant={params.variante} initialOptions={params.options}/>; }
