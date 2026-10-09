import { test, expect } from "@playwright/test";
import { addDays, parisDate } from "../../src/lib/time";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";

test("accueil, navigation mobile, galerie et absence de débordement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  await expect(page.getByRole("heading", { name: "L’art de sublimer vos cheveux." })).toBeVisible();
  await expect(page.locator(".hero-image img")).toHaveAttribute("src", /fashion-original-1/);
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  for (const selector of [".hero-image img", ".home-salon-main img", ".home-natural-photo img", ".hero-secondary img", ".home-salon-detail img"]) {
    const photo = page.locator(selector);
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveCSS("object-fit", "cover");
    await expect(photo).toHaveCSS("padding", "0px");
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator(".hero-secondary")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".home-salon-detail")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".expertise-card").filter({ has: page.getByRole("heading", { name: "Soins capillaires", exact: true }) }).locator("img")).toHaveCSS("object-fit", "cover");
  for (const [category, hairstyle] of [["Extensions", "bouclées"], ["Tissages & Perruques", "Tissage lisse"], ["Événementiel", "Chignon de cérémonie"]]) {
    const photo = page.locator(".expertise-card").filter({ has: page.getByRole("heading", { name: category, exact: true }) }).locator("img");
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveAttribute("alt", new RegExp(hairstyle));
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click(); await page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("link", { name: "Nos coiffures" }).click();
  await expect(page).toHaveURL(/\/coiffures/); await page.goto("/#galerie"); await page.locator(".gallery-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const firstTitle = await page.getByRole("dialog").getByRole("heading").textContent();
  await expect(page.getByRole("button", { name: "Photo précédente", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Photo suivante", exact: true }).click();
  await expect(page.locator(".lightbox-counter")).toHaveText("Photo 2 sur 63");
  await expect(page.getByRole("dialog").getByRole("heading")).not.toHaveText(firstTitle!);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(firstTitle!);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("la recherche reconnaît les variantes et permet de remettre les filtres à zéro sur mobile", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coiffures");
  const search = page.getByRole("searchbox", { name: "Rechercher une coiffure" });
  await search.fill("  knotless   micro  ");
  await expect(page.getByRole("heading", { name: "Knotless Braids", exact: true })).toBeVisible();
  await search.fill("aucune-coiffure-ne-correspond-000");
  await expect(page.locator(".service-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(search).toBeFocused();
  await expect(page.locator(".service-card")).toHaveCount(catalog.services.length);
  await page.locator(".catalog-toolbar").getByRole("button", { name: "Hommes", exact: true }).click();
  await expect(page.locator(".service-card")).toHaveCount(catalog.services.filter((service: { category: string }) => service.category === "Hommes").length);
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(search).toBeFocused();
  await expect(page.locator(".service-card")).toHaveCount(catalog.services.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("les photos du catalogue fourni sont associées à la bonne prestation et à la réservation", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.gallery).toHaveLength(63);
  for (const [id, imageId] of [["knotless", "85575979"], ["twists-homme", "85579289"], ["cornrows-homme", "85579164"]]) {
    const service = catalog.services.find((item: { id: string }) => item.id === id);
    await page.goto(`/coiffures/${id}`);
    const photo = page.locator(".detail-photo img");
    await expect(photo).toHaveAttribute("src", new RegExp(`acuity-${imageId}`));
    await expect(page.locator(".image-note")).toHaveText("Visuel du catalogue de réservation du salon");
    await expect.poll(() => photo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Réserver cette coiffure" }).click();
    await expect(page.locator(".summary-photo img")).toHaveAttribute("src", new RegExp(`acuity-${imageId}`));
    await expect(page.locator(".summary-row").filter({ hasText: "Acompte" })).toHaveText(/10/);
    expect(service.variants[0].referenceId).toBe(imageId);
  }
});

test("l’accueil respecte les contrôles automatisés WCAG AA", async ({ page }) => {
  await page.goto("/"); const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(result.violations).toEqual([]);
});
test("les photos restent entières et les animations respectent la préférence de mouvement réduit", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.locator(".hero-visual")).toHaveCSS("animation-name", "hero-image-enter");
  await page.locator(".expertise-card").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".expertise-card").first()).toHaveClass(/reveal-entered/);
  const top = page.getByRole("link", {name:"Retour en haut"});
  await expect(top).toBeVisible();
  const mobileBook = page.locator(".mobile-book");
  expect((await top.boundingBox())!.y + (await top.boundingBox())!.height).toBeLessThan((await mobileBook.boundingBox())!.y);
  await top.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(150);
  await expect(top).toHaveCount(0);
  await page.goto("/#galerie");
  await page.locator(".gallery-item").first().click();
  await expect(page.locator(".lightbox-photo img")).toHaveCSS("object-fit", "contain");
  await expect.poll(()=>page.locator(".lightbox-photo img").evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator(".hero-visual")).toHaveCSS("animation-name", "none");
  await page.getByRole("button",{name:"Ouvrir le menu"}).click();
  await expect(page.getByRole("navigation",{name:"Navigation mobile"}).getByRole("link").first()).toHaveCSS("animation-name","none");
  await page.keyboard.press("Escape");
  await page.goto("/coiffures/boho-knotless");
  await expect(page.locator(".detail-photo img")).toHaveCSS("object-fit", "contain");
  await expect(page.locator(".detail-price-row")).toContainText("1 h 35 min environ");
  await expect(page.locator(".detail-price-row strong")).toHaveText(/70/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("link",{name:"Réserver cette coiffure"}).click();
  await expect(page.locator(".summary-info")).toContainText("1 h 35 min environ");
  await expect(page.getByRole("button",{name:"Choisir mon créneau"})).toBeEnabled();
});
test("les prestations retirées ne sont plus proposées ni accessibles directement", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  for (const id of ["barber-contours", "coupe-homme", "coupe-a-sec", "coupe-pointes"]) {
    expect(catalog.services.some((service: { id: string }) => service.id === id)).toBe(false);
    expect((await request.get(`/coiffures/${id}`)).status()).toBe(404);
    const availability = await request.get(`/api/availability?service=${id}&variant=legacy&date=${addDays(parisDate(), 5)}`);
    expect(availability.status()).toBe(400);
    expect(await availability.json()).toEqual({ error: "Cette prestation n’existe pas." });
  }
  await page.goto("/coiffures?categorie=Hommes");
  await expect(page.getByRole("heading", { name: "Vanilles homme", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dégradé & barbe", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Contours", exact: true })).toHaveCount(0);
});
test("les photos Pinterest complètent les fiches et la réservation avec leur source", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  for (const id of ["tissage-ouvert", "microlocks", "lissage"]) {
    const service = catalog.services.find((item: { id: string }) => item.id === id);
    const variant = service.variants[0];
    await page.goto(`/coiffures/${id}`);
    const photo = page.locator(".detail-photo img");
    await expect(photo).toHaveAttribute("src", /pinterest-/);
    await expect.poll(() => photo.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".image-note")).toContainText("Photo d’inspiration · Pinterest");
    await expect(page.getByRole("link", { name: "Voir l’inspiration sur Pinterest" })).toHaveAttribute("href", variant.imageLink);
    await page.getByRole("link", { name: "Réserver cette coiffure" }).click();
    await expect(page.locator(".summary-photo img")).toHaveAttribute("src", /pinterest-/);
    await expect(page.locator(".summary-row").filter({ hasText: "Acompte" })).toContainText("10");
  }
});
test("photos par variante, durée réelle et horaires de réservation", async ({ page }) => {
  await page.goto("/coiffures/knotless");
  await expect(page.locator(".detail-price-row")).toContainText("1 h 5 min");
  await page.getByRole("button", { name: "Small", exact: true }).click();
  await expect(page.locator(".detail-photo img")).toHaveAttribute("src", /acuity-85576228/);
  await page.getByRole("button", { name: "Micro", exact: true }).click();
  await expect(page.locator(".detail-price-row")).toContainText("1 h 35 min environ");
  await expect(page.getByRole("link", { name: "Réserver cette coiffure", exact: true })).toBeVisible();
  await page.goto("/reservation?prestation=knotless&variante=3-1");
  await expect(page.getByRole("button", { name: "Choisir mon créneau" })).toBeEnabled();
  await expect(page.locator(".summary-info")).toContainText("1 h 35 min environ");
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await expect(page.locator(".summary-info")).toContainText("1 h 5 min");
  await page.getByRole("button", { name: "Choisir mon créneau" }).click();
  await expect(page.locator(".calendar")).toContainText("08 h 30 — 20 h 00");
  const date = addDays(parisDate(), 6);
  if (date.slice(0, 7) !== parisDate().slice(0, 7)) await page.getByRole("button", { name: "Mois suivant" }).click();
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("button", { name: "18 h 30", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "19 h 00", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "20 h 00", exact: true })).toHaveCount(0);
  await page.goto("/#galerie");
  await expect(page.locator(".gallery-item")).toHaveCount(12);
  await page.getByRole("button", { name: /Voir plus de coiffures/ }).click();
  await expect(page.locator(".gallery-item")).toHaveCount(24);
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
  const saved = await (await request.get(`/api/bookings/${id}?token=${token}`)).json(); expect(saved.data.price).toBe(6000); expect(saved.end_time - saved.start_time).toBe(65 * 60000);
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
  await expect(page.locator(".detail-photo img")).toHaveAttribute("src", /acuity-85576278/);
  await page.getByRole("link", { name: "Réserver cette coiffure" }).click();
  await expect(page.locator(".summary-row").filter({ hasText: "Acompte" })).toHaveText(/10/);
  await expect(page.locator(".summary-row").filter({ hasText: "Solde au salon" })).toHaveText(/75/);
  await expect(page.locator(".deposit-policy-note")).toContainText("n’est pas remboursable");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Choisir mon créneau" }).click();
  const date = addDays(parisDate(), 10);
  if (date.slice(0,7) !== parisDate().slice(0,7)) await page.getByRole("button", { name: "Mois suivant" }).click();
  const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  await page.getByRole("button", { name: dateLabel, exact: true }).click();
  await page.getByRole("button", { name: "08 h 30", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enregistrer ma réservation", exact: true })).toBeDisabled();
  await expect(page.getByText(/La réservation avec acompte sera bientôt disponible/)).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveAccessibleName(/n’est pas remboursable/);
  await page.goto("/politique-reservation");
  await expect(page.getByText(/l’acompte de 10 € reste acquis au salon et n’est pas remboursé/)).toBeVisible();
  await page.goto("/tarifs");
  await expect(page.locator(".price-service-photo").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("la préparation du salon enregistre les consignes et valide un tarif par variante sur mobile", async ({ page, request }) => {
  // Simuler une demande de revalidation dans la base temporaire uniquement.
  const originalSettings = (await (await request.get("/api/catalog")).json()).settings;
  const initialLogin = await request.post("/api/admin/session", { data: { password: "test-only-password-32-characters" } });
  expect(initialLogin.status()).toBe(200);
  const initialHeaders = { Cookie: initialLogin.headers()["set-cookie"].split(";")[0] };
  expect((await request.put("/api/admin/settings", { headers:initialHeaders, data:{...originalSettings,pricingApproved:false} })).status()).toBe(200);
  // Réutiliser la session authentifiée pour éviter des connexions artificiellement répétées.
  await page.context().addCookies((await request.storageState()).cookies);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Administration" }).getByRole("button", { name: "Préparer les réservations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Acompte par virement · 10 €", exact: true })).toBeVisible();
  await expect(page.getByText("Envoi à activer", { exact: true })).toBeVisible();
  await expect(page.getByText(/À renseigner : bénéficiaire et IBAN du salon/)).toBeVisible();
  await page.getByLabel("Rappel avant le rendez-vous (heures)").fill("48");
  await page.getByLabel("Pause entre deux clientes (minutes)").fill("15");
  await page.getByLabel("Consignes avant le rendez-vous").fill("Consigne de test : apportez vos mèches.");
  await page.getByRole("button", { name: "Enregistrer les consignes et rappels" }).click();
  await expect.poll(async () => (await (await request.get("/api/catalog")).json()).settings.reminderHours).toBe(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel("Afficher les points à vérifier").selectOption("prices");
  const card = page.locator(".preparation-review-list article").filter({ has: page.getByRole("heading", { name: "Tissage ouvert", exact: true }) }).first();
  await card.getByRole("button", { name: "Vérifier Tissage ouvert", exact: true }).click();
  await page.getByLabel("Tarif validé variante 1", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer prestation" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect.poll(async () => (await (await request.get("/api/catalog")).json()).services.find((service: {id:string}) => service.id === "tissage-ouvert").variants[0].pricingVerified).toBe(true);
  await page.goto("/reservation?prestation=knotless&variante=1-1");
  await page.getByRole("button", { name: "Choisir mon créneau" }).click();
  await expect(page.locator(".booking-instructions")).toContainText("Consigne de test : apportez vos mèches.");
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.settings.bookingBufferMinutes).toBe(15); expect(catalog.settings.schedule["1"]).toEqual({closed:false,start:"08:30",end:"20:00"});
  // Restaurer les réglages de cette base temporaire pour les autres parcours.
  expect((await request.put("/api/admin/settings", { headers:initialHeaders, data: originalSettings })).status()).toBe(200);
});

test("le test d’envoi est protégé et l’administration distingue acceptation et réception", async ({ page, request }) => {
  expect((await request.post("/api/admin/email-test")).status()).toBe(401);
  const login = await request.post("/api/admin/session", { data: { password: "test-only-password-32-characters" } });
  const headers = { Cookie: login.headers()["set-cookie"].split(";")[0] };
  expect((await request.post("/api/admin/email-test", { headers: { ...headers, Origin: "https://other-origin.example" } })).status()).toBe(403);
  expect((await request.post("/api/admin/email-test", { headers })).status()).toBe(503);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin"); await page.getByLabel("Mot de passe de gestion").fill("test-only-password-32-characters");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.getByRole("navigation", { name: "Administration" }).getByRole("button", { name: "Paramètres", exact: true }).click();
  await expect(page.getByRole("button", { name: "Envoyer un e-mail de test", exact: true })).toBeDisabled();
  const recipient = (await (await request.get("/api/catalog")).json()).settings.email;
  // Simuler uniquement la réponse du fournisseur dans le navigateur ; aucun e-mail réel.
  await page.route("**/api/admin", async route => {
    const response = await route.fetch(); const data = await response.json(); data.integrations.email = true;
    await route.fulfill({ response, json: data });
  });
  await page.getByRole("button", { name: "Actualiser", exact: true }).click();
  const send = page.getByRole("button", { name: "Envoyer un e-mail de test", exact: true });
  await expect(send).toBeEnabled();
  await page.route("**/api/admin/email-test", route => route.fulfill({ status: 502, json: { error: "L’envoi de test a échoué." } }));
  await send.click(); await expect(page.locator(".admin-main").getByRole("alert")).toHaveText("L’envoi de test a échoué.");
  await page.unroute("**/api/admin/email-test");
  await page.route("**/api/admin/email-test", route => route.fulfill({ json: { accepted: true, recipient } }));
  await send.click();
  await expect(page.getByRole("status").filter({ hasText: "Resend a accepté" })).toContainText(recipient);
  await expect(page.locator(".admin-main").getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("la tâche de rappel exige son secret et son dernier passage apparaît dans la préparation", async ({ request }) => {
  expect((await request.get("/api/cron/reminders")).status()).toBe(401);
  expect((await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer wrong-test-secret" } })).status()).toBe(401);
  const result = await request.get("/api/cron/reminders", { headers: { Authorization: "Bearer test-only-cron-secret-32-characters" } });
  expect(result.status()).toBe(200); expect(await result.json()).toEqual({sent:0,failed:0,configured:false});
  const login = await request.post("/api/admin/session", { data: { password: "test-only-password-32-characters" } });
  const headers = { Cookie: login.headers()["set-cookie"].split(";")[0] };
  const data = await (await request.get("/api/admin", { headers })).json();
  expect(data.readiness.reminders.secretConfigured).toBe(true);
  expect(data.readiness.reminders.lastRun.at).toBeGreaterThan(Date.now()-60000);
  expect(data.readiness.reminders.recent).toBe(false);
});

test("la préparation virement montre les coordonnées manquantes et la vérification du salon", async ({ page, request }) => {
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.bookingPaymentProvider).toBe("bank_transfer"); expect(catalog.bookingPaymentsEnabled).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/admin");
  await page.getByLabel("Mot de passe de gestion").fill("test-only-password-32-characters");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.getByRole("button", { name: "Préparer les réservations", exact: true }).last().click();
  const payment = page.locator(".admin-panel").filter({ has: page.getByRole("heading", { name: "Acompte par virement · 10 €", exact: true }) });
  await expect(payment.locator(".status-pill")).toHaveText("À configurer");
  await expect(payment.getByText(/Aucun e-mail d’instructions/)).toBeVisible();
  await expect(page.getByLabel("IBAN du salon")).toBeVisible();
  await expect(page.getByLabel("Délai de paiement du virement (heures)")).toHaveValue("24");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('le virement sur mobile reste en attente puis le salon confirme après réception', async ({ page, request }) => {
  const login=await request.post('/api/admin/session',{data:{password:'test-only-password-32-characters'}});
  expect(login.status()).toBe(200);
  const headers={Cookie:login.headers()['set-cookie'].split(';')[0]};
  const original=(await (await request.get('/api/admin',{headers})).json()).settings;
  await page.context().addCookies((await request.storageState()).cookies);
  await page.setViewportSize({width:390,height:844});await page.goto('/admin');
  await page.getByRole('navigation',{name:'Administration'}).getByRole('button',{name:'Paramètres',exact:true}).click();
  await page.getByLabel('Mode de paiement de l’acompte').selectOption('bank_transfer');
  await page.getByLabel('Bénéficiaire du virement').fill('Bénéficiaire de test');
  await page.getByLabel('IBAN du salon').fill('FR1420041010050500013M02606');
  await page.getByRole('button',{name:'Enregistrer le mode de paiement',exact:true}).click();
  await expect.poll(async () => (await (await request.get('/api/catalog')).json()).bookingPaymentsEnabled).toBe(true);
  expect((await (await request.get('/api/catalog')).json()).settings.bankTransferIban).toBe('');
  await page.goto('/reservation?prestation=knotless&variante=1-1');
  await page.getByRole('button',{name:'Choisir mon créneau',exact:true}).click();
  const date=addDays(parisDate(),20);
  if(date.slice(0,7)!==parisDate().slice(0,7)) await page.getByRole('button',{name:'Mois suivant'}).click();
  const dateLabel=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
  await page.getByRole('button',{name:dateLabel,exact:true}).click();
  await page.getByRole('button',{name:'08 h 30',exact:true}).click();
  await page.getByRole('button',{name:'Continuer',exact:true}).click();
  await page.getByLabel('Prénom',{exact:true}).fill('Cliente');await page.getByLabel('Nom',{exact:true}).fill('Virement');
  await page.getByLabel('Téléphone',{exact:true}).fill('0612345678');await page.getByLabel('E-mail',{exact:true}).fill('test@example.com');
  await page.getByRole('checkbox').check();
  const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/bookings')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Enregistrer ma réservation',exact:true}).click();
  const response=await responsePromise;expect(response.status()).toBe(201);const result=await response.json();
  const saved=result.booking;expect(result.paymentUrl).toBeNull();expect(result.emailSent).toBe(false);expect(saved.data.depositPaid).toBe(false);
  await expect(page.getByRole('heading',{name:'Votre acompte est en attente.',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Votre acompte par virement',exact:true})).toBeVisible();
  const qr=page.getByRole('img',{name:'QR code pour le virement de l’acompte',exact:true});
  await expect(qr).toBeVisible();
  await expect.poll(()=>qr.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(480);
  await expect(page.getByText(/Dans une application bancaire compatible/)).toBeVisible();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('link',{name:'Enregistrer le QR code',exact:true}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe(`virement-${saved.id}.png`);
  expect(await download.failure()).toBeNull();
  const {data:qrPixels,info:qrInfo}=await sharp(await readFile((await download.path())!)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decodedQr=jsQR(new Uint8ClampedArray(qrPixels),qrInfo.width,qrInfo.height);expect(decodedQr).not.toBeNull();
  const fields=decodedQr!.data.split('\n');expect(fields[5]).toBe('Bénéficiaire de test');expect(fields[6]).toBe('FR1420041010050500013M02606');expect(fields[7]).toBe('EUR10.00');expect(fields[10]).toBe(saved.id);
  const afterDownload=await (await request.get(`/api/bookings/${saved.id}?token=${encodeURIComponent(saved.token)}`)).json();
  expect(afterDownload.status).toBe('pending_payment');expect(afterDownload.data.depositPaid).toBe(false);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.route('**/transfer-qr?*',route=>route.fulfill({status:503,json:{error:'QR indisponible dans cet essai'}}));
  await page.reload();
  await expect(page.getByRole('status').filter({hasText:'Le QR code n’a pas pu être chargé.'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Enregistrer le QR code',exact:true})).toHaveCount(0);
  await page.unroute('**/transfer-qr?*');
  await expect(page.getByRole('button',{name:'Copier l’IBAN'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/admin');
  await page.getByLabel('Filtrer les rendez-vous').selectOption('transfers');
  const card=page.locator('.admin-booking').filter({hasText:saved.id});
  await card.getByRole('button',{name:'Acompte reçu',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('checkbox',{name:/J’ai vérifié la réception/}).check();
  await dialog.getByLabel('Référence bancaire (facultative)').fill('TEST-RECEPTION');
  await dialog.getByRole('button',{name:'Valider et confirmer',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  const bookingResponse=await request.get(`/api/bookings/${saved.id}?token=${encodeURIComponent(saved.token)}`);
  const confirmed=await bookingResponse.json();expect(confirmed.status).toBe('confirmed');expect(confirmed.data.depositPaid).toBe(true);expect(confirmed.data.bankTransferReceiptReference).toBe('TEST-RECEPTION');
  await page.goto(`/reservation/${saved.id}?token=${encodeURIComponent(saved.token)}`);
  await expect(page.getByRole('heading',{name:'Votre moment est réservé.',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Votre acompte par virement',exact:true})).toHaveCount(0);
  await expect(page.getByRole('img',{name:'QR code pour le virement de l’acompte',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Ajouter à mon calendrier'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  expect((await request.put('/api/admin/settings',{headers,data:original})).status()).toBe(200);
});
