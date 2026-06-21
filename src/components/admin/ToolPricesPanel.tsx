import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Coins, Save, Plus, Trash2, Sparkles } from "lucide-react";

// Keep this in sync with the built-in TOOLS list in src/routes/tools.tsx
const BUILTIN_TOOLS: { key: string; label: string }[] = [
  { key: "/tools/pdf", label: "Text → PDF" },
  { key: "/tools/ocr", label: "Image → Text" },
  { key: "/tools/audio-convert", label: "Audio Converter" },
  { key: "/tools/qr", label: "QR / Ticket Scanner" },
  { key: "/tools/vocal-split", label: "Vocal Remover" },
  { key: "/tools/voice-clone", label: "Voice Cloning" },
  { key: "/tools/notif-clean", label: "iPhone Notification Remover" },
  { key: "/tools/youtube", label: "YouTube Downloader" },
  { key: "/tools/calculator", label: "Scientific Calculator" },
  { key: "/tools/planets", label: "Planet Explorer" },
  { key: "/tools/dictionary", label: "Dictionary" },
  { key: "/tools/vnum1", label: "Virtual Number" },
  { key: "/tools/vnum2", label: "Virtual Number 2" },
  { key: "/tools/vnum3", label: "Virtual Number 3" },
];

export function ToolPricesPanel() {
  const qc = useQueryClient();

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ["admin-tool-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_prices" as any)
        .select("id,tool_key,label,cost")
        .order("tool_key");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: aiTools = [] } = useQuery({
    queryKey: ["admin-ai-tools-pricing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_tools")
        .select("id,slug,title,credits_cost,status")
        .order("title");
      return data ?? [];
    },
  });

  // Local edit buffer for built-in / dynamic price rows
  const priceMap = new Map<string, any>();
  prices.forEach((p: any) => priceMap.set(p.tool_key, p));

  const allKeys = new Set<string>([
    ...BUILTIN_TOOLS.map((t) => t.key),
    ...prices.map((p: any) => p.tool_key),
  ]);

  const rows = Array.from(allKeys).map((key) => {
    const row = priceMap.get(key);
    const builtin = BUILTIN_TOOLS.find((t) => t.key === key);
    return {
      key,
      label: row?.label ?? builtin?.label ?? key,
      cost: row?.cost ?? 0,
      builtin: !!builtin,
    };
  });

  async function saveBuiltin(tool_key: string, label: string, cost: number) {
    const { error } = await supabase
      .from("tool_prices" as any)
      .upsert({ tool_key, label, cost }, { onConflict: "tool_key" });
    if (error) return toast.error(error.message);
    toast.success("Price updated");
    qc.invalidateQueries({ queryKey: ["admin-tool-prices"] });
    qc.invalidateQueries({ queryKey: ["tool-prices"] });
  }

  async function deleteRow(tool_key: string) {
    const { error } = await supabase.from("tool_prices" as any).delete().eq("tool_key", tool_key);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-tool-prices"] });
    qc.invalidateQueries({ queryKey: ["tool-prices"] });
  }

  async function saveAiCost(id: string, credits_cost: number) {
    const { error } = await supabase.from("ai_tools").update({ credits_cost }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("AI tool price updated");
    qc.invalidateQueries({ queryKey: ["admin-ai-tools-pricing"] });
    qc.invalidateQueries({ queryKey: ["ai-tools-public"] });
  }

  // New custom tool key form
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCost, setNewCost] = useState(0);
  async function addCustom() {
    if (!newKey.trim()) return toast.error("Tool key is required");
    await saveBuiltin(newKey.trim(), newLabel.trim() || newKey.trim(), Math.max(0, newCost | 0));
    setNewKey(""); setNewLabel(""); setNewCost(0);
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-2xl p-5 shadow-card">
        <h2 className="font-bold font-display text-lg flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Tool prices</h2>
        <p className="text-sm text-muted-foreground">Set the credit cost for each tool. 0 means free.</p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground mt-4">Loading…</p>
        ) : (
          <div className="mt-4 space-y-2">
            {rows.map((r) => <PriceRow key={r.key} row={r} onSave={saveBuiltin} onDelete={deleteRow} />)}
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h3 className="font-bold text-sm mb-2">Add a custom / future tool</h3>
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr_auto] gap-2">
            <Input placeholder="Tool key (e.g. /tools/my-new-tool)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Input placeholder="Display label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Input type="number" min={0} value={newCost} onChange={(e) => setNewCost(parseInt(e.target.value) || 0)} />
            <Button onClick={addCustom}><Plus className="w-4 h-4 mr-1" />Add</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-5 shadow-card">
        <h2 className="font-bold font-display text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI-built tools</h2>
        <p className="text-sm text-muted-foreground">Set cost for tools created from the Tool AI panel.</p>
        <div className="mt-4 space-y-2">
          {aiTools.length === 0 && <p className="text-sm text-muted-foreground">No AI tools yet.</p>}
          {aiTools.map((t: any) => <AiPriceRow key={t.id} tool={t} onSave={saveAiCost} />)}
        </div>
      </div>
    </div>
  );
}

function PriceRow({ row, onSave, onDelete }: { row: any; onSave: (k: string, l: string, c: number) => void; onDelete: (k: string) => void }) {
  const [cost, setCost] = useState<number>(row.cost);
  useEffect(() => setCost(row.cost), [row.cost]);
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background/50">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{row.label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{row.key}</div>
      </div>
      <Input type="number" min={0} value={cost} onChange={(e) => setCost(parseInt(e.target.value) || 0)} className="w-20" />
      <Button size="sm" onClick={() => onSave(row.key, row.label, cost)}><Save className="w-3.5 h-3.5" /></Button>
      {!row.builtin && (
        <Button size="sm" variant="ghost" onClick={() => onDelete(row.key)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
      )}
    </div>
  );
}

function AiPriceRow({ tool, onSave }: { tool: any; onSave: (id: string, c: number) => void }) {
  const [cost, setCost] = useState<number>(tool.credits_cost ?? 0);
  useEffect(() => setCost(tool.credits_cost ?? 0), [tool.credits_cost]);
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background/50">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{tool.title} <span className="text-[10px] uppercase ml-1 text-muted-foreground">{tool.status}</span></div>
        <div className="text-[11px] text-muted-foreground truncate">/tools/ai/{tool.slug}</div>
      </div>
      <Input type="number" min={0} value={cost} onChange={(e) => setCost(parseInt(e.target.value) || 0)} className="w-20" />
      <Button size="sm" onClick={() => onSave(tool.id, cost)}><Save className="w-3.5 h-3.5" /></Button>
    </div>
  );
}
