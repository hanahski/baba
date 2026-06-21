import { enhanceImage } from "./image-enhance.functions";

const MAX_DIM = 1600; // downscale very large images before sending to AI
const MAX_BYTES = 9_000_000; // ~9MB base64 budget

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function downscaleIfNeeded(file: File): Promise<string> {
  // If small enough, send as-is for max fidelity.
  if (file.size < MAX_BYTES) {
    const url = await fileToDataUrl(file);
    return url;
  }
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return fileToDataUrl(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.95);
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+);/.exec(meta)?.[1] || "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.split("/")[1] || "png";
  const cleanName = name.replace(/\.[^.]+$/, "") + `.${ext}`;
  return new File([bytes], cleanName, { type: mime });
}

/**
 * Enhance an image File via AI. Returns enhanced File on success,
 * or the original file on any failure. Never throws.
 */
export async function enhanceImageFile(file: File, opts?: { timeoutMs?: number }): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // GIFs / SVGs: skip (animation/vector — enhancement would break them).
  if (/gif|svg/.test(file.type)) return file;

  const timeoutMs = opts?.timeoutMs ?? 45_000;
  try {
    const dataUrl = await downscaleIfNeeded(file);
    const result = await Promise.race([
      enhanceImage({ data: { imageDataUrl: dataUrl } }),
      new Promise<{ ok: false; error: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: "timeout" }), timeoutMs),
      ),
    ]);
    if (!result || (result as any).ok !== true) return file;
    return dataUrlToFile((result as any).imageDataUrl, file.name);
  } catch {
    return file;
  }
}
