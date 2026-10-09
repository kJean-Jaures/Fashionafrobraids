import { NextRequest, NextResponse } from "next/server";
import { readBooking, DomainError } from "@/lib/domain";
import { bankTransferQrPng, BankTransferQrError } from "@/lib/bank-transfer-qr";
import { errorResponse } from "@/lib/http";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const booking = await readBooking((await context.params).id, request.nextUrl.searchParams.get("token") || "");
    if (booking.status !== "pending_payment" || booking.data.depositPaid || booking.data.paymentProvider !== "bank_transfer" ||
        !booking.expires_at || booking.expires_at <= Date.now() || !booking.data.bankTransfer) {
      throw new DomainError("Ce rendez-vous n’attend plus de virement. Consultez votre réservation ou contactez le salon.", 409);
    }
    const png = await bankTransferQrPng({ ...booking.data.bankTransfer, amount: booking.data.deposit, reference: booking.id });
    const filename = `virement-${booking.id.replace(/[^A-Z0-9-]/gi, "")}.png`;
    return new NextResponse(new Uint8Array(png), { headers: {
      ...privateHeaders, "Content-Type": "image/png",
      "Content-Disposition": `${request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${filename}"`,
    } });
  } catch (error) {
    const response = errorResponse(error instanceof BankTransferQrError
      ? new DomainError("Le QR code n’est pas disponible pour ces coordonnées. Utilisez les coordonnées de votre réservation.", 400) : error);
    for (const [name, value] of Object.entries(privateHeaders)) response.headers.set(name, value);
    return response;
  }
}
