import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { AvatarDisplay } from "./AvatarDisplay";
import { Button } from "@/components/ui/button";
import { Home, Library, LogIn, MessageCircle, PlusCircle, RotateCw, Rss, ScanLine, Search as SearchIcon, Shield, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { SiteSearch } from "./SiteSearch";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeOverlay } from "./WelcomeOverlay";
import { ReferralCelebration } from "./ReferralCelebration";
import { ContentRemovalToasts } from "./ContentRemovalToasts";
import { HideSeekListener } from "./HideSeekListener";
import { playNewMessageTone } from "@/lib/sounds";
import { playOrNotify } from "@/lib/web-notify";
import { ReportDialog } from "./ReportDialog";
import { getIsAdminUser } from "@/lib/admin-role";

function useActiveChatThreadId() {
  const router = useRouter();
  const loc = router.state.location;
  if (loc.pathname !== "/chat") return null;
  const t = (loc.search as { t?: string } | undefined)?.t;
  return typeof t === "string" && t ? t : null;
}

function useUnreadChatCount(userId: string | undefined, activeThreadId: string | null) {
  const [count, setCount] = useState(0);
  const activeRef = useRef<string | null>(activeThreadId);
  useEffect(() => { activeRef.current = activeThreadId; }, [activeThreadId]);

  useEffect(() => {
    if (!userId) { setCount(0); return; }
    let alive = true;

    const compute = async () => {
      // Threads I'm in (1:1 + groups)
      const [{ data: oneRows }, { data: memberRows }] = await Promise.all([
        supabase.from("dm_threads").select("id").or(`user_a.eq.${userId},user_b.eq.${userId}`).limit(200),
        supabase.from("dm_thread_members").select("thread_id").eq("user_id", userId).limit(200),
      ]);
      const memberIds = (memberRows ?? []).map((r) => r.thread_id);
      let groupRows: any[] = [];
      if (memberIds.length) {
        const { data } = await supabase
          .from("dm_threads")
          .select("id")
          .in("id", memberIds);
        groupRows = data ?? [];
      }
      const ids = Array.from(new Set([...(oneRows ?? []).map((t) => t.id), ...groupRows.map((t) => t.id)]));
      if (!ids.length) { if (alive) setCount(0); return; }
      const { data: reads } = await supabase
        .from("dm_thread_reads")
        .select("thread_id,last_read_at")
        .eq("user_id", userId)
        .in("thread_id", ids);
      const readMap = new Map((reads ?? []).map((r: any) => [r.thread_id, r.last_read_at]));
      const { data: messages } = await supabase
        .from("dm_messages")
        .select("thread_id,sender_id,created_at")
        .in("thread_id", ids)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);
      const active = activeRef.current;
      const unreadThreads = new Set(
        (messages ?? [])
          .filter((m: any) => {
            // WhatsApp logic: a thread you're actively viewing is never unread.
            if (active && m.thread_id === active) return false;
            const last = readMap.get(m.thread_id);
            return !last || new Date(m.created_at) > new Date(last);
          })
          .map((m: any) => m.thread_id),
      ).size;
      if (alive) setCount(unreadThreads);
    };

    compute();
    const onReadStateChanged = () => void compute();
    window.addEventListener("chat-read-state-changed", onReadStateChanged);
    const onFocus = () => void compute();
    const onVisibility = () => { if (document.visibilityState === "visible") void compute(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    // Safety-net polling so the badge updates everywhere even if realtime drops.
    const poll = window.setInterval(() => void compute(), 20000);
    const ch = supabase
      .channel(`unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          const msg = payload.new as { sender_id?: string; body?: string } | undefined;
          const threadId = (payload.new as { thread_id?: string } | undefined)?.thread_id;
          const isOwn = msg?.sender_id === userId;
          const isActive = !!threadId && threadId === activeRef.current;
          compute();
          // WhatsApp logic: no notification sound for your own messages,
          // and no sound when the message arrives in the thread you're viewing.
          if (msg?.sender_id && !isOwn && !isActive) {
            // Look up sender name for a friendlier notification fallback.
            let senderName = "New message";
            try {
              const { data: p } = await supabase
                .from("profiles").select("display_name").eq("id", msg.sender_id).maybeSingle();
              if (p?.display_name) senderName = p.display_name;
            } catch {}
            playOrNotify(
              () => playNewMessageTone(),
              { title: senderName, body: msg.body ?? "Sent you a message", threadId },
            );
          }
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_threads" }, () => compute())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_thread_reads", filter: `user_id=eq.${userId}` },
        () => compute(),
      )
      .subscribe();
    return () => {
      alive = false;
      window.removeEventListener("chat-read-state-changed", onReadStateChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return count;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const activeThreadId = useActiveChatThreadId();
  const unread = useUnreadChatCount(user?.id, activeThreadId);

  // Hide the floating Report button while scrolling; bring it back after 10s of stillness.
  const [reportHidden, setReportHidden] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastY = window.scrollY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 4) {
        setReportHidden(true);
        lastY = y;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setReportHidden(false), 10000);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await router.invalidate();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  // Pull-to-refresh (mobile): only when scrolled to top.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let startY = 0;
    let active = false;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
      active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && window.scrollY <= 0) {
        setPullY(Math.min(80, dy * 0.5));
      }
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      setPullY((y) => {
        if (y >= 60) void doRefresh();
        return 0;
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => getIsAdminUser(user!.id),
  });
  return (
    <div className="min-h-screen flex flex-col">
      <WelcomeOverlay />
      <ReferralCelebration />
      <ContentRemovalToasts />
      <HideSeekListener userId={user?.id} />
      {/* Pull-to-refresh indicator (mobile) */}
      {(pullY > 0 || refreshing) && (
        <div
          className="md:hidden fixed top-14 inset-x-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ transform: `translateY(${refreshing ? 8 : pullY - 8}px)` }}
        >
          <div className="bg-primary text-primary-foreground rounded-full shadow-glow w-9 h-9 flex items-center justify-center">
            <RotateCw className={`w-4 h-4 ${refreshing || pullY >= 60 ? "animate-spin" : ""}`} />
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
            <Logo size={44} />
            <span className="hidden sm:inline text-gradient font-display tracking-tight">StudentsPlug</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-2 text-sm">
            <Link to="/" className="px-3 py-1.5 rounded-md hover:bg-muted">Feed</Link>
            <Link to="/news" className="px-3 py-1.5 rounded-md hover:bg-muted">News</Link>
            <Link to="/faculties" className="px-3 py-1.5 rounded-md hover:bg-muted">Catalog</Link>
            <Link to="/market" className="px-3 py-1.5 rounded-md hover:bg-muted">Market</Link>
            <Link to="/courses" className="px-3 py-1.5 rounded-md hover:bg-muted">Courses</Link>
            <Link to="/chat" className="px-3 py-1.5 rounded-md hover:bg-muted relative">
              Chat
              {unread > 0 && <UnreadDot count={unread} />}
            </Link>
            <Link to="/tools" className="px-3 py-1.5 rounded-md hover:bg-muted">Tools</Link>
            <Link to="/games" className="px-3 py-1.5 rounded-md hover:bg-muted">Games</Link>
            {isAdmin && <Link to="/admin" className="px-3 py-1.5 rounded-md hover:bg-muted text-primary font-semibold flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Admin</Link>}
          </nav>
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <SiteSearch />
          </div>
          <div className="md:hidden flex-1" />
          <button
            type="button"
            onClick={doRefresh}
            disabled={refreshing}
            className="hidden md:inline-flex p-2 rounded-full hover:bg-muted"
            aria-label="Refresh"
            title="Refresh latest content"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setMobileSearch((s) => !s)}
            className="md:hidden p-2 rounded-full hover:bg-muted"
            aria-label="Toggle search"
          >
            {mobileSearch ? <X className="w-5 h-5" /> : <SearchIcon className="w-5 h-5" />}
          </button>
          <Link
            to={user ? "/post/new" : "/login"}
            search={user ? undefined : { redirect: "/post/new" }}
            aria-label="Create a post"
            className="group relative inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-sm font-bold text-primary-foreground bg-gradient-to-br from-primary via-primary to-accent shadow-glow hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition" aria-hidden />
            <span className="relative w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </span>
            <span className="relative hidden sm:inline">Post</span>
          </Link>

          {user ? (
            <Link to="/me" className="flex items-center gap-2 shrink-0">
              <AvatarDisplay avatarKey={profile?.avatar_key ?? "boy-1"} size={36} online={profile?.show_online} photoUrl={(profile as any)?.picture_url} />
              <span className="hidden sm:inline max-w-[120px] truncate text-sm font-semibold">
                {profile?.display_name ?? "Me"}
              </span>
            </Link>
          ) : (
            <Button asChild size="sm">
              <Link to="/login" search={{ redirect: router.state.location.href }}>
                <LogIn className="w-4 h-4 mr-1" /><span className="hidden xs:inline">Sign in</span>
              </Link>
            </Button>
          )}
        </div>
        {mobileSearch && (
          <div className="md:hidden border-t bg-background px-3 py-2">
            <SiteSearch autoFocus placeholder="Search posts, notes, courses…" />
          </div>
        )}
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6">{children}</main>
      <footer className="hidden border-t bg-muted/20 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} StudentsPlug</p>
          <nav aria-label="Legal and company" className="flex items-center gap-4">
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
           <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
           <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
      {/* Floating Report button — anywhere on the app, fires straight to admins. Hidden on chat to avoid blocking composer. Auto-hides while scrolling, returns after 10s of stillness. */}
      {router.state.location.pathname !== "/chat" && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-3 z-40 transition-all duration-300 ease-out ${reportHidden ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}
        >
          <ReportDialog
            target={{ kind: "general" }}
            trigger={
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-destructive/90 text-destructive-foreground shadow-glow hover:bg-destructive">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Report
              </span>
            }
          />
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-1 grid grid-cols-7 text-[10px]">
          {[
            { to: "/", label: "Feed", icon: Home, key: "feed" },
            { to: "/news", label: "News", icon: Rss, key: "news" },
            { to: "/faculties", label: "Catalog", icon: Library, key: "cat" },
            { to: "/market", label: "Market", icon: ShoppingBag, key: "mkt" },
            { to: "/chat", label: "Chat", icon: MessageCircle, key: "chat" },
            { to: "/tools", label: "Tools", icon: ScanLine, key: "tools" },
            { to: user ? "/me" : "/login", label: user ? "Me" : "Sign in", icon: user ? User : LogIn, key: "me" },
          ].map(({ to, label, icon: Icon, key }) => (
            <Link key={key} to={to} className="flex flex-col items-center gap-0.5 py-2 hover:text-primary transition-colors relative">
              <Icon className="w-5 h-5" />
              {key === "chat" && unread > 0 && <UnreadDot count={unread} mobile />}
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function UnreadDot({ count, mobile }: { count: number; mobile?: boolean }) {
  // Badge grows with unread count: each unread bumps size up to a cap.
  const scale = Math.min(1 + count * 0.06, 1.9);
  const sizePx = Math.round((mobile ? 16 : 18) * scale);
  const fontPx = Math.max(9, Math.round(sizePx * 0.55));
  return (
    <span
      aria-label={`${count} unread`}
      style={{ minWidth: sizePx, height: sizePx, fontSize: fontPx, lineHeight: 1 }}
      className={`absolute ${mobile ? "top-0 right-[24%]" : "-top-1 -right-2"} px-1 rounded-full bg-destructive text-destructive-foreground font-bold flex items-center justify-center shadow-card animate-pulse ring-2 ring-background`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
