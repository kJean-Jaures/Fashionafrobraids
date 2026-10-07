"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag, ArrowUpRight, MapPin, Phone, Camera as Instagram, Download, CalendarDays } from "lucide-react";
import { useSite } from "./provider";
import { Modal } from "./ui";
import { CartDrawer } from "./shop";

export function Logo() { return <span className="brand"><Image className="brand-logo" src="/images/logo-fashion-afro-braids.png" alt="Logo original Fashion Afro Braids Paris" width={64} height={58} sizes="64px" loading="eager"/><span>FASHION <span className="brand-second">AFRO BRAIDS</span><small>PARIS</small></span></span>; }
const links = [["Accueil", "/"], ["Nos coiffures", "/coiffures"], ["Tarifs", "/tarifs"], ["Boutique", "/boutique"], ["À propos", "/a-propos"], ["Avis", "/#avis"], ["Contact", "/contact"]];

export function Header() {
  const { cart, setCartOpen, catalog } = useSite(); const path = usePathname();
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 30); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  return <><a href="#contenu" className="skip-link">Aller au contenu</a><header className={`site-header ${path === "/" && !scrolled ? "over-hero" : ""}`}>
    <div className="header-inner"><Link href="/" aria-label="Fashion Afro Braids Paris — Accueil"><Logo/></Link><nav aria-label="Navigation principale" className="desktop-nav">{links.map(([label, href]) => <Link className={path === href ? "active" : ""} key={label} href={href}>{label}</Link>)}</nav>
    <div className="header-actions"><button className="icon-button cart-button" aria-label={`Ouvrir le panier, ${cart.reduce((s, i) => s + i.quantity, 0)} articles`} onClick={() => setCartOpen(true)}><ShoppingBag size={20}/>{cart.length > 0 && <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>}</button><Link href="/reservation" className="button primary header-book">Prendre rendez-vous <ArrowUpRight size={16}/></Link><button className="icon-button mobile-menu-button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-expanded={open}><Menu size={25}/></button></div></div>
  </header><Modal open={open} onClose={() => setOpen(false)} title="Fashion Afro Braids" className="navigation-modal"><nav aria-label="Navigation mobile">{links.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={20}/></Link>)}<Link href="/mes-rendez-vous" onClick={() => setOpen(false)}>Mes rendez-vous <CalendarDays size={20}/></Link></nav><Link onClick={() => setOpen(false)} href="/reservation" className="button primary">Prendre rendez-vous</Link><a className="mobile-phone" href={`tel:${catalog.settings.phone.replace(/\s/g, "")}`}><Phone size={17}/>{catalog.settings.phone}</a></Modal><CartDrawer/>
  {!path.startsWith("/reservation") && !path.startsWith("/admin") && <Link href="/reservation" className="mobile-book button primary"><CalendarDays size={18}/> Prendre rendez-vous <ArrowUpRight size={17}/></Link>}</>;
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function InstallButton() {
  const [event, setEvent] = useState<InstallEvent | null>(null); const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const listen = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const complete = () => { setInstalled(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", listen); window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", listen); window.removeEventListener("appinstalled", complete); };
  }, []);
  if (installed) return null;
  return <><button className="install-button" onClick={async () => { if (event) { await event.prompt(); await event.userChoice; setEvent(null); } else setHelp(true); }}><Download size={16}/> Installer l’application</button><Modal open={help} onClose={() => setHelp(false)} title="Votre salon, à portée de main"><p>Retrouvez les coiffures, la boutique et vos rendez-vous depuis votre écran d’accueil.</p><ol className="install-steps"><li><strong>Sur iPhone :</strong> ouvrez le site dans Safari, touchez « Partager », puis « Sur l’écran d’accueil ».</li><li><strong>Sur Android :</strong> dans Chrome, ouvrez le menu ⋮ et choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</li></ol><p className="muted small">L’installation nécessite une connexion HTTPS. Les réservations et commandes nécessitent une connexion Internet.</p></Modal></>;
}
export function Footer() {
  const { catalog: { settings } } = useSite();
  return <footer className="site-footer"><div className="container footer-grid"><div className="footer-brand"><Link href="/"><Logo/></Link><p>L’art de la coiffure afro.<br/>Votre style. Votre personnalité.</p><InstallButton/></div><div><h3>Explorez</h3><Link href="/coiffures">Nos coiffures</Link><Link href="/tarifs">Prestations & tarifs</Link><Link href="/#galerie">Nos inspirations</Link><Link href="/boutique">La boutique</Link><Link href="/a-propos">Notre salon</Link></div><div><h3>Votre expérience</h3><Link href="/reservation">Prendre rendez-vous</Link><Link href="/mes-rendez-vous">Mes rendez-vous</Link><Link href="/contact">Nous contacter</Link><Link href="/politique-reservation">Politique de réservation</Link><Link href="/admin">Espace salon</Link></div><div><h3>Retrouvez-nous</h3><a href="https://www.google.com/maps/search/?api=1&query=74+Avenue+de+Saint-Ouen+75018+Paris" target="_blank" rel="noopener noreferrer" className="footer-contact"><MapPin size={17}/>{settings.address}</a><a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="footer-contact"><Phone size={17}/>{settings.phone}</a><p>Horaires dans la page Contact</p><div className="socials">{settings.instagram && <a aria-label="Instagram" href={settings.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={20}/></a>}{settings.tiktok && <a href={settings.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>}{settings.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}</div></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Fashion Afro Braids Paris</span><div><Link href="/mentions-legales">Mentions légales</Link><Link href="/confidentialite">Confidentialité</Link><Link href="/cgv">CGV</Link></div><span>Avec soin, à Paris.</span></div></footer>;
}
