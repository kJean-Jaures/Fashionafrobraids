"use client";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 180, damping: 30, restDelta: .001 });
  const reduced = useReducedMotion();
  return <motion.div className="reading-progress" aria-hidden="true" style={{ scaleX: reduced ? scrollYProgress : smoothProgress }}/>;
}
