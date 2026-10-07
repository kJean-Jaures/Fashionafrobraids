import { test, expect } from "@playwright/test";
import { addDays, parisDate } from "../../src/lib/time";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

test("accueil, navigation mobile, galerie et absence de débordement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  await expect(page.getByRole("heading", { name: "L’art de sublimer vos cheveux." })).toBeVisible();
  await expect(page.locator(".hero-image img")).toHaveAttribute("src", /reference-spiral-cornrows/);
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click(); await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("link", { name: "Nos coiffures" }).click();
  await expect(page).toHaveURL(/\/coiffures/); await page.goto("/#galerie"); await page.getByRole("button", { name: "Voir Spiral cornrows" }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("les photos du catalogue fourni sont associées à la bonne prestation et à la réservation", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.gallery.every((photo: { illustrative: boolean }) => !photo.illustrative)).toBe(true);
  for (const id of ["spiral-cornrows", "twists-homme", "coupe-homme"]) {
    const service = catalog.services.find((item: { id: string }) => item.id === id);
    await page.goto(`/coiffures/${id}`);
    const photo = page.locator(".detail-photo img");
    await expect(photo).toHaveAttribute("src", new RegExp(`reference-${id}`));
    await expect(page.locator(".image-note")).toHaveText("Photo du catalogue fourni par le salon");
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Réserver cette coiffure" }).click();
    await expect(page.locator(".summary-photo img")).toHaveAttribute("src", new RegExp(`reference-${id}`));
    await expect(page.locator(".summary-row").filter({ hasText: "Acompte" })).toHaveText(/10/);
    expect(service.variants.every((variant: { image: string }) => variant.image === service.image)).toBe(true);
  }
});

test("l’accueil respecte les contrôles automatisés WCAG AA", async ({ page }) => {
  await page.goto("/"); const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(result.violations).toEqual([]);
});
test("acompte obligatoire, puis calendrier et annulation avec une exception admin de test", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  const service = catalog.services.find((item: { id: string }) => item.id === "knotless");
  expect(service.deposit).toEqual({ type: "fixed", value: 1000 });
  expect(catalog.bookingPaymentsEnabled).toBe(false);
  const denied = await request.post("/api/bookings", { data: { serviceId: "knotless", variantId: "1-1", date: addDays(parisDate(), 8), time: "08:30", name: "Test Acompte", email: "test@example.com", phone: "0612345678", consent: true } });
  expect(denied.status()).toBe(503);
  // Exception uniquement dans la base éphémère du test : vérifie aussi que
  // l’administration conserve le contrôle sur la règle d’acompte.
  const login = await request.post("/api/admin/session", { data: { password: "test-only-password-32-characters" } });
  expect(login.status()).toBe(200);
  // Le client HTTP du test ne renvoie pas automatiquement un cookie Secure sur HTTP.
  const authHeaders = { Cookie: login.headers()["set-cookie"].split(";")[0] };
  expect((await request.put("/api/admin/content/services", { headers: authHeaders, data: { ...service, deposit: { type: "none", value: 0 } } })).status()).toBe(200);
  await request.delete("/api/admin/session");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coiffures/knotless"); await page.getByRole("button", { name: "Medium", exact: true }).click(); await page.getByRole("button", { name: "Milieu du dos", exact: true }).click();
  await page.getByRole("link", { name: "Réserver cette coiffure" }).click(); await page.getByRole("button", { name: "Choisir mon créneau" }).click();
  const date = addDays(parisDate(), 8); const dayName = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  if (date.slice(0, 7) !== parisDate().slice(0, 7)) await page.getByRole("button", { name: "Mois suivant" }).click();
  await page.getByRole("button", { name: dayName, exact: true }).click(); await page.getByRole("button", { name: "08 h 30", exact: true }).click(); await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByLabel("Prénom", { exact: true }).fill("Cliente"); await page.getByLabel("Nom", { exact: true }).fill("E2E"); await page.getByLabel("Téléphone", { exact: true }).fill("0612345678"); await page.getByLabel("E-mail", { exact: true }).fill("test@example.com"); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Confirmer mon rendez-vous" }).click();
  await expect(page.getByRole("heading", { name: "Votre moment est réservé." })).toBeVisible();
  const url = new URL(page.url()); const id = url.pathname.split("/").pop(); const token = url.searchParams.get("token");
  const saved = await (await request.get(`/api/bookings/${id}?token=${token}`)).json(); expect(saved.data.price).toBe(6000); expect(saved.end_time - saved.start_time).toBe(300 * 60000);
  const calendar = await request.get(`/api/bookings/${id}/calendar?token=${token}`); expect(calendar.status()).toBe(200); expect(await calendar.text()).toContain("BEGIN:VEVENT");
  await page.getByRole("button", { name: "Annuler mon rendez-vous" }).click(); await page.getByRole("button", { name: "Confirmer l’annulation" }).click(); await expect(page.getByRole("heading", { name: "Votre rendez-vous est annulé." })).toBeVisible();
  expect((await request.put("/api/admin/content/services", { headers: authHeaders, data: service })).status()).toBe(200);
  await request.delete("/api/admin/session");
});
test("administration protégée, stock modifiable, panier et commande persistante", async ({ page, request }) => {
  expect((await request.get("/api/admin")).status()).toBe(401);
  await page.goto("/admin"); await page.getByLabel("Mot de passe de gestion").fill("test-only-password-32-characters"); await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { name: "Rendez-vous", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Produits & stocks" }).click(); const bonnet = page.locator(".admin-content-card").filter({ has: page.getByRole("heading", { name: "Bonnet en satin" }) }); await bonnet.getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Stock disponible").fill("4"); await page.getByRole("button", { name: "Enregistrer produit" }).click(); await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/boutique"); const product = page.locator(".product-card").filter({ has: page.getByRole("heading", { name: "Bonnet en satin" }) }); await product.getByRole("button", { name: "Ajouter", exact: true }).click();
  await page.getByRole("button", { name: /Ouvrir le panier/ }).click(); await page.getByRole("link", { name: "Passer la commande" }).click();
  await page.getByLabel("Prénom", { exact: true }).fill("Cliente"); await page.getByLabel("Nom", { exact: true }).fill("Boutique"); await page.getByLabel("E-mail", { exact: true }).fill("test@example.com"); await page.getByLabel("Téléphone", { exact: true }).fill("0612345678"); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: /Confirmer ma commande/ }).click();
  await expect(page.getByRole("heading", { name: "Vos essentiels vous attendent." })).toBeVisible(); await page.reload(); await expect(page.getByRole("heading", { name: "Vos essentiels vous attendent." })).toBeVisible();
  const catalog = await (await request.get("/api/catalog")).json(); expect(catalog.products.find((p: { id: string }) => p.id === "bonnet").stock).toBe(3);
});
test("le contact enregistre le message dans le tableau de bord", async ({ page, request }) => {
  await page.goto("/contact"); await page.getByLabel("Nom et prénom").fill("Visiteuse Test"); await page.getByLabel("E-mail", { exact: true }).fill("test@example.com"); await page.getByLabel("Votre message").fill("Bonjour, pouvez-vous me conseiller une coiffure protectrice ?"); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "Envoyer mon message" }).click(); await expect(page.getByRole("heading", { name: "Votre message est enregistré." })).toBeVisible();
  await page.goto("/admin"); await page.getByLabel("Mot de passe de gestion").fill("test-only-password-32-characters"); await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("button", { name: "Messages", exact: true }).click(); await expect(page.getByText("Bonjour, pouvez-vous me conseiller une coiffure protectrice ?", { exact: true })).toBeVisible();
});
test("manifest PWA, pages privées et refus d’une mutation depuis une autre origine", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json(); expect(manifest.display).toBe("standalone"); expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ src: "/icon.svg", purpose: "any" })]));
  expect((await request.get("/icon.svg")).status()).toBe(200); expect((await request.get("/api/bookings/RDV-inconnu?token=bad")).status()).toBe(404);
  const response = await request.post("/api/orders", { headers: { Origin: "https://untrusted.example" }, data: {} }); expect(response.status()).toBe(403);
});

test("une photo ajoutée dans la galerie reste accessible en production", async ({ page, request }) => {
  await page.goto("/admin"); await page.getByLabel("Mot de passe de gestion").fill("test-only-password-32-characters"); await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("button", { name: "Galerie", exact: true }).click(); await page.getByRole("button", { name: "Ajouter photo" }).click(); await page.getByLabel("Titre", { exact: true }).fill("Photo de test");
  const fixture = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#D4AF37" } }).png().toBuffer();
  await page.getByLabel("Photo", { exact: true }).setInputFiles({ name: "test.png", mimeType: "image/png", buffer: fixture });
  await expect(page.getByLabel("Chemin de la photo existante")).toHaveValue(/\/images\/upload-.*\.webp/); const image = await page.getByLabel("Chemin de la photo existante").inputValue();
  const response = await request.get(image); expect(response.status()).toBe(200); expect(response.headers()["content-type"]).toBe("image/webp");
  await page.getByRole("button", { name: "Enregistrer photo" }).click(); await expect(page.getByRole("dialog")).not.toBeVisible(); await page.reload(); await expect(page.getByRole("heading", { name: "Rendez-vous", exact: true })).toBeVisible(); await page.getByRole("button", { name: "Galerie", exact: true }).click(); await expect(page.getByRole("heading", { name: "Photo de test", exact: true })).toBeVisible();
});

test("le logo original, les prix de l’affiche et les 10 € sont visibles sur téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coiffures/knotless");
  await expect(page.locator("header .brand-logo")).toBeVisible();
  await expect(page.locator(".detail-price-row strong")).toHaveText(/60/);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Small", exact: true }).click();
  await page.getByRole("button", { name: "Bas du dos", exact: true }).click();
  await expect(page.locator(".detail-price-row strong")).toHaveText(/85/);
  await expect(page.locator(".detail-photo img")).toHaveAttribute("src", /poster-knotless-small/);
  await page.getByRole("link", { name: "Réserver cette coiffure" }).click();
  await expect(page.locator(".summary-row").filter({ hasText: "Acompte" })).toHaveText(/10/);
  await expect(page.locator(".summary-row").filter({ hasText: "Solde au salon" })).toHaveText(/75/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Choisir mon créneau" }).click();
  const date = addDays(parisDate(), 10);
  if (date.slice(0,7) !== parisDate().slice(0,7)) await page.getByRole("button", { name: "Mois suivant" }).click();
  const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  await page.getByRole("button", { name: dateLabel, exact: true }).click();
  await page.getByRole("button", { name: "08 h 30", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: /Payer l’acompte.*10/ })).toBeDisabled();
  await expect(page.getByText(/Le paiement de l’acompte sera bientôt disponible/)).toBeVisible();
  await page.goto("/tarifs");
  await expect(page.locator(".price-service-photo").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
