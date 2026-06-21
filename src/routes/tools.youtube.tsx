import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Loader2, Youtube, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tools/youtube")({ component: YouTubeDownloader });

type Mode = "auto" | "audio" | "mute";
type Quality = "360" | "480" | "720" | "1080" | "1440" | "2160" | "max";
type AudioFormat = "mp3" | "opus" | "wav" | "best";

type PreviewResult = {
  proxyUrl: string;
  directUrl: string;
  filename: string;
  size: string | null;
  title: string | null;
  thumbnail: string | null;
  quality: string | null;
  mode: Mode;
};

function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [quality, setQuality] = useState<Quality>("720");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);

  const isYt = /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);

  const ytId = (() => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      return u.searchParams.get("v") || u.pathname.split("/").pop() || "";
    } catch {
      return "";
    }
  })();

  const fetchPreview = async () => {
    if (!url.trim()) return toast.error("Paste a YouTube URL first");
    if (!isYt) return toast.error("Only YouTube links are supported");
    setBusy(true);
    setResult(null);
    setStatus("Reading video info…");
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode, videoQuality: quality, audioFormat }),
      });
      const data = (await res.json()) as {
        url?: string;
        filename?: string;
        size?: string | null;
        title?: string | null;
        thumbnail?: string | null;
        quality?: string | null;
        error?: string;
      };
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to fetch");
      const filename = data.filename || "video";
      setResult({
        proxyUrl: `/api/youtube?u=${encodeURIComponent(data.url)}&n=${encodeURIComponent(filename)}`,
        directUrl: data.url,
        filename,
        size: data.size ?? null,
        title: data.title ?? null,
        thumbnail: data.thumbnail ?? null,
        quality: data.quality ?? null,
        mode,
      });
      setStatus("");
      toast.success("Preview ready — tap Download to save");
    } catch (e) {
      setStatus("");
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setBusy(false);
    }
  };

  const downloadFile = async () => {
    if (!result) return;
    setDownloading(true);
    setProgress(0);
    setStatus("Starting download…");
    try {
      const res = await fetch(result.proxyUrl);
      if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
      const total = Number(res.headers.get("content-length") || 0);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) setProgress(Math.round((received / total) * 100));
          setStatus(
            total
              ? `Downloading… ${(received / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB`
              : `Downloading… ${(received / 1048576).toFixed(1)} MB`,
          );
        }
      }
      const blob = new Blob(chunks as BlobPart[]);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30_000);
      setStatus(`Saved to your downloads · ${(blob.size / 1048576).toFixed(1)} MB`);
      toast.success("Saved to your device");
    } catch (e) {
      setStatus("");
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>

      <div className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
            <Youtube className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold font-display">YouTube Downloader</h2>
            <p className="text-xs text-muted-foreground">Preview the video, then save it.</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-dashed p-3 text-[11px] text-muted-foreground leading-relaxed">
          Only download videos you have the rights to. Respect creators and copyright laws.
        </div>

        <div>
          <Label className="text-xs font-bold">YouTube URL</Label>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setResult(null);
            }}
            placeholder="https://youtube.com/watch?v=..."
            className="mt-1.5"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        {/* Live YouTube preview to confirm correct video */}
        {isYt && ytId && (
          <div className="rounded-xl overflow-hidden border bg-black aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              title="YouTube preview"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div>
          <Label className="text-xs font-bold">Mode</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {([
              { v: "auto", label: "Video + Audio" },
              { v: "audio", label: "Audio only" },
              { v: "mute", label: "Video (mute)" },
            ] as { v: Mode; label: string }[]).map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => {
                  setMode(m.v);
                  setResult(null);
                }}
                className={`text-xs font-semibold rounded-lg px-2 py-2 border transition ${
                  mode === m.v ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode !== "audio" && (
          <div>
            <Label className="text-xs font-bold">Video quality</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {(["360", "480", "720", "1080", "1440", "2160", "max"] as Quality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuality(q);
                    setResult(null);
                  }}
                  className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition ${
                    quality === q ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
                  }`}
                >
                  {q === "max" ? "Max" : `${q}p`}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === "audio" && (
          <div>
            <Label className="text-xs font-bold">Audio format</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {(["mp3", "opus", "wav", "best"] as AudioFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setAudioFormat(f);
                    setResult(null);
                  }}
                  className={`text-xs font-semibold rounded-lg px-3 py-1.5 border transition ${
                    audioFormat === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button onClick={fetchPreview} disabled={busy || downloading || !url.trim()} className="w-full" size="lg">
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {status || "Working…"}
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" /> Find file
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
          <h3 className="font-bold text-sm">Ready to save</h3>

          {result.thumbnail && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              <img src={result.thumbnail} alt={result.title ?? "video"} className="w-full aspect-video object-cover" />
            </div>
          )}

          <div className="space-y-1">
            {result.title && <p className="font-semibold text-sm line-clamp-2">{result.title}</p>}
            <p className="text-[11px] text-muted-foreground break-all">{result.filename}</p>
            <p className="text-[11px] text-muted-foreground">
              {result.mode === "audio" ? "Audio" : result.quality || `${quality}p`}
              {result.size ? ` · ${result.size}` : ""}
            </p>
          </div>

          {downloading && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">{status}</p>
            </div>
          )}

          {!downloading && status && (
            <p className="text-[11px] text-muted-foreground text-center">{status}</p>
          )}

          <Button onClick={downloadFile} disabled={downloading} className="w-full" size="lg">
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Downloading…
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Download to my device
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
