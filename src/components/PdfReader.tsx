// Fullscreen, in-app PDF reader powered by pdf.js.
// Renders one page at a time onto a canvas, supports zoom, page nav, fullscreen
// toggle, keyboard shortcuts and a Download button.
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  Loader2,
  FileText,
} from "lucide-react";

type Props = {
  url: string;
  title: string;
  onClose: () => void;
  downloadName?: string;
};

export function PdfReader({ url, title, onClose, downloadName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const docRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [isFull, setIsFull] = useState(false);

  // Load the document once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const doc = await pdfjs.getDocument({ url, withCredentials: false }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setTotal(doc.numPages);
        setPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || "Could not open this PDF");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      try {
        renderTaskRef.current?.cancel?.();
      } catch {/* ignore */}
      try {
        docRef.current?.destroy?.();
      } catch {/* ignore */}
      docRef.current = null;
    };
  }, [url]);

  // Render whenever page or scale changes
  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas || !container) return;
    try {
      const pdfPage = await doc.getPage(page);
      // Fit-to-width baseline
      const unscaled = pdfPage.getViewport({ scale: 1 });
      const padding = 32;
      const available = Math.max(container.clientWidth - padding, 320);
      const fit = available / unscaled.width;
      setFitScale(fit);
      const finalScale = fit * scale;
      const viewport = pdfPage.getViewport({ scale: finalScale });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      try {
        renderTaskRef.current?.cancel?.();
      } catch {/* ignore */}
      renderTaskRef.current = pdfPage.render({ canvasContext: ctx, viewport });
      await renderTaskRef.current.promise;
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") {
        setError(e?.message ?? "Failed to render page");
      }
    }
  }, [page, scale]);

  useEffect(() => {
    if (!loading && !error) renderPage();
  }, [loading, error, renderPage]);

  // Re-render on resize (fit-to-width)
  useEffect(() => {
    const onResize = () => renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => Math.min(p + 1, total || p));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(p - 1, 1));
      else if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s + 0.15, 3));
      else if (e.key === "-") setScale((s) => Math.max(s - 0.15, 0.5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  // Fullscreen API
  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
        setIsFull(true);
      } else {
        await document.exitFullscreen();
        setIsFull(false);
      }
    } catch {/* ignore */}
  };

  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = (downloadName ?? title).replace(/[^\w\d.\-]+/g, "_") + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch {
      // Fallback — open in new tab
      window.open(url, "_blank", "noopener");
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[120] bg-background flex flex-col"
      role="dialog"
      aria-label={`Reading ${title}`}
    >
      {/* Top bar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold truncate flex-1 min-w-0">{title}</h2>
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mr-2">
          <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))} aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.min(s + 0.15, 3))} aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={download} aria-label="Download PDF">
          <Download className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Download</span>
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleFull} aria-label={isFull ? "Exit fullscreen" : "Fullscreen"}>
          {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Viewer */}
      <div className="flex-1 overflow-auto bg-muted/40">
        <div className="min-h-full flex items-start justify-center py-4 px-2">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-20">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Loading PDF…</p>
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-20 max-w-sm">
              <p className="text-sm text-destructive mb-2">Couldn't open this PDF in the reader.</p>
              <p className="text-xs text-muted-foreground mb-4 break-all">{error}</p>
              <Button onClick={download} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" /> Download instead
              </Button>
            </div>
          )}
          {!loading && !error && (
            <canvas ref={canvasRef} className="shadow-card rounded bg-white max-w-full" />
          )}
        </div>
      </div>

      {/* Bottom pager */}
      {!loading && !error && total > 0 && (
        <footer className="flex items-center justify-center gap-2 px-3 py-2 border-t bg-card/95">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium tabular-nums px-2">
            Page {page} / {total}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPage((p) => Math.min(p + 1, total))}
            disabled={page >= total}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {/* Mobile zoom controls */}
          <div className="sm:hidden flex items-center gap-1 ml-3">
            <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))} aria-label="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[10px] tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => setScale((s) => Math.min(s + 0.15, 3))} aria-label="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </footer>
      )}
      {/* keep linter happy about unused */}
      <span className="hidden">{fitScale}</span>
    </div>
  );
}
