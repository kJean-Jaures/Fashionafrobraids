import type { Metadata } from "next";
import { Checkout } from "@/components/shop";
export const metadata: Metadata = { title: "Votre commande", robots: { index: false, follow: false } };
export default function Page() { return <Checkout/>; }
