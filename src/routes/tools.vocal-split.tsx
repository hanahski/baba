import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Upload,
  Download,
  Loader2,
  Mic2,
  Music2,
  Play,
  Pause,
  Sparkles,
  Waves,
  FileAudio,
} from "lucide-react";
import { toast } from "sonner";
import { ToolConsentGate } from "@/components/audio/ToolConsentGate";
import { logToolJob } from "@/lib/tool-audit";
import { separateVocals } from "@/lib/vocal-split.functions";
import VocalSplitV2 from "@/components/audio/VocalSplitV2";

export const Route = createFileRoute("/tools/vocal-split")({
  component: () => (
    <ToolConsentGate>
      <VocalSplitShell />
    </ToolConsentGate>
  ),
});

function VocalSplitShell() {
  const [variant, setVariant] = useState<"v1" | "v2">("v1");
  return (
    <div className="space-y-4">
      <Link
        to="/tools"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>
      <div className="inline-flex w-full rounded-xl border bg-card p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setVariant("v1")}
          className={`flex-1 px-3 py-2 rounded-lg transition ${
            variant === "v1"
              ? "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow"
              : "hover:bg-accent"
          }`}
        >
          Vocal Remover · v1
        </button>
        <button
          type="button"
          onClick={() => setVariant("v2")}
          className={`flex-1 px-3 py-2 rounded-lg transition ${
            variant === "v2"
              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow"
              : "hover:bg-accent"
          }`}
        >
          Vocal Remover · v2
        </button>
      </div>
      {variant === "v1" ? <VocalSplit /> : <VocalSplitV2 />}
    </div>
  );
}

type Stems = {
  vocalsUrl: string;
  instrumentsUrl: string;
  cached?: boolean;
  duration?: number;
  remainingMinutes?: number;
};

type View = "vocals" | "instrumental" | "original";

const PREVIEW_TOKEN_KEY = "studentsplug-preview-token";

function apiPath(path: string) {
  if (typeof window === "undefined") return path;
  const params = new URLSearchParams(window.location.search);
  const currentToken = params.get("__lovable_token");
  if (currentToken) sessionStorage.setItem(PREVIEW_TOKEN_KEY, currentToken);
  const token = currentToken || sessionStorage.getItem(PREVIEW_TOKEN_KEY);
  if (!token) return path;
  return `${path}${path.includes("?") ? "&" : "?"}__lovable_token=${encodeURIComponent(token)}`;
}

const STAGES = [
  "Uploading audio…",
  "Analysing waveform…",
  "Isolating vocals (AI)…",
  "Rendering instrumental…",
  "Mastering stems…",
];

function useFakeProgress(active: boolean) {
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState(STAGES[0]);
  useEffect(() => {
    if (!active) {
      setPct(0);
      setStage(STAGES[0]);
      return;
    }
    let p = 4;
    setPct(p);
    setStage(STAGES[0]);
    const id = window.setInterval(() => {
      // ease toward 92%
      p = p + Math.max(0.4, (92 - p) * 0.04);
      if (p > 92) p = 92;
      setPct(p);
      const idx = Math.min(STAGES.length - 1, Math.floor((p / 92) * STAGES.length));
      setStage(STAGES[idx]);
    }, 350);
    return () => window.clearInterval(id);
  }, [active]);
  return { pct, stage };
}

function StemPlayer({
  src,
  label,
  accent,
  Icon,
  onDownload,
  downloading,
}: {
  src: string | null;
  label: string;
  accent: "vocals" | "instr" | "orig";
  Icon: typeof Mic2;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setPlaying(false);
    setCur(0);
    const onTime = () => setCur(a.currentTime);
    const onDur = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const v = Number(e.target.value);
    a.currentTime = (v / 100) * (dur || 0);
    setCur(a.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const accentClass =
    accent === "vocals"
      ? "from-fuchsia-500/80 to-violet-500/80"
      : accent === "instr"
        ? "from-sky-500/80 to-emerald-500/80"
        : "from-amber-500/80 to-orange-500/80";

  const progress = dur ? (cur / dur) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-card">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass} opacity-[0.07]`}
      />
      <div className="relative p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold flex items-center gap-2 capitalize">
            <span
              className={`inline-flex w-7 h-7 rounded-lg bg-gradient-to-br ${accentClass} items-center justify-center text-white shadow`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            {label}
          </h3>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              WAV
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={!src}
            className={`shrink-0 w-11 h-11 rounded-full bg-gradient-to-br ${accentClass} text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-40`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${accentClass} transition-[width] duration-150`}
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={seek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground tabular-nums">
              <span>{fmt(cur)}</span>
              <span>{fmt(dur)}</span>
            </div>
          </div>
        </div>

        {/* visual bars */}
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm bg-gradient-to-t ${accentClass}`}
              style={{
                height: `${
                  20 +
                  Math.abs(Math.sin(i * 0.7 + (playing ? Date.now() / 300 : 0))) * 80
                }%`,
                opacity: playing ? 0.85 : 0.35,
                transition: "height 240ms ease, opacity 240ms ease",
              }}
            />
          ))}
        </div>

        {src && <audio ref={audioRef} src={src} preload="metadata" className="hidden" />}
      </div>
    </div>
  );
}

function VocalSplit() {
  const separateVocalsFn = useServerFn(separateVocals);
  const [file, setFile] = useState<File | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stems, setStems] = useState<Stems | null>(null);
  const [view, setView] = useState<View>("vocals");
  const [downloadBusy, setDownloadBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { pct, stage } = useFakeProgress(!!busy);

  useEffect(() => {
    return () => {
      if (origUrl) URL.revokeObjectURL(origUrl);
    };
  }, [origUrl]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(f.name)) {
      return toast.error("Please upload an audio file");
    }
    if (f.size > 50 * 1024 * 1024) return toast.error("Max 50 MB");
    setFile(f);
    setStems(null);
    if (origUrl) URL.revokeObjectURL(origUrl);
    setOrigUrl(URL.createObjectURL(f));
  };

  const run = async () => {
    if (!file) return toast.error("Choose a file first");
    const t0 = performance.now();
    try {
      setBusy("Starting…");
      const form = new FormData();
      form.append("file", file);
      const data = await separateVocalsFn({ data: form });
      setStems({
        vocalsUrl: data.vocalsUrl,
        instrumentsUrl: data.instrumentsUrl,
        cached: !!data.cached,
        duration: data.fileInfo?.duration,
        remainingMinutes: data.usage?.remaining,
      });
      setView("vocals");
      void logToolJob({
        tool: "vocal-split",
        file,
        settings: { provider: "voice-separation-api", cached: !!data.cached },
        durationMs: Math.round(performance.now() - t0),
      });
      toast.success(data.cached ? "Stems ready (cached)" : "Stems ready ✨");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to split");
    } finally {
      setBusy(null);
    }
  };

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "track";

  const downloadStem = async (which: "vocals" | "instrumental") => {
    if (!stems) return;
    const url = which === "vocals" ? stems.vocalsUrl : stems.instrumentsUrl;
    const name = `${baseName} (${which}).wav`;
    try {
      setDownloadBusy(which);
      const proxy = apiPath(`/api/public/vocal-split?u=${encodeURIComponent(url)}&n=${encodeURIComponent(name)}`);
      const a = document.createElement("a");
      a.href = proxy;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Downloading ${which}…`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setTimeout(() => setDownloadBusy(null), 600);
    }
  };

  const currentSrc = useMemo(
    () =>
      view === "original"
        ? origUrl
        : view === "vocals"
          ? stems?.vocalsUrl ?? null
          : stems?.instrumentsUrl ?? null,
    [view, origUrl, stems],
  );

  return (
    <div className="relative space-y-5">
      {/* animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-sky-500/20 blur-3xl animate-pulse"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[360px] h-[360px] rounded-full bg-emerald-500/15 blur-3xl animate-pulse"
          style={{ animationDelay: "2.4s" }}
        />
      </div>


      <div className="relative overflow-hidden bg-card/80 backdrop-blur border rounded-2xl p-5 shadow-card space-y-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Mic2 className="w-5 h-5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold font-display text-lg">Vocal Remover</h2>
            <p className="text-xs text-muted-foreground">
              AI splits any song into clean vocals + instrumental.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-dashed p-3 text-[11px] text-muted-foreground leading-relaxed">
          Max 50 MB · up to 5 min · 20 min/month free. Supports MP3, WAV, FLAC, AAC, OGG, M4A, WEBM.
        </div>

        <div>
          <Label className="text-xs font-bold">Audio file</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group mt-1.5 w-full border-2 border-dashed rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition flex flex-col items-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center group-hover:scale-110 transition">
              {file ? (
                <FileAudio className="w-5 h-5 text-primary" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              )}
            </div>
            <span className="text-sm font-medium text-center break-all px-2">
              {file ? file.name : "Tap to choose an audio file"}
            </span>
            {file && (
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.webm"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {origUrl && !stems && !busy && (
          <StemPlayer src={origUrl} label="original" accent="orig" Icon={Music2} />
        )}

        <Button
          onClick={run}
          disabled={!file || !!busy}
          className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:opacity-95 text-white border-0"
          size="lg"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working magic…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Split stems
            </>
          )}
        </Button>

        {busy && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Waves className="w-3.5 h-3.5 text-primary animate-pulse" />
                {stage}
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute inset-y-0 w-1/3 bg-white/20 blur-sm animate-[shimmer_1.6s_linear_infinite]"
                style={{ left: `${Math.max(0, pct - 20)}%` }}
              />
            </div>
            <div className="flex items-end gap-0.5 h-6 pt-1">
              {Array.from({ length: 32 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-fuchsia-500/70 to-violet-500/70"
                  style={{
                    height: `${30 + Math.abs(Math.sin(i * 0.6 + pct / 5)) * 70}%`,
                    transition: "height 300ms ease",
                  }}
                />
              ))}
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              Hang tight — separation usually takes 20-60 seconds.
            </p>
          </div>
        )}
      </div>

      {stems && (
        <div className="relative overflow-hidden bg-card/80 backdrop-blur border rounded-2xl p-4 shadow-card space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Preview
            </h3>
            <div className="inline-flex rounded-lg border overflow-hidden text-xs font-semibold">
              {(["vocals", "instrumental", "original"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 capitalize transition ${
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <StemPlayer
            key={view}
            src={currentSrc}
            label={view}
            accent={view === "vocals" ? "vocals" : view === "instrumental" ? "instr" : "orig"}
            Icon={view === "instrumental" ? Music2 : view === "vocals" ? Mic2 : Music2}
          />

          {stems.remainingMinutes != null && (
            <p className="text-[11px] text-muted-foreground text-center">
              {stems.cached ? "Cached result · " : ""}
              {stems.duration ? `${stems.duration.toFixed(1)}s processed · ` : ""}
              {stems.remainingMinutes.toFixed(1)} min remaining this month
            </p>
          )}
        </div>
      )}

      {stems && (
        <div className="grid sm:grid-cols-2 gap-4 animate-fade-in">
          <StemPlayer
            src={stems.vocalsUrl}
            label="vocals"
            accent="vocals"
            Icon={Mic2}
            onDownload={() => downloadStem("vocals")}
            downloading={downloadBusy === "vocals"}
          />
          <StemPlayer
            src={stems.instrumentsUrl}
            label="instrumental"
            accent="instr"
            Icon={Music2}
            onDownload={() => downloadStem("instrumental")}
            downloading={downloadBusy === "instrumental"}
          />
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
