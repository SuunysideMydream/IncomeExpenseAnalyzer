import { useState, type ReactNode } from "react";
import {
  BedDouble,
  Bike,
  BookOpen,
  Camera,
  CarFront,
  Coffee,
  CookingPot,
  Dumbbell,
  Flower2,
  Footprints,
  Gamepad2,
  Gift,
  Guitar,
  Headphones,
  Laptop,
  Luggage,
  Palette,
  Plane,
  ShoppingBag,
  Smartphone,
  Sofa,
  Tent,
  Umbrella,
  WashingMachine,
  Watch,
} from "lucide-react";
import { glyphForPlan, type PlanGlyph } from "../lib/appearance";
import { isSiteIconImage, type SiteIcon } from "../lib/site-icon";
import type { Plan } from "../types";

const glyphIcons = {
  bag: ShoppingBag,
  laptop: Laptop,
  phone: Smartphone,
  headphones: Headphones,
  game: Gamepad2,
  camera: Camera,
  watch: Watch,
  sofa: Sofa,
  plant: Flower2,
  bed: BedDouble,
  laundry: WashingMachine,
  coffee: Coffee,
  cooking: CookingPot,
  plane: Plane,
  suitcase: Luggage,
  car: CarFront,
  bicycle: Bike,
  camping: Tent,
  beach: Umbrella,
  sneaker: Footprints,
  gift: Gift,
  guitar: Guitar,
  art: Palette,
  books: BookOpen,
  fitness: Dumbbell,
} satisfies Record<PlanGlyph, typeof Laptop>;

export function GlyphIcon({ glyph, size }: { glyph: PlanGlyph; size: number }) {
  const Icon = glyphIcons[glyph];
  return <Icon size={size} aria-hidden="true" data-plan-glyph={glyph} />;
}

export function RecordIcon({
  site,
  size,
  fallback,
}: {
  site?: SiteIcon;
  size: number;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string>();
  const source = site?.image;
  if (!isSiteIconImage(source) || source === failed) return fallback;
  return (
    <img
      className="record-site-icon"
      data-icon-host={site?.host}
      src={source}
      alt=""
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      onError={() => setFailed(source)}
    />
  );
}

export function PlanIcon({
  plan,
  size,
}: {
  plan: Pick<Plan, "emoji" | "glyph" | "siteIcon">;
  size: number;
}) {
  return (
    <RecordIcon
      site={plan.siteIcon}
      size={size}
      fallback={<GlyphIcon glyph={glyphForPlan(plan)} size={size} />}
    />
  );
}
