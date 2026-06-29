import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import {
  Shield, Trash2, ShoppingBag, FileText, Users, LayoutDashboard,
  Inbox, Image as ImageIcon, BadgeCheck, Star, Sparkles, Plug, Ban, CheckCircle2,
  BookOpen, ShieldCheck, Ticket, Wand2, Newspaper, Coins, ScanLine, Library, GraduationCap, Tag,
} from "lucide-react";
import { ToolEditor } from "@/components/admin/ToolEditor";
import { ToolPricesPanel } from "@/components/admin/ToolPricesPanel";
import { AdminAiPanel } from "@/components/admin/AdminAiPanel";
import { ToolAiPanel } from "@/components/admin/ToolAiPanel";
import { EbsuNewsPanel } from "@/components/admin/EbsuNewsPanel";
import { resolveBannerUrls } from "@/lib/banner-url";
import { claimSeedAdminRole, getIsAdminUser } from "@/lib/admin-role";

export const Route = createFileRoute("/admin")({ component: AdminPanel });

type Tab = "dashboard" | "ai" | "toolai" | "ebsunews" | "users" | "applications" | "verifications" | "posts" | "listings" | "tickets" | "scans" | "catalogue" | "marketcats" | "banners" | "tools" | "prices";


function AdminPanel() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      await claimSeedAdminRole();
      return getIsAdminUser(user.id);
    },
  });

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading]);

  if (loading || roleLoading) return <AppShell><p>Loading…</p></AppShell>;
  if (!isAdmin) return <AppShell><div className="text-center py-16"><Shield className="w-12 h-12 mx-auto text-muted-foreground mb-2" /><p className="font-semibold">Admin access required</p></div></AppShell>;

  const tabs: { k: Tab; label: string; icon: any }[] = [
    { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { k: "ai", label: "Admin AI", icon: Sparkles },
    { k: "toolai", label: "Tool AI", icon: Wand2 },
    { k: "ebsunews", label: "EBSU News AI", icon: Newspaper },
    { k: "users", label: "Users", icon: Users },
    { k: "applications", label: "Applications", icon: Inbox },
    { k: "verifications", label: "Verifications", icon: GraduationCap },
    
    { k: "posts", label: "Posts", icon: FileText },
    { k: "listings", label: "Listings", icon: ShoppingBag },
    { k: "tickets", label: "Tickets", icon: Ticket },
    { k: "scans", label: "Scan Log", icon: ScanLine },
    { k: "catalogue", label: "Catalogue", icon: Library },
    { k: "marketcats", label: "Market categories", icon: Tag },
    { k: "banners", label: "Banners", icon: ImageIcon },
    { k: "tools", label: "Tools", icon: Wand2 },
    { k: "prices", label: "Tool Prices", icon: Coins },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="bg-card border rounded-3xl p-5 shadow-card">
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Shield className="w-6 h-6 text-primary" />Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Full control of users, content, badges, and banners.</p>
          <div className="mt-4 flex gap-2 flex-wrap">
            {tabs.map(({ k, label, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1.5 transition ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>

        {tab === "dashboard" && <AdminDashboard />}
        {tab === "ai" && <AdminAiPanel />}
        {tab === "toolai" && <ToolAiPanel />}
        {tab === "ebsunews" && <EbsuNewsPanel />}
        {tab === "users" && <AdminUsers />}
        {tab === "applications" && <AdminApplications />}
        {tab === "verifications" && <AdminVerifications />}
        
        {tab === "posts" && <AdminPosts />}
        {tab === "listings" && <AdminListings />}
        {tab === "tickets" && <AdminTickets />}
        {tab === "scans" && <AdminScanLog />}
        {tab === "catalogue" && <AdminCatalogue />}
        {tab === "marketcats" && <AdminMarketCategories />}
        {tab === "banners" && <AdminBanners />}
        {tab === "tools" && <ToolEditor />}
        {tab === "prices" && <ToolPricesPanel />}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="bg-card border rounded-2xl p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" />{label}</div>
      <div className="text-2xl font-bold font-display mt-1">{value ?? "—"}</div>
    </div>
  );
}

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await supabase.rpc("admin_dashboard_stats" as any)).data as any,
    refetchInterval: 30_000,
  });
  const ranks = (stats?.rank_distribution ?? {}) as Record<string, number>;
  const recentLogins = (stats?.recent_logins ?? []) as Array<any>;
  const recentSignups = (stats?.recent_signups ?? []) as Array<any>;
  const timeAgo = (iso: string) => {
    if (!iso) return "—";
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Online now" value={stats?.online_count} icon={Users} />
        <StatCard label="Signups today" value={stats?.signups_today} icon={Sparkles} />
        <StatCard label="Signups 7d" value={stats?.signups_7d} icon={Sparkles} />
        <StatCard label="Total users" value={stats?.total_users} icon={Users} />
        <StatCard label="Total posts" value={stats?.total_posts} icon={FileText} />
        <StatCard label="Total listings" value={stats?.total_listings} icon={ShoppingBag} />
        <StatCard label="Tickets sold" value={stats?.total_tickets_sold} icon={Ticket} />
        <StatCard label="Pending badges" value={stats?.pending_applications} icon={Inbox} />
        
      </div>
      <div className="bg-card border rounded-2xl p-4">
        <h3 className="font-semibold mb-2">Rank distribution</h3>
        <div className="grid grid-cols-5 gap-2 text-center">
          {["newbie", "normal", "active", "legend", "pro"].map((t) => (
            <div key={t} className="bg-muted rounded-xl p-2">
              <div className="text-xs text-muted-foreground capitalize">{t}</div>
              <div className="text-lg font-bold">{ranks[t] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Recently active</h3>
          <ul className="divide-y -mx-2">
            {recentLogins.length === 0 && <li className="text-sm text-muted-foreground px-2 py-3">No activity yet.</li>}
            {recentLogins.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-2 py-2 gap-2">
                <Link to="/profile/$id" params={{ id: u.id }} className="text-sm font-medium hover:text-primary truncate">{u.display_name}</Link>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(u.last_seen_at)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />New users</h3>
          <ul className="divide-y -mx-2">
            {recentSignups.length === 0 && <li className="text-sm text-muted-foreground px-2 py-3">No signups yet.</li>}
            {recentSignups.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-2 py-2 gap-2">
                <div className="min-w-0">
                  <Link to="/profile/$id" params={{ id: u.id }} className="block text-sm font-medium hover:text-primary truncate">{u.display_name}</Link>
                  <p className="text-[10px] text-muted-foreground truncate">{u.email ?? "—"}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(u.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [q, setQ] = useState("");
  const { data, refetch } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id,display_name,email,credits,approved_post_count,rank_tier,rank_step,is_verified,is_star,is_legit,is_sure_plug,status").order("approved_post_count", { ascending: false }).limit(100);
      if (q) query = query.or(`display_name.ilike.%${q}%,email.ilike.%${q}%`);
      return (await query).data ?? [];
    },
  });
  const { data: adminIds } = useQuery({
    queryKey: ["admin-ids"],
    queryFn: async () => new Set(((await supabase.from("user_roles").select("user_id").eq("role", "admin")).data ?? []).map((r) => r.user_id)),
  });

  const setBadge = async (uid: string, badge: string, value: boolean) => {
    const { error } = await supabase.rpc("admin_set_badge" as any, { _user_id: uid, _badge: badge, _value: value });
    if (error) toast.error(error.message); else { toast.success(`${badge} ${value ? "granted" : "revoked"}`); refetch(); }
  };
  const setStatus = async (uid: string, status: "active" | "blocked" | "deactivated") => {
    const { error } = await supabase.rpc("admin_set_user_status" as any, { _user_id: uid, _status: status });
    if (error) toast.error(error.message); else { toast.success(`User ${status}`); refetch(); }
  };
  const setRank = async (uid: string, tier: string, step: number) => {
    const { error } = await supabase.rpc("admin_set_rank" as any, { _user_id: uid, _tier: tier, _step: step });
    if (error) toast.error(error.message); else { toast.success("Rank set"); refetch(); }
  };
  const toggleAdmin = async (uid: string, currentlyAdmin: boolean) => {
    const op = currentlyAdmin
      ? supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin")
      : supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
    const { error } = await op;
    if (error) toast.error(error.message); else { toast.success(currentlyAdmin ? "Admin removed" : "Admin granted"); refetch(); }
  };

  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" />
      <div className="space-y-2">
        {(data ?? []).map((u: any) => {
          const isUserAdmin = adminIds?.has(u.id) ?? false;
          return (
            <div key={u.id} className="bg-card border rounded-2xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link to="/profile/$id" params={{ id: u.id }} className="font-medium hover:text-primary line-clamp-1">
                    {u.display_name}
                    {isUserAdmin && <span className="ml-1 text-xs text-primary">[admin]</span>}
                    {u.status !== "active" && <span className="ml-1 text-xs text-destructive">[{u.status}]</span>}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{u.email} · {u.approved_post_count} posts · {u.credits} cr · {u.rank_tier} {u.rank_step}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { k: "verified", label: "Auth", icon: BadgeCheck, on: u.is_verified },
                  { k: "star", label: "Star", icon: Star, on: u.is_star },
                  { k: "legit", label: "Legit", icon: CheckCircle2, on: u.is_legit },
                  { k: "sure_plug", label: "Plug", icon: Plug, on: u.is_sure_plug },
                ].map(({ k, label, icon: Icon, on }) => (
                  <button key={k} onClick={() => setBadge(u.id, k, !on)}
                    className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1 border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent"}`}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <select className="text-xs bg-muted rounded-full px-2 py-1" value={u.rank_tier}
                  onChange={(e) => setRank(u.id, e.target.value, u.rank_step)}>
                  {["newbie", "normal", "active", "legend", "pro"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <select className="text-xs bg-muted rounded-full px-2 py-1" value={u.rank_step}
                  onChange={(e) => setRank(u.id, u.rank_tier, Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>Step {s}</option>)}
                </select>
                {u.status === "active" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "blocked")}><Ban className="w-3 h-3 mr-1" />Block</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "deactivated")}>Deactivate</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "active")}><CheckCircle2 className="w-3 h-3 mr-1" />Reactivate</Button>
                )}
                <Button size="sm" variant={isUserAdmin ? "destructive" : "outline"} onClick={() => toggleAdmin(u.id, isUserAdmin)}>
                  {isUserAdmin ? "Revoke admin" : "Make admin"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminApplications() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-apps"],
    queryFn: async () => (await supabase.from("badge_applications").select("*,profiles:user_id(display_name,email)").order("created_at", { ascending: false })).data ?? [],
  });
  const review = async (id: string, userId: string, badge: string, status: "approved" | "rejected") => {
    if (status === "approved") {
      const { error } = await supabase.rpc("admin_set_badge" as any, { _user_id: userId, _badge: badge, _value: true });
      if (error) return toast.error(error.message);
    }
    const { error } = await supabase.from("badge_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Application ${status}`); refetch(); }
  };
  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No applications yet.</p>}
      {(data ?? []).map((a: any) => (
        <div key={a.id} className="bg-card border rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{a.profiles?.display_name ?? "—"} <span className="text-xs text-muted-foreground">· {a.badge}</span></p>
              <p className="text-xs text-muted-foreground">{a.profiles?.email}{a.reg_number && ` · Reg: ${a.reg_number}`}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "pending" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : a.status === "approved" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-destructive/20 text-destructive"}`}>{a.status}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{a.reason}</p>
          {a.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => review(a.id, a.user_id, a.badge, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => review(a.id, a.user_id, a.badge, "rejected")}>Reject</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminPosts() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => (await supabase.from("posts").select("id,title,post_type,created_at,author_id,is_official,profiles:author_id(display_name)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const del = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refetch(); }
  };
  const toggleOfficial = async (id: string, current: boolean) => {
    const { error } = await supabase.from("posts").update({ is_official: !current } as any).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(!current ? "Marked official" : "Unmarked"); refetch(); }
  };
  const toNote = async (id: string) => {
    const { data, error } = await supabase.rpc("admin_post_to_note" as any, { _post_id: id });
    if (error) toast.error(error.message); else toast.success("Converted to study note · " + String(data).slice(0, 8));
  };
  return (
    <div className="bg-card border rounded-2xl divide-y">
      {(data ?? []).map((p: any) => (
        <div key={p.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <Link to="/post/$id" params={{ id: p.id }} className="font-medium hover:text-primary line-clamp-1">
              {p.is_official && <ShieldCheck className="inline w-3.5 h-3.5 mr-1 text-primary" />}
              {p.title}
            </Link>
            <p className="text-xs text-muted-foreground">{p.post_type} · {p.profiles?.display_name ?? "—"}</p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => toggleOfficial(p.id, !!p.is_official)} title="Mark as official admin post">
              <ShieldCheck className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => toNote(p.id)} title="Convert to study note">
              <BookOpen className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(p.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}


function AdminListings() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => (await supabase.from("market_listings").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  const del = async (id: string) => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("market_listings").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refetch(); }
  };
  return (
    <div className="bg-card border rounded-2xl divide-y">
      {(data ?? []).map((l) => (
        <div key={l.id} className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to="/market/$id" params={{ id: l.id }} className="font-medium hover:text-primary line-clamp-1">{l.title}</Link>
            <p className="text-xs text-muted-foreground">{l.category} · ₦{Number(l.price).toLocaleString()} {l.is_sold && "· SOLD"}</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => del(l.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
}

type LinkKind = "internal" | "external" | "profile" | "post" | "book" | "course" | "ticket" | "none";

const LINK_KIND_OPTIONS: { value: LinkKind; label: string; hint: string; placeholder: string; prefix?: string }[] = [
  { value: "none", label: "No link", hint: "Banner won't be clickable", placeholder: "" },
  { value: "internal", label: "Page on this site", hint: "Any path on Students Plug (e.g. /games or /tools)", placeholder: "/tools" },
  { value: "external", label: "External website", hint: "Full URL starting with https://", placeholder: "https://example.com" },
  { value: "profile", label: "User profile", hint: "Paste a user ID — links to their profile", placeholder: "uuid…", prefix: "/profile/" },
  { value: "post", label: "Post", hint: "Post ID — links to the post page", placeholder: "post-id", prefix: "/post/" },
  { value: "book", label: "Book / Novel / Comic", hint: "Library book ID", placeholder: "book-id", prefix: "/books/read/" },
  { value: "course", label: "Course", hint: "Course ID", placeholder: "course-id", prefix: "/course/" },
  { value: "ticket", label: "Event ticket", hint: "Ticket ID", placeholder: "ticket-id", prefix: "/tickets/" },
];

function buildLinkUrl(kind: LinkKind, value: string): string {
  const v = value.trim();
  if (!v || kind === "none") return "";
  if (kind === "internal") return v.startsWith("/") || /^https?:\/\//i.test(v) ? v : `/${v}`;
  if (kind === "external") return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  const opt = LINK_KIND_OPTIONS.find((o) => o.value === kind);
  return opt?.prefix ? `${opt.prefix}${v}` : v;
}

type BannerLayout = "image-bg" | "image-left" | "image-right" | "image-top" | "text-only" | "split";
type BannerVariant = "auto" | "light" | "dark";
const LAYOUT_OPTIONS: { v: BannerLayout; label: string }[] = [
  { v: "image-bg", label: "Image background" },
  { v: "image-top", label: "Image on top" },
  { v: "image-left", label: "Image left" },
  { v: "image-right", label: "Image right" },
  { v: "split", label: "Split diagonal" },
  { v: "text-only", label: "Text only" },
];

function AdminBanners() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const rows = (await supabase.from("banner_slides").select("*").order("sort_order", { ascending: true })).data ?? [];
      return resolveBannerUrls(rows as any[]);
    },
  });

  // CTR analytics
  const { data: ctr } = useQuery({
    queryKey: ["admin-banner-ctr"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("banner_events").select("banner_id, kind");
      const map = new Map<string, { impressions: number; clicks: number }>();
      (data ?? []).forEach((e: any) => {
        const m = map.get(e.banner_id) ?? { impressions: 0, clicks: 0 };
        if (e.kind === "impression") m.impressions++;
        else if (e.kind === "click") m.clicks++;
        map.set(e.banner_id, m);
      });
      return map;
    },
  });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [linkKind, setLinkKind] = useState<LinkKind>("none");
  const [linkValue, setLinkValue] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewRatio, setPreviewRatio] = useState<number | null>(null);
  const [layout, setLayout] = useState<BannerLayout>("image-bg");
  const [accent, setAccent] = useState("#0ea5e9");
  const [variant, setVariant] = useState<BannerVariant>("auto");
  const [publishAt, setPublishAt] = useState("");
  const [expireAt, setExpireAt] = useState("");

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage.from("banners").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365);
      setImagePath(path);
      setImageUrl(signed?.signedUrl ?? "");
      const im = new Image();
      im.onload = () => setPreviewRatio(im.width / im.height);
      if (signed?.signedUrl) im.src = signed.signedUrl;
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setUploading(false); }
  };

  const finalLinkUrl = buildLinkUrl(linkKind, linkValue);
  const linkOpt = LINK_KIND_OPTIONS.find((o) => o.value === linkKind)!;

  const add = async () => {
    if (!title) return toast.error("Title required");
    if (layout !== "text-only" && !imageUrl) return toast.error("Image required for this layout");
    const stored = imagePath || imageUrl;
    const { error } = await supabase.from("banner_slides").insert({
      title,
      subtitle,
      image_url: stored || null,
      link_url: finalLinkUrl || null,
      cta_label: ctaLabel.trim() || null,
      layout,
      accent: accent || null,
      variant,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      expire_at: expireAt ? new Date(expireAt).toISOString() : null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Banner added");
      setTitle(""); setSubtitle(""); setImageUrl(""); setImagePath("");
      setLinkKind("none"); setLinkValue(""); setCtaLabel("");
      setPreviewRatio(null); setLayout("image-bg"); setVariant("auto");
      setPublishAt(""); setExpireAt("");
      refetch();
    }
  };
  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("banner_slides").update({ is_active: !is_active }).eq("id", id);
    refetch();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("banner_slides").delete().eq("id", id);
    refetch();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const list = (data ?? []) as any[];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    await Promise.all([
      supabase.from("banner_slides").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("banner_slides").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-2xl p-3 space-y-3">
        <h3 className="font-semibold">Add new banner</h3>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Subtitle (optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />

        <div>
          <label className="block text-sm font-medium mb-1">Layout</label>
          <select value={layout} onChange={(e) => setLayout(e.target.value as BannerLayout)} className="w-full h-10 px-3 rounded-md border bg-background text-sm">
            {LAYOUT_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Accent colour</label>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-full rounded-md border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Text theme</label>
            <select value={variant} onChange={(e) => setVariant(e.target.value as BannerVariant)} className="w-full h-10 px-3 rounded-md border bg-background text-sm">
              <option value="auto">Auto</option>
              <option value="light">Light text</option>
              <option value="dark">Dark text</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-1">Publish at (optional)</label>
            <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expire at (optional)</label>
            <input type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} className="w-full h-10 px-3 rounded-md border bg-background text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Banner image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
          <p className="text-[11px] text-muted-foreground mt-1">Any aspect ratio works — it auto-fits the carousel.</p>
        </div>
        <Input placeholder="…or paste image URL" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImagePath(""); setPreviewRatio(null); }} />

        {imageUrl && (
          <div className="rounded-xl overflow-hidden border bg-muted">
            <div className="aspect-[16/7] w-full relative">
              <img src={imageUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <p className="text-[11px] text-muted-foreground p-2">
              Preview at home carousel size{previewRatio ? ` · source ${previewRatio.toFixed(2)}:1` : ""}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <label className="block text-sm font-medium">Where should tapping this banner take people?</label>
          <select
            value={linkKind}
            onChange={(e) => { setLinkKind(e.target.value as LinkKind); setLinkValue(""); }}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm"
          >
            {LINK_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">{linkOpt.hint}</p>
          {linkKind !== "none" && (
            <>
              <Input
                placeholder={linkOpt.placeholder}
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
              />
              {finalLinkUrl && (
                <p className="text-[11px] text-muted-foreground break-all">
                  Final URL: <span className="font-mono">{finalLinkUrl}</span>
                </p>
              )}
              <Input
                placeholder='Button label (e.g. "Read more", "Open")'
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
              />
            </>
          )}
        </div>

        <Button onClick={add} disabled={uploading || !title}>Add banner</Button>
      </div>

      <div className="space-y-2">
        {(data ?? []).map((b: any, idx: number) => {
          const stats = ctr?.get(b.id);
          const imp = stats?.impressions ?? 0;
          const clk = stats?.clicks ?? 0;
          const rate = imp > 0 ? ((clk / imp) * 100).toFixed(1) : "0.0";
          return (
            <div key={b.id} className="bg-card border rounded-2xl p-3 flex items-center gap-3">
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="w-16 h-16 object-cover rounded-xl" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">text</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{b.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{b.subtitle ?? ""}</p>
                <p className="text-[11px] text-muted-foreground">
                  {b.layout ?? "image-bg"} · {b.variant ?? "auto"}
                  {b.publish_at && ` · from ${new Date(b.publish_at).toLocaleDateString()}`}
                  {b.expire_at && ` · until ${new Date(b.expire_at).toLocaleDateString()}`}
                </p>
                <p className="text-[11px] text-primary">{imp} impressions · {clk} clicks · {rate}% CTR</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => move(idx, 1)} disabled={idx === (data?.length ?? 0) - 1}>↓</Button>
              </div>
              <Button size="sm" variant="outline" onClick={() => toggle(b.id, b.is_active)}>{b.is_active ? "Hide" : "Show"}</Button>
              <Button size="sm" variant="destructive" onClick={() => del(b.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function AdminTickets() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ticket-sales"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("ticket_purchases")
        .select("id, ticket_id, buyer_id, price_paid, qr_token, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const rows = purchases ?? [];
      const ticketIds = [...new Set(rows.map((r: any) => r.ticket_id))];
      const buyerIds = [...new Set(rows.map((r: any) => r.buyer_id))];
      const [{ data: tickets }, { data: buyers }] = await Promise.all([
        ticketIds.length
          ? supabase.from("tickets").select("id,title,uploader_id,pay_mode,photo_url").in("id", ticketIds)
          : Promise.resolve({ data: [] as any[] }),
        buyerIds.length
          ? supabase.from("profiles").select("id,display_name").in("id", buyerIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const tMap = new Map((tickets ?? []).map((t: any) => [t.id, t]));
      const bMap = new Map((buyers ?? []).map((b: any) => [b.id, b]));
      return rows.map((r: any) => ({ ...r, ticket: tMap.get(r.ticket_id), buyer: bMap.get(r.buyer_id) }));
    },
  });

  // Live updates — any new scan/purchase shows up immediately
  useEffect(() => {
    const ch = supabase
      .channel("admin-ticket-purchases")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_purchases" },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-ticket-sales"] });
          toast.success("New ticket sale", { id: "new-ticket-sale" });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        () => qc.invalidateQueries({ queryKey: ["admin-ticket-sales"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const totalRevenue = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.price_paid || 0), 0);


  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Tickets sold" value={data?.length ?? 0} icon={Ticket} />
        <StatCard label="Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={Sparkles} />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading sales…</p>}
      {!isLoading && !data?.length && (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-2xl">
          <Ticket className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No tickets have been sold yet.
        </div>
      )}
      <div className="space-y-2">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="bg-card border rounded-2xl p-3 flex items-center gap-3">
            {r.ticket?.photo_url && (
              <img src={r.ticket.photo_url} alt="" className="w-14 h-14 object-cover rounded-xl" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-1">{r.ticket?.title ?? "(deleted ticket)"}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                Buyer: {r.buyer?.display_name ?? r.buyer_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/70 font-mono truncate">QR {r.qr_token}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">
                {r.ticket?.pay_mode === "credits" ? `${r.price_paid} cr` : `₦${Number(r.price_paid).toLocaleString()}`}
              </div>
              <div className="text-[10px] text-success inline-flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Sold</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminScanLog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-scans"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: scans } = await supabase
        .from("ticket_scans" as any)
        .select("id, ticket_id, scanner_id, scanned_at")
        .order("scanned_at", { ascending: false })
        .limit(200);
      const rows = (scans ?? []) as any[];
      if (!rows.length) return [];
      const ticketIds = [...new Set(rows.map((r) => r.ticket_id))];
      const userIds = [...new Set(rows.map((r) => r.scanner_id))];
      const [{ data: tickets }, { data: users }] = await Promise.all([
        supabase.from("tickets").select("id,title").in("id", ticketIds),
        supabase.from("profiles").select("id,display_name").in("id", userIds),
      ]);
      const tMap = new Map((tickets ?? []).map((t: any) => [t.id, t]));
      const uMap = new Map((users ?? []).map((u: any) => [u.id, u]));
      return rows.map((r) => ({ ...r, ticket: tMap.get(r.ticket_id), scanner: uMap.get(r.scanner_id) }));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-ticket-scans")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_scans" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-scans"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Scans logged" value={data?.length ?? 0} icon={ScanLine} />
        <StatCard label="Unique tickets" value={new Set((data ?? []).map((r: any) => r.ticket_id)).size} icon={Ticket} />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading scans…</p>}
      {!isLoading && !data?.length && (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-2xl">
          <ScanLine className="w-10 h-10 mx-auto mb-2 opacity-40" />
          No tickets have been scanned yet.
        </div>
      )}
      <div className="bg-card border rounded-2xl divide-y">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium line-clamp-1">{r.ticket?.title ?? "(deleted ticket)"}</p>
              <p className="text-xs text-muted-foreground">
                Scanned by {r.scanner?.display_name ?? r.scanner_id.slice(0, 8)} · {new Date(r.scanned_at).toLocaleString()}
              </p>
            </div>
            <span className="text-[10px] text-success inline-flex items-center gap-0.5 shrink-0"><CheckCircle2 className="w-3 h-3" />Verified</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCatalogue() {
  const qc = useQueryClient();
  const [newFaculty, setNewFaculty] = useState({ name: "", icon: "📚" });
  const [newDept, setNewDept] = useState<{ name: string; faculty_id: string }>({ name: "", faculty_id: "" });
  const [newCourse, setNewCourse] = useState<{ code: string; title: string; department_id: string }>({ code: "", title: "", department_id: "" });

  const { data: faculties } = useQuery({
    queryKey: ["admin-faculties"],
    queryFn: async () => (await supabase.from("faculties").select("id,name,icon").order("name")).data ?? [],
  });
  const { data: departments } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: async () => (await supabase.from("departments").select("id,name,faculty_id").order("name")).data ?? [],
  });
  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,code,title,department_id").order("code").limit(500)).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-faculties"] });
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  };

  const addFaculty = async () => {
    if (!newFaculty.name.trim()) return;
    const { error } = await supabase.from("faculties").insert(newFaculty as any);
    if (error) toast.error(error.message); else { toast.success("Faculty added"); setNewFaculty({ name: "", icon: "📚" }); refresh(); }
  };
  const addDept = async () => {
    if (!newDept.name.trim() || !newDept.faculty_id) return;
    const { error } = await supabase.from("departments").insert(newDept as any);
    if (error) toast.error(error.message); else { toast.success("Department added"); setNewDept({ name: "", faculty_id: "" }); refresh(); }
  };
  const addCourse = async () => {
    if (!newCourse.code.trim() || !newCourse.title.trim() || !newCourse.department_id) return;
    const { error } = await supabase.from("courses").insert({ ...newCourse, code: newCourse.code.toUpperCase() } as any);
    if (error) toast.error(error.message); else { toast.success("Course added"); setNewCourse({ code: "", title: "", department_id: "" }); refresh(); }
  };
  const delRow = async (table: "faculties" | "departments" | "courses", id: string) => {
    if (!confirm("Delete? This cannot be undone.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-5">
      <section className="bg-card border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold inline-flex items-center gap-2"><Library className="w-4 h-4" /> Faculties</h3>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Name" value={newFaculty.name} onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })} className="flex-1 min-w-[160px]" />
          <Input placeholder="Icon (emoji)" value={newFaculty.icon} onChange={(e) => setNewFaculty({ ...newFaculty, icon: e.target.value })} className="max-w-[110px]" />
          <Button onClick={addFaculty}>Add</Button>
        </div>
        <ul className="divide-y border rounded-xl">
          {(faculties ?? []).map((f: any) => (
            <li key={f.id} className="p-2 flex items-center justify-between text-sm">
              <span>{f.icon} {f.name}</span>
              <Button size="sm" variant="destructive" onClick={() => delRow("faculties", f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold inline-flex items-center gap-2"><BookOpen className="w-4 h-4" /> Departments</h3>
        <div className="flex gap-2 flex-wrap">
          <select value={newDept.faculty_id} onChange={(e) => setNewDept({ ...newDept, faculty_id: e.target.value })} className="bg-background border rounded-xl px-3 py-2 text-sm">
            <option value="">Faculty…</option>
            {(faculties ?? []).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Input placeholder="Department name" value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} className="flex-1 min-w-[180px]" />
          <Button onClick={addDept}>Add</Button>
        </div>
        <ul className="divide-y border rounded-xl max-h-72 overflow-auto">
          {(departments ?? []).map((d: any) => {
            const f = (faculties ?? []).find((x: any) => x.id === d.faculty_id);
            return (
              <li key={d.id} className="p-2 flex items-center justify-between text-sm">
                <span><span className="text-muted-foreground">{f?.name ?? "—"} ›</span> {d.name}</span>
                <Button size="sm" variant="destructive" onClick={() => delRow("departments", d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-card border rounded-2xl p-4 space-y-3">
        <h3 className="font-bold inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Courses</h3>
        <div className="flex gap-2 flex-wrap">
          <select value={newCourse.department_id} onChange={(e) => setNewCourse({ ...newCourse, department_id: e.target.value })} className="bg-background border rounded-xl px-3 py-2 text-sm">
            <option value="">Department…</option>
            {(departments ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <Input placeholder="Code (e.g. CSC 401)" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} className="max-w-[160px]" />
          <Input placeholder="Title" value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} className="flex-1 min-w-[180px]" />
          <Button onClick={addCourse}>Add</Button>
        </div>
        <ul className="divide-y border rounded-xl max-h-96 overflow-auto">
          {(courses ?? []).map((c: any) => (
            <li key={c.id} className="p-2 flex items-center justify-between text-sm">
              <span><strong className="text-primary">{c.code}</strong> · {c.title}</span>
              <Button size="sm" variant="destructive" onClick={() => delRow("courses", c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AdminVerifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("student_verifications" as any)
        .select("id,user_id,jamb_reg_number,verified,response,created_at")
        .eq("verified", true)
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,email,avatar_key,is_verified")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((r: any) => ({ ...r, profile: byId.get(r.user_id) }));
    },
  });

  const revoke = async (user_id: string) => {
    if (!confirm("Revoke this user's verified badge?")) return;
    const { error } = await supabase.rpc("admin_set_badge", {
      _user_id: user_id, _badge: "verified", _value: false,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Badge revoked");
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-6 text-center">Loading verifications…</p>;

  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground p-6 text-center">No verified students yet.</p>
      )}
      {(data ?? []).map((r: any) => (
        <div key={r.id} className="bg-card border rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              <Link
                to="/profile/$id"
                params={{ id: r.user_id }}
                className="font-semibold hover:text-primary line-clamp-1"
              >
                {r.profile?.display_name ?? r.user_id.slice(0, 8)}
              </Link>
              {r.profile?.is_verified ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Active</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Revoked</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              <span className="font-mono">{r.jamb_reg_number}</span>
              {r.response?.session ? <> · {r.response.session}</> : null}
              {r.profile?.email ? <> · {r.profile.email}</> : null}
            </p>
            <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
          </div>
          {r.profile?.is_verified && (
            <Button size="sm" variant="destructive" onClick={() => revoke(r.user_id)}>
              <Ban className="w-3.5 h-3.5 mr-1" /> Revoke
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function AdminMarketCategories() {
  const qc = useQueryClient();
  const KINDS: { k: "products" | "tickets" | "books" | "advert"; label: string }[] = [
    { k: "products", label: "Products" },
    { k: "tickets", label: "Tickets" },
    { k: "books", label: "Books" },
    { k: "advert", label: "Adverts" },
  ];
  const [kind, setKind] = useState<"products" | "tickets" | "books" | "advert">("products");
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-market-categories", kind],
    queryFn: async () =>
      (await supabase
        .from("marketplace_categories" as any)
        .select("*")
        .eq("kind", kind)
        .order("sort_order")
        .order("label")).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-market-categories", kind] });

  const add = async () => {
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
    const l = label.trim();
    if (!s || !l) return toast.error("Slug and label required");
    const { error } = await supabase
      .from("marketplace_categories" as any)
      .insert({ kind, slug: s, label: l, sort_order: 100 });
    if (error) toast.error(error.message);
    else { toast.success("Category added"); setSlug(""); setLabel(""); refresh(); }
  };
  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("marketplace_categories" as any)
      .update({ is_active: !is_active }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.from("marketplace_categories" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {KINDS.map((x) => (
          <button key={x.k} onClick={() => setKind(x.k)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${kind === x.k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="slug (e.g. hostel)" value={slug} onChange={(e) => setSlug(e.target.value)} className="max-w-[180px]" />
          <Input placeholder="Label shown to users" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1 min-w-[180px]" />
          <Button onClick={add}>Add category</Button>
        </div>
        <ul className="divide-y border rounded-xl">
          {(data ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground text-center">No categories yet.</li>}
          {(data ?? []).map((c: any) => (
            <li key={c.id} className="p-2 flex items-center justify-between text-sm gap-2">
              <span className={c.is_active ? "" : "opacity-50 line-through"}>
                <strong>{c.label}</strong> <span className="text-muted-foreground font-mono text-[11px]">{c.slug}</span>
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => toggle(c.id, c.is_active)}>
                  {c.is_active ? "Disable" : "Enable"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => del(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
