import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminAiChat, markAdminAiSeen, adminAiUploadImage } from "@/lib/admin-ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles, Trash2, CheckCircle2, XCircle, Radio, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

type Msg = { id: string; role: "user" | "assistant"; content: string; executed?: { name: string; args: any; result: any; error?: string }[]; proactive?: boolean; kind?: string; imageUrl?: string };

const KEY = "admin-ai-history";


export function AdminAiPanel() {
  const send = useServerFn(adminAiChat);
  const upload = useServerFn(adminAiUploadImage);
  const markSeen = useServerFn(markAdminAiSeen);
  const { user, profile } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());


  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-80))); }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  // Backfill recent proactive messages on mount + subscribe to realtime
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("admin_ai_messages")
        .select("id,content,kind,payload,created_at,related_action_id")
        .eq("admin_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(30);
      if (cancelled || !data) return;
      const incoming: Msg[] = data
        .filter((r: any) => !seenIds.current.has(r.id))
        .map((r: any) => {
          seenIds.current.add(r.id);
          return { id: `p-${r.id}`, role: "assistant", content: r.content, proactive: true, kind: r.kind };
        });
      if (incoming.length) setMsgs((m) => [...m, ...incoming]);
    })();

    const ch = supabase
      .channel("admin-ai-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_ai_messages", filter: `admin_user_id=eq.${user.id}` }, (payload) => {
        const r: any = payload.new;
        if (seenIds.current.has(r.id)) return;
        seenIds.current.add(r.id);
        setMsgs((m) => [...m, { id: `p-${r.id}`, role: "assistant", content: r.content, proactive: true, kind: r.kind }]);
        if (r.kind !== "scheduled_done") toast.info("Co-Admin: " + String(r.content).slice(0, 80));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "scheduled_admin_actions", filter: `created_by=eq.${user.id}` }, (payload) => {
        const r: any = payload.new;
        if (r.status === "done" || r.status === "failed") {
          // The hook will also post a message; this is just a subtle toast for instant feedback.
          toast.success(`Scheduled ${r.action}: ${r.status}`, { duration: 2500 });
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  // Mark proactive messages seen when panel is visible
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => { markSeen().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [msgs.length, user?.id, markSeen]);

  async function go() {
    const text = input.trim();
    if ((!text && !pendingImage) || busy) return;
    setBusy(true);
    let attachedUrl: string | undefined;
    let displayImg: string | undefined;
    try {
      if (pendingImage) {
        const up = await upload({ data: { data_url: pendingImage.dataUrl, filename: pendingImage.name } });
        attachedUrl = up.url;
        displayImg = up.url;
      }
      const userText = text || (attachedUrl ? "(image attached)" : "");
      const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: userText, imageUrl: displayImg };
      const next = [...msgs, userMsg];
      setMsgs(next);
      setInput("");
      setPendingImage(null);
      const history = next.filter((m) => !m.proactive).map((m) => ({ role: m.role, content: m.content }));
      const res = await send({ data: { messages: history, attached_image_url: attachedUrl } });
      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.reply || "(no reply)", executed: res.executed }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: `⚠️ ${e?.message ?? String(e)}` }]);
      toast.error(e?.message ?? "Admin AI failed");
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(f: File | null) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setPendingImage({ dataUrl: String(reader.result), name: f.name });
    reader.readAsDataURL(f);
  }


  const clear = () => {
    if (!confirm("Clear admin AI chat history? (Proactive alerts will reappear from the server.)")) return;
    setMsgs([]);
    seenIds.current.clear();
    localStorage.removeItem(KEY);
  };

  const firstName = profile?.display_name?.split(" ")[0] || "there";
  const starters = [
    `Hey ${firstName}, show today's stats`,
    "Find user named Maureen",
    "Remove verification from [name] and add it back in 1 minute",
    "List the 5 most recent pending reports",
    "Grant 100 credits to user [name]",
  ];

  return (
    <div className="bg-card border rounded-3xl shadow-card flex flex-col" style={{ height: "calc(100vh - 240px)", minHeight: 500 }}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold flex items-center gap-1.5">Co-Admin <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-green-600"><Radio className="w-3 h-3 animate-pulse" />live</span></p>
            <p className="text-xs text-muted-foreground">Schedules in seconds. Will message you first if something needs you.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clear}><Trash2 className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <Sparkles className="w-10 h-10 mx-auto text-primary" />
            <div>
              <p className="font-semibold">Hey {firstName} 👋</p>
              <p className="text-sm text-muted-foreground">I'm your co-admin. Tell me what to do, or I'll ping you when something needs attention.</p>
            </div>
            <div className="flex flex-col gap-2 max-w-md mx-auto">
              {starters.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="text-left text-sm px-3 py-2 rounded-xl bg-muted hover:bg-muted/70">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : m.proactive ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted"}`}>
              {m.proactive && <p className="text-[10px] uppercase tracking-wide text-amber-600 mb-1">co-admin · {m.kind ?? "info"}</p>}
              {m.imageUrl && <img src={m.imageUrl} alt="" className="rounded-lg mb-1.5 max-h-40 object-cover" />}
              {m.content}
              {m.executed && m.executed.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {m.executed.map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5 bg-background/50 rounded-lg px-2 py-1">
                      {e.error ? <XCircle className="w-3.5 h-3.5 text-destructive mt-0.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-mono">{e.name}</span>
                        {e.error && <p className="text-destructive">{e.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-3 py-2 text-sm inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t space-y-2">
        {pendingImage && (
          <div className="flex items-center gap-2 bg-muted rounded-xl p-2">
            <img src={pendingImage.dataUrl} alt="" className="w-12 h-12 rounded object-cover" />
            <span className="text-xs flex-1 truncate">{pendingImage.name}</span>
            <button onClick={() => setPendingImage(null)} className="p-1 hover:bg-background rounded"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
          <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={busy} title="Attach image"><ImageIcon className="w-4 h-4" /></Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } }}
            placeholder={pendingImage ? "Caption / instruction (e.g. 'post as banner')…" : `Talk to your co-admin, ${firstName}…`}
            disabled={busy}
          />
          <Button onClick={go} disabled={busy || (!input.trim() && !pendingImage)}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );

}
