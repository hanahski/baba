import { useAuth } from "@/lib/auth";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogIn, LogOut, Loader2, AlertCircle, User } from "lucide-react";

export function AuthStatusBanner() {
  const { user, loading, error, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Only ever shown on the home page.
  if (pathname !== "/") return null;

  // Slide up (hide) once the user is signed in.
  const hidden = !!user;

  const baseClasses =
    "fixed inset-x-0 top-0 z-[60] flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium backdrop-blur-sm transition-transform duration-500 ease-out";
  const slide = hidden ? "-translate-y-full" : "translate-y-0";

  let content: React.ReactNode;
  let tone = "bg-muted/90 text-muted-foreground border-b border-border";

  if (loading) {
    tone = "bg-primary/90 text-primary-foreground";
    content = (
      <div className="flex items-center gap-2 mx-auto">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking auth status…
      </div>
    );
  } else if (error) {
    tone = "bg-destructive/90 text-destructive-foreground";
    content = (
      <>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Auth error: {error.message}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 rounded bg-destructive-foreground/20 px-2 py-0.5 text-[11px] hover:bg-destructive-foreground/30"
        >
          Retry
        </button>
      </>
    );
  } else if (user) {
    tone = "bg-success/90 text-success-foreground";
    content = (
      <>
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>
            Signed in as <span className="font-semibold">{user.email ?? user.id.slice(0, 8)}</span>
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="shrink-0 inline-flex items-center gap-1 rounded bg-success-foreground/20 px-2 py-0.5 text-[11px] hover:bg-success-foreground/30"
        >
          <LogOut className="h-3 w-3" />
          Sign out
        </button>
      </>
    );
  } else {
    content = (
      <>
        <div className="flex items-center gap-2">
          <LogIn className="h-3.5 w-3.5 shrink-0" />
          <span>You are signed out</span>
        </div>
        <Link
          to="/login"
          className="shrink-0 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </>
    );
  }

  return <div className={`${baseClasses} ${tone} ${slide}`}>{content}</div>;
}
