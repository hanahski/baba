import { Link } from "@tanstack/react-router";
import { Copy, Download, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { parsePastQuestion, extractYear } from "@/lib/past-question-format";
import { downloadPastQuestionPdf } from "@/lib/past-question-pdf";
import { MathText } from "@/components/MathText";
import { AvatarDisplay } from "@/components/AvatarDisplay";

export type PastQuestionArticleProps = {
  note: {
    title: string;
    body: string;
    created_at: string;
    course: { code: string; title: string } | null;
    faculty: string | null;
    department: string | null;
  };
  audience?: {
    count: number;
    viewers: Array<{ id: string; display_name: string; avatar_key: string; at: string }>;
  } | null;
};

export function PastQuestionArticle({ note, audience = null }: PastQuestionArticleProps) {
  const parsed = parsePastQuestion(note.body);
  const year = extractYear(note.body);
  const code = note.course?.code ?? note.title.split("—")[0]?.trim() ?? "EBSU";
  const courseTitle = note.course?.title ?? note.title;

  const onDownload = () => {
    try {
      downloadPastQuestionPdf({
        title: note.title,
        body: note.body,
        course: { code, title: courseTitle },
        faculty: note.faculty,
        department: note.department,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't build PDF");
    }
  };

  return (
    <article className="bg-card border rounded-2xl shadow-card max-w-3xl overflow-hidden">
      <header className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">
          Ebonyi State University · Past Question
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display mt-2">
          {code} — {courseTitle}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {note.faculty && (
            <span className="bg-white/15 backdrop-blur px-2 py-1 rounded-full">{note.faculty}</span>
          )}
          {note.department && (
            <span className="bg-white/15 backdrop-blur px-2 py-1 rounded-full">{note.department}</span>
          )}
          {year && <span className="bg-white/15 backdrop-blur px-2 py-1 rounded-full">Session {year}</span>}
        </div>
      </header>

      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-5">
          <Button size="sm" onClick={onDownload}>
            <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(note.body);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1" /> Copy text
          </Button>
        </div>

        {parsed.meta.length > 0 && (
          <div className="rounded-xl border bg-muted/40 p-4 mb-6 text-sm leading-relaxed space-y-1">
            {parsed.meta.map((m, i) => (
              <p key={i} className="text-muted-foreground">{m}</p>
            ))}
          </div>
        )}

        {/* If the document had no recognisable section/question markers, the
            parser puts every line into `header`. Render those lines so the
            user-posted body never disappears from the detail view. */}
        {parsed.blocks.length === 0 && parsed.header.length > 0 && (
          <div className="space-y-3 text-[15px] leading-7 mb-4">
            {parsed.header.map((line, i) => (
              <MathText key={i} className="leading-7">{line}</MathText>
            ))}
          </div>
        )}

        {/* Ultimate fallback: if the parser produced nothing usable AND header
            is empty (e.g. user pasted only meta-like lines, or short body),
            render the raw body so content never disappears. */}
        {parsed.blocks.length === 0 && parsed.header.length === 0 && note.body?.trim() && (
          <div className="text-[15px] leading-7 whitespace-pre-wrap">
            <MathText className="leading-7">{note.body}</MathText>
          </div>
        )}

        <div className="space-y-4 text-[15px] leading-7">
          {parsed.blocks.map((b, i) => {
            if (b.kind === "section") {
              return (
                <h2
                  key={i}
                  className="mt-6 pb-1 border-b-2 border-primary/40 text-sm font-bold uppercase tracking-wider text-primary"
                >
                  {b.label}
                </h2>
              );
            }
            if (b.kind === "question") {
              return (
                <div key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center mt-0.5">
                    {b.number}
                  </span>
                  <div className="flex-1"><MathText className="leading-7">{b.text}</MathText></div>
                </div>
              );
            }
            return (
              <MathText key={i} className="text-muted-foreground leading-7">{b.text}</MathText>
            );
          })}
        </div>

        {audience && (
          <section className="mt-8 pt-5 border-t">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Audience
                <span className="text-xs font-normal text-muted-foreground">· who opened this</span>
              </h3>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                <Eye className="w-3.5 h-3.5" /> {audience.count} {audience.count === 1 ? "view" : "views"}
              </span>
            </div>
            {audience.viewers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No one has opened this note yet.</p>
            ) : (
              <ul className="space-y-2">
                {audience.viewers.slice(0, 12).map((v) => (
                  <li key={v.id + v.at} className="flex items-center gap-3">
                    <Link to="/profile/$id" params={{ id: v.id }} className="shrink-0">
                      <AvatarDisplay avatarKey={v.avatar_key} size={28} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to="/profile/$id" params={{ id: v.id }} className="text-sm font-semibold truncate hover:underline">
                        {v.display_name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">read {formatDistanceToNow(new Date(v.at), { addSuffix: true })}</p>
                    </div>
                  </li>
                ))}
                {audience.viewers.length > 12 && (
                  <li className="text-xs text-muted-foreground pl-10">+ {audience.viewers.length - 12} more</li>
                )}
              </ul>
            )}
          </section>
        )}

        <footer className="mt-8 pt-4 border-t text-[11px] text-muted-foreground">
          Saved {new Date(note.created_at).toISOString().slice(0, 10)} · StudentsPlug
        </footer>
      </div>
    </article>
  );
}
