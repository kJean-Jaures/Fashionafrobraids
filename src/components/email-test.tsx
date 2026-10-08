"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { api, FormError } from "./ui";

export function EmailConnectionTest({ configured, email }: { configured: boolean; email: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recipient, setRecipient] = useState("");

  async function send() {
    setPending(true); setError(""); setRecipient("");
    try {
      const result = await api<{ accepted: boolean; recipient: string }>("/api/admin/email-test", { method: "POST" });
      if (result.accepted) setRecipient(result.recipient);
    } catch (error) { setError((error as Error).message); }
    finally { setPending(false); }
  }
  return <div>
    <h3>Vérifier l’envoi</h3>
    <p className="small muted">{email ? <>Un message de test sera envoyé à <strong>{email}</strong>.</> : "Enregistrez l’adresse e-mail du salon dans les paramètres pour recevoir le test."}</p>
    <button className="button outline" type="button" disabled={pending || !configured || !email} onClick={() => void send()}><Mail size={17}/>{pending ? "Envoi en cours…" : "Envoyer un e-mail de test"}</button>
    <FormError error={error}/>
    {recipient && <p role="status" className="small">Resend a accepté le message de test pour {recipient}. Vérifiez votre boîte de réception et les courriers indésirables.</p>}
  </div>;
}
