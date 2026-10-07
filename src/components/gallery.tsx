"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryPhoto } from "@/lib/catalog";
import { Photo } from "./photo";
import { Reveal } from "./reveal";
import { Modal } from "./ui";
export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [filter, setFilter] = useState("Toutes"); const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [limit, setLimit] = useState(12);
  const filtered = useMemo(() => photos.filter(photo => filter === "Toutes" || photo.category === filter), [photos, filter]);
  const index = filtered.findIndex(photo => photo.id === selected?.id);
  useEffect(() => {
    if (!selected) return;
    const navigate = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setSelected(previous => filtered[filtered.findIndex(photo => photo.id === previous?.id) + direction] || previous);
    };
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [selected, filtered]);
  const categories = ["Toutes", ...new Set(photos.map(photo => photo.category))];
  return <><div className="filter-row gallery-filters" aria-label="Catégories de photos">{categories.map(category => <button key={category} aria-pressed={filter === category} className={`filter-chip ${filter === category ? "selected" : ""}`} onClick={() => { setFilter(category); setLimit(12); }}>{category}</button>)}</div><Reveal className="gallery-grid" stagger>{filtered.slice(0, limit).map((photo, i) => <button key={photo.id} onClick={() => setSelected(photo)} className={`gallery-item gallery-${i % 4}`} aria-label={`Voir ${photo.title}`}><Photo src={photo.image} alt={photo.title} position={photo.position} fit="contain"/><span className="gallery-caption"><span><small>{photo.illustrative ? "INSPIRATION" : photo.category}</small><strong>{photo.title}</strong></span><ArrowUpRight size={22}/></span></button>)}</Reveal>{filtered.length > limit && <button type="button" className="button outline-light gallery-more" onClick={() => setLimit(previous => previous + 12)}>Voir plus de coiffures ({filtered.length - limit})</button>}{!photos.length && <p>Les réalisations du salon seront bientôt présentées ici.</p>}<Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || "Photo"} className="lightbox">{selected && <><Photo key={selected.id} src={selected.image} alt={selected.title} position={selected.position} className="lightbox-photo" fit="contain" priority sizes="(max-width: 700px) 90vw, 650px"/><div className="lightbox-controls"><button type="button" className="lightbox-control" aria-label="Photo précédente" aria-keyshortcuts="ArrowLeft" disabled={index <= 0} onClick={() => setSelected(filtered[index - 1])}><ChevronLeft size={20}/><span>Précédente</span></button><p className="lightbox-counter" role="status" aria-live="polite">Photo {index + 1} sur {filtered.length}</p><button type="button" className="lightbox-control" aria-label="Photo suivante" aria-keyshortcuts="ArrowRight" disabled={index >= filtered.length - 1} onClick={() => setSelected(filtered[index + 1])}><span>Suivante</span><ChevronRight size={20}/></button></div>{selected.illustrative && <p className="image-note">Visuel d’inspiration, pas une réalisation photographiée au salon.</p>}</>}</Modal></>;
}
