// Browser-side vocal / instrumental splitter — chunked, low-memory version.
//
// Strategy (same DSP as before): center-channel cancellation.
//   Mid = (L + R) / 2  — centered content (vocals, kick, bass)
//   Side = (L - R) / 2 — panned content (overheads, guitars, keys, reverb)
//
//   Instrumental ≈ stereo(Side, -Side) wide  +  LPF(Mid, 200 Hz)  +  HPF(Mid, 12 kHz)
//   Vocal       ≈ Mid - bandpass(Side, 200..6000), then HPF 90 + presence + LPF 14k.
//
// Why this file was rewritten:
//   The previous implementation ran four full-song OfflineAudioContext renders
//   AND kept ~8 full-length Float32 buffers alive at once. A 5-minute stereo
//   song blew past 400 MB of RAM and crashed mobile tabs. This version does
//   the same math with hand-rolled RBJ biquads, streams the audio in 10-second
//   chunks, yields to the event loop between chunks (so progress UI updates
//   and the OS doesn't kill the tab), and writes results straight into the
//   final output buffers — no offline contexts, no intermediate copies.

import { encodeWav } from "./notif-clean";

export type SplitResult = {
  vocals: AudioBuffer;
  instrumental: AudioBuffer;
  /** 0..1 — how stereo the source is. <0.05 means likely mono — warn user. */
  stereoness: number;
};

export type SplitMode = "balanced" | "vocal-focus" | "instrumental-focus";

/** Decode a File into an AudioBuffer using the browser's AudioContext. */
export async function decodeFile(file: File): Promise<AudioBuffer> {
  const ab = await file.arrayBuffer();
  const AC: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    return await ctx.decodeAudioData(ab.slice(0));
  } finally {
    ctx.close();
  }
}

/** Measure how different L and R are. 0 = mono, 1 = totally decorrelated. */
function measureStereoness(buf: AudioBuffer): number {
  if (buf.numberOfChannels < 2) return 0;
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  let diff = 0;
  let energy = 0;
  const step = Math.max(1, Math.floor(L.length / 200000));
  for (let i = 0; i < L.length; i += step) {
    const d = L[i] - R[i];
    diff += d * d;
    energy += L[i] * L[i] + R[i] * R[i];
  }
  if (energy < 1e-9) return 0;
  return Math.min(1, diff / energy);
}

// ---------------------------------------------------------------------------
// Tiny RBJ biquad (single-channel, streaming). Same coefficients WebAudio uses.
// ---------------------------------------------------------------------------

type BiquadType = "lowpass" | "highpass" | "peaking";

class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0;
  private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;

  constructor(type: BiquadType, freq: number, sr: number, q: number, gainDb = 0) {
    const w0 = (2 * Math.PI * freq) / sr;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
    if (type === "lowpass") {
      b0 = (1 - cosw0) / 2; b1 = 1 - cosw0; b2 = (1 - cosw0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
    } else if (type === "highpass") {
      b0 = (1 + cosw0) / 2; b1 = -(1 + cosw0); b2 = (1 + cosw0) / 2;
      a0 = 1 + alpha; a1 = -2 * cosw0; a2 = 1 - alpha;
    } else {
      const A = Math.pow(10, gainDb / 40);
      b0 = 1 + alpha * A; b1 = -2 * cosw0; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cosw0; a2 = 1 - alpha / A;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
            - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Split into vocal + instrumental stems — streaming, low-memory.
 */
export async function splitStems(
  source: AudioBuffer,
  mode: SplitMode = "balanced",
  onProgress?: (pct: number, msg: string) => void,
): Promise<SplitResult> {
  onProgress?.(5, "Analyzing stereo field…");
  const sr = source.sampleRate;
  const n = source.length;
  const stereoness = measureStereoness(source);
  await yieldToUI();

  // Direct references — no copies.
  const L = source.getChannelData(0);
  const R = source.numberOfChannels > 1 ? source.getChannelData(1) : L;

  // Output Float32Arrays — these are the ONLY large allocations we make.
  const instL = new Float32Array(n);
  const instR = new Float32Array(n);
  const voc   = new Float32Array(n);

  // Per-stem filter chains (stateful — must persist across chunks).
  // Instrumental: only sub-bass from mid is restored (kick/bass usually centered).
  // We DROP the "air restore" entirely — high-mid mono content == vocal sibilance.
  const lpInstBass = new Biquad("lowpass",  120,   sr, 0.7);
  // Vocal isolation: aggressively bandpass mid to the vocal range, then notch out
  // the parts that are also present in the sides (instruments leaking into mid).
  const hpVocBand  = new Biquad("highpass", 180,   sr, 0.707);
  const lpVocBand  = new Biquad("lowpass",  7000,  sr, 0.707);
  const peakVoc    = new Biquad("peaking",  2500,  sr, 0.9, mode === "vocal-focus" ? 4 : 2.5);
  // Apply the SAME bandpass to the side signal so subtraction lines up phase-wise.
  const hpSideBand = new Biquad("highpass", 180,   sr, 0.707);
  const lpSideBand = new Biquad("lowpass",  7000,  sr, 0.707);

  // How much sub-bass from the mid to mix back into the instrumental.
  // vocal-focus → keep instrumental thin so vocals dominate; instrumental-focus → fuller bass.
  const instBassAmt = mode === "instrumental-focus" ? 1.0
                    : mode === "vocal-focus"        ? 0.5
                    : 0.85;
  // Stereo width of the side signal in the instrumental.
  const sideWideAmt = mode === "vocal-focus" ? 0.8 : 1.15;
  // How aggressively to subtract the side-band from the vocal stem (1 = full notch).
  const vocalNotch  = mode === "vocal-focus" ? 1.15 : mode === "instrumental-focus" ? 0.85 : 1.0;
  const vocGain     = mode === "vocal-focus" ? 1.6 : 1.35;
  const instGain    = mode === "instrumental-focus" ? 1.15 : 1.0;

  const chunk = Math.max(1, sr * 10); // 10-second windows
  let i = 0;
  while (i < n) {
    const end = Math.min(n, i + chunk);
    for (let j = i; j < end; j++) {
      const l = L[j];
      const r = R[j];
      const mid  = (l + r) * 0.5;
      const side = (l - r) * 0.5;

      // ---- Instrumental ----
      // Side signal is everything panned (guitars, keys, overheads, reverb).
      // Add sub-bass from mid so kick/bass don't disappear. No high-mid leak.
      const bass = lpInstBass.process(mid) * instBassAmt;
      const w    = side * sideWideAmt;
      instL[j] = ( w + bass) * instGain;
      instR[j] = (-w + bass) * instGain;

      // ---- Vocal ----
      // 1. Bandpass the mid to the vocal range (kills sub-bass & cymbals).
      // 2. Bandpass the side identically, then subtract — this notches out
      //    panned instruments that bled into the mid through bus compression.
      const midBand  = lpVocBand.process(hpVocBand.process(mid));
      const sideBand = lpSideBand.process(hpSideBand.process(side));
      // Use |side| as an instrument-presence envelope — when side is loud,
      // pull the mid down extra hard (ducking against the instrumental).
      const duck = 1 / (1 + Math.abs(sideBand) * 2.5 * vocalNotch);
      let v = (midBand - sideBand * vocalNotch) * duck;
      v = peakVoc.process(v);
      voc[j] = v * vocGain;
    }
    i = end;
    const pct = 10 + Math.round((i / n) * 80);
    onProgress?.(pct, `Processing… ${Math.round((i / n) * 100)}%`);
    await yieldToUI();
  }

  onProgress?.(92, "Packaging stems…");
  await yieldToUI();

  // Build output AudioBuffers via a tiny OfflineAudioContext just to get
  // the AudioBuffer constructor without touching `new AudioBuffer(...)`.
  const ctx = new OfflineAudioContext(2, n, sr);
  const instBuf = ctx.createBuffer(2, n, sr);
  instBuf.copyToChannel(instL as Float32Array<ArrayBuffer>, 0);
  instBuf.copyToChannel(instR as Float32Array<ArrayBuffer>, 1);
  const vocBuf = ctx.createBuffer(2, n, sr);
  vocBuf.copyToChannel(voc as Float32Array<ArrayBuffer>, 0);
  vocBuf.copyToChannel(voc as Float32Array<ArrayBuffer>, 1);

  onProgress?.(100, "Done");
  return { vocals: vocBuf, instrumental: instBuf, stereoness };
}

export { encodeWav };
