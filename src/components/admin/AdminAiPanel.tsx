import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { adminAiChat, markAdminAiSeen, adminAiUploadFile } from "@/lib/admin-ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { playAdminAiReplyChime } from "@/lib/sounds";
import {
  Terminal, Send, Loader2, Trash2, CheckCircle2, XCircle, Radio,
  Image as ImageIcon, Paperclip, X, FileText, FileCode2, Download, Cpu,
  Bell, BellOff,
} from "lucide-react";
import { toast } from "sonner";

const NOTIF_PREF_KEY = "admin-ai-notif-on";

type Attachment = { url: string; name: string; mime: string; kind: "image" | "file"; size: number };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  executed?: { name: string; args: any; result: any; error?: string }[];
  proactive?: boolean;
  kind?: string;
  attachments?: Attachment[];
};

const KEY = "admin-ai-history-v2";
const MAX_ATTACHMENTS = 25;

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (/(java|kotlin|typescript|javascript|python|json|xml|css|html|sql|x-sh|x-c)/.test(mime)) return FileCode2;
  return FileText;
}

function humanSize(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export function AdminAiPanel() {
  const send = useServerFn(adminAiChat);
  const upload = useServerFn(adminAiUploadFile);
  const markSeen = useServerFn(markAdminAiSeen);
  const { user, profile } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seenIds = useRef(new Set<string>());
  const [notifOn, setNotifOn] = useState<boolean>(() => {
    try { return localStorage.getItem(NOTIF_PREF_KEY) !== "0"; } catch { return true; }
  });
  const notifOnRef = useRef(notifOn);
  useEffect(() => { notifOnRef.current = notifOn; try { localStorage.setItem(NOTIF_PREF_KEY, notifOn ? "1" : "0"); } catch {} }, [notifOn]);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-80))); }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => { inputRef.current?.focus(); }, []);

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
        if (notifOnRef.current) { try { playAdminAiReplyChime(); } catch {} }
        if (r.kind !== "scheduled_done") toast.info("Console: " + String(r.content).slice(0, 80));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => { markSeen().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [msgs.length, user?.id, markSeen]);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - pending.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_ATTACHMENTS} attachments per message`); return; }
    const list = Array.from(files).slice(0, remaining);
    setUploading((n) => n + list.length);
    for (const f of list) {
      try {
        if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name}: too large (max 25MB)`); continue; }
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
        });
        const up = await upload({ data: { data_url: dataUrl, filename: f.name, mime: f.type || "application/octet-stream" } });
        setPending((arr) => [...arr, { url: up.url, name: up.filename, mime: up.mime, kind: up.kind, size: up.size }]);
      } catch (e: any) {
        toast.error(`${f.name}: ${e?.message ?? "upload failed"}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function go() {
    const text = input.trim();
    if ((!text && pending.length === 0) || busy) return;
    setBusy(true);
    const atts = pending;
    const userText = text || (atts.length ? `(${atts.length} attachment${atts.length > 1 ? "s" : ""})` : "");
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: userText, attachments: atts };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setPending([]);
    try {
      const history = next.filter((m) => !m.proactive).map((m) => ({ role: m.role, content: m.content }));
      const res = await send({
        data: {
          messages: history,
          attached_image_url: atts.find((a) => a.kind === "image")?.url,
          attachments: atts.map((a) => ({ url: a.url, name: a.name, mime: a.mime, kind: a.kind })),
        },
      });
      setMsgs((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.reply || "(no reply)", executed: res.executed }]);
      if (notifOnRef.current) { try { playAdminAiReplyChime(); } catch {} }
    } catch (e: any) {
      setMsgs((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: `⚠️ ${e?.message ?? String(e)}` }]);
      toast.error(e?.message ?? "Console failed");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  const clear = () => {
    if (!confirm("Clear console history?")) return;
    setMsgs([]);
    seenIds.current.clear();
    localStorage.removeItem(KEY);
  };

  const firstName = profile?.display_name?.split(" ")[0] || "operator";

  // Generated files emitted by tool calls
  function extractGenerated(executed?: Msg["executed"]) {
    if (!executed) return [];
    return executed
      .filter((e) => e.result && e.result.file_url)
      .map((e) => ({
        url: e.result.file_url as string,
        filename: e.result.filename as string,
        mime: (e.result.mime as string) || "application/octet-stream",
        size: (e.result.size as number) || 0,
      }));
  }

  return (
    <div
      className="flex flex-col rounded-2xl border border-emerald-500/30 shadow-2xl shadow-emerald-900/30 overflow-hidden"
      style={{
        height: "calc(100vh - 240px)",
        minHeight: 500,
        background: "linear-gradient(180deg, #0a1f1a 0%, #08121a 50%, #060a14 100%)",
        color: "#d7f5e8",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-emerald-500/20 bg-black/30 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Terminal className="w-5 h-5 text-black" strokeWidth={2.5} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-black animate-pulse" />
          </div>
          <div>
            <p className="font-semibold text-emerald-100 tracking-tight flex items-center gap-1.5">
              Console
              <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-400/80">
                <Cpu className="w-2.5 h-2.5" /> v2
              </span>
            </p>
            <p className="text-[11px] text-emerald-300/60 font-mono flex items-center gap-1.5">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> secure · pro mode
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotifOn((v) => !v)}
            title={notifOn ? "Mute reply sound" : "Unmute reply sound"}
            className="text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/10"
          >
            {notifOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} className="text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[13px]">
        {msgs.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Terminal className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <p className="font-semibold text-emerald-100">Console ready, {firstName}.</p>
              <p className="text-xs text-emerald-300/60 mt-1">Code, write, compose. Attach up to 25 files. Generate Java, Kotlin, XML, PDF, DOCX.</p>
            </div>
            <div className="flex flex-col gap-1.5 max-w-md mx-auto text-left">
              {[
                "Write a Kotlin MainActivity that fetches /api/news and renders a list",
                "Generate a 2-page PDF brief on this quarter's stats",
                "Make a Java class for JWT validation with HS256",
                "Compose a DOCX policy doc for refund handling",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-[12px] px-3 py-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-emerald-200/90 transition"
                >
                  $ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => {
          const generated = extractGenerated(m.executed);
          return (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[88%] rounded-xl px-3 py-2 bg-gradient-to-br from-emerald-600/30 to-cyan-700/30 border border-emerald-400/40 text-emerald-50"
                    : m.proactive
                      ? "max-w-[92%] rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/40 text-amber-100"
                      : "max-w-[92%] rounded-xl px-3 py-2 bg-slate-900/60 border border-emerald-500/15 text-emerald-50/95"
                }
              >
                {m.proactive && (
                  <p className="text-[10px] uppercase tracking-widest text-amber-300 mb-1 font-sans">
                    push · {m.kind ?? "info"}
                  </p>
                )}

                {/* Attachments shown on user bubble */}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    {m.attachments.slice(0, 12).map((a, i) =>
                      a.kind === "image" ? (
                        <img key={i} src={a.url} alt="" className="w-full h-16 object-cover rounded border border-emerald-400/30" />
                      ) : (
                        <div key={i} className="flex flex-col items-center justify-center h-16 rounded border border-emerald-400/30 bg-black/30 px-1 text-center">
                          <FileText className="w-4 h-4 text-emerald-300" />
                          <span className="text-[9px] truncate w-full mt-0.5">{a.name}</span>
                        </div>
                      ),
                    )}
                    {m.attachments.length > 12 && (
                      <div className="flex items-center justify-center h-16 rounded border border-emerald-400/30 bg-black/30 text-xs">
                        +{m.attachments.length - 12}
                      </div>
                    )}
                  </div>
                )}

                {/* Message body */}
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none font-sans
                    prose-headings:text-emerald-100 prose-strong:text-emerald-100
                    prose-code:text-amber-200 prose-code:bg-black/40 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-black/60 prose-pre:border prose-pre:border-emerald-500/20
                    prose-a:text-cyan-300">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                )}

                {/* Generated files download chips */}
                {generated.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {generated.map((f, i) => {
                      const Icon = fileIcon(f.mime);
                      const isImage = f.mime.startsWith("image/");
                      if (isImage) {
                        return (
                          <div key={i} className="space-y-1">
                            <img src={f.url} alt={f.filename} className="rounded-lg border border-emerald-400/40 max-h-80 w-auto" />
                            <a
                              href={f.url}
                              download={f.filename}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 hover:text-emerald-100"
                            >
                              <Download className="w-3 h-3" /> {f.filename}{f.size > 0 ? ` · ${humanSize(f.size)}` : ""}
                            </a>
                          </div>
                        );
                      }
                      return (
                        <a
                          key={i}
                          href={f.url}
                          download={f.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/40 transition group"
                        >
                          <Icon className="w-4 h-4 text-emerald-300 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-mono truncate text-emerald-100">{f.filename}</p>
                            {f.size > 0 && <p className="text-[10px] text-emerald-300/60">{humanSize(f.size)}</p>}
                          </div>
                          <Download className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200" />
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Tool execution log */}
                {m.executed && m.executed.length > 0 && (
                  <div className="mt-2 space-y-1 text-[11px] font-sans">
                    {m.executed.map((e, i) => (
                      <div key={i} className="flex items-start gap-1.5 bg-black/30 rounded px-2 py-1 border border-emerald-500/10">
                        {e.error ? <XCircle className="w-3 h-3 text-red-400 mt-0.5" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-emerald-300">{e.name}</span>
                          {e.error && <p className="text-red-300">{e.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex justify-start">
            <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl px-3 py-2 inline-flex items-center gap-2 text-emerald-300/90 font-mono text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> processing…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="p-2.5 border-t border-emerald-500/20 bg-black/40 space-y-2">
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {pending.map((a, i) => (
              <div key={i} className="relative group">
                {a.kind === "image" ? (
                  <img src={a.url} alt="" className="w-12 h-12 object-cover rounded border border-emerald-400/40" />
                ) : (
                  <div className="w-12 h-12 rounded border border-emerald-400/40 bg-black/40 flex flex-col items-center justify-center px-0.5 text-center">
                    <FileText className="w-3.5 h-3.5 text-emerald-300" />
                    <span className="text-[8px] truncate w-full text-emerald-200/90">{a.name.split(".").pop()}</span>
                  </div>
                )}
                <button
                  onClick={() => setPending((arr) => arr.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center"
                  type="button"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {uploading > 0 && (
              <div className="w-12 h-12 rounded border border-emerald-400/30 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
              </div>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt,.md,.json,.xml,.java,.kt,.kts,.gradle,.ts,.tsx,.js,.jsx,.py,.html,.css,.sql,.sh,.csv,.yaml,.yml,.svg,.c,.cpp,.h,.go,.rs,.swift,.php"
            hidden
            onChange={(e) => { onPickFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={busy || pending.length >= MAX_ATTACHMENTS}
            title={`Attach files (max ${MAX_ATTACHMENTS})`}
            className="shrink-0 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } }}
            placeholder={pending.length ? "Instruction for attachments…" : `> ${firstName}, what's the task?`}
            disabled={busy}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none bg-black/40 border-emerald-500/30 text-emerald-50 placeholder:text-emerald-400/40 font-mono text-[13px] focus-visible:ring-emerald-400/60"
          />
          <Button
            onClick={go}
            disabled={busy || (!input.trim() && pending.length === 0)}
            className="shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-black font-semibold shadow-lg shadow-emerald-500/30"
            size="icon"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {pending.length > 0 && (
          <p className="text-[10px] text-emerald-400/60 font-mono px-1">
            {pending.length}/{MAX_ATTACHMENTS} attached · max 25MB each
          </p>
        )}
      </div>
    </div>
  );
}
