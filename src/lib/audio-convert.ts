// Client-side audio format converter powered by ffmpeg.wasm.
//
// The ffmpeg core (~25MB) is loaded on demand from a CDN the first time the
// user converts something, then cached by the browser. After that, every
// conversion runs entirely offline in a Web Worker — no server, no upload.
//
// We use the single-threaded core so we don't need SharedArrayBuffer / COOP
// headers (which the dev/prod server doesn't set).

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type AudioFormat = "mp3" | "wav" | "aac" | "m4a" | "ogg" | "opus" | "flac";

export const FORMATS: { value: AudioFormat; label: string; mime: string }[] = [
  { value: "mp3", label: "MP3", mime: "audio/mpeg" },
  { value: "wav", label: "WAV", mime: "audio/wav" },
  { value: "aac", label: "AAC", mime: "audio/aac" },
  { value: "m4a", label: "M4A", mime: "audio/mp4" },
  { value: "ogg", label: "OGG (Vorbis)", mime: "audio/ogg" },
  { value: "opus", label: "Opus", mime: "audio/ogg" },
  { value: "flac", label: "FLAC", mime: "audio/flac" },
];

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(
  onProgress?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ff = new FFmpeg();
    if (onProgress) {
      ff.on("log", ({ message }) => {
        if (message) onProgress(message);
      });
    }
    onProgress?.("Downloading audio engine (~25 MB, one-time)…");
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = ff;
    return ff;
  })();

  return loadPromise;
}

/** Map output format → ffmpeg encoder args. Bitrate overrides defaults. */
function encoderArgs(fmt: AudioFormat, bitrateKbps?: number): string[] {
  const br = bitrateKbps ? `${bitrateKbps}k` : null;
  switch (fmt) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", br ?? "192k"];
    case "wav":
      return ["-c:a", "pcm_s16le"];
    case "aac":
    case "m4a":
      return ["-c:a", "aac", "-b:a", br ?? "192k"];
    case "ogg":
      return ["-c:a", "libvorbis", ...(br ? ["-b:a", br] : ["-q:a", "5"])];
    case "opus":
      return ["-c:a", "libopus", "-b:a", br ?? "128k"];
    case "flac":
      return ["-c:a", "flac"];
  }
}

export type ConvertOptions = {
  bitrateKbps?: number;
  sampleRate?: number;
  /** 1 = mono, 2 = stereo */
  channels?: 1 | 2;
};

export async function convertAudio(
  file: File,
  output: AudioFormat,
  onProgress?: (msg: string) => void,
  opts: ConvertOptions = {},
): Promise<Blob> {
  const ff = await getFFmpeg(onProgress);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const inputName = `in.${ext}`;
  const outputName = `out.${output}`;

  onProgress?.("Loading file…");
  await ff.writeFile(inputName, await fetchFile(file));

  const extras: string[] = [];
  if (opts.sampleRate) extras.push("-ar", String(opts.sampleRate));
  if (opts.channels) extras.push("-ac", String(opts.channels));

  onProgress?.(`Converting to ${output.toUpperCase()}…`);
  await ff.exec(["-i", inputName, ...extras, ...encoderArgs(output, opts.bitrateKbps), outputName]);

  const data = await ff.readFile(outputName);
  try { await ff.deleteFile(inputName); } catch { /* ignore */ }
  try { await ff.deleteFile(outputName); } catch { /* ignore */ }

  const mime = FORMATS.find((f) => f.value === output)?.mime ?? "audio/mpeg";
  return new Blob([new Uint8Array(data as Uint8Array)], { type: mime });
}
