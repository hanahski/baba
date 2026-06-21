import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookA, Loader2, Search, Volume2 } from "lucide-react";

export const Route = createFileRoute("/tools/dictionary")({ component: DictionaryPage });

type Pronunciation = { region: string; ipa: string; audio: string[] };
type Definition = { cefr?: string | null; grammar?: string | null; definition: string; examples?: string[] };
type Sense = { guide_word?: string | null; definitions: Definition[] };
type Entry = {
  word: string;
  part_of_speech?: string;
  pronunciations?: Pronunciation[];
  senses?: Sense[];
};
type Result = { word: string; entries: Entry[] };

function playAudio(urls: string[]) {
  const mp3 = urls.find((u) => u.endsWith(".mp3")) || urls[0];
  if (mp3) new Audio(mp3).play().catch(() => {});
}

function DictionaryPage() {
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wotd, setWotd] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dictionary?action=wotd")
      .then((r) => r.json())
      .then((d) => {
        const w = d?.data?.word;
        if (w) setWotd(w);
      })
      .catch(() => {});
  }, []);

  async function lookup(q?: string) {
    const search = (q ?? term).trim();
    if (!search || loading) return;
    setTerm(search);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/dictionary?action=define&word=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (!res.ok || data?.status !== "success" || !data?.data?.entries?.length) {
        throw new Error("No definition found for that word.");
      }
      setResult(data.data as Result);
    } catch (e) {
      setError((e as Error).message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <BookA className="w-6 h-6 text-primary" /> Dictionary
        </h1>
        <p className="text-sm text-muted-foreground">Definitions, pronunciation & examples.</p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="Search a word…"
            className="w-full h-11 rounded-xl border bg-card pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={() => lookup()}
          disabled={loading || !term.trim()}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-card hover:shadow-glow transition disabled:opacity-50"
        >
          {loading ? "…" : "Look up"}
        </button>
      </div>

      {wotd && !result && !loading && (
        <button
          onClick={() => lookup(wotd)}
          className="mt-4 text-sm text-muted-foreground hover:text-primary transition"
        >
          Word of the day: <span className="font-bold text-primary">{wotd}</span>
        </button>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error && <p className="text-sm text-destructive mt-6">{error}</p>}

      {result && (
        <div className="mt-6 space-y-5">
          {result.entries.map((entry, i) => (
            <div key={i} className="bg-card border rounded-2xl p-5 shadow-card">
              <div className="flex items-center flex-wrap gap-3">
                <h2 className="text-xl font-bold font-display">{entry.word}</h2>
                {entry.part_of_speech && (
                  <span className="text-xs italic text-muted-foreground">{entry.part_of_speech}</span>
                )}
                {entry.pronunciations?.map((p, pi) => (
                  <button
                    key={pi}
                    onClick={() => playAudio(p.audio)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="uppercase">{p.region}</span>
                    <span className="text-muted-foreground">/{p.ipa}/</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                {entry.senses?.map((sense, si) => (
                  <div key={si}>
                    {sense.guide_word && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                        {sense.guide_word}
                      </span>
                    )}
                    {sense.definitions.map((def, di) => (
                      <div key={di} className="mt-1">
                        <p className="text-sm">
                          {def.cefr && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-2 uppercase">
                              {def.cefr}
                            </span>
                          )}
                          {def.definition}
                        </p>
                        {def.examples && def.examples.length > 0 && (
                          <ul className="mt-1 ml-4 list-disc text-sm text-muted-foreground italic">
                            {def.examples.slice(0, 4).map((ex, ei) => (
                              <li key={ei}>{ex}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
