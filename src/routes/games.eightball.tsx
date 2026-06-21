import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/games/eightball")({ component: EightBallPage });

type Answer = { reading: string; type?: string };

function EightBallPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setShake(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/eightball?locale=en");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // tiny suspense
      await new Promise((r) => setTimeout(r, 900));
      setAnswer({ reading: data.reading, type: data.type });
    } catch (e) {
      setError((e as Error).message || "Could not reach the oracle");
    } finally {
      setShake(false);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Magic 8-Ball
        </h1>
        <p className="text-sm text-muted-foreground">Ask a yes/no question. The ball decides.</p>
      </header>

      <div className="flex flex-col items-center gap-6">
        <div
          className={`relative w-56 h-56 rounded-full bg-gradient-to-br from-zinc-900 to-black shadow-glow flex items-center justify-center select-none ${
            shake ? "animate-bounce" : ""
          }`}
        >
          <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-zinc-800 via-zinc-900 to-black" />
          <div className="absolute top-6 left-10 w-10 h-6 rounded-full bg-white/15 blur-md" />
          <div className="relative w-28 h-28 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center p-3 text-center shadow-inner">
            {loading ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : answer ? (
              <span className="text-xs font-bold leading-tight">{answer.reading}</span>
            ) : (
              <span className="text-3xl font-black font-display">8</span>
            )}
          </div>
        </div>

        {answer?.type && !loading && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {answer.type}
          </span>
        )}

        <div className="w-full flex flex-col sm:flex-row gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Will I pass my exam?"
            className="flex-1 h-11 rounded-xl border bg-card px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-card hover:shadow-glow transition disabled:opacity-50"
          >
            {loading ? "Shaking…" : "Ask the ball"}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
