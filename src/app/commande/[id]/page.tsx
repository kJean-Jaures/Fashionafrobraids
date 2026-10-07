import { readOrder } from "@/lib/domain";
import { OrderConfirmation } from "@/components/shop";
import { notFound } from "next/navigation";
export const metadata = { title: "Suivi de commande", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  try { const order = await readOrder((await params).id, (await searchParams).token || ""); return <OrderConfirmation order={order}/>; } catch { notFound(); }
}
