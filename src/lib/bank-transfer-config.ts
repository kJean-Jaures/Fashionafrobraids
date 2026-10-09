import type { Settings } from "./catalog";

export const normalizeIban = (value: string) => value.replace(/\s/g, "").toUpperCase();
export function validIban(value: string) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  let remainder = 0;
  for (const character of iban.slice(4) + iban.slice(0, 4)) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
export function bankTransferConfigured(settings?: Settings) {
  return Boolean(settings && validIban(settings.bankTransferIban) && settings.bankTransferBeneficiary.trim().length >= 2);
}
