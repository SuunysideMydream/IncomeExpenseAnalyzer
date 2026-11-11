import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import { Grid2x2, ImagePlus, RotateCcw, X } from "lucide-react";
import {
  clampCoverPosition,
  COVER_ZOOM_MAX,
  DEFAULT_COVER_FRAME,
  glyphForPlan,
  PLAN_GLYPH_GROUPS,
  type CoverFrame,
} from "../lib/appearance";
import { PLAN_PHOTO_TYPES, preparePlanCover } from "../lib/cover-photo";
import { PlanArtwork } from "./PlanArtwork";
import { GlyphIcon } from "./RecordIcon";
import { SiteIconField, type useSiteIcon } from "./SiteIconField";
import type { Plan } from "../types";

export type PlanAppearanceState = Pick<
  Plan,
  "glyph" | "coverPhoto" | "coverFrame"
>;

export function PlanAppearance({
  value,
  onChange,
  color,
  preparing,
  onPreparing,
  site,
}: {
  value: PlanAppearanceState;
  onChange: Dispatch<SetStateAction<PlanAppearanceState>>;
  color: string;
  preparing: boolean;
  onPreparing: (value: boolean) => void;
  site: ReturnType<typeof useSiteIcon>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    travelX: number;
    travelY: number;
    frame: CoverFrame;
  } | null>(null);
  const frame = value.coverFrame || DEFAULT_COVER_FRAME;
  const glyph = glyphForPlan(value);
  const setFrame = (next: CoverFrame) =>
    onChange((current) => ({ ...current, coverFrame: next }));

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!value.coverPhoto || !event.isPrimary || event.button !== 0) return;
    const viewport = event.currentTarget;
    const image = viewport.querySelector<HTMLImageElement>(".plan-cover-image");
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const { width, height } = viewport.getBoundingClientRect();
    const scale =
      Math.max(width / image.naturalWidth, height / image.naturalHeight) *
      frame.zoom;
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      travelX: Math.max(0, image.naturalWidth * scale - width),
      travelY: Math.max(0, image.naturalHeight * scale - height),
      frame,
    };
    viewport.focus({ preventScroll: true });
    viewport.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    setFrame({
      zoom: start.frame.zoom,
      x:
        start.travelX > 0.5
          ? clampCoverPosition(
              start.frame.x - (event.clientX - start.x) / start.travelX,
            )
          : start.frame.x,
      y:
        start.travelY > 0.5
          ? clampCoverPosition(
              start.frame.y - (event.clientY - start.y) / start.travelY,
            )
          : start.frame.y,
    });
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointer !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const version = ++request.current;
    setError("");
    onPreparing(true);
    try {
      const coverPhoto = await preparePlanCover(file);
      if (request.current === version)
        onChange((current) => ({
          ...current,
          coverPhoto,
          coverFrame: undefined,
        }));
    } catch (error) {
      if (request.current === version) setError((error as Error).message);
    } finally {
      if (request.current === version) onPreparing(false);
    }
  }

  return (
    <div className="form-section plan-appearance">
      <h4>PLAN APPEARANCE</h4>
      <div className="plan-appearance-grid">
        <div className="plan-cover-editor">
          <div
            className={`plan-cover-viewport${value.coverPhoto ? " can-frame" : ""}${dragging ? " is-dragging" : ""}`}
            role={value.coverPhoto ? "group" : undefined}
            aria-label={value.coverPhoto ? "Reposition cover photo" : undefined}
            aria-describedby={value.coverPhoto ? "plan-frame-hint" : undefined}
            tabIndex={value.coverPhoto ? 0 : undefined}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={(event) => {
              if (!value.coverPhoto) return;
              const nudges: Record<string, [number, number]> = {
                ArrowLeft: [0.05, 0],
                ArrowRight: [-0.05, 0],
                ArrowUp: [0, 0.05],
                ArrowDown: [0, -0.05],
              };
              if (!Object.hasOwn(nudges, event.key)) return;
              event.preventDefault();
              const [x, y] = nudges[event.key];
              setFrame({
                zoom: frame.zoom,
                x: clampCoverPosition(frame.x + x),
                y: clampCoverPosition(frame.y + y),
              });
            }}
          >
            <PlanArtwork
              color={color}
              plan={{ ...value, siteIcon: site.value }}
              preview
            >
              <div className="space-product-tag">COVER PREVIEW</div>
            </PlanArtwork>
          </div>
          {value.coverPhoto && (
            <div className="plan-frame-controls">
              <label htmlFor="plan-cover-zoom">
                Cover zoom{" "}
                <output htmlFor="plan-cover-zoom">
                  {frame.zoom.toFixed(2)}×
                </output>
              </label>
              <input
                type="range"
                id="plan-cover-zoom"
                min={1}
                max={COVER_ZOOM_MAX}
                step={0.05}
                value={frame.zoom}
                onChange={(event) =>
                  setFrame({ ...frame, zoom: Number(event.target.value) })
                }
              />
              <p id="plan-frame-hint" className="ledger-hint">
                Drag the preview or use its arrow keys to move the photo.
              </p>
              <button
                type="button"
                className="link-button"
                disabled={
                  frame.zoom === 1 && frame.x === 0.5 && frame.y === 0.5
                }
                onClick={() => setFrame(DEFAULT_COVER_FRAME)}
              >
                <RotateCcw size={14} /> Reset framing
              </button>
            </div>
          )}
        </div>
        <div className="plan-appearance-controls">
          <div className="plan-cover-actions">
            <input
              ref={fileInput}
              id="plan-cover-file"
              type="file"
              accept={PLAN_PHOTO_TYPES.join(",")}
              aria-label="Installment cover photo"
              hidden
              onChange={(event) => void upload(event)}
            />
            <button
              type="button"
              className="secondary"
              disabled={preparing}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus size={16} />
              {value.coverPhoto ? "Replace photo" : "Import photo"}
            </button>
            {value.coverPhoto && (
              <button
                type="button"
                className="link-button"
                disabled={preparing}
                onClick={() => {
                  setError("");
                  onChange((current) => ({
                    ...current,
                    coverPhoto: undefined,
                    coverFrame: undefined,
                  }));
                }}
              >
                <X size={15} /> Remove photo
              </button>
            )}
          </div>
          <p className="ledger-hint" aria-live="polite">
            {preparing
              ? "Preparing your cover…"
              : "JPEG, PNG, or WebP. The cover is resized and saved with this plan."}
          </p>
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
          <details className="plan-glyph-picker">
            <summary>
              <Grid2x2 size={16} /> Choose a glyph
              <span>
                <GlyphIcon glyph={glyph} size={16} />
              </span>
            </summary>
            <div className="plan-glyph-groups">
              {PLAN_GLYPH_GROUPS.map(({ label, icons }) => (
                <div key={label} role="group" aria-label={label}>
                  <h5>{label}</h5>
                  <div>
                    {icons.map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        title={name}
                        aria-label={name}
                        aria-pressed={glyph === id}
                        onClick={() =>
                          onChange((current) => ({ ...current, glyph: id }))
                        }
                      >
                        <GlyphIcon glyph={id} size={18} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="link-button"
              disabled={glyph === "bag"}
              onClick={() =>
                onChange((current) => ({ ...current, glyph: "bag" }))
              }
            >
              <RotateCcw size={14} /> Use default icon
            </button>
          </details>
          <SiteIconField
            id="plan-site"
            lookup={site}
            fallback={<GlyphIcon glyph={glyph} size={18} />}
          />
        </div>
      </div>
    </div>
  );
}
