import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useApp } from "../context";

export function Reveal({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const { calm } = useApp();
  return (
    <motion.div
      data-studio-reveal
      id={id}
      className={className}
      initial={calm ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.06 }}
      animate={calm ? { opacity: 1, y: 0 } : undefined}
      transition={{ type: "spring", bounce: 0, duration: calm ? 0 : 0.42 }}
    >
      {children}
    </motion.div>
  );
}
