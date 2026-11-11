import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useApp } from "../context";
import {
  DEFAULT_COVER_FRAME,
  isCoverFrame,
  isPlanCover,
} from "../lib/appearance";
import type { CSSVars, Plan } from "../types";
import { PlanIcon } from "./RecordIcon";

export function PlanArtwork({
  color,
  plan,
  children,
  preview = false,
}: {
  color: string;
  plan: Pick<
    Plan,
    "emoji" | "glyph" | "coverPhoto" | "coverFrame" | "siteIcon"
  >;
  children?: ReactNode;
  preview?: boolean;
}) {
  const { calm } = useApp();
  const photo = isPlanCover(plan.coverPhoto) ? plan.coverPhoto : undefined;
  const frame = isCoverFrame(plan.coverFrame)
    ? plan.coverFrame
    : DEFAULT_COVER_FRAME;
  return (
    <div
      className={`space-product-art${photo ? " has-plan-cover" : ""}${preview ? " plan-art-preview" : ""}`}
      style={
        {
          "--product-color": color,
          "--cover-zoom": frame.zoom,
          "--cover-x": `${frame.x * 100}%`,
          "--cover-y": `${frame.y * 100}%`,
        } as CSSVars
      }
    >
      {photo ? (
        <>
          <img
            className="plan-cover-image"
            src={photo}
            alt=""
            loading={preview ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
          <span className="plan-cover-scrim" aria-hidden="true" />
        </>
      ) : (
        <div className="space-product-ring" aria-hidden="true" />
      )}
      <motion.span
        className="space-product-icon"
        aria-hidden="true"
        whileHover={calm ? undefined : { rotate: 0, y: -3 }}
      >
        <PlanIcon plan={plan} size={36} />
      </motion.span>
      {children}
    </div>
  );
}
