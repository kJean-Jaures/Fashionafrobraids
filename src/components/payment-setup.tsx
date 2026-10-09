"use client";

import type { BookingReadiness } from "@/lib/booking-readiness";

export function PaymentSetupGuide({ payment }: { payment: BookingReadiness["payment"] }) {
  if (payment.provider === "bank_transfer") return <div className="payment-setup-guide">
    <p>Les 10 € arrivent directement sur le compte bancaire du salon. Le site ne prélève aucune commission de paiement ; les éventuels frais bancaires dépendent de votre contrat.</p>
    <p>{payment.configured ? "Coordonnées enregistrées. Vérifiez une réservation de test et sa confirmation." : "À renseigner : bénéficiaire et IBAN du salon dans les paramètres du virement."}</p>
    <p>Après réception des 10 €, cliquez sur « Acompte reçu » dans Rendez-vous. Le site confirme le créneau et prépare la confirmation e-mail et le rappel. Aucun e-mail d’instructions ou de paiement en attente n’est envoyé.</p>
    {payment.demo && <p className="small muted">Démonstration : utilisez des données de test et n’effectuez aucun virement réel.</p>}
  </div>;
  const sumup = payment.provider === "sumup";
  return <div className="payment-setup-guide">
    <p>{sumup ? "Carte bancaire et Apple Pay sur les appareils compatibles, via la page sécurisée SumUp. Les encaissements sont versés sur le compte bancaire enregistré chez SumUp, après les frais du prestataire." : "Paiement via la page sécurisée PayPal. La carte bancaire est proposée selon l’éligibilité du compte et de la cliente."}</p>
    <p>{payment.configured ? "Configuration présente. Une réservation de test doit encore vérifier le paiement et sa confirmation." : sumup ? "À connecter : compte SumUp du salon, clé API privée, code marchand et adresse HTTPS du nouveau site." : "À connecter : compte PayPal Business, identifiants API, webhook et adresse HTTPS du nouveau site."}</p>
    {payment.demo && <p className="small muted">Vous consultez la démonstration. Les paiements réels y sont désactivés.</p>}
    <details className="preparation-guide"><summary>{sumup ? "Les étapes pour connecter carte et Apple Pay" : "Les étapes pour connecter PayPal"}</summary>
      {sumup ? <ol>
        <li>Créer le compte du salon sur <a href="https://www.sumup.com/fr-fr/paiements-en-ligne/" target="_blank" rel="noopener noreferrer">SumUp</a>, puis faire valider le profil et le compte bancaire de réception. Le parcours utilise un paiement en ligne.</li>
        <li>Dans les réglages développeur SumUp, créer un profil Sandbox pour les essais. Relever son code marchand et créer sa clé API privée ; la clé publique ne suffit pas.</li>
        <li>Renseigner les variables privées du serveur : PAYMENT_PROVIDER=sumup, SUMUP_API_KEY, SUMUP_MERCHANT_CODE, SUMUP_MODE=test et PUBLIC_SITE_URL. L’adresse HTTPS doit joindre ce nouveau site.</li>
        <li>Tester l’acompte de 10 € avec le profil Sandbox et une carte de test SumUp. Vérifier la confirmation, l’e-mail et un paiement refusé avant de passer au profil réel avec SUMUP_MODE=live.</li>
      </ol> : <ol>
        <li>Préparer le compte marchand sur <a href="https://www.paypal.com/fr/business" target="_blank" rel="noopener noreferrer">PayPal</a>.</li>
        <li>Créer l’application et le webhook dans PayPal Developer. Commencer en Sandbox.</li>
        <li>Renseigner PAYMENT_PROVIDER=paypal, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, PAYPAL_MODE et PUBLIC_SITE_URL dans les variables privées du serveur.</li>
        <li>Vérifier une réservation de test avec paiement et confirmation avant le mode Live.</li>
      </ol>}
      <p className="small muted">Apple Pay est proposé selon l’appareil, le navigateur et la configuration du compte marchand. Le guide du projet est docs/activer-reservations.md. Gardez les clés et coordonnées bancaires privées.</p>
    </details>
  </div>;
}
