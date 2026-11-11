export const CARD_NETWORKS = {
  mastercard: "Mastercard",
  visa: "Visa",
  unionpay: "UnionPay",
  jcb: "JCB",
  none: "No network mark",
} as const;

export type CardNetwork = keyof typeof CARD_NETWORKS;

export function isCardNetwork(value: unknown): value is CardNetwork {
  return typeof value === "string" && Object.hasOwn(CARD_NETWORKS, value);
}

export const PLAN_GLYPH_GROUPS = [
  {
    label: "Tech",
    icons: [
      ["laptop", "Laptop", "💻"],
      ["phone", "Phone", "📱"],
      ["headphones", "Headphones", "🎧"],
      ["game", "Game controller", "🎮"],
      ["camera", "Camera", "📷"],
      ["watch", "Watch", "⌚"],
    ],
  },
  {
    label: "Home",
    icons: [
      ["sofa", "Sofa", "🛋️"],
      ["plant", "Plant", "🪴"],
      ["bed", "Bed", "🛏️"],
      ["laundry", "Laundry", "🧺"],
      ["coffee", "Coffee", "☕"],
      ["cooking", "Cooking", "🍳"],
    ],
  },
  {
    label: "Travel",
    icons: [
      ["plane", "Plane", "✈️"],
      ["suitcase", "Suitcase", "🧳"],
      ["car", "Car", "🚗"],
      ["bicycle", "Bicycle", "🚲"],
      ["camping", "Camping", "🏕️"],
      ["beach", "Beach", "🏖️"],
    ],
  },
  {
    label: "Lifestyle",
    icons: [
      ["sneaker", "Sneaker", "👟"],
      ["gift", "Gift", "🎁"],
      ["guitar", "Guitar", "🎸"],
      ["art", "Art", "🎨"],
      ["books", "Books", "📚"],
      ["fitness", "Fitness", "🏋️"],
    ],
  },
] as const;

export type PlanGlyph =
  "bag" | (typeof PLAN_GLYPH_GROUPS)[number]["icons"][number][0];

const glyphs = new Set<unknown>(["bag"]);
const legacyGlyphs = new Map<string, PlanGlyph>();
for (const { icons } of PLAN_GLYPH_GROUPS)
  for (const [glyph, , emoji] of icons) {
    glyphs.add(glyph);
    legacyGlyphs.set(emoji, glyph);
  }

export const isPlanGlyph = (value: unknown): value is PlanGlyph =>
  glyphs.has(value);
export const isPlanEmoji = (value: unknown): value is string =>
  typeof value === "string" && legacyGlyphs.has(value);

export function glyphForPlan(plan?: { glyph?: PlanGlyph; emoji?: string }) {
  if (isPlanGlyph(plan?.glyph)) return plan.glyph;
  return (plan?.emoji && legacyGlyphs.get(plan.emoji)) || "bag";
}

export interface CoverFrame {
  zoom: number;
  x: number;
  y: number;
}

export const COVER_ZOOM_MAX = 3;
export const DEFAULT_COVER_FRAME: Readonly<CoverFrame> = {
  zoom: 1,
  x: 0.5,
  y: 0.5,
};
export const clampCoverPosition = (value: number) =>
  Math.max(0, Math.min(1, value));

export function isCoverFrame(value: unknown): value is CoverFrame {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { zoom, x, y } = value as CoverFrame;
  return (
    Number.isFinite(zoom) &&
    zoom >= 1 &&
    zoom <= COVER_ZOOM_MAX &&
    Number.isFinite(x) &&
    x >= 0 &&
    x <= 1 &&
    Number.isFinite(y) &&
    y >= 0 &&
    y <= 1
  );
}

export const MAX_PLAN_COVER_LENGTH = 140_000;

export function isPlanCover(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_PLAN_COVER_LENGTH &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}
