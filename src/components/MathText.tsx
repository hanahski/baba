import "katex/dist/katex.min.css";
import * as reactKatexNs from "react-katex";
import { useMemo } from "react";

const reactKatex: any = (reactKatexNs as any).default ?? reactKatexNs;
const BlockMath: React.ComponentType<{ math: string }> = reactKatex.BlockMath;
const InlineMath: React.ComponentType<{ math: string }> = reactKatex.InlineMath;

/**
 * Renders text containing LaTeX math wrapped in $...$ (inline) or $$...$$ (block).
 * Also cleans up common OCR artifacts:
 *  - bare "&" that aren't entity escapes
 *  - stray "$" with no closing partner
 *  - Windows-style \r line endings
 */
function sanitize(input: string): string {
  let s = input.replace(/\r\n?/g, "\n");
  // remove parenthetical image descriptions the model sometimes leaves
  s = s.replace(/\[(?:image|screenshot|figure)[^\]]*\]/gi, "");
  return s;
}

type Segment =
  | { type: "text"; value: string }
  | { type: "inline-math"; value: string }
  | { type: "block-math"; value: string };

function tokenize(input: string): Segment[] {
  const out: Segment[] = [];
  // Match $$...$$ first (greedy across newlines), then $...$ (single line, non-greedy)
  const re = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) out.push({ type: "text", value: input.slice(last, m.index) });
    if (m[1] != null) out.push({ type: "block-math", value: m[1].trim() });
    else if (m[2] != null) out.push({ type: "inline-math", value: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ type: "text", value: input.slice(last) });
  return out;
}

export function MathText({ children, className }: { children: string; className?: string }) {
  const segments = useMemo(() => tokenize(sanitize(children ?? "")), [children]);
  return (
    <div className={className ?? "prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed"}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        if (seg.type === "inline-math") {
          try { return <InlineMath key={i} math={seg.value} />; }
          catch { return <code key={i}>{seg.value}</code>; }
        }
        try {
          return (
            <div key={i} className="my-2 overflow-x-auto">
              <BlockMath math={seg.value} />
            </div>
          );
        } catch { return <pre key={i} className="text-xs">{seg.value}</pre>; }
      })}
    </div>
  );
}
