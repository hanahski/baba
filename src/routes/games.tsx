import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Puzzle, Grid3x3, Sparkles, Gamepad2, Brain } from "lucide-react";

export const Route = createFileRoute("/games")({ component: GamesPage });

function GamesPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onHub = path === "/games";

  return (
    <AppShell>
      {onHub ? (
        <>
          <h1 className="text-2xl font-bold font-display mb-1">Mini-games</h1>
          <p className="text-muted-foreground mb-6">Take a break between study sessions.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link to="/games/puzzle" className="group bg-card border rounded-2xl p-6 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <Puzzle className="w-10 h-10 text-primary mb-3" />
              <h2 className="font-bold text-lg group-hover:text-primary">Sliding Puzzle</h2>
              <p className="text-sm text-muted-foreground mt-1">Arrange the 3×3 tiles in order.</p>
            </Link>
            <Link to="/games/eightball" className="group bg-card border rounded-2xl p-6 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <Sparkles className="w-10 h-10 text-primary mb-3" />
              <h2 className="font-bold text-lg group-hover:text-primary">Magic 8-Ball</h2>
              <p className="text-sm text-muted-foreground mt-1">Ask a yes/no question and shake it.</p>
            </Link>
            <Link to="/games/freegames" className="group bg-card border rounded-2xl p-6 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <Gamepad2 className="w-10 h-10 text-primary mb-3" />
              <h2 className="font-bold text-lg group-hover:text-primary">Free Games</h2>
              <p className="text-sm text-muted-foreground mt-1">Browse & play 400+ free-to-play games.</p>
            </Link>
            <Link to="/games/riddle" className="group bg-card border rounded-2xl p-6 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition-all">
              <Brain className="w-10 h-10 text-primary mb-3" />
              <h2 className="font-bold text-lg group-hover:text-primary">Riddle Me</h2>
              <p className="text-sm text-muted-foreground mt-1">Type your answer, reveal & celebrate.</p>
            </Link>
            <div className="bg-card border-2 border-dashed rounded-2xl p-6 opacity-60">
              <Grid3x3 className="w-10 h-10 text-muted-foreground mb-3" />
              <h2 className="font-bold text-lg">Crossword</h2>
              <p className="text-sm text-muted-foreground mt-1">Coming soon — university-themed clues.</p>
            </div>
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
