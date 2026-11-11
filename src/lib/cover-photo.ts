import { isPlanCover } from "./appearance";

export const PLAN_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PLAN_PHOTO_LIMIT = 16 * 1024 * 1024;

export async function preparePlanCover(file: File): Promise<string> {
  if (!PLAN_PHOTO_TYPES.includes(file.type))
    throw Error("Choose a JPEG, PNG, or WebP photo.");
  if (!file.size || file.size > PLAN_PHOTO_LIMIT)
    throw Error("Choose a photo smaller than 16 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw Error("This photo could not be opened. Try another image.");
  }
  try {
    const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw Error("Photo previews are unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.84, 0.72, 0.58, 0.42, 0.28]) {
      const photo = canvas.toDataURL("image/jpeg", quality);
      if (isPlanCover(photo)) return photo;
    }
    throw Error("This photo is still too large. Try a smaller image.");
  } finally {
    bitmap.close();
  }
}
