import { notFound } from "next/navigation";
import { readBooking } from "@/lib/domain";
import { BookingConfirmation } from "@/components/booking";
export const metadata = { title: "Votre rendez-vous", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string; payment?: string }> }) {
  try { const query = await searchParams; const token = query.token || ""; return <BookingConfirmation initialBooking={await readBooking((await params).id, token)} token={token} paymentError={query.payment === "error"}/>; } catch { notFound(); }
}
