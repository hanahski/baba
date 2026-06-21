// Compose a downloadable ticket image: the original photo with a QR stamp,
// holder name and a footer bar, like a real printed ticket.
import QRCode from "qrcode";

export async function composeTicketImage(opts: {
  photoUrl: string;
  qrToken: string;
  title: string;
  holder: string;
}): Promise<string> {
  const { photoUrl, qrToken, title, holder } = opts;
  const img = await loadImage(photoUrl);

  // Target width 1200, keep aspect; add 200px footer bar.
  const W = 1200;
  const scale = W / img.width;
  const H = Math.round(img.height * scale);
  const footer = 240;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H + footer;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, W, H);

  // QR card in bottom-right of the photo
  const qrSize = 260;
  const pad = 20;
  const qrCard = qrSize + pad * 2;
  const cardX = W - qrCard - 24;
  const cardY = H - qrCard - 24;
  roundRect(ctx, cardX, cardY, qrCard, qrCard, 18);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();

  const qrDataUrl = await QRCode.toDataURL(`SP-TICKET:${qrToken}`, { width: qrSize, margin: 0, color: { dark: "#0a0a0a", light: "#ffffff" } });
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, cardX + pad, cardY + pad, qrSize, qrSize);

  // Footer strip
  const grad = ctx.createLinearGradient(0, H, W, H + footer);
  grad.addColorStop(0, "#6d28d9");
  grad.addColorStop(1, "#db2777");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H, W, footer);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(truncate(title, 28), 40, H + 36);

  ctx.font = "30px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(`Holder: ${truncate(holder, 32)}`, 40, H + 108);
  ctx.fillText("Scan with Sure Plug · Ticket QR Scanner", 40, H + 154);

  // bar code style ticks across the bottom edge
  const tickY = H + footer - 24;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let x = 40, i = 0; x < W - 40; x += 8, i++) {
    const h = (i % 3 === 0) ? 18 : (i % 2 === 0) ? 10 : 14;
    ctx.fillRect(x, tickY - h, 3, h);
  }

  return canvas.toDataURL("image/png");
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  // Data URLs (and our composed canvases) load directly — no CORS dance needed.
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return await rawLoad(src);
  }
  // Fetch as blob → data URL so the canvas is never tainted by a missing CORS
  // header. Storage CDNs occasionally drop the header on mobile networks,
  // which used to crash `toDataURL()` and surface as "PDF download failed".
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    return await rawLoad(dataUrl);
  } catch {
    // Last-ditch: try anonymous crossOrigin load directly.
    return await new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("Could not load ticket image"));
      im.src = src;
    });
  }
}

function rawLoad(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Image decode failed"));
    im.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

export async function createTicketPdfBlob(dataUrl: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  // Get image dimensions from the data URL
  const img = await loadImage(dataUrl);
  const ratio = img.height / img.width;
  // Use A4-ish portrait, fit image to page width with margin
  const pageW = 595; // pt (A4 width)
  const margin = 24;
  const imgW = pageW - margin * 2;
  const imgH = imgW * ratio;
  const pageH = imgH + margin * 2;
  const pdf = new jsPDF({ unit: "pt", format: [pageW, pageH], orientation: "portrait" });
  pdf.addImage(dataUrl, "PNG", margin, margin, imgW, imgH, undefined, "FAST");
  return pdf.output("blob");
}

export async function downloadTicketPdf(dataUrl: string, filename: string, openedWindow?: Window | null) {
  const blob = await createTicketPdfBlob(dataUrl);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Best-effort: if a tab was pre-opened (desktop), point it at the PDF.
  // On mobile this window is often blocked or closed already; ignore failures.
  try {
    if (openedWindow && !openedWindow.closed) openedWindow.location.href = url;
    else openedWindow?.close?.();
  } catch { /* popup blocked — download still succeeded */ }

  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
