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
          {out.type === "text" && <div className="text-sm whitespace-pre-wrap">{out.text}</div>}
          {out.type === "json" && <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto">{JSON.stringify(out.data, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
