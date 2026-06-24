// Synthesised "iPhone tri-tone" notification ding using the Web Audio API.
// No external asset — keeps the bundle lean and avoids asset-host CORS issues.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx || ctx.state === "closed") {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

// Best-effort resume — call before every sound. Mobile browsers (and tab
// backgrounding) suspend the AudioContext, which silently breaks playback
// after the app has been used for a while. Resuming on each play keeps the
// chime working for the entire session.
function ensureRunning(audio: AudioContext) {
  if (audio.state === "suspended") {
    audio.resume().catch(() => {});
  }
}

// Browsers block audio until the user interacts with the page. Unlock the
// AudioContext on the first gesture so realtime-triggered sounds (which are
// NOT inside a user gesture) can play afterwards.
if (typeof window !== "undefined") {
  const unlock = () => {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume().catch(() => {});
    // Play a 1-sample silent buffer to fully unlock on iOS/Safari.
    try {
      const buf = audio.createBuffer(1, 1, 22050);
      const src = audio.createBufferSource();
      src.buffer = buf;
      src.connect(audio.destination);
      src.start(0);
    } catch {}
  };
  // Keep listeners attached for the entire session so any future gesture
  // (after the tab was backgrounded / suspended) re-unlocks audio.
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
  // When the tab becomes visible again, try to resume the context.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const audio = getCtx();
      if (audio) ensureRunning(audio);
    }
  });
}

/** Plays a short three-note chime (~0.8s). Best-effort: silent if blocked. */
export function playVerifiedChime() {
  const audio = getCtx();
  if (!audio) return;
  // Some browsers auto-suspend the context until user gesture.
  if (audio.state === "suspended") audio.resume().catch(() => {});

  // iPhone tri-tone uses three rising tones: A5, E5, A5 roughly.
  const notes: { freq: number; at: number; dur: number }[] = [
    { freq: 880,  at: 0.00, dur: 0.18 }, // A5
    { freq: 659,  at: 0.16, dur: 0.18 }, // E5
    { freq: 1175, at: 0.34, dur: 0.30 }, // D6
  ];

  const master = audio.createGain();
  master.gain.value = 0.35;
  master.connect(audio.destination);

  const now = audio.currentTime;
  for (const n of notes) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    // Quick attack, soft release for a bell-like envelope.
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(1, now + n.at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    osc.connect(g).connect(master);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.dur + 0.02);
  }
}

/** Plays a bright celebratory fanfare for the welcome animation. */
export function playWelcomeCelebrationChime() {
  const audio = getCtx();
  if (!audio) return;

  const start = () => {
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    master.gain.exponentialRampToValueAtTime(0.55, audio.currentTime + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1.25);
    master.connect(audio.destination);

    const now = audio.currentTime;
    const notes: { freq: number; at: number; dur: number; type?: OscillatorType }[] = [
      { freq: 523.25, at: 0.00, dur: 0.18 },
      { freq: 659.25, at: 0.12, dur: 0.18 },
      { freq: 783.99, at: 0.24, dur: 0.2 },
      { freq: 1046.5, at: 0.42, dur: 0.34 },
      { freq: 1318.5, at: 0.66, dur: 0.28, type: "triangle" },
    ];

    for (const n of notes) {
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = n.type ?? "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.at);
      osc.frequency.exponentialRampToValueAtTime(n.freq * 1.015, now + n.at + n.dur);
      g.gain.setValueAtTime(0.0001, now + n.at);
      g.gain.exponentialRampToValueAtTime(0.9, now + n.at + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
      osc.connect(g).connect(master);
      osc.start(now + n.at);
      osc.stop(now + n.at + n.dur + 0.05);
    }

    const sparkle = audio.createOscillator();
    const sparkleGain = audio.createGain();
    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(1760, now + 0.78);
    sparkle.frequency.exponentialRampToValueAtTime(2489, now + 1.08);
    sparkleGain.gain.setValueAtTime(0.0001, now + 0.78);
    sparkleGain.gain.exponentialRampToValueAtTime(0.45, now + 0.82);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    sparkle.connect(sparkleGain).connect(master);
    sparkle.start(now + 0.78);
    sparkle.stop(now + 1.18);
  };

  if (audio.state === "suspended") {
    audio.resume().then(start).catch(() => {});
    return;
  }

  start();
}

/** Soft two-note "ping" for incoming chat messages. */
export function playNewMessageTone() {
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.38;
  master.connect(audio.destination);
  // Bright, sparkly four-note arpeggio — distinctive "you got a message" chime.
  const notes = [
    { freq: 1046, at: 0.0,  dur: 0.14 }, // C6
    { freq: 1318, at: 0.09, dur: 0.14 }, // E6
    { freq: 1568, at: 0.18, dur: 0.16 }, // G6
    { freq: 2093, at: 0.28, dur: 0.28 }, // C7
  ];
  for (const n of notes) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(1, now + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    o.connect(g).connect(master);
    o.start(now + n.at);
    o.stop(now + n.at + n.dur + 0.02);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch {} };
  }
  // Soft sine pad underneath for warmth.
  const pad = audio.createOscillator();
  const padGain = audio.createGain();
  pad.type = "sine";
  pad.frequency.value = 523; // C5
  padGain.gain.setValueAtTime(0.0001, now);
  padGain.gain.exponentialRampToValueAtTime(0.5, now + 0.04);
  padGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  pad.connect(padGain).connect(master);
  pad.start(now);
  pad.stop(now + 0.65);
  pad.onended = () => {
    try { pad.disconnect(); padGain.disconnect(); master.disconnect(); } catch {}
  };
}

/** Whimsical "found you!" arpeggio for hide-and-seek pings. */
export function playHideSeekPing() {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume().catch(() => {});
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.32;
  master.connect(audio.destination);
  const notes = [
    { freq: 784, at: 0.0, dur: 0.14 },
    { freq: 988, at: 0.1, dur: 0.14 },
    { freq: 1318, at: 0.2, dur: 0.18 },
    { freq: 1568, at: 0.33, dur: 0.26 },
  ];
  for (const n of notes) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(1, now + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    o.connect(g).connect(master);
    o.start(now + n.at);
    o.stop(now + n.at + n.dur + 0.02);
  }
}

/**
 * Crisp "beep-beep" scan-confirmation tone for the ticket scanner.
 * Two short square-ish blips (like a barcode scanner at checkout) —
 * intentionally distinct from the bell-like Verified chime.
 */
export function playTicketScanChime() {
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.3;
  master.connect(audio.destination);
  const blips = [
    { freq: 1760, at: 0.0,  dur: 0.09 }, // A6
    { freq: 2349, at: 0.11, dur: 0.14 }, // D7
  ];
  for (const n of blips) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "square";
    o.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(1, now + n.at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    o.connect(g).connect(master);
    o.start(now + n.at);
    o.stop(now + n.at + n.dur + 0.02);
  }
}

/**
 * Harsh descending "buzz" played when a ticket QR fails to verify or is
 * already used. Intentionally negative-sounding so the scan operator notices
 * the failure even in a noisy environment.
 */
export function playTicketScanFail() {
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.28;
  master.connect(audio.destination);
  // Two low sawtooth blasts dropping in pitch.
  const blips = [
    { from: 320, to: 200, at: 0.0,  dur: 0.18 },
    { from: 240, to: 120, at: 0.22, dur: 0.32 },
  ];
  for (const n of blips) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(n.from, now + n.at);
    o.frequency.exponentialRampToValueAtTime(n.to, now + n.at + n.dur);
    g.gain.setValueAtTime(0.0001, now + n.at);
    g.gain.exponentialRampToValueAtTime(1, now + n.at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur);
    o.connect(g).connect(master);
    o.start(now + n.at);
    o.stop(now + n.at + n.dur + 0.02);
  }
}

/**
 * Signature "Console reply" chime for the Admin AI panel.
 * Distinct futuristic two-step pulse + glassy chord so the admin instantly
 * recognises a Co-Admin response vs. any other ping.
 */
export function playAdminAiReplyChime() {
  const audio = getCtx();
  if (!audio) return;
  ensureRunning(audio);
  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.value = 0.32;
  master.connect(audio.destination);

  // Step 1: short low blip (square) — "tap"
  const blip = audio.createOscillator();
  const blipG = audio.createGain();
  blip.type = "square";
  blip.frequency.setValueAtTime(420, now);
  blip.frequency.exponentialRampToValueAtTime(620, now + 0.08);
  blipG.gain.setValueAtTime(0.0001, now);
  blipG.gain.exponentialRampToValueAtTime(0.8, now + 0.008);
  blipG.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  blip.connect(blipG).connect(master);
  blip.start(now); blip.stop(now + 0.12);

  // Step 2: shimmering chord (E5 + B5 + E6) — "shine"
  const chord = [659, 988, 1319];
  for (const f of chord) {
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.6, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g).connect(master);
    o.start(now + 0.12); o.stop(now + 0.75);
  }
  // Sparkle accent
  const spk = audio.createOscillator();
  const spkG = audio.createGain();
  spk.type = "sine";
  spk.frequency.setValueAtTime(2637, now + 0.22);
  spk.frequency.exponentialRampToValueAtTime(3520, now + 0.42);
  spkG.gain.setValueAtTime(0.0001, now + 0.22);
  spkG.gain.exponentialRampToValueAtTime(0.4, now + 0.25);
  spkG.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  spk.connect(spkG).connect(master);
  spk.start(now + 0.22); spk.stop(now + 0.6);
}



