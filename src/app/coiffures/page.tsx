import type { Metadata } from "next";
import { CataloguePage } from "@/components/catalogue";
export const metadata: Metadata = { title: "Nos coiffures · Tresses, knotless, perruques & soins" };
export default async function Page({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) { return <CataloguePage category={(await searchParams).categorie}/>; }
