import { resizeImage } from "@/lib/image-resize";

// Kartenbilder sollen sich bis auf 8-fach vergrößern lassen: bis 6000 Pixel an der langen Seite bleiben sie unverändert
// (PNG bleibt PNG, also verlustfrei), nur größere werden verkleinert, und zwar im selben Format.
export const MAP_MAX_SIDE = 6000;
export const MAP_MAX_BYTES = 25 * 1024 * 1024;

const KEEP_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type MapImagePlan = { kind: "keep" } | { kind: "shrink"; scale: number; type: "image/png" | "image/jpeg" };

// Was mit einem Kartenbild passiert: unverändert lassen (SVG, GIF, passende Größe) oder im selben Format verkleinern.
export function planMapImage(type: string, width: number, height: number): MapImagePlan {
  if (type === "image/svg+xml" || type === "image/gif") return { kind: "keep" };
  const scale = Math.min(1, MAP_MAX_SIDE / Math.max(width, height));
  if (scale === 1 && KEEP_TYPES.includes(type)) return { kind: "keep" };
  return { kind: "shrink", scale, type: type === "image/png" ? "image/png" : "image/jpeg" };
}

export async function prepareMapImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const plan = planMapImage(file.type, bitmap.width, bitmap.height);
    if (plan.kind === "keep") {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * plan.scale);
    const height = Math.round(bitmap.height * plan.scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    if (plan.type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, plan.type, 0.92));
    if (!blob) return file;
    const ext = plan.type === "image/png" ? "png" : "jpg";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: plan.type });
  } catch {
    // Formate, die der Browser nicht lesen kann (z. B. HEIC), wie bisher als JPEG verkleinern.
    return resizeImage(file, MAP_MAX_SIDE, 0.92);
  }
}
