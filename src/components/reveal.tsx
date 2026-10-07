"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

export function Reveal({ children, className = "", stagger = false, effect = "rise" }: { children: ReactNode; className?: string; stagger?: boolean; effect?: "rise" | "fade" }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced || !("IntersectionObserver" in window)) return;
    const targets = stagger ? Array.from(root.children) : [root];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("reveal-entered");
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    targets.forEach((target, index) => {
      (target as HTMLElement).dataset.revealEffect = effect;
      (target as HTMLElement).style.setProperty("--reveal-delay", `${stagger ? index % 4 * .06 : 0}s`);
      if (!target.classList.contains("reveal-entered")) observer.observe(target);
    });
    return () => observer.disconnect();
  }, [children, reduced, stagger, effect]);
  return <div ref={ref} className={className}>{children}</div>;
}
