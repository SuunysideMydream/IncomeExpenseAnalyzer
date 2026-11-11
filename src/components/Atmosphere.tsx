import { useEffect } from "react";
import { motion, useSpring } from "motion/react";

export function Atmosphere({ calm }: { calm: boolean }) {
  const x = useSpring(0, { stiffness: 55, damping: 20 });
  const y = useSpring(0, { stiffness: 55, damping: 20 });

  useEffect(() => {
    if (calm || !matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set((event.clientX / innerWidth - 0.5) * 36);
      y.set((event.clientY / innerHeight - 0.5) * 26);
    };
    const reset = () => {
      x.set(0);
      y.set(0);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", reset);
      x.jump(0);
      y.jump(0);
    };
  }, [calm, x, y]);

  return (
    <div className="workspace-atmosphere" aria-hidden="true">
      <motion.div
        className="atmosphere-drift"
        style={calm ? undefined : { x, y }}
      >
        <span className="atmosphere-violet" />
        <span className="atmosphere-mint" />
        <span className="atmosphere-glint" />
      </motion.div>
    </div>
  );
}
