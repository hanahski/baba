import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Crown,
  Edit3,
  Globe,
  MapPin,
  MessageCircle,
  MoreVertical,
  RotateCw,
  Search,
  Send,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getOrCreateDmThread } from "@/lib/dm";
import { CampusLocationView } from "@/components/CampusLocationView";
import { plugAiChat } from "@/lib/plug-ai.functions";
import { Sparkles, ImagePlus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { RichText } from "@/components/RichText";
import { playNewMessageTone } from "@/lib/sounds";
import { playOrNotify, ensureNotificationPermission, notificationsGranted } from "@/lib/web-notify";
import { isOnline } from "@/lib/presence";

const PLUG_AI_THREAD_ID = "plug-ai";
const PLUG_AI_STORAGE_KEY = (uid: string) => `plug-ai-msgs:${uid}`;
const DM_NOTIF_KEY = "dm-notif-on";

function dmNotifEnabled(): boolean {
  try { return localStorage.getItem(DM_NOTIF_KEY) !== "0"; } catch { return true; }
}
function setDmNotifEnabled(on: boolean) {
  try { localStorage.setItem(DM_NOTIF_KEY, on ? "1" : "0"); } catch {}
}

type PendingMsg = { id: string; sender_id: string; body: string; created_at: string; read_at: null; _pending: true; _error?: boolean };
const PENDING_KEY = (uid: string, tid: string) => `dm-pending:${uid}:${tid}`;
function loadPending(meId: string, threadId: string): PendingMsg[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY(meId, threadId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function savePending(meId: string, threadId: string, list: PendingMsg[]) {
  try {
    if (list.length) localStorage.setItem(PENDING_KEY(meId, threadId), JSON.stringify(list));
    else localStorage.removeItem(PENDING_KEY(meId, threadId));
  } catch {}
}

type ChatSearch = { t?: string; tab?: "dms" | "campus" | "nearby"; newGroup?: boolean; groupName?: string };

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  validateSearch: (s: Record<string, unknown>): ChatSearch => ({
    t: typeof s.t === "string" ? s.t : undefined,
    tab: s.tab === "campus" || s.tab === "nearby" || s.tab === "dms" ? s.tab : undefined,
    newGroup: s.newGroup === true || s.newGroup === "1" || s.newGroup === "true" ? true : undefined,
    groupName: typeof s.groupName === "string" ? s.groupName : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Chat Plug — StudentsPlug" },
      { name: "description", content: "Private DMs, group chats and campus chat for EBSU students." },
    ],
  }),
});

type ProfileLite = { id: string; display_name: string; avatar_key: string; show_online: boolean; last_seen_at: string };

type ThreadRow = {
  id: string;
  user_a: string | null;
  user_b: string | null;
  last_message_at: string;
  is_group: boolean;
  name: string | null;
  photo_url: string | null;
  owner_id: string | null;
  other?: ProfileLite | null;
  memberCount?: number;
  last?: { body: string; sender_id: string; created_at: string } | null;
  unread?: number;
};

type MemberLite = ProfileLite & { role?: string };

function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activeTab = search.tab ?? (search.t ? "dms" : "dms");
  const activeThread = search.t ?? null;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center py-16">
          <MessageCircle className="w-12 h-12 mx-auto text-primary mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Opening Chat Plug…</p>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto text-center py-16">
          <MessageCircle className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-display font-bold">Chat Plug</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to send and receive private messages.</p>
          <Button asChild className="mt-4">
            <Link to="/login" search={{ redirect: "/chat" }}>Sign in to chat</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold">Chat Plug</h1>
            <p className="text-xs text-muted-foreground">DMs · Groups · Campus · Nearby</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <TabButton active={activeTab === "dms"} onClick={() => navigate({ to: "/chat", search: { tab: "dms" } })}>
              <MessageCircle className="w-3.5 h-3.5" /> Chats
            </TabButton>
            <TabButton active={activeTab === "campus"} onClick={() => navigate({ to: "/chat", search: { tab: "campus" } })}>
              <Globe className="w-3.5 h-3.5" /> Campus
            </TabButton>
            <TabButton active={activeTab === "nearby"} onClick={() => navigate({ to: "/chat", search: { tab: "nearby" } })}>
              <MapPin className="w-3.5 h-3.5" /> Nearby
            </TabButton>
          </div>
        </div>

        {activeTab === "dms" && <DmsView meId={user.id} activeThread={activeThread} initialNewGroup={search.newGroup} initialGroupName={search.groupName} />}
        {activeTab === "campus" && <CampusLocationView meId={user.id} mode="campus" />}
        {activeTab === "nearby" && <CampusLocationView meId={user.id} mode="nearby" />}
      </div>
    </AppShell>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 transition ${
        active ? "bg-background shadow-sm" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- DMs + Groups: thread list + open thread ---------------- */

function DmsView({ meId, activeThread, initialNewGroup, initialGroupName }: { meId: string; activeThread: string | null; initialNewGroup?: boolean; initialGroupName?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: threads = [] } = useQuery<ThreadRow[]>({
    queryKey: ["dm-threads", meId],
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // 1:1 threads I'm in
      const { data: oneRows, error: oneErr } = await supabase
        .from("dm_threads")
        .select("id,user_a,user_b,last_message_at,is_group,name,photo_url,owner_id")
        .or(`user_a.eq.${meId},user_b.eq.${meId}`)
        .order("last_message_at", { ascending: false })
        .limit(100);
      if (oneErr) throw oneErr;

      // Group threads I'm a member of
      const { data: myMemberRows } = await supabase
        .from("dm_thread_members")
        .select("thread_id")
        .eq("user_id", meId);
      const memberThreadIds = (myMemberRows ?? []).map((r) => r.thread_id);
      let groupRows: any[] = [];
      if (memberThreadIds.length) {
        const { data: gr } = await supabase
          .from("dm_threads")
          .select("id,user_a,user_b,last_message_at,is_group,name,photo_url,owner_id")
          .in("id", memberThreadIds)
          .eq("is_group", true)
          .order("last_message_at", { ascending: false });
        groupRows = gr ?? [];
      }

      const rows = [...(oneRows ?? []), ...groupRows] as ThreadRow[];
      // De-dup
      const seen = new Set<string>();
      const merged = rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
      merged.sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at));

      const otherIds = Array.from(
        new Set(
          merged
            .filter((r) => !r.is_group)
            .map((r) => (r.user_a === meId ? r.user_b : r.user_a))
            .filter((x): x is string => !!x),
        ),
      );
      const tIds = merged.map((r) => r.id);
      const groupIds = merged.filter((r) => r.is_group).map((r) => r.id);

      const [profilesRes, lastsRes, memCountRes] = await Promise.all([
        otherIds.length
          ? supabase.from("profiles").select("id,display_name,avatar_key,show_online,last_seen_at").in("id", otherIds)
          : Promise.resolve({ data: [] as any[] }),
        tIds.length
          ? supabase
              .from("dm_messages")
              .select("thread_id,body,sender_id,created_at")
              .in("thread_id", tIds)
              .order("created_at", { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [] as any[] }),
        groupIds.length
          ? supabase.from("dm_thread_members").select("thread_id").in("thread_id", groupIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      // Unread counts per thread (Facebook-style blue badge).
      const readsRes = tIds.length
        ? await supabase.from("dm_thread_reads").select("thread_id,last_read_at").eq("user_id", meId).in("thread_id", tIds)
        : { data: [] as any[] };
      const readMap = new Map<string, string>();
      for (const r of readsRes.data ?? []) readMap.set(r.thread_id, r.last_read_at);
      const unreadMap = new Map<string, number>();
      for (const m of lastsRes.data ?? []) {
        if (m.sender_id === meId) continue;
        const last = readMap.get(m.thread_id);
        if (last && new Date(m.created_at) <= new Date(last)) continue;
        unreadMap.set(m.thread_id, (unreadMap.get(m.thread_id) ?? 0) + 1);
      }
      const pMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
      const lastMap = new Map<string, any>();
      for (const m of lastsRes.data ?? []) if (!lastMap.has(m.thread_id)) lastMap.set(m.thread_id, m);
      const countMap = new Map<string, number>();
      for (const m of memCountRes.data ?? []) countMap.set(m.thread_id, (countMap.get(m.thread_id) ?? 0) + 1);

      return merged.map((r) => {
        const otherId = !r.is_group ? (r.user_a === meId ? r.user_b : r.user_a) : null;
        return {
          ...r,
          other: otherId ? (pMap.get(otherId) ?? null) : null,
          last: lastMap.get(r.id) ?? null,
          memberCount: r.is_group ? (countMap.get(r.id) ?? 0) : undefined,
          unread: unreadMap.get(r.id) ?? 0,
        };
      });
    },
  });

  const [notifOn, setNotifOn] = useState<boolean>(() => dmNotifEnabled());
  useEffect(() => { setDmNotifEnabled(notifOn); }, [notifOn]);
  const notifOnRef = useRef(notifOn);
  useEffect(() => { notifOnRef.current = notifOn; }, [notifOn]);
  const toggleNotif = async () => {
    const next = !notifOn;
    setNotifOn(next);
    if (next && !notificationsGranted()) {
      // Best-effort permission request — works because this runs inside a user gesture.
      await ensureNotificationPermission();
    }
  };

  // Build a stable comma-joined thread-id list so the realtime channel filter
  // scopes INSERT events to threads the user actually belongs to (avoids
  // listening to every dm_messages row in the database).
  const threadIdsKey = useMemo(
    () => threads.map((t) => t.id).sort().join(","),
    [threads],
  );

  useEffect(() => {
    const ids = threadIdsKey ? threadIdsKey.split(",") : [];
    const ch = supabase
      .channel(`dm-threads-${meId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, () =>
        qc.invalidateQueries({ queryKey: ["dm-threads", meId] }),
      );
    if (ids.length) {
      ch.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=in.(${ids.join(",")})`,
        },
        async (payload) => {
          qc.invalidateQueries({ queryKey: ["dm-threads", meId] });
          const row: any = payload.new;
          if (row?.sender_id && row.sender_id !== meId && notifOnRef.current) {
            let senderName = "New message";
            try {
              const { data: p } = await supabase
                .from("profiles").select("display_name").eq("id", row.sender_id).maybeSingle();
              if (p?.display_name) senderName = p.display_name;
            } catch {}
            playOrNotify(
              () => playNewMessageTone(),
              { title: senderName, body: row.body ?? "Sent you a message", threadId: row.thread_id },
            );
          }
        },
      );
    }
    ch.on("postgres_changes", { event: "*", schema: "public", table: "dm_thread_members" }, () =>
      qc.invalidateQueries({ queryKey: ["dm-threads", meId] }),
    ).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [meId, qc, threadIdsKey]);

  // Periodically re-tick presence so "active now" badges expire/refresh
  // every 30s without requiring user input.
  const [, setPresenceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPresenceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  // Search filter for the conversation list.
  const [search, setSearch] = useState("");
  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const title = t.is_group ? (t.name ?? "") : (t.other?.display_name ?? "");
      return title.toLowerCase().includes(q);
    });
  }, [threads, search]);

  // Active-Now strip: 1:1 partners who are online right now, dedup by user id.
  const activeNow = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ threadId: string; userId: string; name: string; avatarKey: string | null; unread: number }> = [];
    for (const t of threads) {
      if (t.is_group || !t.other?.id) continue;
      if (seen.has(t.other.id)) continue;
      if (!isOnline(t.other.show_online, t.other.last_seen_at)) continue;
      seen.add(t.other.id);
      out.push({
        threadId: t.id,
        userId: t.other.id,
        name: t.other.display_name ?? "Student",
        avatarKey: t.other.avatar_key ?? null,
        unread: t.unread ?? 0,
      });
    }
    return out;
  }, [threads]);

  const open = (id: string) => navigate({ to: "/chat", search: { tab: "dms", t: id } });
  const back = () => navigate({ to: "/chat", search: { tab: "dms" } });

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-12rem)]">
      <aside className={`${activeThread ? "hidden md:block" : "block"} bg-card border rounded-2xl overflow-hidden md:flex md:flex-col relative`}>
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleNotif}
              title={notifOn ? "Mute message sounds" : "Unmute message sounds"}
              aria-label={notifOn ? "Mute message sounds" : "Unmute message sounds"}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            >
              {notifOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-destructive" />}
            </button>
            <NewChatButton meId={meId} onCreated={open} initialMode={initialNewGroup ? "group" : undefined} initialGroupName={initialGroupName} />
          </div>
        </div>
        {activeNow.length > 0 && (
          <div className="px-3 py-2 border-b bg-muted/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Active Now
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {activeNow.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => open(u.threadId)}
                  title={u.name}
                  className="relative shrink-0 group"
                >
                  <AvatarDisplay avatarKey={u.avatarKey ?? "boy-1"} size={44} online />
                  {u.unread > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none ring-2 ring-card">
                      {u.unread > 9 ? "9+" : u.unread}
                    </span>
                  )}
                  <span className="block text-[10px] mt-1 max-w-[52px] truncate text-center text-muted-foreground group-hover:text-foreground">
                    {u.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <button
            onClick={() => open(PLUG_AI_THREAD_ID)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition border-b ${
              activeThread === PLUG_AI_THREAD_ID ? "bg-muted" : ""
            }`}
          >
            <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground flex items-center justify-center shrink-0 shadow-glow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm truncate flex items-center gap-1">
                  Plug AI
                  <span className="text-[9px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">AI</span>
                </span>
              </div>
              <p className="text-xs truncate text-muted-foreground">Super-smart assistant · Ask me anything</p>
            </div>
          </button>
          {threads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center px-4 py-8">
              No conversations yet. Tap <b>New</b> to start a chat or create a group.
            </p>
          ) : visibleThreads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center px-4 py-8">
              No chats match "{search}".
            </p>
          ) : (
            visibleThreads.map((t) => {
              const isActive = t.id === activeThread;
              const preview = t.last?.body ?? "Say hi 👋";
              const mine = t.last?.sender_id === meId;
              const title = t.is_group
                ? (t.name ?? "Group")
                : (t.other?.display_name ?? "Student");
              return (
                <button
                  key={t.id}
                  onClick={() => open(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition ${
                    isActive ? "bg-muted" : ""
                  } border-b last:border-b-0`}
                >
                  {t.is_group ? (
                    <div className="w-[42px] h-[42px] rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : (
                    <AvatarDisplay
                      avatarKey={t.other?.avatar_key ?? "boy-1"}
                      size={42}
                      online={!!(t.other?.show_online && t.other?.last_seen_at && Date.now() - new Date(t.other.last_seen_at).getTime() < 3 * 60_000)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{title}</span>
                      {t.last && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(t.last.created_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${(t.unread ?? 0) > 0 && !isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {t.is_group && <span className="opacity-70">{t.memberCount ?? 0} members · </span>}
                        {mine && "You: "}
                        {preview}
                      </p>
                      {(t.unread ?? 0) > 0 && !isActive && (
                        <span className="ml-2 shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold leading-none">
                          {(t.unread ?? 0) > 99 ? "99+" : t.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className={`${activeThread ? "block" : "hidden md:block"} bg-card border rounded-2xl overflow-hidden`}>
        {activeThread ? (
          activeThread === PLUG_AI_THREAD_ID ? (
            <PlugAiPane meId={meId} onBack={back} />
          ) : (
            <ThreadPane meId={meId} threadId={activeThread} onBack={back} />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            Pick a conversation on the left, or start a new one.
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadPane({ meId, threadId, onBack }: { meId: string; threadId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const myName = profile?.display_name ?? "Student";
  const [text, setText] = useState("");
  const [pendingMsgs, setPendingMsgs] = useState<PendingMsg[]>(() => loadPending(meId, threadId));
  const [membersOpen, setMembersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const justSentRef = useRef(false);
  // Persist pending queue so unsent messages survive reloads.
  useEffect(() => { savePending(meId, threadId, pendingMsgs); }, [meId, threadId, pendingMsgs]);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  // sender_id -> { name, expiresAt }
  const [typers, setTypers] = useState<Record<string, { name: string; expiresAt: number }>>({});
  const markThreadRead = useCallback(async () => {
    const now = new Date().toISOString();
    await supabase
      .from("dm_thread_reads")
      .upsert(
        { user_id: meId, thread_id: threadId, last_read_at: now },
        { onConflict: "user_id,thread_id" },
      );
    await supabase
      .from("dm_messages")
      .update({ read_at: now })
      .eq("thread_id", threadId)
      .neq("sender_id", meId)
      .is("read_at", null);
    qc.invalidateQueries({ queryKey: ["dm-threads", meId] });
    window.dispatchEvent(new Event("chat-read-state-changed"));
  }, [meId, threadId, qc]);

  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    const ch = typingChannelRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event: "typing", payload: { user_id: meId, name: myName } });
  };

  const { data } = useQuery({
    queryKey: ["dm", threadId],
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: thread } = await supabase
        .from("dm_threads")
        .select("id,user_a,user_b,is_group,name,photo_url,owner_id")
        .eq("id", threadId)
        .maybeSingle();
      if (!thread) return { thread: null, msgs: [], other: null, members: [], senders: new Map<string, ProfileLite>() };

      const isGroup = thread.is_group;
      const otherId = !isGroup ? (thread.user_a === meId ? thread.user_b : thread.user_a) : null;

      const [{ data: msgs }, otherRes, membersRes] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("id,sender_id,body,created_at,read_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true })
          .limit(500),
        otherId
          ? supabase.from("profiles").select("id,display_name,avatar_key,show_online,last_seen_at").eq("id", otherId).maybeSingle()
          : Promise.resolve({ data: null }),
        isGroup
          ? supabase.from("dm_thread_members").select("user_id,role").eq("thread_id", threadId)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      let memberProfiles: MemberLite[] = [];
      if (isGroup && (membersRes.data ?? []).length) {
        const ids = (membersRes.data ?? []).map((m: any) => m.user_id);
        const { data: prof } = await supabase
          .from("profiles")
          .select("id,display_name,avatar_key,show_online,last_seen_at")
          .in("id", ids);
        const roleMap = new Map((membersRes.data ?? []).map((m: any) => [m.user_id, m.role]));
        memberProfiles = ((prof ?? []) as ProfileLite[]).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "member" }));
      }

      const senderIds = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
      let senderMap = new Map<string, ProfileLite>();
      if (isGroup && senderIds.length) {
        const have = new Map(memberProfiles.map((p) => [p.id, p]));
        const missing = senderIds.filter((id) => !have.has(id));
        if (missing.length) {
          const { data: extra } = await supabase
            .from("profiles")
            .select("id,display_name,avatar_key,show_online,last_seen_at")
            .in("id", missing);
          for (const p of extra ?? []) have.set(p.id, p as ProfileLite);
        }
        senderMap = have;
      }

      return { thread, msgs: msgs ?? [], other: otherRes.data as ProfileLite | null, members: memberProfiles, senders: senderMap };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`dm-thread-${threadId}`, { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["dm", threadId] });
          if (payload.eventType === "INSERT") {
            const row: any = payload.new;
            if (row?.sender_id && row.sender_id !== meId && dmNotifEnabled()) {
              // If the tab is visible AND on this thread, just play sound; otherwise
              // also fire a browser notification so the user is notified even when
              // audio is blocked (iOS) or the tab is hidden.
              playOrNotify(
                () => playNewMessageTone(),
                { title: "New message", body: row.body ?? "", threadId },
              );
            }
            // Immediately mark as read since we're viewing the thread.
            if (row?.sender_id && row.sender_id !== meId && document.visibilityState === "visible") {
              void markThreadRead();
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_thread_members", filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ["dm", threadId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_thread_reads", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          // When the other party's read pointer advances, mark our sent messages
          // as delivered/read instantly without waiting for a refetch.
          const row: any = payload.new;
          if (!row || row.user_id === meId) return;
          const lastReadAt: string = row.last_read_at;
          qc.setQueryData(["dm", threadId], (prev: any) => {
            if (!prev) return prev;
            const next = (prev.msgs ?? []).map((m: any) =>
              m.sender_id === meId && !m.read_at && new Date(m.created_at) <= new Date(lastReadAt)
                ? { ...m, read_at: lastReadAt }
                : m,
            );
            return { ...prev, msgs: next };
          });
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { user_id?: string; name?: string } | undefined;
        if (!p?.user_id || p.user_id === meId) return;
        setTypers((prev) => ({
          ...prev,
          [p.user_id!]: { name: p.name || "Someone", expiresAt: Date.now() + 3500 },
        }));
      })
      .subscribe();
    typingChannelRef.current = ch;
    // Mark thread as read when opened, and again when new messages arrive while viewing
    void markThreadRead();
    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [threadId, qc, meId, markThreadRead]);

  // Expire stale typers every second
  useEffect(() => {
    const i = setInterval(() => {
      setTypers((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.expiresAt > now) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const activeTypers = useMemo(
    () => Object.values(typers).filter((t) => t.expiresAt > Date.now()),
    [typers, data?.msgs.length],
  );

  const visibleMsgs = useMemo(() => {
    const saved = data?.msgs ?? [];
    if (!pendingMsgs.length) return saved;
    const savedIds = new Set(saved.map((m: any) => m.id));
    // Dedupe: if a saved row matches a pending message (same sender, same body,
    // within a 60s window), drop the pending so we don't double-render after
    // the realtime INSERT lands before our insert call returns.
    const matched = (p: PendingMsg) => saved.some((s: any) =>
      s.sender_id === p.sender_id &&
      s.body === p.body &&
      Math.abs(+new Date(s.created_at) - +new Date(p.created_at)) < 60_000,
    );
    const stillPending = pendingMsgs.filter((m) => !savedIds.has(m.id) && !matched(m));
    return [...saved, ...stillPending].sort(
      (a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at),
    );
  }, [data?.msgs, pendingMsgs]);

  // Reload pending queue when switching threads.
  useEffect(() => {
    setPendingMsgs(loadPending(meId, threadId));
  }, [threadId, meId]);

  // Re-mark as read whenever the message list grows while we're on this thread
  useEffect(() => {
    if (!data?.msgs.length) return;
    void markThreadRead();
  }, [data?.msgs.length, markThreadRead]);

  // Track whether the user is near the bottom — don't yank the view if
  // they've scrolled up to read history.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = visibleMsgs[visibleMsgs.length - 1] as any | undefined;
    const lastIsMine = !!last && last.sender_id === meId;
    if (justSentRef.current || isNearBottomRef.current || lastIsMine) {
      el.scrollTo({ top: el.scrollHeight, behavior: justSentRef.current ? "auto" : "smooth" });
      justSentRef.current = false;
    }
  }, [visibleMsgs.length, meId]);

  // Try to actually persist a pending message to the DB. Marks _error on failure.
  const attemptSend = useCallback(async (p: PendingMsg) => {
    setPendingMsgs((prev) => prev.map((m) => m.id === p.id ? { ...m, _error: false } : m));
    const { data: saved, error } = await supabase
      .from("dm_messages")
      .insert({ thread_id: threadId, sender_id: meId, body: p.body })
      .select("id,sender_id,body,created_at,read_at")
      .single();
    if (error) {
      setPendingMsgs((prev) => prev.map((m) => m.id === p.id ? { ...m, _error: true } : m));
      if (navigator.onLine) toast.error(error.message);
      return;
    }
    setPendingMsgs((prev) => prev.filter((m) => m.id !== p.id));
    qc.setQueryData(["dm", threadId], (prev: any) => {
      if (!prev) return prev;
      const withoutTemp = (prev.msgs ?? []).filter((m: any) => m.id !== p.id);
      if (saved && withoutTemp.some((m: any) => m.id === saved.id)) return { ...prev, msgs: withoutTemp };
      return { ...prev, msgs: [...withoutTemp, saved] };
    });
    const ts = saved?.created_at ?? p.created_at;
    qc.setQueryData(["dm-threads", meId], (prev: any) => Array.isArray(prev)
      ? prev.map((t: any) => t.id === threadId ? { ...t, last_message_at: ts, last: { body: p.body, sender_id: meId, created_at: ts } } : t)
      : prev);
    void supabase.from("dm_threads").update({ last_message_at: ts }).eq("id", threadId);
    void markThreadRead();
  }, [meId, threadId, qc, markThreadRead]);

  // Flush any queued messages when we come back online or the thread mounts.
  useEffect(() => {
    const flush = () => {
      if (!navigator.onLine) return;
      setPendingMsgs((prev) => {
        for (const p of prev) void attemptSend(p);
        return prev;
      });
    };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [attemptSend, threadId]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: PendingMsg = { id: tempId, sender_id: meId, body, created_at: now, read_at: null, _pending: true };
    setText("");
    setPendingMsgs((prev) => [...prev, optimistic]);
    justSentRef.current = true;
    isNearBottomRef.current = true;
    qc.setQueryData(["dm-threads", meId], (prev: any) => Array.isArray(prev)
      ? prev.map((t: any) => t.id === threadId ? { ...t, last_message_at: now, last: { body, sender_id: meId, created_at: now } } : t)
      : prev);
    if (!navigator.onLine) {
      // Will auto-flush when the `online` event fires.
      return;
    }
    await attemptSend(optimistic);
  };

  const retry = (id: string) => {
    const p = pendingMsgs.find((m) => m.id === id);
    if (!p) return;
    justSentRef.current = true;
    void attemptSend(p);
  };

  const discardPending = (id: string) => {
    setPendingMsgs((prev) => prev.filter((m) => m.id !== id));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("dm_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["dm", threadId] });
  };

  const leaveGroup = async () => {
    if (!confirm("Leave this group?")) return;
    const { error } = await supabase.rpc("remove_dm_group_member", { _thread_id: threadId, _member_id: meId });
    if (error) return toast.error(error.message);
    toast.success("Left group");
    qc.invalidateQueries({ queryKey: ["dm-threads", meId] });
    onBack();
  };

  const thread = data?.thread;
  const isGroup = !!thread?.is_group;
  const other = data?.other ?? null;
  const online = !isGroup && other?.show_online && other?.last_seen_at && Date.now() - new Date(other.last_seen_at).getTime() < 3 * 60_000;
  const senders = data?.senders ?? new Map<string, ProfileLite>();
  const memberIds = (data?.members ?? []).map((m) => m.id);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-3 py-2 border-b">
        <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        {isGroup ? (
          <button
            onClick={() => setMembersOpen((v) => !v)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{thread?.name ?? "Group"}</div>
              <div className="text-[11px] text-muted-foreground">
                {data?.members.length ?? 0} members · WhatsApp-style group
              </div>
            </div>
          </button>
        ) : (
          <>
            <AvatarDisplay avatarKey={other?.avatar_key ?? "boy-1"} size={36} online={!!online} />
            <Link to="/profile/$id" params={{ id: other?.id ?? "" }} className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate hover:underline">{other?.display_name ?? "Student"}</div>
              <div className="text-[11px] text-muted-foreground">{online ? "Online now" : "Tap to view profile"}</div>
            </Link>
          </>
        )}
        {isGroup && thread && (
          <GroupActions
            threadId={threadId}
            name={thread.name ?? "Group"}
            isOwner={thread.owner_id === meId}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["dm", threadId] });
              qc.invalidateQueries({ queryKey: ["dm-threads", meId] });
            }}
            onLeave={leaveGroup}
          />
        )}
      </header>

      {isGroup && membersOpen && (
        <div className="border-b bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Members</span>
            <button onClick={() => setMembersOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.members ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1.5 bg-card border rounded-full pl-1 pr-2 py-1 text-xs"
              >
                <Link to="/profile/$id" params={{ id: m.id }} className="flex items-center gap-1.5 min-w-0 hover:underline">
                  <AvatarDisplay avatarKey={m.avatar_key} size={20} />
                  <span className="truncate max-w-[100px]">{m.display_name}</span>
                </Link>
                {m.id === thread?.owner_id && <Crown className="w-3 h-3 text-primary" />}
                {thread?.owner_id === meId && m.id !== meId && <RemoveMemberButton threadId={threadId} memberId={m.id} memberName={m.display_name} />}
              </div>
            ))}
          </div>
          {thread?.owner_id === meId && <AddMembersButton threadId={threadId} existingIds={memberIds} />}
          <Button size="sm" variant="destructive" onClick={leaveGroup} className="w-full">
            Leave group
          </Button>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto bg-muted/30 p-3 space-y-2">
        {visibleMsgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi 👋</p>
        )}
        {visibleMsgs.map((m: any) => {
          const mine = m.sender_id === meId;
          const sender = isGroup ? senders.get(m.sender_id) : null;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {isGroup && !mine && (
                <AvatarDisplay avatarKey={sender?.avatar_key ?? "boy-1"} size={28} className="mt-auto" />
              )}
              <div className="max-w-[78%] group">
                {isGroup && !mine && (
                  <div className="text-[10px] font-semibold text-primary mb-0.5 px-1">{sender?.display_name ?? "Student"}</div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                    mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                  } ${m._error ? "ring-2 ring-destructive/60" : ""} ${m._pending && !m._error ? "opacity-80" : ""}`}
                >
                  {m.body}
                </div>
                <div className={`text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  {mine && (
                    m._error ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="w-3 h-3" aria-label="Failed to send" />
                        <button onClick={() => retry(m.id)} className="underline hover:no-underline inline-flex items-center gap-0.5">
                          <RotateCw className="w-3 h-3" /> Retry
                        </button>
                        <button onClick={() => discardPending(m.id)} className="hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : m._pending ? (
                      <span aria-label={navigator.onLine ? "Sending" : "Queued — will send when online"}>
                        {navigator.onLine ? "Sending…" : "Queued"}
                      </span>
                    ) : m.read_at ? (
                      <CheckCheck className="w-3.5 h-3.5 text-primary" aria-label="Read" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 opacity-50" aria-label="Delivered" />
                    )
                  )}
                  {mine && !m._pending && !m._error && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {activeTypers.length > 0 && (
        <div className="px-3 pb-1 -mt-1 text-[11px] text-muted-foreground flex items-center gap-2 animate-fade-in">
          <span className="inline-flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
          </span>
          <span className="truncate">
            {activeTypers.length === 1
              ? `${activeTypers[0].name} is typing…`
              : `${activeTypers.length} people are typing…`}
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t p-2 flex gap-2 bg-card"
      >
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) sendTyping();
          }}
          placeholder="Type a message…"
          maxLength={2000}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck
          enterKeyHint="send"
          name="chat-message"
          inputMode="text"
        />
        <Button type="submit" disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

/* ---------------- New chat / new group popover ---------------- */

function NewChatButton({ meId, onCreated, initialMode, initialGroupName }: { meId: string; onCreated: (threadId: string) => void; initialMode?: "dm" | "group"; initialGroupName?: string }) {
  const [open, setOpen] = useState(!!initialMode);
  const [mode, setMode] = useState<"dm" | "group">(initialMode ?? "dm");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [groupName, setGroupName] = useState(initialGroupName ?? "");
  const [picked, setPicked] = useState<ProfileLite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const reset = () => {
    setOpen(false);
    setQ("");
    setGroupName("");
    setPicked([]);
    setMode("dm");
  };

  const { data: results = [] } = useQuery<ProfileLite[]>({
    queryKey: ["dm-search", debounced],
    enabled: open && debounced.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_key,show_online,last_seen_at")
        .ilike("display_name", `%${debounced}%`)
        .neq("id", meId)
        .limit(20);
      return (data ?? []) as ProfileLite[];
    },
  });

  const startDm = async (otherId: string) => {
    try {
      const tid = await getOrCreateDmThread(meId, otherId);
      reset();
      onCreated(tid);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't start chat");
    }
  };

  const togglePick = (p: ProfileLite) => {
    setPicked((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name) return toast.error("Give the group a name");
    if (picked.length < 1) return toast.error("Add at least one member");
    setSaving(true);
    try {
      const { data: threadId, error } = await supabase.rpc("create_dm_group", {
        _name: name,
        _member_ids: picked.map((p) => p.id),
      });
      if (error) throw error;
      toast.success("Group created");
      reset();
      onCreated(threadId);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't create group");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4 mr-1" /> New
      </Button>
    );
  }

  return (
    <div className="absolute z-30 top-12 left-3 right-3 bg-card border rounded-xl shadow-glow p-3 max-h-[70vh] overflow-hidden flex flex-col">
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-2">
        <button
          onClick={() => setMode("dm")}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 ${mode === "dm" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <MessageCircle className="w-3 h-3" /> Direct
        </button>
        <button
          onClick={() => setMode("group")}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs flex items-center justify-center gap-1 ${mode === "group" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <Users className="w-3 h-3" /> Group
        </button>
      </div>

      {mode === "group" && (
        <Input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name (e.g. CSC 200L)"
          maxLength={60}
          className="mb-2"
        />
      )}

      {mode === "group" && picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {picked.map((p) => (
            <span key={p.id} className="bg-primary/10 text-primary text-[11px] rounded-full pl-1 pr-2 py-0.5 flex items-center gap-1">
              <AvatarDisplay avatarKey={p.avatar_key} size={16} />
              {p.display_name}
              <button onClick={() => togglePick(p)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…" className="pl-8" />
      </div>

      <div className="mt-2 overflow-y-auto flex-1">
        {debounced.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Type a name to search students.</p>
        )}
        {debounced.length > 0 && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No students match "{debounced}".</p>
        )}
        {results.map((r) => {
          const isPicked = picked.some((p) => p.id === r.id);
          return (
            <button
              key={r.id}
              onClick={() => (mode === "dm" ? startDm(r.id) : togglePick(r))}
              className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left ${isPicked ? "bg-primary/5" : ""}`}
            >
              <AvatarDisplay avatarKey={r.avatar_key} size={32} />
              <span className="text-sm font-medium truncate flex-1">{r.display_name}</span>
              {mode === "group" && isPicked && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mt-2">
        <Button variant="ghost" size="sm" onClick={reset} className="flex-1">
          Cancel
        </Button>
        {mode === "group" && (
          <Button size="sm" onClick={createGroup} disabled={saving || !groupName.trim() || picked.length === 0} className="flex-1">
            {saving ? "Creating…" : `Create (${picked.length})`}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddMembersButton({ threadId, existingIds }: { threadId: string; existingIds: string[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const { data: results = [] } = useQuery<ProfileLite[]>({
    queryKey: ["dm-add-search", debounced, existingIds.join(",")],
    enabled: open && debounced.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_key,show_online,last_seen_at")
        .ilike("display_name", `%${debounced}%`)
        .limit(20);
      return ((data ?? []) as ProfileLite[]).filter((p) => !existingIds.includes(p.id));
    },
  });

  const add = async (userId: string) => {
    const { error } = await supabase.rpc("add_dm_group_member", { _thread_id: threadId, _member_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Member added");
    qc.invalidateQueries({ queryKey: ["dm", threadId] });
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <UserPlus className="w-4 h-4 mr-1" /> Add members
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search to add…" className="pl-8" />
      </div>
      <div className="max-h-48 overflow-y-auto bg-card rounded-lg border">
        {results.map((r) => (
          <button key={r.id} onClick={() => add(r.id)} className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left">
            <AvatarDisplay avatarKey={r.avatar_key} size={28} />
            <span className="text-sm font-medium truncate flex-1">{r.display_name}</span>
            <UserPlus className="w-4 h-4 text-primary" />
          </button>
        ))}
        {debounced.length > 0 && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No matches.</p>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setQ(""); }} className="w-full">
        Done
      </Button>
    </div>
  );
}

function RemoveMemberButton({ threadId, memberId, memberName }: { threadId: string; memberId: string; memberName: string }) {
  const qc = useQueryClient();
  const remove = async () => {
    if (!confirm(`Remove ${memberName} from this group?`)) return;
    const { error } = await supabase.rpc("remove_dm_group_member", { _thread_id: threadId, _member_id: memberId });
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    qc.invalidateQueries({ queryKey: ["dm", threadId] });
  };
  return (
    <button onClick={remove} className="ml-0.5 text-muted-foreground hover:text-destructive" title={`Remove ${memberName}`} aria-label={`Remove ${memberName}`}>
      <UserMinus className="w-3 h-3" />
    </button>
  );
}

function GroupActions({ threadId, name, isOwner, onChanged, onLeave }: { threadId: string; name: string; isOwner: boolean; onChanged: () => void; onLeave: () => void }) {
  const rename = async () => {
    const next = prompt("Group name", name)?.trim();
    if (!next || next === name) return;
    const { error } = await supabase.rpc("rename_dm_group", { _thread_id: threadId, _name: next });
    if (error) return toast.error(error.message);
    toast.success("Group renamed");
    onChanged();
  };
  return (
    <div className="flex items-center gap-1">
      {isOwner && (
        <button type="button" onClick={rename} className="p-2 rounded-full hover:bg-muted" aria-label="Rename group" title="Rename group">
          <Edit3 className="w-4 h-4" />
        </button>
      )}
      <button type="button" onClick={onLeave} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive" aria-label="Leave group" title="Leave group">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ---------------- Plug AI: built-in super-smart assistant ---------------- */

type AiMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // data URLs attached to this user message
  created_at: string;
};

const PLUG_AI_PREFILL_KEY = "plug-ai-prefill";

function fileToDataUrlAi(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function PlugAiPane({ meId, onBack }: { meId: string; onBack: () => void }) {
  const callAi = useServerFn(plugAiChat);
  const [msgs, setMsgs] = useState<AiMsg[]>([]);
  const [text, setText] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const storageKey = PLUG_AI_STORAGE_KEY(meId);

  // total images already in conversation (for the 25 cap)
  const existingImgCount = useMemo(
    () => msgs.reduce((n, m) => n + (m.images?.length ?? 0), 0),
    [msgs],
  );
  // Plug AI is limited to ONE image per message for clarity + speed.
  const remainingImgSlots = Math.max(0, 1 - pendingImages.length);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMsgs(parsed);
      }
    } catch {/* ignore */}
    setHydrated(true);
    // Prefill from OCR ("Ask Plug AI" button)
    try {
      const pre = sessionStorage.getItem(PLUG_AI_PREFILL_KEY);
      if (pre) {
        setText(pre);
        sessionStorage.removeItem(PLUG_AI_PREFILL_KEY);
      }
    } catch {/* ignore */}
  }, [storageKey]);

  useEffect(() => {
    // CRITICAL: never persist before we've loaded existing history, otherwise
    // the initial empty render wipes out the saved conversation.
    if (!hydrated) return;
    // Strip image data URLs before persisting to avoid blowing localStorage quota.
    try {
      const safe = msgs.slice(-80).map((m) =>
        m.images && m.images.length
          ? { ...m, images: undefined, content: `${m.content}\n[${m.images.length} image${m.images.length === 1 ? "" : "s"} attached]` }
          : m,
      );
      localStorage.setItem(storageKey, JSON.stringify(safe));
    } catch {/* ignore */}
  }, [msgs, storageKey, hydrated]);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, thinking]);

  const pickImages = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    if (remainingImgSlots <= 0) {
      toast.error("Only 1 image at a time — remove the current one to attach another");
      return;
    }
    const slice = arr.slice(0, remainingImgSlots);
    if (arr.length > 1) toast.info("Plug AI accepts 1 image per message");
    try {
      const urls = await Promise.all(slice.map(fileToDataUrlAi));
      setPendingImages((p) => [...p, ...urls]);
    } catch {
      toast.error("Could not read one of the images");
    }
  };

  const removePending = (i: number) =>
    setPendingImages((p) => p.filter((_, idx) => idx !== i));

  const send = async () => {
    const body = text.trim();
    if ((!body && pendingImages.length === 0) || thinking) return;
    const imgs = pendingImages;
    setText("");
    setPendingImages([]);
    const userMsg: AiMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: body || (imgs.length ? "(image)" : ""),
      images: imgs.length ? imgs : undefined,
      created_at: new Date().toISOString(),
    };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setThinking(true);
    try {
      const payload = next.map((m) => {
        if (m.role === "user" && m.images && m.images.length) {
          return {
            role: m.role,
            content: [
              ...(m.content ? [{ type: "text" as const, text: m.content }] : []),
              ...m.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
            ],
          };
        }
        return { role: m.role, content: m.content };
      });
      const { reply } = await callAi({ data: { messages: payload } });
      setMsgs((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply || "(no response)",
          created_at: new Date().toISOString(),
        },
      ]);
      try { playNewMessageTone(); } catch {}
    } catch (e: any) {
      toast.error(e?.message ?? "Plug AI failed");
      setMsgs((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${e?.message ?? "Something went wrong. Try again."}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const clear = () => {
    if (!confirm("Clear this conversation with Plug AI?")) return;
    setMsgs([]);
    setPendingImages([]);
    try { localStorage.removeItem(storageKey); } catch {/* ignore */}
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-3 py-2 border-b">
        <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground flex items-center justify-center shrink-0 shadow-glow">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate flex items-center gap-1.5">
            Plug AI
            <span className="text-[9px] uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">AI</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Super-intelligent · Problem solver · 1 image / message
          </div>
        </div>
        {msgs.length > 0 && (
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded">
            Clear
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/30 p-3 space-y-2">
        {msgs.length === 0 && (
          <div className="text-center py-8 px-4">
            <Sparkles className="w-10 h-10 mx-auto text-primary mb-2" />
            <h3 className="font-display font-bold text-lg">Hi, I'm Plug AI 👋</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Ask me anything — homework, code, exam prep, essays, life advice. Attach up to 25 images and I'll read them too.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                "Explain photosynthesis simply",
                "Help me debug a Python error",
                "Plan my exam revision week",
                "Summarise this topic for me",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="text-[11px] bg-card border rounded-full px-3 py-1.5 hover:bg-primary/5 hover:border-primary/30 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground flex items-center justify-center shrink-0 mt-auto">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="max-w-[82%] space-y-1.5">
                {m.images && m.images.length > 0 && (
                  <div className={`grid gap-1.5 ${m.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {m.images.map((src, i) => (
                      <img key={i} src={src} alt="attachment" className="rounded-lg max-h-48 object-cover border" />
                    ))}
                  </div>
                )}
                {m.content && (
                  mine ? (
                    <div className="px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap bg-primary text-primary-foreground rounded-br-sm">
                      {m.content}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-2xl text-sm break-words bg-card border rounded-bl-sm">
                      <RichText>{m.content}</RichText>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground flex items-center justify-center shrink-0 mt-auto">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-3 py-2 rounded-2xl bg-card border rounded-bl-sm">
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {pendingImages.length > 0 && (
        <div className="border-t bg-card px-2 pt-2 flex gap-2 flex-wrap">
          {pendingImages.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removePending(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border text-xs inline-flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t p-2 flex gap-2 bg-card items-center"
      >
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          
          className="hidden"
          onChange={(e) => { void pickImages(e.target.files); e.target.value = ""; }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => imgInputRef.current?.click()}
          disabled={thinking || remainingImgSlots === 0}
          title={remainingImgSlots === 0 ? "Remove the attached image to add another" : "Attach an image"}
        >
          <ImagePlus className="w-5 h-5" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Plug AI anything…"
          maxLength={4000}
          autoComplete="off"
          enterKeyHint="send"
          disabled={thinking}
        />
        <Button type="submit" disabled={(!text.trim() && pendingImages.length === 0) || thinking}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

