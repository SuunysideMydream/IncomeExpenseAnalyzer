export interface SiteIcon {
  host: string;
  image?: string;
}

const privateSuffixes = new Set([
  "localhost",
  "local",
  "internal",
  "test",
  "example",
  "invalid",
  "onion",
]);

export function normalizeSiteHost(input: string): string | undefined {
  const value = input.trim();
  if (!value || value.length > 2048) return;
  try {
    const url = new URL(
      /^[a-z][\w+.-]*:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const labels = host.split(".");
    const suffix = labels.at(-1) || "";
    if (
      host.length > 253 ||
      labels.length < 2 ||
      privateSuffixes.has(suffix) ||
      !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/.test(suffix) ||
      labels.some(
        (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
      )
    )
      return;
    return host;
  } catch {
    return;
  }
}

export function isSiteIconImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 32_000 &&
    /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(value)
  );
}

export function isSiteIcon(value: unknown): value is SiteIcon {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const { host, image } = value as SiteIcon;
  return (
    typeof host === "string" &&
    normalizeSiteHost(host) === host &&
    (image === undefined || isSiteIconImage(image))
  );
}

// A public hostname is the only record information sent to the icon service.
export async function fetchSiteIcon(host: string, signal: AbortSignal) {
  if (normalizeSiteHost(host) !== host) return;
  const response = await fetch(
    `https://icon.horse/icon/${encodeURIComponent(host)}`,
    {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    },
  );
  const limit = 256 * 1024;
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/") ||
    Number(response.headers.get("content-length")) > limit
  )
    return;
  const blob = await response.blob();
  if (blob.size > limit) return;
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) return;
    const scale = Math.min(1, 64 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    return isSiteIconImage(png) ? png : undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}
