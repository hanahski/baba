import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wand2, Save, RotateCcw, Phone, Loader2, Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Mic2, Mic, Youtube, Music2, Sparkles } from "lucide-react";
import { aiParseToolSnippet } from "@/lib/admin-tool-ai.functions";

type Override = {
  id?: string;
  tool_key: string;
  rapidapi_host: string | null;
  rapidapi_key: string | null;
  paths: Record<string, string>;
  notes: string | null;
};

type ToolDef = {
  key: string;
  label: string;
  defaultHost: string;
  actions: string[];
  healthUrl: string;
  icon: typeof Phone;
};

const TOOLS: ToolDef[] = [
  {
    key: "vnum1",
    label: "Virtual Number 1",
    defaultHost: "global-virtual-number-api.p.rapidapi.com",
    actions: ["countries", "numbers", "messages"],
    healthUrl: "/api/public/virtual-number?provider=1&action=health",
    icon: Phone,
  },
  {
    key: "vnum2",
    label: "Virtual Number 2",
    defaultHost: "global-virtual-numbers-sms-verify.p.rapidapi.com",
    actions: ["countries", "numbers", "messages"],
    healthUrl: "/api/public/virtual-number?provider=2&action=health",
    icon: Phone,
  },
  {
    key: "vnum3",
    label: "Virtual Number 3",
    defaultHost: "verify-sms-temp-number.p.rapidapi.com",
    actions: ["countries", "numbers", "messages"],
    healthUrl: "/api/public/virtual-number?provider=3&action=health",
    icon: Phone,
  },
  {
    key: "vocal",
    label: "Vocal Remover (Upload)",
    defaultHost: "voice-separation-api.p.rapidapi.com",
    actions: ["separate"],
    healthUrl: "/api/public/vocal-split?action=health",
    icon: Mic2,
  },
  {
    key: "vocal-yt",
    label: "Vocal Remover (YouTube)",
    defaultHost: "stemsplit-ai-audio-stem-separation-youtube-to-stems2.p.rapidapi.com",
    actions: ["create", "status"],
    healthUrl: "/api/public/vocal-split-v2?action=health",
    icon: Music2,
  },
  {
    key: "voice-clone",
    label: "Voice Cloning",
    defaultHost: "multilingual-tts-voice-cloning-api1.p.rapidapi.com",
    actions: ["clone", "design"],
    healthUrl: "/api/public/voice-clone?action=health",
    icon: Mic,
  },
  {
    key: "youtube",
    label: "YouTube Downloader",
    defaultHost: "youtube-media-downloader.p.rapidapi.com",
    actions: ["details"],
    healthUrl: "/api/youtube?action=health",
    icon: Youtube,
  },
];

// Smart parser: extract host + key + a candidate path from arbitrary snippets
// (cURL, JS fetch, axios, C#, JSON config, plain URL, etc.)
function parseSnippet(input: string) {
  const out: { host?: string; key?: string; path?: string; method?: string } = {};
  const text = input.trim();
  if (!text) return out;

  // x-rapidapi-host
  const hostMatch =
    text.match(/x-rapidapi-host['":\s,]+([a-z0-9.\-]+\.p\.rapidapi\.com)/i) ||
    text.match(/['"]?host['"]?\s*[:=]\s*['"]([a-z0-9.\-]+\.p\.rapidapi\.com)['"]/i) ||
    text.match(/([a-z0-9.\-]+\.p\.rapidapi\.com)/i);
  if (hostMatch) out.host = hostMatch[1];

  // x-rapidapi-key  (long alphanumeric, often ending in 'jsn...')
  const keyMatch =
    text.match(/x-rapidapi-key['":\s,]+([A-Za-z0-9]{30,})/i) ||
    text.match(/['"]?api[_-]?key['"]?\s*[:=]\s*['"]([A-Za-z0-9]{30,})['"]/i);
  if (keyMatch) out.key = keyMatch[1];

  // Path: pull from a URL or RequestUri
  const urlMatch =
    text.match(/https?:\/\/[a-z0-9.\-]+\.p\.rapidapi\.com(\/[^\s"'`)]+)/i) ||
    text.match(/RequestUri\s*=\s*new\s+Uri\(["']https?:\/\/[^"']+?(\/[^"']+)["']/i) ||
    text.match(/fetch\(\s*["']https?:\/\/[^"']+?(\/[^"']+)["']/i);
  if (urlMatch) out.path = urlMatch[1];

  // Method
  const methodMatch = text.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/);
  if (methodMatch) out.method = methodMatch[1].toUpperCase();

  return out;
}

export function ToolEditor() {
  const qc = useQueryClient();
  const [activeKey, setActiveKey] = useState<string>("vnum1");
  const active = TOOLS.find((t) => t.key === activeKey)!;

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["tool-overrides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_overrides" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as Override[];
    },
  });

  const current: Override = overrides?.find((o) => o.tool_key === activeKey) ?? {
    tool_key: activeKey,
    rapidapi_host: null,
    rapidapi_key: null,
    paths: {},
    notes: null,
  };

  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [snippet, setSnippet] = useState("");
  const [snippetAction, setSnippetAction] = useState<string>("countries");
  const [aiBusy, setAiBusy] = useState(false);
  const aiParseFn = useServerFn(aiParseToolSnippet);

  // Hydrate when switching tool or after first load
  const hydrateKey = `${activeKey}:${overrides?.length ?? 0}`;
  const [hydrated, setHydrated] = useState<string>("");
  if (hydrated !== hydrateKey) {
    setHost(current.rapidapi_host ?? "");
    setApiKey(current.rapidapi_key ?? "");
    setPaths(current.paths ?? {});
    setNotes(current.notes ?? "");
    setHydrated(hydrateKey);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        tool_key: activeKey,
        rapidapi_host: host.trim() || null,
        rapidapi_key: apiKey.trim() || null,
        paths,
        notes: notes.trim() || null,
      };
      const { error } = await supabase
        .from("tool_overrides" as any)
        .upsert(payload, { onConflict: "tool_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["tool-overrides"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const resetToDefaults = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tool_overrides" as any)
        .delete()
        .eq("tool_key", activeKey);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reverted to built-in defaults");
      setHydrated(""); // force re-hydrate
      qc.invalidateQueries({ queryKey: ["tool-overrides"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reset failed"),
  });

  const applySnippet = () => {
    const parsed = parseSnippet(snippet);
    if (!parsed.host && !parsed.key && !parsed.path) {
      return toast.error("Couldn't recognise that snippet");
    }
    if (parsed.host) setHost(parsed.host);
    if (parsed.key) setApiKey(parsed.key);
    if (parsed.path) {
      setPaths((prev) => ({ ...prev, [snippetAction]: parsed.path! }));
    }
    toast.success(
      `Imported: ${[
        parsed.host && "host",
        parsed.key && "key",
        parsed.path && `${snippetAction} path`,
      ]
        .filter(Boolean)
        .join(", ")}`,
    );
    setSnippet("");
  };

  const applySnippetAI = async () => {
    if (!snippet.trim()) return;
    setAiBusy(true);
    try {
      const parsed = await aiParseFn({
        data: { snippet, toolKey: activeKey, actions: active.actions },
      });
      let touched: string[] = [];
      if (parsed?.host) { setHost(parsed.host); touched.push("host"); }
      if (parsed?.key) { setApiKey(parsed.key); touched.push("key"); }
      if (parsed?.paths && typeof parsed.paths === "object") {
        setPaths((prev) => ({ ...prev, ...parsed.paths! }));
        touched.push(`paths: ${Object.keys(parsed.paths).join(", ")}`);
      }
      if (parsed?.notes) { setNotes((n) => n || parsed.notes!); touched.push("notes"); }
      if (touched.length === 0) {
        toast.error("AI couldn't find anything useful");
      } else {
        toast.success(`AI imported: ${touched.join(", ")}`);
        setSnippet("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI parse failed");
    } finally {
      setAiBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card border rounded-2xl p-6 shadow-card flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading tool configs…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HealthPanel onPick={(k) => setActiveKey(k)} />

      <div className="bg-card border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="font-bold font-display">Tool Editor</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Swap the upstream API for any "Other Tool" when its free trial ends. Paste a cURL,
          fetch, axios, or C# snippet — it auto-extracts host, key and path.
        </p>

        <div className="flex gap-2 flex-wrap mt-4 overflow-x-auto">
          {TOOLS.map((t) => {
            const has = overrides?.some((o) => o.tool_key === t.key);
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeKey === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {has && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-success inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Smart import */}
      <div className="bg-card border rounded-2xl p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-bold text-sm">Smart import</h3>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Apply path to:</Label>
            <select
              value={snippetAction}
              onChange={(e) => setSnippetAction(e.target.value)}
              className="text-xs rounded-md border bg-background px-2 py-1"
            >
              {active.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Textarea
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          placeholder={`Paste anything:\n\ncurl --request GET --url https://xyz.p.rapidapi.com/foo \\\n  --header 'x-rapidapi-host: xyz.p.rapidapi.com' \\\n  --header 'x-rapidapi-key: YOUR_KEY'`}
          className="font-mono text-xs min-h-[140px]"
        />
        <div className="flex gap-2 flex-wrap">
          <Button onClick={applySnippet} disabled={!snippet.trim() || aiBusy} size="sm">
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Auto-fill (regex)
          </Button>
          <Button
            onClick={applySnippetAI}
            disabled={!snippet.trim() || aiBusy}
            size="sm"
            variant="secondary"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90"
          >
            {aiBusy ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> AI parsing…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Parse with AI</>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Regex is instant. AI handles messy or unusual snippets (it understands intent
          and figures out the right action key).
        </p>
      </div>

      {/* Manual fields */}
      <div className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
        <div>
          <Label className="text-xs font-bold">RapidAPI Host</Label>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={active.defaultHost}
            className="mt-1.5 font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Leave empty to use built-in default ({active.defaultHost}).
          </p>
        </div>

        <div>
          <Label className="text-xs font-bold">RapidAPI Key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Leave empty to use RAPIDAPI_KEY secret"
            className="mt-1.5 font-mono text-sm"
          />
        </div>

        <div>
          <Label className="text-xs font-bold">Endpoint paths</Label>
          <p className="text-[11px] text-muted-foreground mb-2">
            Use {"{country}"}, {"{countryId}"}, {"{number}"}, {"{phone}"}, {"{page}"} as placeholders.
            Leave empty to use built-in path for that action.
          </p>
          <div className="space-y-2">
            {active.actions.map((a) => (
              <div key={a} className="flex items-center gap-2">
                <span className="text-[11px] font-mono w-20 shrink-0 text-muted-foreground">
                  {a}
                </span>
                <Input
                  value={paths[a] ?? ""}
                  onChange={(e) =>
                    setPaths((p) => ({ ...p, [a]: e.target.value }))
                  }
                  placeholder={`/path?param={country}`}
                  className="font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs font-bold">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this provider…"
            className="mt-1.5 text-sm min-h-[70px]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save override
          </Button>
          <Button
            variant="outline"
            onClick={() => resetToDefaults.mutate()}
            disabled={resetToDefaults.isPending || !current.id}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset to defaults
          </Button>
        </div>
      </div>
    </div>
  );
}

type Health = {
  status: "ok" | "warn" | "dead" | "unknown";
  httpStatus?: number;
  latencyMs?: number;
  limit?: number | null;
  remaining?: number | null;
  reset?: string | null;
  host?: string;
  error?: string;
  upstream?: unknown;
};

function HealthPanel({ onPick }: { onPick: (key: string) => void }) {
  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["tool-health"],
    queryFn: async () => {
      const out: Record<string, Health> = {};
      await Promise.all(
        TOOLS.map(async (t) => {
          try {
            const r = await fetch(t.healthUrl);
            out[t.key] = (await r.json()) as Health;
          } catch (e) {
            out[t.key] = {
              status: "dead",
              error: e instanceof Error ? e.message : "Network error",
            };
          }
        }),
      );
      return out;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Toast when any tool flips to warn/dead (only after first load)
  const [warned, setWarned] = useState<Record<string, string>>({});
  if (data) {
    for (const t of TOOLS) {
      const h = data[t.key];
      if (!h) continue;
      const prev = warned[t.key];
      const sig = `${h.status}:${h.remaining ?? ""}`;
      if (prev !== sig) {
        if (h.status === "warn" && prev !== sig) {
          toast.warning(`${t.label}: quota low (${h.remaining}/${h.limit} left)`);
        } else if (h.status === "dead" && prev && !prev.startsWith("dead")) {
          toast.error(`${t.label} is down (HTTP ${h.httpStatus ?? "?"})`);
        }
        warned[t.key] = sig; // mutate ref-style to avoid re-render loop
      }
    }
  }
  void setWarned;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-bold font-display">Tool Life</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Re-check
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Live status of each provider. Green = healthy, amber = quota almost gone,
        red = dead — replace the key/host below before users notice.
      </p>

      <div className="grid sm:grid-cols-2 gap-2 mt-4">
        {TOOLS.map((t) => {
          const h = data?.[t.key];
          const status = h?.status ?? "unknown";
          const cfg = {
            ok: {
              cls: "border-success/40 bg-success/5",
              dot: "bg-success",
              Icon: CheckCircle2,
              iconCls: "text-success",
              label: "Healthy",
            },
            warn: {
              cls: "border-warning/50 bg-warning/10 animate-pulse",
              dot: "bg-warning",
              Icon: AlertTriangle,
              iconCls: "text-warning",
              label: "Dying soon",
            },
            dead: {
              cls: "border-destructive/50 bg-destructive/10",
              dot: "bg-destructive",
              Icon: XCircle,
              iconCls: "text-destructive",
              label: "Down",
            },
            unknown: {
              cls: "border-border bg-muted/30",
              dot: "bg-muted-foreground",
              Icon: Loader2,
              iconCls: "text-muted-foreground animate-spin",
              label: "Checking…",
            },
          }[status];

          const pct =
            h?.limit && h.limit > 0 && h.remaining != null
              ? Math.max(0, Math.min(100, (h.remaining / h.limit) * 100))
              : null;

          return (
            <button
              key={t.key}
              onClick={() => onPick(t.key)}
              className={`text-left rounded-xl border p-3 transition hover:scale-[1.01] ${cfg.cls}`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="font-semibold text-sm">{t.label}</span>
                <cfg.Icon className={`w-4 h-4 ml-auto ${cfg.iconCls}`} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span>{cfg.label}</span>
                {h?.httpStatus ? <span>· HTTP {h.httpStatus}</span> : null}
                {h?.latencyMs != null ? <span>· {h.latencyMs}ms</span> : null}
              </div>
              {pct !== null && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-background overflow-hidden">
                    <div
                      className={
                        status === "warn"
                          ? "h-full bg-warning"
                          : status === "dead"
                            ? "h-full bg-destructive"
                            : "h-full bg-success"
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {h?.remaining}/{h?.limit} calls left
                  </div>
                </div>
              )}
              {status === "dead" && h?.error && (
                <div className="text-[10px] text-destructive mt-1 line-clamp-2">
                  {h.error}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {dataUpdatedAt > 0 && (
        <div className="text-[10px] text-muted-foreground mt-3">
          Last checked {new Date(dataUpdatedAt).toLocaleTimeString()} · auto-refreshes every minute
        </div>
      )}
    </div>
  );
}

