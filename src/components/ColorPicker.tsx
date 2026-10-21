import { normalizeColor } from "../lib/finance";
const presets = [
  "#2C9B72",
  "#7460DC",
  "#4D79B8",
  "#DF725F",
  "#9A78CE",
  "#C58A39",
  "#397C86",
  "#BC6088",
  "#17211F",
  "#FF00AA",
];
export function ColorPicker({
  value,
  onChange,
  label,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
}) {
  const normalized = normalizeColor(value),
    valid = normalized || "#7460DC",
    rgb = [1, 3, 5].map((offset) =>
      parseInt(valid.slice(offset, offset + 2), 16),
    );
  const updateChannel = (index: number, channel: number) => {
    const next = [...rgb];
    next[index] = channel;
    onChange(
      "#" +
        next
          .map((number) => number.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase(),
    );
  };
  return (
    <div className="card-color-field">
      <h4>{label}</h4>
      <div className="card-color-editor">
        <div className="card-color-top">
          <label
            className="card-color-swatch"
            style={{ background: valid }}
            aria-label={`${label} native color`}
          >
            <input
              type="color"
              value={valid}
              aria-label={`${label} color`}
              onChange={(event) => onChange(event.target.value.toUpperCase())}
            />
          </label>
          <div className="card-hex-field">
            <label htmlFor={id}>{label} HEX</label>
            <input
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onBlur={() => {
                if (normalized) onChange(normalized);
              }}
              placeholder="#7460DC"
              spellCheck={false}
              aria-invalid={!normalized}
            />
          </div>
        </div>
        <div className="card-color-presets">
          {presets.map((color) => (
            <button
              key={color}
              type="button"
              style={{ background: color }}
              className="card-color-preset"
              aria-label={`${label} ${color}`}
              aria-pressed={normalized === color}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
        <details className="card-color-adjust">
          <summary>Adjust RGB channels</summary>
          {["Red", "Green", "Blue"].map((channel, index) => (
            <label className="card-color-channel" key={channel}>
              <span>{channel}</span>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb[index]}
                aria-label={`${label} ${channel}`}
                onChange={(event) =>
                  updateChannel(index, Number(event.target.value))
                }
              />
              <output>{rgb[index]}</output>
            </label>
          ))}
        </details>
        <small>
          {normalized
            ? "Choose a preset, enter HEX, or mix your own color."
            : "Enter 3 or 6 HEX digits, for example #ABC or #AABBCC."}
        </small>
      </div>
    </div>
  );
}
