// Vocal Removal v2 — StemSplit (YouTube → Stems) via RapidAPI.
// Input is a YouTube URL; output is vocals + instrumental (+ full audio).
// Same UX as v1, emerald / teal / cyan palette.

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Loader2,
  Mic2,
  Music2,
  Play,
  Pause,
  Sparkles,
  Waves,
  Youtube,
  Music4,
} from "lucide-react";
import { toast } from "sonner";
import { logToolJob } from "@/lib/tool-audit";

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

type StemName = "vocals" | "instrumental" | "fullAudio";

const STEM_META: Record<StemName, { label: string; Icon: typeof Mic2; accent: string }> = {
  vocals:       { label: "Vocals",       Icon: Mic2,   accent: "from-emerald-500/80 to-teal-500/80" },
  instrumental: { label: "Instrumental", Icon: Music2, accent: "from-cyan-500/80 to-sky-500/80" },
  fullAudio:    { label: "Full audio",   Icon: Music4, accent: "from-slate-500/80 to-zinc-500/80" },
};

const STAGES = [
  "Sending YouTube URL…",
  "Extracting audio…",
  "AI isolating vocals…",
  "Building instrumental…",
  "Encoding stems…",
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
    const id = window.setInterval(() => {
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
  accent: string;
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
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
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

  const progress = dur ? (cur / dur) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.07]`} />
      <div className="relative p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold flex items-center gap-2 capitalize">
            <span className={`inline-flex w-7 h-7 rounded-lg bg-gradient-to-br ${accent} items-center justify-center text-white shadow`}>
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
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              MP3
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={!src}
            className={`shrink-0 w-11 h-11 rounded-full bg-gradient-to-br ${accent} text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-40`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${accent} transition-[width] duration-150`}
                style={{ width: `${progress}%` }}
              />
              <input
                type="range" min={0} max={100} value={progress} onChange={seek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Seek"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground tabular-nums">
              <span>{fmt(cur)}</span><span>{fmt(dur)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm bg-gradient-to-t ${accent}`}
              style={{
                height: `${20 + Math.abs(Math.sin(i * 0.7 + (playing ? Date.now() / 300 : 0))) * 80}%`,
                opacity: playing ? 0.85 : 0.35,
                transition: "height 240ms ease, opacity 240ms ease",
              }}
            />
          ))}
        </div>

        {src && <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" className="hidden" />}
      </div>
    </div>
  );
}

type JobOutput = { url?: string; expiresAt?: string };
type JobResponse = {
  id?: string;
  status?: string; // QUEUED | PROCESSING | COMPLETED | FAILED
  progress?: number;
  videoTitle?: string;
  videoDuration?: number;
  errorMessage?: string;
  audioMetadata?: { bpm?: number; key?: string };
  outputs?: Partial<Record<StemName, JobOutput>>;
};

export default function VocalSplitV2() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [downloadBusy, setDownloadBusy] = useState<StemName | null>(null);
  const pollRef = useRef<number | null>(null);
  const { pct, stage } = useFakeProgress(!!busy);

  useEffect(() => () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
  }, []);

  const pollStatus = async (id: string, t0: number) => {
    try {
      const res = await fetch(apiPath(`/api/public/vocal-split-v2?id=${encodeURIComponent(id)}`));
      const j = (await res.json()) as JobResponse & { error?: string };
      if (!res.ok) throw new Error(j.error || "Status failed");
      setJob(j);
      const s = String(j.status || "").toUpperCase();
      if (s === "COMPLETED" || s === "DONE" || s === "SUCCESS") {
        setBusy(null);
        void logToolJob({
          tool: "vocal-split-v2",
          settings: { provider: "stemsplit-rapidapi", youtubeUrl },
          durationMs: Math.round(performance.now() - t0),
        });
        toast.success("Stems ready ✨");
        return;
      }
      if (s === "FAILED" || s === "ERROR") {
        setBusy(null);
        toast.error(j.errorMessage || "Separation failed");
        return;
      }
      pollRef.current = window.setTimeout(() => pollStatus(id, t0), 3000);
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : "Polling failed");
    }
  };

  const run = async () => {
    const u = youtubeUrl.trim();
    if (!u) return toast.error("Paste a YouTube URL first");
    if (!/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(u)) {
      return toast.error("That doesn't look like a YouTube URL");
    }
    const t0 = performance.now();
    try {
      setBusy("Starting…");
      setJob(null);
      setJobId(null);
      const res = await fetch(apiPath("/api/public/vocal-split-v2"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: u }),
      });
      const j = (await res.json()) as JobResponse & { error?: string };
      if (!res.ok) throw new Error(j.error || "Job creation failed");
      const id = j.id;
      if (!id) throw new Error("Server did not return a job id");
      setJobId(id);
      setJob(j);
      pollStatus(id, t0);
    } catch (e) {
      setBusy(null);
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to start");
    }
  };

  const baseName = useMemo(() => {
    const t = job?.videoTitle?.trim();
    return (t || "track").replace(/[^a-zA-Z0-9 _()-]+/g, "").slice(0, 60) || "track";
  }, [job?.videoTitle]);

  const downloadStem = async (stem: StemName) => {
    const out = job?.outputs?.[stem];
    if (!out?.url) return;
    const name = `${baseName} (${stem}).mp3`;
    try {
      setDownloadBusy(stem);
      const proxy = apiPath(
        `/api/public/vocal-split-v2?url=${encodeURIComponent(out.url)}&n=${encodeURIComponent(name)}`,
      );
      const a = document.createElement("a");
      a.href = proxy;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Downloading ${stem}…`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setTimeout(() => setDownloadBusy(null), 600);
    }
  };

  const availableStems = useMemo<StemName[]>(() => {
    const o = job?.outputs;
    if (!o) return [];
    const order: StemName[] = ["vocals", "instrumental", "fullAudio"];
    return order.filter((s) => o[s]?.url);
  }, [job]);

  const bpm = job?.audioMetadata?.bpm;
  const musicalKey = job?.audioMetadata?.key;

  return (
    <div className="relative space-y-5">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-cyan-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1.2s" }} />
        <div className="absolute bottom-0 left-1/4 w-[360px] h-[360px] rounded-full bg-teal-500/15 blur-3xl animate-pulse" style={{ animationDelay: "2.4s" }} />
      </div>

      <div className="relative overflow-hidden bg-card/80 backdrop-blur border rounded-2xl p-5 shadow-card space-y-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <Waves className="w-5 h-5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold font-display text-lg">Vocal Remover · v2</h2>
            <p className="text-xs text-muted-foreground">
              Paste a YouTube link — StemSplit AI extracts vocals & instrumental.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-dashed p-3 text-[11px] text-muted-foreground leading-relaxed">
          Max 60 minutes per video. Also detects BPM & musical key. Output is MP3.
        </div>

        <div>
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5 text-red-600" />
            YouTube URL
          </Label>
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            disabled={!!busy}
            className="mt-1.5"
          />
        </div>

        <Button
          onClick={run}
          disabled={!youtubeUrl.trim() || !!busy}
          className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-95 text-white border-0"
          size="lg"
        >
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Splitting…</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Extract stems</>}
        </Button>

        {busy && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Waves className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                {stage}
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">{Math.round(pct)}%</span>
            </div>
            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              StemSplit takes 1–3 minutes depending on track length.
            </p>
          </div>
        )}

        {job?.videoTitle && (
          <div className="rounded-xl border bg-card/60 p-3 text-xs space-y-1">
            <div className="font-semibold truncate">🎬 {job.videoTitle}</div>
            {(bpm || musicalKey) && (
              <div className="flex gap-3 text-muted-foreground">
                {bpm ? <span>BPM: <span className="font-mono text-foreground">{Math.round(bpm)}</span></span> : null}
                {musicalKey ? <span>Key: <span className="font-mono text-foreground">{musicalKey}</span></span> : null}
              </div>
            )}
          </div>
        )}
      </div>

      {availableStems.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 animate-fade-in">
          {availableStems.map((s) => {
            const meta = STEM_META[s];
            const url = job?.outputs?.[s]?.url ?? null;
            return (
              <StemPlayer
                key={s}
                src={url}
                label={meta.label}
                accent={meta.accent}
                Icon={meta.Icon}
                onDownload={() => downloadStem(s)}
                downloading={downloadBusy === s}
              />
            );
          })}
        </div>
      )}

      {jobId && !busy && availableStems.length === 0 && (
        <p className="text-xs text-center text-muted-foreground">Job {jobId} — no stems returned.</p>
      )}
    </div>
  );
}
