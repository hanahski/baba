import { Flag } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Target =
  | { kind: "post"; id: string }
  | { kind: "user"; id: string }
  | { kind: "listing"; id: string }
  | { kind: "general" }
  | { kind: "catalogue"; faculty?: string; department?: string };

// Thin nav-shim — the real composer lives at /report so it has full screen
// space on mobile and can accept screenshot uploads.
export function ReportDialog({
  target,
  trigger,
  label,
}: {
  target: Target;
  trigger?: React.ReactNode;
  label?: string;
}) {
  const search: Record<string, string> = { kind: target.kind };
  if ("id" in target && target.id) search.id = target.id;
  if (target.kind === "catalogue") {
    if (target.faculty) search.faculty = target.faculty;
    if (target.department) search.department = target.department;
  }

  return (
    <Link
      to="/report"
      search={search as any}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:bg-muted text-xs"
      title="Report"
    >
      {trigger ?? (
        <>
          <Flag className="w-3.5 h-3.5" /> {label ?? "Report"}
        </>
      )}
    </Link>
  );
}
