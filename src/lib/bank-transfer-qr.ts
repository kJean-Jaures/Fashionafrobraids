import QRCode from "qrcode";
import { normalizeIban, validIban } from "./bank-transfer-config";

type Transfer = { beneficiary: string; iban: string; bic?: string; amount: number; reference: string };
export class BankTransferQrError extends Error {}

/** EPC069-12, version 002 : UTF-8, montant en euros et référence non structurée. */
export function bankTransferQrPayload(transfer: Transfer) {
  const beneficiary = transfer.beneficiary.trim();
  const iban = normalizeIban(transfer.iban);
  const bic = (transfer.bic || "").trim().toUpperCase();
  const reference = transfer.reference.trim();
  const invalidText = (value: string, max: number) => !value || Array.from(value).length > max || /\p{Cc}/u.test(value);
  if (!validIban(iban) || invalidText(beneficiary, 70) || invalidText(reference, 140) ||
      (bic && !/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic)) ||
      !Number.isSafeInteger(transfer.amount) || transfer.amount < 1 || transfer.amount > 99999999999) {
    throw new BankTransferQrError("Ces coordonnées ne permettent pas de préparer un QR code de virement.");
  }
  const amount = `${Math.floor(transfer.amount / 100)}.${String(transfer.amount % 100).padStart(2, "0")}`;
  // BIC facultatif en v002 ; objet et référence structurée restent vides.
  const payload = ["BCD", "002", "1", "SCT", bic, beneficiary, iban, `EUR${amount}`, "", "", reference].join("\n");
  if (Buffer.byteLength(payload, "utf8") > 331) throw new BankTransferQrError("Ces coordonnées sont trop longues pour un QR code de virement.");
  return payload;
}

export function bankTransferQrPng(transfer: Transfer) {
  return QRCode.toBuffer(bankTransferQrPayload(transfer), {
    type: "png", errorCorrectionLevel: "M", margin: 4, width: 480,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}
