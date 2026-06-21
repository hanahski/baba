import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Mic,
  Sparkles,
  Loader2,
  Download,
  Wand2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tools/voice-clone")({
  component: VoiceClonePage,
});

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Arabic",
  "Hindi",
  "Chinese",
  "Japanese",
  "Korean",
  "Russian",
];

type Mode = "clone" | "design";

function pickAudioUrl(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data.startsWith("http") ? data : null;
  const candidates = [
    data.audio_url,
    data.url,
    data.output,
    data.output_url,
    data.audio,
    data.result?.audio_url,
    data.result?.url,
    data.data?.audio_url,
    data.data?.url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }
  return null;
}

function pickBase64(data: any): string | null {
  if (!data) return null;
  const candidates = [data.audio_base64, data.base64, data.audio, data.data?.audio_base64];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 100 && !c.startsWith("http")) return c;
  }
  return null;
}

function VoiceClonePage() {
  const [mode, setMode] = useState<Mode>("clone");
  const [text, setText] = useState("Hello! This is a test of voice cloning.");
  const [referenceUrl, setReferenceUrl] = useState(
    "https://dsagathr3ed.pages.dev/tts-sample.mp3",
  );
  const [voiceAttrs, setVoiceAttrs] = useState("female, young adult, british accent");
  const [language, setLanguage] = useState("English");
  const [speed, setSpeed] = useState(1);
  const [numStep, setNumStep] = useState(16);
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const run = async () => {
    if (!text.trim()) return toast.error("Enter some text");
    if (mode === "clone" && !referenceUrl.trim())
      return toast.error("Reference audio URL is required");
    if (mode === "design" && !voiceAttrs.trim())
      return toast.error("Voice attributes are required");

    setBusy(true);
    setAudioUrl(null);
    try {
      const body =
        mode === "clone"
          ? {
              text,
              reference_audio_url: referenceUrl,
              language,
              format: "wav",
              speed,
              num_step: numStep,
            }
          : {
              text,
              voice_attributes: voiceAttrs,
              language,
              format: "wav",
              num_step: numStep,
            };

      const res = await fetch(`/api/public/voice-clone?action=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const ct = res.headers.get("content-type") || "";
      if (ct.startsWith("audio/")) {
        const blob = await res.blob();
        setAudioUrl(URL.createObjectURL(blob));
        toast.success("Voice generated ✨");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Generation failed");
      }
      const url = pickAudioUrl(data);
      if (url) {
        setAudioUrl(url);
        toast.success("Voice generated ✨");
        return;
      }
      const b64 = pickBase64(data);
      if (b64) {
        setAudioUrl(`data:audio/wav;base64,${b64}`);
        toast.success("Voice generated ✨");
        return;
      }
      console.log("voice-clone response", data);
      toast.error("No audio in response — check console");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voice-${mode}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-5">
      <Link
        to="/tools"
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>

      <div className="relative overflow-hidden bg-card border rounded-2xl p-5 shadow-card space-y-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
            <Mic className="w-5 h-5 text-white" />
            <Sparkles className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold font-display text-lg">Voice Cloning</h2>
            <p className="text-xs text-muted-foreground">
              Clone any voice from a sample, or design one from attributes.
            </p>
          </div>
        </div>

        <div className="inline-flex w-full rounded-xl border bg-muted/30 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("clone")}
            className={`flex-1 px-3 py-2 rounded-lg transition ${
              mode === "clone"
                ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow"
                : "hover:bg-accent"
            }`}
          >
            Clone from sample
          </button>
          <button
            type="button"
            onClick={() => setMode("design")}
            className={`flex-1 px-3 py-2 rounded-lg transition ${
              mode === "design"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                : "hover:bg-accent"
            }`}
          >
            Design a voice
          </button>
        </div>

        <div>
          <Label className="text-xs font-bold">Text to speak</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={4}
            className="mt-1.5"
            placeholder="What should the voice say?"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{text.length}/2000</p>
        </div>

        {mode === "clone" ? (
          <div>
            <Label className="text-xs font-bold">Reference audio URL</Label>
            <Input
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://.../sample.mp3"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Public MP3/WAV URL — 5–15s of clean speech works best.
            </p>
          </div>
        ) : (
          <div>
            <Label className="text-xs font-bold">Voice attributes</Label>
            <Input
              value={voiceAttrs}
              onChange={(e) => setVoiceAttrs(e.target.value)}
              placeholder="female, young adult, british accent"
              className="mt-1.5"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold">Language</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-bold">
              Quality (num_step) — {numStep}
            </Label>
            <input
              type="range"
              min={8}
              max={32}
              step={1}
              value={numStep}
              onChange={(e) => setNumStep(Number(e.target.value))}
              className="mt-3 w-full"
            />
          </div>
          {mode === "clone" && (
            <div className="col-span-2">
              <Label className="text-xs font-bold">Speed — {speed.toFixed(2)}×</Label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="mt-3 w-full"
              />
            </div>
          )}
        </div>

        <Button
          onClick={run}
          disabled={busy}
          size="lg"
          className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-95 text-white border-0"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              {mode === "clone" ? "Clone voice" : "Design voice"}
            </>
          )}
        </Button>

        {audioUrl && (
          <div className="rounded-xl border bg-gradient-to-br from-pink-500/5 to-rose-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Volume2 className="w-4 h-4 text-pink-600" /> Result
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
              preload="metadata"
            />
            <Button
              onClick={download}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" /> Download WAV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
