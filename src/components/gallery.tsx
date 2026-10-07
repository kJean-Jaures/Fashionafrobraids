"use client";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { GalleryPhoto } from "@/lib/catalog";
import { Photo } from "./photo";
import { Modal } from "./ui";
export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState("Toutes"); const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [limit, setLimit] = useState(12);
  const filtered = photos.filter(photo => filter === "Toutes" || photo.category === filter);
  const categories = ["Toutes", ...new Set(photos.map(photo => photo.category))];
  return <><div className="filter-row gallery-filters" aria-label="Catégories de photos">{categories.map(category => <button key={category} aria-pressed={filter === category} className={`filter-chip ${filter === category ? "selected" : ""}`} onClick={() => { setFilter(category); setLimit(12); }}>{category}</button>)}</div><div className="gallery-grid">{filtered.slice(0, limit).map((photo, i) => <button key={photo.id} onClick={() => setSelected(photo)} className={`gallery-item gallery-${i % 4}`} aria-label={`Voir ${photo.title}`}><Photo src={photo.image} alt={photo.title} position={photo.position}/><span className="gallery-caption"><span><small>{photo.illustrative ? "INSPIRATION" : photo.category}</small><strong>{photo.title}</strong></span><ArrowUpRight size={22}/></span></button>)}</div>{filtered.length > limit && <button type="button" className="button outline-light gallery-more" onClick={() => setLimit(previous => previous + 12)}>Voir plus de coiffures ({filtered.length - limit})</button>}{!photos.length && <p>Les réalisations du salon seront bientôt présentées ici.</p>}<Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || "Photo"} className="lightbox">{selected && <><Photo src={selected.image} alt={selected.title} position={selected.position} className="lightbox-photo"/>{selected.illustrative && <p className="image-note">Visuel d’inspiration, pas une réalisation photographiée au salon.</p>}</>}</Modal></>;
}
