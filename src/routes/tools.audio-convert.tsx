import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Download, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { convertAudio, FORMATS, type AudioFormat } from "@/lib/audio-convert";
import { ToolConsentGate } from "@/components/audio/ToolConsentGate";
import { logToolJob } from "@/lib/tool-audit";

export const Route = createFileRoute("/tools/audio-convert")({
  component: () => (
    <ToolConsentGate>
      <AudioConvert />
    </ToolConsentGate>
  ),
});

const MAX_BYTES = 50 * 1024 * 1024;

// Codec-specific bitrate options. WAV/FLAC are lossless and ignore bitrate.
const BITRATES: Record<AudioFormat, number[]> = {
  mp3: [96, 128, 192, 256, 320],
  aac: [96, 128, 192, 256],
  m4a: [96, 128, 192, 256],
  ogg: [96, 128, 192, 256],
  opus: [64, 96, 128, 192],
  wav: [],
  flac: [],
};

const SAMPLE_RATES = [22050, 32000, 44100, 48000];

function detectInputFormat(name: string): AudioFormat | "auto" {
  const ext = name.split(".").pop()?.toLowerCase();
  const hit = FORMATS.find((f) => f.value === ext);
  return hit ? hit.value : "auto";
}

function AudioConvert() {
  const [file, setFile] = useState<File | null>(null);
  const [inputFmt, setInputFmt] = useState<AudioFormat | "auto">("auto");
  const [output, setOutput] = useState<AudioFormat>("mp3");
  const [bitrate, setBitrate] = useState<number>(192);
  const [sampleRate, setSampleRate] = useState<number | "keep">("keep");
  const [channels, setChannels] = useState<"keep" | "1" | "2">("keep");
  const [busy, setBusy] = useState<string | null>(null);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outSize, setOutSize] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|aac|flac|opus)$/i.test(f.name)) {
      return toast.error("Please upload an audio file");
    }
    if (f.size > MAX_BYTES) return toast.error("Max 50 MB");
    setFile(f);
    setInputFmt(detectInputFormat(f.name));
    if (outUrl) URL.revokeObjectURL(outUrl);
    setOutUrl(null);
  };

  const run = async () => {
    if (!file) return toast.error("Choose a file first");
    const t0 = performance.now();
    try {
      const blob = await convertAudio(
        file,
        output,
        (msg) => setBusy(msg),
        {
          bitrateKbps: BITRATES[output].length ? bitrate : undefined,
          sampleRate: sampleRate === "keep" ? undefined : sampleRate,
          channels: channels === "keep" ? undefined : Number(channels) as 1 | 2,
        },
      );
      if (outUrl) URL.revokeObjectURL(outUrl);
      const url = URL.createObjectURL(blob);
      setOutUrl(url);
      setOutSize(blob.size);
      setBusy(null);
      void logToolJob({
        tool: "audio-convert",
        file,
        settings: { output, bitrate, sampleRate, channels },
        durationMs: Math.round(performance.now() - t0),
      });
      toast.success(`Converted to ${output.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      setBusy(null);
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "audio";
  const showBitrate = BITRATES[output].length > 0;

  return (
    <div className="space-y-5">
      <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>

      <div className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold font-display">Audio Converter</h2>
            <p className="text-xs text-muted-foreground">
              Convert between MP3, WAV, AAC, M4A, OGG, Opus and FLAC. Quality controls included.
            </p>
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold">Audio file (max 50 MB)</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1.5 w-full border-2 border-dashed rounded-xl p-5 hover:border-primary hover:bg-primary/5 transition flex flex-col items-center gap-2"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {file ? file.name : "Tap to choose an audio file"}
            </span>
            {file && (
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.opus"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-bold">Input format</Label>
            <select
              value={inputFmt}
              onChange={(e) => setInputFmt(e.target.value as AudioFormat | "auto")}
              className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="auto">Auto-detect</option>
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-bold">Output format</Label>
            <select
              value={output}
              onChange={(e) => {
                const v = e.target.value as AudioFormat;
                setOutput(v);
                if (BITRATES[v].length && !BITRATES[v].includes(bitrate)) {
                  setBitrate(BITRATES[v][Math.floor(BITRATES[v].length / 2)]);
                }
              }}
              className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {showBitrate ? (
            <div>
              <Label className="text-xs font-bold">Bitrate</Label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                {BITRATES[output].map((b) => (
                  <option key={b} value={b}>{b} kbps</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <Label className="text-xs font-bold">Bitrate</Label>
              <div className="mt-1.5 px-3 py-2 text-xs text-muted-foreground border rounded-lg bg-muted/30">
                Lossless
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs font-bold">Sample rate</Label>
            <select
              value={String(sampleRate)}
              onChange={(e) =>
                setSampleRate(e.target.value === "keep" ? "keep" : Number(e.target.value))
              }
              className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="keep">Keep</option>
              {SAMPLE_RATES.map((s) => (
                <option key={s} value={s}>{s.toLocaleString()} Hz</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-bold">Channels</Label>
            <select
              value={channels}
              onChange={(e) => setChannels(e.target.value as "keep" | "1" | "2")}
              className="mt-1.5 w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="keep">Keep</option>
              <option value="1">Mono</option>
              <option value="2">Stereo</option>
            </select>
          </div>
        </div>

        <Button onClick={run} disabled={!file || !!busy} className="w-full" size="lg">
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {busy}
            </>
          ) : (
            `Convert to ${output.toUpperCase()}`
          )}
        </Button>

        {busy && (
          <p className="text-[11px] text-muted-foreground text-center">
            First conversion downloads the audio engine (~25&nbsp;MB) once, then it's cached.
          </p>
        )}
      </div>

      {outUrl && (
        <div className="bg-card border rounded-2xl p-4 shadow-card space-y-3">
          <h3 className="font-bold">Converted file</h3>
          <audio controls src={outUrl} className="w-full" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{(outSize / 1024 / 1024).toFixed(2)} MB</span>
            <a
              href={outUrl}
              download={`${baseName}.${output}`}
              className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
            >
              <Download className="w-3.5 h-3.5" /> Download .{output}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
