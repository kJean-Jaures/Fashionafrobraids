"use client";
import { useEffect, useState } from "react";
import type { Settings } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import type { Booking } from "@/lib/domain";
import { formatDate, formatTime } from "@/lib/time";
import { useSite } from "./provider";
import { Field, FormError, SubmitButton, api } from "./ui";

export function BankTransferSettings({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState({ ...settings, bookingPaymentMethod: settings.bookingPaymentMethod || "bank_transfer" as const });
  const [pending, setPending] = useState(false); const [error, setError] = useState("");
  useEffect(() => { setDraft({ ...settings, bookingPaymentMethod: settings.bookingPaymentMethod || "bank_transfer" }); }, [settings]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(draft) }); await onSaved(); }
    catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  return <form className="admin-panel" onSubmit={save}>
    <h2>Virement direct sur votre compte</h2>
    <Field label="Mode de paiement de l’acompte"><select value={draft.bookingPaymentMethod} onChange={e => setDraft({ ...draft, bookingPaymentMethod: e.target.value as Settings["bookingPaymentMethod"] & string })}><option value="bank_transfer">Virement bancaire · vérification par le salon</option><option value="sumup">Carte et Apple Pay · SumUp</option><option value="paypal">PayPal</option></select></Field>
    <div className="form-grid">
      <Field label="Bénéficiaire du virement"><input autoComplete="off" maxLength={100} value={draft.bankTransferBeneficiary} onChange={e => setDraft({ ...draft, bankTransferBeneficiary: e.target.value })}/></Field>
      <Field label="IBAN du salon"><input autoComplete="off" spellCheck={false} maxLength={64} value={draft.bankTransferIban} onChange={e => setDraft({ ...draft, bankTransferIban: e.target.value })}/></Field>
      <Field label="BIC (facultatif)"><input autoComplete="off" maxLength={11} value={draft.bankTransferBic} onChange={e => setDraft({ ...draft, bankTransferBic: e.target.value })}/></Field>
      <Field label="Délai de paiement du virement (heures)"><input type="number" min={1} max={72} value={draft.bankTransferHoldHours} onChange={e => setDraft({ ...draft, bankTransferHoldHours: Number(e.target.value) })}/></Field>
    </div>
    <p className="small muted">Le bénéficiaire et un IBAN valide activent le virement. Ils sont affichés uniquement sur les pages privées des réservations concernées. Le délai est limité au début du rendez-vous ; passé ce délai, le créneau est libéré. Les réservations existantes conservent leurs coordonnées et leur échéance.</p>
    <p>Aucun e-mail d’instructions n’est envoyé. Vérifiez les 10 € reçus dans votre banque, puis utilisez « Acompte reçu » dans Rendez-vous : la confirmation et le rappel sont préparés automatiquement.</p>
    <FormError error={error}/><SubmitButton pending={pending}>Enregistrer le mode de paiement</SubmitButton>
  </form>;
}

export function BankTransferDetails({ booking }: { booking: Booking }) {
  const { toast } = useSite(); const bank = booking.data.bankTransfer;
  if (!bank || booking.data.paymentProvider !== "bank_transfer" || booking.status !== "pending_payment" || booking.data.depositPaid || !booking.expires_at || booking.expires_at <= Date.now()) return null;
  const copy = async (value: string, label: string) => { try { await navigator.clipboard.writeText(value); toast(label + " copié"); } catch { toast("Vous pouvez sélectionner et copier le texte affiché."); } };
  return <section className="confirmation-card bank-transfer-details" aria-label="Coordonnées pour le virement">
    <h2>Votre acompte par virement</h2><p>Effectuez un virement de <strong>{money(booking.data.deposit)}</strong> depuis votre application bancaire, avec la référence ci-dessous.</p>
    <dl><div><dt>Bénéficiaire</dt><dd>{bank.beneficiary}</dd></div><div><dt>IBAN</dt><dd>{bank.iban.replace(/(.{4})/g, "$1 ").trim()}</dd></div>{bank.bic && <div><dt>BIC</dt><dd>{bank.bic}</dd></div>}<div><dt>Motif / référence</dt><dd>{booking.id}</dd></div><div><dt>Échéance</dt><dd>{formatDate(booking.expires_at)} à {formatTime(booking.expires_at)} · heure de Paris</dd></div></dl>
    <div className="confirmation-actions"><button className="button outline" onClick={() => void copy(bank.iban, "IBAN")}>Copier l’IBAN</button><button className="button outline" onClick={() => void copy(booking.id, "Référence")}>Copier la référence</button></div>
    <p className="small muted">La réservation sera confirmée après vérification de la réception par le salon. Vous recevrez alors votre e-mail de confirmation. Un virement classique peut arriver après l’échéance : contactez le salon si nécessaire.</p>
  </section>;
}
