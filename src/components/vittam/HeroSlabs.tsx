import { motion, useReducedMotion } from "framer-motion";

/**
 * Landing-hero visual: slow-drifting stack of receipt-like slabs.
 * CSS 3D transforms (not three.js) — keeps bundle small and SSR-safe.
 */
export function HeroSlabs() {
  const reduce = useReducedMotion();
  const slabs = [
    { c: "var(--marigold)", y: 0, r: -8, d: 0 },
    { c: "var(--banyan)", y: 30, r: 6, d: 1.2 },
    { c: "var(--paper)", y: 60, r: -3, d: 2.4 },
  ];
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-lg" style={{ perspective: 1400 }}>
      {slabs.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: s.y }}
          transition={{ duration: 1.2, delay: s.d * 0.2, ease: "easeOut" }}
          className="absolute inset-x-0 mx-auto h-40 w-[85%] rounded-md shadow-2xl"
          style={{
            top: 40 + i * 40,
            background: `linear-gradient(135deg, ${s.c}, color-mix(in oklab, ${s.c} 70%, #000))`,
            transform: `rotate(${s.r}deg) translateZ(${i * 30}px)`,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-md"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0 22px, rgba(0,0,0,0.06) 22px 23px)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
