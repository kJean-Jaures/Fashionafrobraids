import Image from "next/image";
export function Photo({ src, alt, className = "", priority = false, position, fit = "cover", sizes = "(max-width: 700px) 100vw, 50vw" }: { src: string; alt: string; className?: string; priority?: boolean; position?: string; fit?: "cover" | "contain"; sizes?: string }) {
  const [path, fragment] = src.split("#");
  const crop = path.endsWith("gallery.webp");
  const location = position || fragment || "center";
  return <div className={`photo ${crop ? "triptych" : ""} ${fit === "contain" && !crop ? "photo-contain" : ""} ${className}`}>{crop ? <div style={{ position: "absolute", top: 0, bottom: 0, width: "300%", left: location === "left" ? "0" : location === "right" ? "-200%" : "-100%" }}><Image src={path} alt={alt} fill sizes={sizes} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} style={{ objectFit: "cover" }}/></div> : <Image src={path} alt={alt} fill sizes={sizes} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} style={{ objectFit: fit, objectPosition: fit === "contain" ? "center" : location }}/>}</div>;
}
