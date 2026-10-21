// React adaptations of animated-text-changing, moving icon, and splash screen.tsx.
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useSystemReducedMotion } from "../../lib/motion";
import { Plus } from "lucide-react";
import { useApp } from "../../context";
export function AnimatedTextRoller() {
  const { calm } = useApp(),
    [index, setIndex] = useState(0);
  const words = [
    "a little more clarity.",
    "a little more possibility.",
    "a little more peace of mind.",
  ];
  useEffect(() => {
    if (calm) return;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % words.length);
    }, 5200);
    return () => clearInterval(timer);
  }, [calm]);
  return (
    <span className="react-text-roller" aria-live="off">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          initial={calm ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: calm ? 0 : -8 }}
          transition={{ duration: calm ? 0 : 0.25 }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
export function SpinningQuickAdd() {
  const { calm, open } = useApp(),
    id = useId().replace(/:/g, "");
  return (
    <motion.button
      className="space-orbit-button react-orbit"
      aria-label="Quick add expense"
      onClick={() => open({ kind: "transaction", type: "expense" })}
      whileTap={calm ? undefined : { scale: 0.95 }}
    >
      <motion.svg
        viewBox="0 0 110 110"
        aria-hidden="true"
        animate={calm ? { rotate: 0 } : { rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <path id={id} d="M55 55m-41 0a41 41 0 1 1 82 0a41 41 0 1 1-82 0" />
        </defs>
        <text>
          <textPath href={`#${id}`}>
            MAKE IT COUNT · EVERY LITTLE THING ·{" "}
          </textPath>
        </text>
      </motion.svg>
      <span>
        <Plus />
      </span>
    </motion.button>
  );
}
export function LiquidWelcome({
  message = "Opening your personal money space.",
  calm: forceCalm = false,
}: {
  message?: string;
  calm?: boolean;
}) {
  const reduced = useSystemReducedMotion(),
    calm = reduced || forceCalm,
    id = useId().replace(/:/g, "");
  return (
    <motion.div
      className="space-splash react-splash"
      role="status"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: calm ? 0 : 0.2 }}
    >
      <div className="space-liquid-loader">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <defs>
            <clipPath id={id}>
              <circle cx="60" cy="60" r="48" />
            </clipPath>
          </defs>
          <circle className="space-loader-ring" cx="60" cy="60" r="49" />
          <g clipPath={`url(#${id})`}>
            <motion.g
              animate={calm ? {} : { y: [4, -4, 4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.path
                className="react-wave-back"
                d="M-240 62Q-210 40-180 62T-120 62T-60 62T0 62T60 62T120 62T180 62T240 62T300 62T360 62V140H-240Z"
                animate={calm ? {} : { x: [-120, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
              />
              <motion.path
                className="react-wave-front"
                d="M-240 69Q-210 47-180 69T-120 69T-60 69T0 69T60 69T120 69T180 69T240 69T300 69T360 69V140H-240Z"
                animate={calm ? {} : { x: [0, -120] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
              />
            </motion.g>
          </g>
          <path className="space-loader-check" d="m44 62 11 11 23-25" />
        </svg>
      </div>
      <strong aria-label="moneywise">
        {Array.from("moneywise").map((char, index) => (
          <motion.span
            aria-hidden="true"
            key={index}
            style={{ display: "inline-block" }}
            initial={calm ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: calm ? 0 : index * 0.024, duration: 0.25 }}
          >
            {char}
          </motion.span>
        ))}
      </strong>
      <p>{message}</p>
    </motion.div>
  );
}
