import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Download, Loader2, BellOff, Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import {
  detectBursts,
  renderClean,
  encodeWav,
  type Mode,
  type Burst,
} from "@/lib/notif-clean";
import { WaveformCanvas, type WaveMarker } from "@/components/audio/WaveformCanvas";
import { ToolConsentGate } from "@/components/audio/ToolConsentGate";
import { logToolJob } from "@/lib/tool-audit";

export const Route = createFileRoute("/tools/notif-clean")({
  component: () => (
    <ToolConsentGate>
      <NotifClean />
    </ToolConsentGate>
  ),
});

function NotifClean() {
  const [file, setFile] = useState<File | null>(null);
  const [origBuf, setOrigBuf] = useState<AudioBuffer | null>(null);
  const [mode, setMode] = useState<Mode>("balanced");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [scanned, setScanned] = useState(false);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const tick = () => setPlayhead(el.currentTime);
    el.addEventListener("timeupdate", tick);
    return () => el.removeEventListener("timeupdate", tick);
  }, [origUrl]);

  const pickFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(f.name)) {
      return toast.error("Please upload an audio file");
    }
    if (f.size > 60 * 1024 * 1024) return toast.error("Max 60 MB");
    setFile(f);
    setBursts([]);
    setScanned(false);
    setOutUrl(null);
    if (origUrl) URL.revokeObjectURL(origUrl);
    setOrigUrl(URL.createObjectURL(f));
    try {
      const ab = await f.arrayBuffer();
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const buf = await ctx.decodeAudioData(ab.slice(0));
      ctx.close();
      setOrigBuf(buf);
    } catch {
      setOrigBuf(null);
    }
  };

  const scan = async () => {
    if (!origBuf) return toast.error("Choose a file first");
    try {
      setBusy("Scanning for notification sounds…");
      setProgress(40);
      await new Promise((r) => setTimeout(r, 30));
      const det = detectBursts(origBuf, mode);
      setBursts(det.bursts);
      setScanned(true);
      setProgress(100);
      setBusy(null);
      if (det.bursts.length === 0) {
        toast.warning("No notification sounds detected. Try Aggressive mode, or add one manually.");
      } else {
        toast.success(`Detected ${det.bursts.length} sound${det.bursts.length === 1 ? "" : "s"}.`);
      }
    } catch (e) {
      setBusy(null);
      setProgress(0);
      toast.error(e instanceof Error ? e.message : "Scan failed");
    }
  };

  const addBurstAtPlayhead = () => {
    if (!origBuf) return;
    const t = playhead ?? 0;
    const start = Math.max(0, t);
    const end = Math.min(origBuf.duration, start + 4.6); // default iPhone tri-tone length
    setBursts((bs) => [...bs, { start, end, confidence: 1 }].sort((a, b) => a.start - b.start));
    toast.success(`Added burst at ${fmt(start)}`);
  };

  const removeBurst = (i: number) => {
    setBursts((bs) => bs.filter((_, idx) => idx !== i));
  };

  const updateBurst = (i: number, patch: Partial<Burst>) => {
    setBursts((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  };

  const previewBurst = (b: Burst) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, b.start - 0.3);
    el.play();
    setTimeout(() => el.pause(), Math.max(500, (b.end - b.start + 0.6) * 1000));
  };

  const apply = async () => {
    if (!origBuf) return toast.error("Choose a file first");
    if (bursts.length === 0) return toast.error("No bursts to remove. Scan or add some manually.");
    const t0 = performance.now();
    try {
      setBusy(`Removing ${bursts.length} sound${bursts.length === 1 ? "" : "s"}…`);
      setProgress(70);
      await new Promise((r) => setTimeout(r, 30));
      const cleaned = await renderClean(origBuf, bursts, mode);
      setBusy("Encoding WAV…");
      setProgress(95);
      const blob = encodeWav(cleaned);
      if (outUrl) URL.revokeObjectURL(outUrl);
      setOutUrl(URL.createObjectURL(blob));
      setProgress(100);
      setBusy(null);
      void logToolJob({
        tool: "notif-clean",
        file,
        settings: { mode, burstCount: bursts.length },
        durationMs: Math.round(performance.now() - t0),
      });
      toast.success(`Cleaned. Removed ${bursts.length} sound${bursts.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setBusy(null);
      setProgress(0);
      toast.error(e instanceof Error ? e.message : "Failed to process audio");
    }
  };

  const markers: WaveMarker[] = bursts.map((b) => ({
    start: b.start,
    end: b.end,
    color: "rgba(239, 68, 68, 0.35)",
  }));

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-card space-y-5">
      <Link to="/tools" className="text-xs text-primary inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> All tools
      </Link>
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <BellOff className="w-5 h-5 text-primary" /> iPhone Notification Remover
        </h2>
        <p className="text-sm text-muted-foreground">
          Detects iPhone tri-tone bursts and removes them with targeted notch filters.
          You can also add or remove bursts manually before processing.
        </p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-muted/40 transition"
      >
        <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
        <p className="text-sm mt-2 font-medium">
          {file ? file.name : "Drop or click to upload an audio file"}
        </p>
        <p className="text-xs text-muted-foreground">MP3, WAV, M4A, OGG · up to 60 MB</p>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {origBuf && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold">Waveform · click to seek</Label>
            <span className="text-[11px] text-muted-foreground">
              {bursts.length} burst{bursts.length === 1 ? "" : "s"} marked
            </span>
          </div>
          <WaveformCanvas
            buffer={origBuf}
            height={90}
            markers={markers}
            playhead={playhead}
            onSeek={(t) => {
              if (audioRef.current) audioRef.current.currentTime = t;
              setPlayhead(t);
            }}
          />
          {origUrl && <audio ref={audioRef} src={origUrl} controls className="w-full" />}
        </div>
      )}

      <div>
        <Label className="text-sm">Removal mode</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(["gentle", "balanced", "aggressive"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border capitalize transition ${
                mode === m ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={scan} disabled={!origBuf || !!busy} variant="outline">
          {busy?.startsWith("Scanning") ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Auto-detect
        </Button>
        <Button onClick={addBurstAtPlayhead} disabled={!origBuf || !!busy} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Add at playhead
        </Button>
      </div>

      {(scanned || bursts.length > 0) && (
        <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-bold">Bursts ({bursts.length})</p>
          {bursts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              None marked. Use Auto-detect, or seek the audio and click "Add at playhead".
            </p>
          ) : (
            <ul className="text-xs space-y-1 max-h-56 overflow-auto">
              {bursts.map((b, i) => (
                <li key={i} className="flex items-center gap-2 bg-card border rounded-lg px-2 py-1.5">
                  <span className="font-mono w-6 text-muted-foreground">#{i + 1}</span>
                  <input
                    type="number"
                    step="0.1"
                    value={b.start.toFixed(2)}
                    onChange={(e) => updateBurst(i, { start: Math.max(0, Number(e.target.value)) })}
                    className="w-20 rounded border bg-background px-1.5 py-0.5 text-xs"
                  />
                  <span className="text-muted-foreground">→</span>
                  <input
                    type="number"
                    step="0.1"
                    value={b.end.toFixed(2)}
                    onChange={(e) => updateBurst(i, { end: Math.max(b.start + 0.1, Number(e.target.value)) })}
                    className="w-20 rounded border bg-background px-1.5 py-0.5 text-xs"
                  />
                  <span className="text-muted-foreground ml-1">
                    {Math.round(b.confidence * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => previewBurst(b)}
                    className="ml-auto p-1 hover:bg-accent rounded"
                    title="Preview this burst"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBurst(i)}
                    className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button onClick={apply} disabled={!origBuf || bursts.length === 0 || !!busy} className="w-full">
        {busy && !busy.startsWith("Scanning") ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        {busy && !busy.startsWith("Scanning") ? busy : `Remove ${bursts.length} sound${bursts.length === 1 ? "" : "s"}`}
      </Button>

      {busy && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {outUrl && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-primary">Cleaned</p>
          <audio src={outUrl} controls className="w-full" />
          <a
            href={outUrl}
            download={`cleaned-${(file?.name ?? "audio").replace(/\.[^.]+$/, "")}.wav`}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download WAV
          </a>
        </div>
      )}
    </div>
  );
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2);
  return `${m}:${s.padStart(5, "0")}`;
}
