import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/games/puzzle")({ component: PuzzlePage });

function shuffle(): number[] {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function PuzzlePage() {
  const [tiles, setTiles] = useState<number[]>(() => shuffle());
  const [moves, setMoves] = useState(0);
  const won = useMemo(() => tiles.every((t, i) => (i === 8 ? t === 0 : t === i + 1)), [tiles]);

  const move = (i: number) => {
    const zero = tiles.indexOf(0);
    const [r, c] = [Math.floor(i / 3), i % 3];
    const [zr, zc] = [Math.floor(zero / 3), zero % 3];
    if (Math.abs(r - zr) + Math.abs(c - zc) !== 1) return;
    const next = [...tiles];
    [next[i], next[zero]] = [next[zero], next[i]];
    setTiles(next); setMoves(moves + 1);
  };

  return (
    <AppShell>
      <Link to="/games" className="text-sm text-primary hover:underline">← Games</Link>
      <h1 className="text-2xl font-bold font-display mt-2 mb-1">Sliding Puzzle</h1>
      <p className="text-muted-foreground mb-4">Moves: {moves} {won && <span className="text-success font-bold">· Solved!</span>}</p>
      <div className="grid grid-cols-3 gap-2 max-w-sm">
        {tiles.map((t, i) => (
          <button key={i} onClick={() => move(i)} disabled={t === 0}
            className={`aspect-square rounded-xl text-2xl font-bold font-display shadow-card transition-all ${t === 0 ? "bg-transparent" : "bg-hero text-primary-foreground hover:scale-105"}`}>
            {t === 0 ? "" : t}
          </button>
        ))}
      </div>
      <Button className="mt-4" onClick={() => { setTiles(shuffle()); setMoves(0); }}>Shuffle</Button>
    </AppShell>
  );
}
