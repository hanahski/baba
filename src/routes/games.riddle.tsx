import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Brain, Loader2, Eye, RefreshCw, Send, Check, X } from "lucide-react";

export const Route = createFileRoute("/games/riddle")({ component: RiddlePage });

type Verdict = "correct" | "wrong" | null;

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMatch(guess: string, answer: string) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  // accept if guess contains the answer or vice-versa (for short core words)
  if (a.length >= 3 && (g.includes(a) || a.includes(g))) return true;
  return false;
}

/* ---------------- Web Audio sound effects (no assets needed) ---------------- */
let audioCtx: AudioContext | null = null;
function ctx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playWrong() {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  // two descending "buzzer" tones
  [220, 160].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const t = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}

function playCheckChime() {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  // bright ascending arpeggio = "check mark" success ding
  [659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = now + i * 0.1;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

function playApplause() {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  const duration = 1.8;
  // noise buffer for clapping/cheering texture
  const buffer = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    // swelling envelope of random claps + crowd cheer noise
    const env = Math.sin(Math.PI * t) * 0.9;
    const clap = Math.random() < 0.04 ? (Math.random() * 2 - 1) : 0;
    const crowd = (Math.random() * 2 - 1) * 0.25;
    data[i] = (clap + crowd) * env;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.7;
  const gain = ac.createGain();
  gain.gain.value = 0.5;
  src.connect(bp).connect(gain).connect(ac.destination);
  src.start(now);
  src.stop(now + duration);
}

function celebrate() {
  playCheckChime();
  playApplause();
}

function RiddlePage() {
  const [riddle, setRiddle] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function next() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setRevealed(false);
    setVerdict(null);
    setGuess("");
    setRiddle(null);
    try {
      const res = await fetch("/api/riddle");
      const data = await res.json();
      if (!res.ok || !data?.riddle) throw new Error(data?.error || "No riddle");
      setRiddle(data.riddle);
      setAnswer(data.answer || "");
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e) {
      setError((e as Error).message || "Could not load a riddle");
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (!guess.trim() || !answer || revealed) return;
    if (isMatch(guess, answer)) {
      setVerdict("correct");
      setRevealed(true);
      celebrate();
    } else {
      setVerdict("wrong");
      playWrong();
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" /> Riddle Me
        </h1>
        <p className="text-sm text-muted-foreground">Read the riddle, type your answer, then reveal.</p>
      </header>

      <div className="bg-card border rounded-2xl p-6 shadow-card min-h-[160px] flex flex-col items-center justify-center text-center gap-4">
        {loading ? (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        ) : riddle ? (
          <p className="text-lg font-medium leading-relaxed">{riddle}</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Press the button to get your first riddle.</p>
        )}
      </div>

      {riddle && !loading && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                if (verdict === "wrong") setVerdict(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={revealed}
              placeholder="Type your answer…"
              className={`flex-1 h-11 rounded-xl border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                verdict === "wrong" ? "border-destructive ring-1 ring-destructive" : ""
              }`}
            />
            <button
              onClick={submit}
              disabled={!guess.trim() || revealed}
              className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-card hover:shadow-glow transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" /> Check
            </button>
          </div>

          {verdict === "wrong" && (
            <p className="text-sm text-destructive flex items-center justify-center gap-1.5">
              <X className="w-4 h-4" /> Not quite — try again!
            </p>
          )}

          {revealed ? (
            <p className="text-sm flex items-center justify-center gap-2 text-primary bg-primary/10 rounded-xl px-4 py-3">
              {verdict === "correct" && <Check className="w-4 h-4 text-success" />}
              <span>{verdict === "correct" ? "Correct! " : "Answer: "}<strong>{answer}</strong></span>
            </p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border bg-background text-sm font-bold hover:bg-muted transition"
            >
              <Eye className="w-4 h-4" /> Reveal answer
            </button>
          )}
        </div>
      )}

      <button
        onClick={next}
        disabled={loading}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-card hover:shadow-glow transition disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {riddle ? "New riddle" : "Get a riddle"}
      </button>
    </div>
  );
}
