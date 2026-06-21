import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Chapter = { id: string; idx: number; title: string; content: string | null };

/**
 * Paginated swipe reader for user-composed books.
 * - Splits each chapter's HTML into screen-height pages by paragraph (smart line breaks).
 * - Swipe / arrow / keyboard nav.
 * - Soft page-flip tick via WebAudio (no asset).
 * - Remembers last page in localStorage per book.
 */
export function SwipeBookReader({
  bookId,
  title,
  chapters,
}: {
  bookId: string;
  title: string;
  chapters: Chapter[];
}) {
  // Flatten chapters into an ordered list of "blocks" (paragraph-level chunks).
  const blocks = useMemo(() => {
    const out: { kind: "title" | "html"; chapter: string; html: string }[] = [];
    for (const c of chapters) {
      out.push({ kind: "title", chapter: c.title, html: `<h2>${escapeHtml(c.title)}</h2>` });
      const parts = splitHtmlIntoParagraphs(c.content || "");
      for (const p of parts) out.push({ kind: "html", chapter: c.title, html: p });
    }
    return out;
  }, [chapters]);

  const measureRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<number[][]>([]); // page -> block indices
  const [page, setPage] = useState(0);
  const storageKey = `book-page:${bookId}`;

  // Paginate: greedily pack blocks until they exceed the visible page height.
  useEffect(() => {
    const wrap = measureRef.current;
    const target = pageRef.current;
    if (!wrap || !target) return;
    const maxH = target.clientHeight - 24;
    const result: number[][] = [];
    let current: number[] = [];
    wrap.innerHTML = "";
    for (let i = 0; i < blocks.length; i++) {
      const el = document.createElement("div");
      el.innerHTML = blocks[i].html;
      wrap.appendChild(el);
      if (wrap.scrollHeight > maxH && current.length > 0) {
        result.push(current);
        current = [i];
        wrap.innerHTML = "";
        wrap.appendChild(el);
      } else {
        current.push(i);
      }
    }
    if (current.length) result.push(current);
    wrap.innerHTML = "";
    setPages(result);
    const saved = Number(localStorage.getItem(storageKey) || "0");
    setPage(Math.min(Math.max(0, saved), Math.max(0, result.length - 1)));
  }, [blocks, storageKey]);

  useEffect(() => {
    if (pages.length) localStorage.setItem(storageKey, String(page));
  }, [page, pages.length, storageKey]);

  // Soft tick on page change.
  const turnSound = () => {
    try {
      const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as
        | typeof AudioContext
        | undefined;
      if (!Ctor) return;
      const a = new Ctor();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(520, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, a.currentTime + 0.08);
      g.gain.setValueAtTime(0.06, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.12);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.13);
      setTimeout(() => a.close().catch(() => {}), 250);
    } catch {}
  };

  const go = (delta: number) => {
    setPage((p) => {
      const next = Math.min(Math.max(0, p + delta), Math.max(0, pages.length - 1));
      if (next !== p) turnSound();
      return next;
    });
  };

  // Touch swipe.
  const touch = useRef<{ x: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    if (Math.abs(dx) < 50) return;
    go(dx < 0 ? 1 : -1);
  };

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  const currentBlocks = pages[page] ?? [];
  const currentChapter = blocks[currentBlocks[0]]?.chapter ?? title;
  const progress = pages.length ? Math.round(((page + 1) / pages.length) * 100) : 0;

  return (
    <div className="relative bg-gradient-to-b from-amber-50/40 to-background dark:from-zinc-900 dark:to-background rounded-xl overflow-hidden border">
      {/* Hidden measure surface — same width as the page surface. */}
      <div
        ref={measureRef}
        aria-hidden
        className="invisible absolute inset-0 px-6 py-6 prose prose-sm md:prose-base dark:prose-invert max-w-none"
      />
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground border-b bg-card/70 backdrop-blur">
        <span className="flex items-center gap-1 truncate">
          <BookOpen className="w-3.5 h-3.5" /> <span className="truncate">{currentChapter}</span>
        </span>
        <span>
          {page + 1} / {pages.length || 1}
        </span>
      </div>
      <div
        ref={pageRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          go(x < rect.width / 2 ? -1 : 1);
        }}
        className="px-6 py-6 select-none cursor-pointer overflow-hidden"
        style={{ height: "70vh" }}
      >
        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          {currentBlocks.map((i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: blocks[i].html }} />
          ))}
        </article>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-card/70">
        <Button size="sm" variant="ghost" onClick={() => go(-1)} disabled={page === 0}>
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <div className="flex-1 h-1 mx-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => go(1)}
          disabled={page >= pages.length - 1}
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Break sanitized HTML into top-level block strings so we can paginate by paragraph. */
function splitHtmlIntoParagraphs(html: string): string[] {
  if (!html.trim()) return ["<p><em>(empty)</em></p>"];
  if (typeof window === "undefined") return [html];
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const out: string[] = [];
  tpl.content.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      out.push((node as Element).outerHTML);
    } else if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").trim();
      if (t) out.push(`<p>${escapeHtml(t)}</p>`);
    }
  });
  return out.length ? out : [html];
}