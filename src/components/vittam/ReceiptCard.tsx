import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
};

export function ReceiptCard({ children, className, tilt = true }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 15 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 15 });

  const enabled = tilt && !reduce;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div style={{ perspective: 1000 }} className="pt-[10px]">
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={enabled ? { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" } : undefined}
        className={cn("receipt-glass p-6", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}
