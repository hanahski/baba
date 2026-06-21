import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  listSources,
  upsertSource,
  deleteSource,
  generateEbsuNews,
  deleteNewsArticle,
} from "@/lib/ebsu-news.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Sparkles, Newspaper, ExternalLink, RotateCw } from "lucide-react";

export function EbsuNewsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listSources);
  const upsert = useServerFn(upsertSource);
  const del = useServerFn(deleteSource);
  const gen = useServerFn(generateEbsuNews);
  const delArt = useServerFn(deleteNewsArticle);

  const { data: sources = [], isLoading: srcLoading } = useQuery({
    queryKey: ["ebsu-sources"],
    queryFn: () => list(),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["ebsu-news-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("id, title, slug, status, image_url, published_at")
        .eq("category", "ebsu")
        .order("published_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  async function addSource() {
    if (!newUrl.trim()) return;
    try {
      await upsert({ data: { url: newUrl.trim(), label: newLabel.trim() || undefined, weight: 1, is_active: true } });
      setNewUrl(""); setNewLabel("");
      toast.success("Source added");
      qc.invalidateQueries({ queryKey: ["ebsu-sources"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function toggleSource(s: any) {
    try {
      await upsert({ data: { id: s.id, url: s.url, label: s.label, weight: s.weight, is_active: !s.is_active } });
      qc.invalidateQueries({ queryKey: ["ebsu-sources"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function removeSource(id: string) {
    if (!confirm("Remove this source?")) return;
    await del({ data: { id } });
    qc.invalidateQueries({ queryKey: ["ebsu-sources"] });
  }

  async function generate(publish: boolean) {
    setBusy(true);
    try {
      const r = await gen({ data: { topic: topic.trim() || undefined, publish } });
      toast.success(publish ? "EBSU news published!" : "Draft created");
      setTopic("");
      qc.invalidateQueries({ queryKey: ["ebsu-news-articles"] });
      console.log("generated", r);
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally { setBusy(false); }
  }

  async function removeArticle(id: string) {
    if (!confirm("Delete this article?")) return;
    await delArt({ data: { id } });
    qc.invalidateQueries({ queryKey: ["ebsu-news-articles"] });
  }

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="bg-card border rounded-3xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-bold font-display text-lg">Smart EBSU News Composer</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          The AI pulls fresh content from your active sources, combines what students care about, and writes a polished, eye-catching post with cover image.
        </p>
        <Textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Optional angle / editor brief — e.g. 'New semester resumption date' or leave blank to let the AI pick the best story from sources."
          rows={2}
          maxLength={500}
          className="mb-3"
        />
        <div className="flex gap-2">
          <Button onClick={() => generate(true)} disabled={busy || sources.filter((s: any) => s.is_active).length === 0} className="flex-1">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate & Publish
          </Button>
          <Button variant="outline" onClick={() => generate(false)} disabled={busy || sources.filter((s: any) => s.is_active).length === 0}>
            Draft only
          </Button>
        </div>
      </div>

      {/* Sources */}
      <div className="bg-card border rounded-3xl p-5 shadow-card">
        <h2 className="font-bold font-display text-lg mb-3">AI Sources (EBSU)</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="flex-1 min-w-[200px]" />
          <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="w-40" />
          <Button onClick={addSource} disabled={!newUrl.trim()}><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
        {srcLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <ul className="space-y-2">
            {sources.map((s: any) => (
              <li key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <button onClick={() => toggleSource(s)} className={`w-2 h-2 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} title="Toggle active" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.label || s.url}</div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate">
                    {s.url} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                <button onClick={() => removeSource(s.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
            {sources.length === 0 && <p className="text-sm text-muted-foreground">No sources yet. Add one above.</p>}
          </ul>
        )}
      </div>

      {/* Articles */}
      <div className="bg-card border rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold font-display text-lg flex items-center gap-2"><Newspaper className="w-5 h-5" />Recent EBSU Articles</h2>
          <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["ebsu-news-articles"] })}>
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ul className="space-y-2">
          {articles.map((a: any) => (
            <li key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
              {a.image_url ? <img src={a.image_url} className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <Link to="/news/$slug" params={{ slug: a.slug }} className="font-medium text-sm truncate block hover:text-primary">{a.title}</Link>
                <div className="text-xs text-muted-foreground">
                  {a.status} · {new Date(a.published_at).toLocaleString()}
                </div>
              </div>
              <button onClick={() => removeArticle(a.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
          {articles.length === 0 && <p className="text-sm text-muted-foreground">No EBSU articles yet — generate one above.</p>}
        </ul>
      </div>
    </div>
  );
}
