import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toolAiPropose, toolAiList, toolAiSetStatus, toolAiDelete, toolAiExport } from "@/lib/tool-ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import * as LucideIcons from "lucide-react";
import { Wand2, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink, Sparkles, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

function Icon({ name, className }: { name: string; className?: string }) {
  const Comp = (LucideIcons as any)[name] ?? Sparkles;
  return <Comp className={className} />;
}

const KIND_LABEL: Record<string, string> = {
  ai_prompt: "AI prompt",
  ai_image: "AI image",
  api_call: "API call",
};

export function ToolAiPanel() {
  const propose = useServerFn(toolAiPropose);
  const list = useServerFn(toolAiList);
  const setStatus = useServerFn(toolAiSetStatus);
  const del = useServerFn(toolAiDelete);
  const exportTool = useServerFn(toolAiExport);
  const qc = useQueryClient();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-tools-admin"],
    queryFn: () => list({ data: {} }),
  });
  const tools = data?.tools ?? [];

  async function go() {
    if (!brief.trim() || busy) return;
    setBusy(true);
    try {
      const r = await propose({ data: { brief: brief.trim() } });
      toast.success(`Drafted: ${r.tool.title}`);
      setBrief("");
      qc.invalidateQueries({ queryKey: ["ai-tools-admin"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  }

  async function approve(id: string) {
    await setStatus({ data: { id, status: "approved" } });
    toast.success("Approved — live on /tools");
    qc.invalidateQueries({ queryKey: ["ai-tools-admin"] });
    qc.invalidateQueries({ queryKey: ["ai-tools-public"] });
  }
  async function reject(id: string) {
    await setStatus({ data: { id, status: "rejected" } });
    qc.invalidateQueries({ queryKey: ["ai-tools-admin"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this tool?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["ai-tools-admin"] });
    qc.invalidateQueries({ queryKey: ["ai-tools-public"] });
  }
  async function bake(id: string) {
    try {
      const r = await exportTool({ data: { id } });
      await navigator.clipboard.writeText(r.snippet);
      toast.success("Snippet copied", {
        description: `Send it to Lovable: "Add ${r.title} to src/data/aiToolsSeed.ts" and paste.`,
        duration: 8000,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  const examples = [
    "Build an AI tool that rewrites my paragraph in formal academic English",
    "A tool that takes a country name and shows population, capital, region from restcountries.com",
    "An AI image tool: generate a study-room aesthetic wallpaper from a vibe description",
    "A tool that takes a word and returns its definition and example sentences (dictionaryapi.dev)",
    "Weather right now for any city using open-meteo (no key needed)",
  ];

  return (
    <div className="bg-card border rounded-3xl shadow-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold">Tool AI</p>
          <p className="text-xs text-muted-foreground">Describe a tool — I'll design it. You approve it to go live on /tools.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Describe the tool you want me to build…"
        />
        <div className="flex flex-wrap gap-1.5">
          {examples.map((s) => (
            <button key={s} onClick={() => setBrief(s)} className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70">{s.slice(0, 48)}…</button>
          ))}
        </div>
        <Button onClick={go} disabled={busy || !brief.trim()} className="w-full">
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Designing…</> : <><Sparkles className="w-4 h-4 mr-2" />Draft tool</>}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">All drafts ({tools.length})</p>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {tools.map((t: any) => (
          <div key={t.id} className="border rounded-2xl p-3 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center shrink-0">
              <Icon name={t.icon} className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold truncate">{t.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  t.status === "approved" ? "bg-success/20 text-success"
                  : t.status === "rejected" ? "bg-destructive/20 text-destructive"
                  : "bg-amber-500/20 text-amber-600"
                }`}>{t.status}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{KIND_LABEL[t.kind]}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{t.category}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              <details className="mt-1">
                <summary className="text-[11px] cursor-pointer text-muted-foreground">config</summary>
                <pre className="text-[10px] bg-muted/50 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(t.config, null, 2)}</pre>
              </details>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {t.status !== "approved" && (
                  <Button size="sm" variant="default" onClick={() => approve(t.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                  </Button>
                )}
                {t.status === "approved" && (
                  <Link to="/tools/ai/$slug" params={{ slug: t.slug }}>
                    <Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5 mr-1" />Open</Button>
                  </Link>
                )}
                {t.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => bake(t.id)} title="Bake into codebase so remixes ship this tool">
                    <Code2 className="w-3.5 h-3.5 mr-1" />Export to codebase
                  </Button>
                )}
                {t.status !== "rejected" && t.status !== "approved" && (
                  <Button size="sm" variant="ghost" onClick={() => reject(t.id)}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && tools.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No drafts yet. Describe a tool above.</p>
        )}
      </div>
    </div>
  );
}
