"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Catalog } from "@/lib/db";
import type { Product } from "@/lib/catalog";
type CartLine = { productId: string; quantity: number };
export type SavedBooking = { id: string; token: string };
type Context = { catalog: Catalog; cart: CartLine[]; ready: boolean; add: (product: Product, quantity?: number) => void; update: (id: string, quantity: number) => void; clear: () => void; cartOpen: boolean; setCartOpen: (value: boolean) => void; toast: (message: string) => void; refresh: () => Promise<void>; savedBookings: SavedBooking[]; saveBooking: (value: SavedBooking) => void };
const Site = createContext<Context | null>(null);
export const useSite = () => { const context = useContext(Site); if (!context) throw new Error("Contexte absent"); return context; };
export function SiteProvider({ catalog: initial, children }: { catalog: Catalog; children: ReactNode }) {
  const [catalog, setCatalog] = useState(initial); const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false); const [cartOpen, setCartOpen] = useState(false); const [message, setMessage] = useState("");
  const [savedBookings, setSaved] = useState<SavedBooking[]>([]);
  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("fab-cart") || "[]");
      if (Array.isArray(cart)) setCart(cart.filter(item => typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 10).slice(0, 20));
      const saved = JSON.parse(localStorage.getItem("fab-bookings") || "[]");
      if (Array.isArray(saved)) setSaved(saved.filter(item => typeof item.id === "string" && typeof item.token === "string").slice(0, 30));
    } catch { /* Le stockage n’est pas toujours disponible en navigation privée. */ }
    setReady(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("fab-cart", JSON.stringify(cart)); } catch {} }, [cart, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem("fab-bookings", JSON.stringify(savedBookings)); } catch {} }, [savedBookings, ready]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(timer); }, [message]);
  const toast = useCallback((message: string) => setMessage(message), []);
  async function refresh() { const response = await fetch("/api/catalog"); if (response.ok) setCatalog(await response.json()); }
  function add(product: Product, quantity = 1) {
    if (product.stock < 1) { toast("Ce produit est actuellement indisponible."); return; }
    setCart(previous => {
      const current = previous.find(item => item.productId === product.id);
      const next = Math.min(product.stock, 10, (current?.quantity || 0) + quantity);
      return [...previous.filter(item => item.productId !== product.id), { productId: product.id, quantity: next }];
    });
    toast(`${product.name} ajouté au panier`);
  }
  function update(id: string, quantity: number) { setCart(previous => previous.map(item => item.productId === id ? { ...item, quantity: Math.min(10, Math.max(0, quantity)) } : item).filter(item => item.quantity)); }
  function saveBooking(value: SavedBooking) { setSaved(previous => [value, ...previous.filter(item => item.id !== value.id)].slice(0, 30)); }
  return <Site.Provider value={{ catalog, cart, ready, add, update, clear: () => setCart([]), cartOpen, setCartOpen, toast, refresh, savedBookings, saveBooking }}>{children}<div aria-live="polite" role="status" className={`toast ${message ? "visible" : ""}`}>{message}</div></Site.Provider>;
}
