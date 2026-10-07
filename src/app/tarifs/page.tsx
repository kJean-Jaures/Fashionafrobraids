import type { Metadata } from "next";
import { PricesPage } from "@/components/catalogue";
export const metadata: Metadata = { title: "Prestations & tarifs" };
export default function Page() { return <PricesPage/>; }
