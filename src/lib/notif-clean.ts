// iPhone notification sound remover.
//
// Strategy (all client-side, no server):
//  1. Decode the uploaded file with the browser's AudioContext.
//  2. Slide a short window (~93ms) across the mono mix-down and compute a
//     real FFT for each frame. Score every frame on how "iPhone-tri-tone-ish"
//     it is: narrow peaks concentrated in 2–6 kHz with the characteristic
//     ~1480 / 2114 / 2960 / 4180 Hz partials, AND a sharp onset.
//  3. Group consecutive high-score frames into bursts (clamped to 0.3–8s).
//  4. Re-render the audio with OfflineAudioContext. Two parallel chains
//     (dry + a stack of notch BiquadFilters) are mixed by a gain automation
//     that crossfades to the notched chain ONLY during detected bursts.
//     -> music/voice outside the burst is untouched.
//  5. Encode result as a 16-bit PCM WAV blob.

export type Mode = "gentle" | "balanced" | "aggressive";

export type Burst = {
  start: number;
  end: number;
  confidence: number; // 0..1
};

export type DetectResult = {
  bursts: Burst[];
  meanScore: number;
  threshold: number;
};

// Tri-tone partials we target. Apple's tri-tone bell has strong energy
// around these frequencies; aggressive mode adds a couple more.
const PARTIALS = [1480, 2114, 2960, 4180];
const PARTIALS_AGGRESSIVE = [1100, 1480, 2114, 2960, 4180, 5280];

// ---------- WAV encoder ----------
export function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

// ---------- Minimal radix-2 FFT (in-place) ----------
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tRe = curRe * re[b] - curIm * im[b];
        const tIm = curRe * im[b] + curIm * re[b];
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nRe;
      }
    }
  }
}

// ---------- Detection ----------
export function detectBursts(
  buffer: AudioBuffer,
  mode: Mode,
): DetectResult {
  const sr = buffer.sampleRate;
  // mono mix-down
  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) mono[i] += ch[i];
  }
  if (buffer.numberOfChannels > 1) {
    const inv = 1 / buffer.numberOfChannels;
    for (let i = 0; i < mono.length; i++) mono[i] *= inv;
  }

  const N = 4096;
  const hop = Math.floor(sr * 0.05); // ~50ms hop
  const partials = mode === "aggressive" ? PARTIALS_AGGRESSIVE : PARTIALS;
  // bin width = sr / N
  const binIdx = (f: number) => Math.round((f * N) / sr);
  // Energy band 2–6 kHz
  const b2k = binIdx(2000);
  const b6k = binIdx(6000);
  // "Outside" reference band 200–1500 Hz
  const bLo1 = binIdx(200);
  const bLo2 = binIdx(1500);

  // hann window
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  const re = new Float32Array(N);
  const im = new Float32Array(N);
  const mag = new Float32Array(N / 2);

  const scores: number[] = [];
  const times: number[] = [];

  for (let pos = 0; pos + N <= mono.length; pos += hop) {
    for (let i = 0; i < N; i++) {
      re[i] = mono[pos + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]);

    let eHigh = 0;
    for (let i = b2k; i <= b6k; i++) eHigh += mag[i] * mag[i];
    let eLow = 1e-9;
    for (let i = bLo1; i <= bLo2; i++) eLow += mag[i] * mag[i];
    const ratio = eHigh / eLow;

    // Partial concentration: ratio of energy at partial bins to band energy.
    let ePart = 0;
    for (const f of partials) {
      const b = binIdx(f);
      for (let i = b - 2; i <= b + 2; i++) ePart += mag[i] * mag[i];
    }
    const concentration = ePart / (eHigh + 1e-9);

    // Combined score
    const s = Math.log10(1 + ratio) * concentration;
    scores.push(s);
    times.push(pos / sr);
  }

  // Threshold relative to median (robust against music with bright cymbals).
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const meanScore = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);

  const factor = mode === "aggressive" ? 2.2 : mode === "gentle" ? 4.5 : 3.2;
  const threshold = Math.max(median * factor, p95 * 0.6, 0.05);

  // Group contiguous frames above threshold (allow tiny gaps).
  const bursts: Burst[] = [];
  let curStart: number | null = null;
  let curMax = 0;
  let gap = 0;
  const maxGapFrames = 4;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) {
      if (curStart === null) curStart = times[i];
      curMax = Math.max(curMax, scores[i]);
      gap = 0;
    } else if (curStart !== null) {
      gap++;
      if (gap > maxGapFrames) {
        const end = times[i - gap];
        pushBurst(bursts, curStart, end, curMax, threshold);
        curStart = null;
        curMax = 0;
        gap = 0;
      }
    }
  }
  if (curStart !== null) {
    pushBurst(bursts, curStart, times[times.length - 1] + hop / sr, curMax, threshold);
  }

  return { bursts, meanScore, threshold };
}

function pushBurst(
  out: Burst[],
  start: number,
  end: number,
  peak: number,
  threshold: number,
) {
  const dur = end - start;
  if (dur < 0.25 || dur > 8) return;
  const conf = Math.min(1, peak / (threshold * 2));
  if (conf < 0.4) return;
  out.push({ start, end, confidence: conf });
}

// ---------- Render with notches over bursts ----------
export async function renderClean(
  buffer: AudioBuffer,
  bursts: Burst[],
  mode: Mode,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate,
  );

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  // Two parallel chains: dry + notched. A pair of gain nodes crossfades
  // between them so the notch only affects burst regions.
  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();

  src.connect(dryGain);

  // Build the notch chain.
  const partials = mode === "aggressive" ? PARTIALS_AGGRESSIVE : PARTIALS;
  const Q = mode === "gentle" ? 18 : mode === "aggressive" ? 8 : 12;
  let node: AudioNode = src;
  for (const f of partials) {
    const n = ctx.createBiquadFilter();
    n.type = "notch";
    n.frequency.value = f;
    n.Q.value = Q;
    node.connect(n);
    node = n;
  }
  // Aggressive mode also adds a gentle high-shelf cut to tame the brightness.
  if (mode === "aggressive") {
    const sh = ctx.createBiquadFilter();
    sh.type = "highshelf";
    sh.frequency.value = 2000;
    sh.gain.value = -3;
    node.connect(sh);
    node = sh;
  }
  node.connect(wetGain);

  dryGain.connect(ctx.destination);
  wetGain.connect(ctx.destination);

  // Default: full dry, zero wet.
  dryGain.gain.setValueAtTime(1, 0);
  wetGain.gain.setValueAtTime(0, 0);

  const fade = 0.04; // 40ms crossfade so the notch doesn't click in/out.
  for (const b of bursts) {
    const s = Math.max(0, b.start - fade);
    const e = b.end + fade;
    dryGain.gain.setValueAtTime(1, s);
    dryGain.gain.linearRampToValueAtTime(0, b.start);
    dryGain.gain.setValueAtTime(0, b.end);
    dryGain.gain.linearRampToValueAtTime(1, e);

    wetGain.gain.setValueAtTime(0, s);
    wetGain.gain.linearRampToValueAtTime(1, b.start);
    wetGain.gain.setValueAtTime(1, b.end);
    wetGain.gain.linearRampToValueAtTime(0, e);
  }

  src.start(0);
  return ctx.startRendering();
}
