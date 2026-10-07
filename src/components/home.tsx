"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowDown, MapPin, Clock3, Phone, Sparkles, Heart, Scissors, Leaf, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Photo } from "./photo";
import { useSite } from "./provider";
import { Gallery } from "./gallery";
import { ProductCard } from "./shop";

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null); const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current || reduced || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setEntered(true); observer.disconnect(); } }, { threshold: .08 });
    observer.observe(ref.current); return () => observer.disconnect();
  }, [reduced]);
  return <motion.div ref={ref} className={`${className} ${entered ? "reveal-entered" : ""}`} initial={false}>{children}</motion.div>;
}
export function SectionTitle({ eyebrow, title, italic, children, dark = false }: { eyebrow: string; title: string; italic?: string; children?: React.ReactNode; dark?: boolean }) {
  return <div className={`section-title ${dark ? "on-dark" : ""}`}><p className="eyebrow"><span/>{eyebrow}</p><h2>{title}{italic && <><br/><em>{italic}</em></>}</h2>{children && <p className="section-description">{children}</p>}</div>;
}
const expertise = [
  { name: "Tresses & Braids", text: "Knotless, box braids, fulani…", image: "/images/reference-spiral-cornrows.jpeg", category: "Knotless", number: "01" },
  { name: "Extensions", text: "Longueur, volume & caractère.", image: "/images/gallery.webp#center", category: "Extensions", number: "02" },
  { name: "Tissages & Perruques", text: "L’art de la transformation.", image: "/images/gallery.webp#right", category: "Perruques", number: "03" },
  { name: "Hommes & Enfants", text: "Un style pour chacun.", image: "/images/reference-twists-homme.jpeg", category: "Hommes", number: "04" },
  { name: "Événementiel", text: "Pour vos plus beaux moments.", image: "/images/gallery.webp#center", category: "Événementiel", number: "05" },
  { name: "Soins capillaires", text: "Prendre soin, naturellement.", image: "/images/hero.webp", category: "Soins", number: "06" }
];
export function Home() {
  const { catalog } = useSite(); const reduced = useReducedMotion();
  const day = catalog.settings.schedule["1"];
  const sameHours = Object.values(catalog.settings.schedule).every(item => !item.closed && item.start === day.start && item.end === day.end);
  return <>
    <section className="hero"><Photo src="/images/reference-spiral-cornrows.jpeg" alt="Spiral cornrows — photo du catalogue fourni par le salon" position="center 30%" priority className="hero-image" sizes="100vw"/><div className="hero-shade"/><div className="container hero-inner"><motion.div className="hero-copy" initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
      <p className="eyebrow"><span/>Salon de coiffure afro · Paris 18e</p><h1>L’art de sublimer<br/><em>vos cheveux.</em></h1><p className="hero-description">Tresses, braids, extensions et soins.<br/>Votre beauté, révélée avec passion et précision.</p><div className="hero-buttons"><Link href="/reservation" className="button primary">Prendre rendez-vous <ArrowUpRight size={19}/></Link><Link href="/coiffures" className="button outline-light">Découvrir nos coiffures <ArrowUpRight size={18}/></Link></div><div className="hero-signature"><span className="signature-line"/><span>Votre style. Votre personnalité.<br/><strong>Notre savoir-faire.</strong></span></div>
    </motion.div><div className="hero-side-label">FASHION AFRO BRAIDS — PARIS</div><a href="#expertises" className="hero-scroll"><span>La beauté commence ici</span><ArrowDown size={17}/></a><p className="hero-photo-caption">Photo du catalogue du salon</p></div></section>
    <div className="info-strip"><div className="container"><a href="/contact"><MapPin size={19}/><span>74 Avenue de Saint-Ouen <small>Paris 18e</small></span></a><a href="/contact"><Clock3 size={19}/><span>{sameHours ? "Ouvert 7j/7" : "Horaires du salon"} <small>{sameHours ? `${day.start.replace(":", " h ")} — ${day.end.replace(":", " h ")}` : "Consulter les horaires"}</small></span></a><a href={`tel:${catalog.settings.phone.replace(/\s/g, "")}`}><Phone size={18}/><span>{catalog.settings.phone}<small>Parlons de votre prochaine coiffure</small></span></a></div></div>
    <section id="expertises" className="section cream"><div className="container"><Reveal className="section-heading-row"><SectionTitle eyebrow="Le savoir-faire Fashion Afro Braids" title="La coiffure afro," italic="dans toute sa beauté.">Des coiffures pensées pour révéler votre personnalité et sublimer vos cheveux.</SectionTitle><Link href="/coiffures" className="text-link">Toutes nos prestations <ArrowUpRight size={18}/></Link></Reveal><div className="expertise-grid">{expertise.map(item => <Link key={item.name} href={`/coiffures?categorie=${encodeURIComponent(item.category)}`} className="expertise-card"><Photo src={item.image} alt={item.name} sizes="(max-width: 700px) 85vw, 30vw"/><div className="expertise-overlay"/><span className="expertise-number">{item.number}</span><div className="expertise-caption"><div><h3>{item.name}</h3><p>{item.text}</p></div><span className="circle-arrow"><ArrowUpRight size={21}/></span></div></Link>)}</div><p className="image-note">Les photos de coiffures sont à découvrir dans la galerie. Certains visuels de présentation restent des inspirations.</p></div></section>
    <section id="galerie" className="section dark"><div className="container"><Reveal className="section-heading-row"><SectionTitle eyebrow="Chaque coiffure raconte une histoire" title="Du caractère." italic="De l’allure." dark>Explorez les styles, trouvez celui qui vous ressemble.</SectionTitle><Link href="/coiffures" className="text-link light">Trouver ma coiffure <ArrowUpRight size={18}/></Link></Reveal><Gallery photos={catalog.gallery}/></div></section>
    <section className="section cream why-section"><div className="container why-layout"><div><SectionTitle eyebrow="L’expérience Fashion Afro Braids" title="Bien plus" italic="qu’une coiffure.">Un moment pour vous, une attention à chaque détail et une coiffure qui exprime votre personnalité.</SectionTitle><Link href="/a-propos" className="text-link">Découvrez notre salon <ArrowUpRight size={18}/></Link></div><div className="why-grid">{[[Scissors, "Expertise", "Un savoir-faire dédié aux textures et aux coiffures afro."], [Sparkles, "Qualité", "Des gestes précis et le soin apporté à chaque finition."], [Leaf, "Confort", "Un temps pour prendre soin de vous et de vos cheveux."], [Heart, "Personnalisation", "Des conseils et une coiffure adaptés à vos envies."]].map(([Icon, title, text]) => { const I = Icon as typeof Scissors; return <div className="why-card" key={String(title)}><I size={25} strokeWidth={1.25}/><h3>{String(title)}</h3><p>{String(text)}</p></div>; })}</div></div></section>
    <Reviews/>
    <section className="section cream"><div className="container"><div className="section-heading-row"><SectionTitle eyebrow="Les essentiels du quotidien" title="La beauté se prolonge" italic="à la maison.">Bonnets, mèches, perruques et accessoires : retrouvez notre sélection.</SectionTitle><Link href="/boutique" className="text-link">Explorer la boutique <ArrowUpRight size={18}/></Link></div><div className="product-grid">{catalog.products.slice(0, 4).map(product => <ProductCard key={product.id} product={product}/>)}</div></div></section>
    <section className="booking-banner"><div className="container"><p className="eyebrow">Votre prochain rendez-vous avec vous-même</p><h2>Une nouvelle coiffure.<br/><em>Une nouvelle énergie.</em></h2><Link href="/reservation" className="button primary">Choisir mon rendez-vous <ArrowUpRight size={19}/></Link><p>74 Avenue de Saint-Ouen · Paris 18e</p></div><span className="banner-art" aria-hidden="true">FAB</span></section>
  </>;
}
function Reviews() {
  const { catalog: { reviews } } = useSite(); const [current, setCurrent] = useState(0); const [paused, setPaused] = useState(false); const reduced = useReducedMotion();
  useEffect(() => { if (reviews.length < 2 || paused || reduced) return; const timer = setInterval(() => setCurrent(i => (i + 1) % reviews.length), 6500); return () => clearInterval(timer); }, [reviews.length, paused, reduced]);
  const review = reviews[current % Math.max(reviews.length, 1)];
  return <section id="avis" className="reviews-section" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)}><div className="container"><p className="eyebrow">Vos mots, notre inspiration</p><h2>{review ? "Vous nous faites confiance." : "Votre expérience compte."}</h2>{review ? <div className="review-content">{review.rating > 0 && <div className="review-stars" aria-label={`${review.rating} étoiles sur 5`}>{Array.from({ length: review.rating }, (_, i) => <Star key={i} size={16} fill="currentColor"/>)}</div>}<blockquote>« {review.text} »</blockquote><p>{review.name}</p>{reviews.length > 1 && <div className="review-controls"><button className="icon-button" aria-label="Avis précédent" onClick={() => setCurrent(i => (i - 1 + reviews.length) % reviews.length)}><ChevronLeft size={20}/></button>{reviews.map((item, i) => <button key={item.id} aria-label={`Avis ${i + 1}`} className={`review-dot ${i === current ? "active" : ""}`} onClick={() => setCurrent(i)}/>)}<button className="icon-button" aria-label="Avis suivant" onClick={() => setCurrent(i => (i + 1) % reviews.length)}><ChevronRight size={20}/></button></div>}</div> : <><p className="review-empty">Vous êtes venu·e au salon ? Votre retour nous aide à prendre soin de chaque expérience.</p><a href="https://www.google.com/maps/search/?api=1&query=Fashion+Afro+Braids+74+Avenue+de+Saint-Ouen+Paris" target="_blank" rel="noopener noreferrer" className="text-link">Retrouver le salon sur Google <ArrowUpRight size={18}/></a></>}</div></section>;
}
