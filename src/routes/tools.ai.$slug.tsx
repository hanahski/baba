import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toolAiRun } from "@/lib/tool-ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import * as LucideIcons from "lucide-react";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tools/ai/$slug")({ component: AiToolPage });

function Icon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as any)[name] ?? Sparkles;
  return <Comp className={className} />;
}

function AiToolPage() {
  const { slug } = Route.useParams();
  const run = useServerFn(toolAiRun);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<any>(null);

  const { data: tool, isLoading } = useQuery({
    queryKey: ["ai-tool", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_tools").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function go() {
    if (!input.trim() || busy) return;
    setBusy(true); setOut(null);
    try {
      const cost = (tool as any)?.credits_cost ?? 0;
      if (cost > 0) {
        const { error } = await supabase.rpc("spend_credits", {
          _amount: cost, _reason: `tool:ai:${slug}`, _metadata: { slug },
        });
        if (error) {
          if (error.message.includes("INSUFFICIENT_CREDITS")) throw new Error("Not enough credits");
          throw error;
        }
      }
      const r = await run({ data: { slug, input: input.trim() } });
      setOut(r);
      if (cost > 0) toast.success(`−${cost} credits`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  if (!tool) return (
    <div className="text-center py-12">
      <p className="font-semibold">Tool not found</p>
      <Link to="/tools" className="text-sm text-primary hover:underline">Back to Tools</Link>
    </div>
  );

  const cfg = (tool.config || {}) as any;
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />Tools
      </Link>
      <div className="bg-card border rounded-3xl p-5 shadow-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
            <Icon name={tool.icon} className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display">{tool.title}</h1>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <label className="text-sm font-medium">{cfg.input_label || "Input"}</label>
        <Textarea
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={cfg.input_placeholder || "Type here…"}
          className="mt-1"
        />
        <Button onClick={go} disabled={busy || !input.trim()} className="w-full mt-3">
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working…</> : <><Sparkles className="w-4 h-4 mr-2" />Run</>}
        </Button>
      </div>

      {out && (
        <div className="bg-card border rounded-3xl p-5 shadow-card space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Result</p>
          {out.type === "image" && out.url && <img src={out.url} alt="" className="rounded-xl w-full" />}
          {out.type === "text" && <div className="text-sm whitespace-pre-wrap leading-relaxed">{out.text}</div>}
          {out.type === "json" && <PrettyJson data={out.data} />}
        </div>
      )}
    </div>
  );
}

function isUrl(s: string) {
  return /^https?:\/\/\S+$/i.test(s);
}
function isImageUrl(s: string) {
  return isUrl(s) && /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(s);
}
function isAudioUrl(s: string) {
  return isUrl(s) && /\.(mp3|wav|ogg|m4a)(\?|#|$)/i.test(s);
}

function PrettyValue({ value }: { value: any }) {
  if (value === null || value === undefined)
    return <span className="text-muted-foreground italic">—</span>;
  if (typeof value === "boolean")
    return <span className="font-mono text-primary">{value ? "true" : "false"}</span>;
  if (typeof value === "number")
    return <span className="font-mono text-primary">{value}</span>;
  if (typeof value === "string") {
    if (isImageUrl(value))
      return <img src={value} alt="" className="rounded-lg max-h-48 mt-1 border" />;
    if (isAudioUrl(value))
      return <audio controls src={value} className="w-full mt-1" />;
    if (isUrl(value))
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
          {value}
        </a>
      );
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  return <PrettyJson data={value} />;
}

function PrettyJson({ data, depth = 0 }: { data: any; depth?: number }) {
  if (data === null || data === undefined)
    return <p className="text-sm text-muted-foreground italic">No result.</p>;
  if (Array.isArray(data)) {
    if (data.length === 0)
      return <p className="text-sm text-muted-foreground italic">Empty list.</p>;
    return (
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">#{i + 1}</p>
            <PrettyValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof data === "object") {
    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
    if (entries.length === 0)
      return <p className="text-sm text-muted-foreground italic">No fields.</p>;
    return (
      <div className={depth === 0 ? "space-y-2.5" : "space-y-1.5 ml-2 mt-1 border-l-2 border-muted pl-3"}>
        {entries.map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground mr-2">
              {k.replace(/_/g, " ")}
            </span>
            <div className="mt-0.5">
              <PrettyValue value={v} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <PrettyValue value={data} />;
}

