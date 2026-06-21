import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      const text = extractText(children);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="relative group my-2">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground border opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="bg-muted/60 text-foreground rounded-lg p-3 pr-12 overflow-x-auto text-xs font-mono">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in (node as any)) {
    return extractText((node as any).props?.children);
  }
  return "";
}

/**
 * Renders AI text with full markdown + math support, styled to feel native
 * inside chat bubbles. Headings, lists, code, tables, links and KaTeX math
 * all render as proper HTML — no raw ###, ***, $$ leaking through.
 */
export function RichText({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed break-words text-foreground space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...p }) => <h1 className="text-base font-display font-bold mt-2 mb-1" {...p} />,
          h2: ({ node, ...p }) => <h2 className="text-[15px] font-display font-bold mt-2 mb-1" {...p} />,
          h3: ({ node, ...p }) => <h3 className="text-sm font-semibold mt-2 mb-1" {...p} />,
          h4: ({ node, ...p }) => <h4 className="text-sm font-semibold mt-1.5 mb-1" {...p} />,
          p: ({ node, ...p }) => <p className="my-1.5 leading-relaxed" {...p} />,
          ul: ({ node, ...p }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5" {...p} />,
          ol: ({ node, ...p }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5" {...p} />,
          li: ({ node, ...p }) => <li className="leading-relaxed" {...p} />,
          strong: ({ node, ...p }) => <strong className="font-semibold text-foreground" {...p} />,
          em: ({ node, ...p }) => <em className="italic" {...p} />,
          a: ({ node, ...p }) => (
            <a className="text-primary underline underline-offset-2 break-all" target="_blank" rel="noopener noreferrer" {...p} />
          ),
          blockquote: ({ node, ...p }) => (
            <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic" {...p} />
          ),
          hr: () => <hr className="my-3 border-border" />,
          code: ({ node, className, children, ...p }: any) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) {
              return (
                <code className="block whitespace-pre overflow-x-auto" {...p}>
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-muted/60 text-foreground px-1 py-0.5 rounded text-[0.85em] font-mono" {...p}>
                {children}
              </code>
            );
          },
          pre: ({ node, children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ node, ...p }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse" {...p} />
            </div>
          ),
          th: ({ node, ...p }) => <th className="border border-border bg-muted/40 px-2 py-1 text-left font-semibold" {...p} />,
          td: ({ node, ...p }) => <td className="border border-border px-2 py-1" {...p} />,
        }}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
