import { one } from "@/lib/db";
import type { Service } from "@/lib/catalog";
import { ServiceDetail } from "@/components/catalogue";
import { notFound } from "next/navigation";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const service = await one<Service>("services", (await params).id); return { title: service?.name || "Coiffure" }; }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const service = await one<Service>("services", (await params).id); if (!service?.active) notFound(); return <ServiceDetail service={service}/>; }
