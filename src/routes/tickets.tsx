import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { encodePlugShare } from "@/components/PlugShareActions";
import { toast } from "sonner";
import { Ticket, Upload, QrCode, Lock, Loader2, Download, Megaphone } from "lucide-react";
import QRCode from "qrcode";
import { composeTicketImage, downloadTicketPdf } from "@/lib/ticket-composer";
import { getIsAdminUser } from "@/lib/admin-role";

export const Route = createFileRoute("/tickets")({ component: TicketsPage });

function TicketsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"browse" | "upload" | "mine">("browse");

  const { data: profile } = useQuery({
    queryKey: ["me-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("is_star,is_verified").eq("id", user!.id).maybeSingle()).data,
  });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => getIsAdminUser(user!.id),
  });

  const canUpload = !!isAdmin || (!!profile?.is_verified && !!profile?.is_star);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white rounded-3xl p-6 shadow-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Ticket className="w-7 h-7" />Ticket Marketplace</h1>
              <p className="text-sm opacity-90 mt-1">Buy & sell event tickets. Only Star + Authentication badge users can sell.</p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/tools/qr"><QrCode className="w-4 h-4 mr-1" />Scan ticket</Link>
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { k: "browse", label: "Browse" },
            { k: "upload", label: canUpload ? "I want to sell my ticket" : "I want to sell my ticket 🔒" },
            { k: "mine", label: "My purchases" },
          ].map(({ k, label }) => (
            <button key={k} onClick={() => setTab(k as typeof tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${tab === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "browse" && <BrowseTickets />}
        {tab === "upload" && (canUpload ? <UploadTicket userId={user?.id} /> : <LockedUpload />)}
        {tab === "mine" && <MyPurchases userId={user?.id} />}
      </div>
    </AppShell>
  );
}

function BrowseTickets() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["tickets-browse"],
    queryFn: async () => (await supabase.from("tickets").select("*").eq("is_sold", false).order("created_at", { ascending: false }).limit(60)).data ?? [],
  });

  const buyAndDownload = async (ticket: any) => {
    if (!user) { nav({ to: "/login" }); return; }
    const pdfWindow = window.open("", "_blank");
    setBuyingId(ticket.id);
    try {
      const { error } = await supabase.rpc("buy_ticket", { _ticket_id: ticket.id });
      if (error) throw error;

      const { data: freshTicket, error: refreshError } = await supabase.from("tickets").select("*").eq("id", ticket.id).maybeSingle();
      if (refreshError) throw refreshError;
      if (!freshTicket?.qr_token) throw new Error("Ticket QR is not ready yet");

      const stampedTicket = await composeTicketImage({
        photoUrl: freshTicket.photo_url,
        qrToken: freshTicket.qr_token,
        title: freshTicket.title,
        holder: profile?.display_name || user.email || "Holder",
      });

      await downloadTicketPdf(stampedTicket, `ticket-${freshTicket.id}.pdf`, pdfWindow);
      toast.success("Ticket PDF downloaded");
      qc.invalidateQueries({ queryKey: ["tickets-browse"] });
      qc.invalidateQueries({ queryKey: ["my-tickets", user.id] });
    } catch (err: any) {
      pdfWindow?.close();
      toast.error(err.message ?? "PDF download failed");
    } finally {
      setBuyingId(null);
    }
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-8">Loading…</p>;
  if (!data?.length) return <div className="text-center py-12 text-muted-foreground"><Ticket className="w-10 h-10 mx-auto mb-2 opacity-40" />No tickets for sale right now.</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((t) => (
        <div key={t.id} className="bg-card border rounded-2xl overflow-hidden shadow-card hover:shadow-glow transition flex flex-col">
          <Link to="/tickets/$id" params={{ id: t.id }}>
            <img src={t.photo_url} alt={t.title} className="w-full h-44 object-cover" />
          </Link>
          <div className="p-4 flex-1 flex flex-col">
            <Link to="/tickets/$id" params={{ id: t.id }} className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold line-clamp-1">{t.title}</h3>
                <span className="text-primary font-bold whitespace-nowrap">{t.pay_mode === "credits" ? `${t.price} cr` : `₦${Number(t.price).toLocaleString()}`}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
            </Link>
            <Button type="button" onClick={() => buyAndDownload(t)} disabled={buyingId === t.id} className="mt-3 w-full">
              {buyingId === t.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Ticket className="w-4 h-4 mr-1" />}
              {buyingId === t.id ? "Downloading PDF…" : t.pay_mode === "credits" ? `Buy for ${t.price} cr` : `Buy for ₦${Number(t.price).toLocaleString()}`}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LockedUpload() {
  return (
    <div className="bg-card border-2 border-dashed rounded-2xl p-8 text-center space-y-4">
      <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
      <h3 className="font-bold font-display text-lg">Selling tickets needs special badges</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Only users with the <strong>Star</strong> badge <em>and</em> the <strong>Authentication</strong> badge can list tickets.
        Apply below and admin will review your request.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button asChild>
          <Link to="/apply-badge" search={{ badge: "star" }}>Apply for Star badge</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/me">Get Authentication (verify student)</Link>
        </Button>
      </div>
    </div>
  );
}

function UploadTicket({ userId }: { userId?: string }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("0");
  const [payMode, setPayMode] = useState<"contact" | "credits">("contact");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !file) { toast.error("Add a ticket photo first"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("tickets").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const { data: signed, error: sErr } = await supabase.storage.from("tickets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr) throw sErr;
      const pub = { publicUrl: signed.signedUrl };
      const ins = await supabase.from("tickets").insert({
        uploader_id: userId, title, description: desc, photo_url: pub.publicUrl,
        price: Number(price) || 0, pay_mode: payMode, contact: contact || null,
      }).select("id").single();
      if (ins.error) throw ins.error;

      if (shareToFeed && ins.data?.id) {
        const share = encodePlugShare({
          kind: "ticket",
          id: ins.data.id,
          href: `/tickets/${ins.data.id}`,
          contact: contact || null,
          authorId: userId,
        });
        const body =
          (desc?.trim() || `Ticket for sale: ${title}`) +
          `\n\nPrice: ${payMode === "credits" ? `${Number(price) || 0} credits` : `₦${Number(price) || 0}`}` +
          share;
        await supabase.from("posts").insert({
          author_id: userId,
          post_type: "ticket",
          title,
          body,
          image_url: pub.publicUrl,
        } as any);
      }

      toast.success(shareToFeed ? "Ticket listed & shared to the feed" : "Ticket listed");
      qc.invalidateQueries({ queryKey: ["tickets-browse"] });
      nav({ to: "/tickets" });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="bg-card border rounded-2xl p-5 space-y-4">
      <h2 className="font-bold font-display text-lg flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />List a ticket</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ticket title (e.g. EBSU Cultural Night)" required maxLength={120} />
      <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Event details, date, venue, seat info…" rows={3} maxLength={1000} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" required />
        <Select value={payMode} onValueChange={(v) => setPayMode(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contact">Contact seller (₦)</SelectItem>
            <SelectItem value="credits">In-app credits</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {payMode === "contact" && (
        <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Your WhatsApp / phone" maxLength={120} />
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Ticket photo</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" required />
      </div>
      <label className="flex items-start gap-3 p-3 rounded-2xl border bg-muted/40 cursor-pointer">
        <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} className="mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-primary" /> Do you want this to appear in the feed?
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Cross-post to the main feed with quick buttons (Chat host, Contact) so more students see it.
          </p>
        </div>
      </label>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Uploading…" : shareToFeed ? "Publish ticket & share to feed" : "Publish ticket"}</Button>
    </form>
  );
}

function MyPurchases({ userId }: { userId?: string }) {
  const { data } = useQuery({
    queryKey: ["my-tickets", userId],
    enabled: !!userId,
    queryFn: async () => (await supabase.from("ticket_purchases").select("*, ticket:tickets(*)").eq("buyer_id", userId!).order("created_at", { ascending: false })).data ?? [],
  });
  if (!userId) return <p className="text-muted-foreground text-sm">Sign in to view your tickets.</p>;
  if (!data?.length) return <p className="text-muted-foreground text-sm text-center py-8">No purchases yet.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.map((p: any) => <PurchasedTicket key={p.id} p={p} />)}
    </div>
  );
}

function PurchasedTicket({ p }: { p: any }) {
  const { user, profile } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => { QRCode.toDataURL(`SP-TICKET:${p.qr_token}`, { width: 320 }).then(setQr); }, [p.qr_token]);

  const downloadPurchasedTicket = async () => {
    const pdfWindow = window.open("", "_blank");
    setDownloading(true);
    try {
      const stampedTicket = await composeTicketImage({
        photoUrl: p.ticket?.photo_url,
        qrToken: p.qr_token,
        title: p.ticket?.title ?? "Ticket",
        holder: profile?.display_name || user?.email || "Holder",
      });
      await downloadTicketPdf(stampedTicket, `ticket-${p.ticket_id}.pdf`, pdfWindow);
      toast.success("Ticket PDF downloaded");
    } catch (err: any) {
      pdfWindow?.close();
      toast.error(err.message ?? "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-card">
      <h3 className="font-semibold">{p.ticket?.title}</h3>
      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
      {qr && <img src={qr} alt="QR" className="mt-3 mx-auto w-72 h-72" />}
      <Button type="button" onClick={downloadPurchasedTicket} disabled={downloading || !p.ticket?.photo_url} className="mt-3 w-full">
        {downloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
        {downloading ? "Downloading PDF…" : "Download ticket PDF"}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-2 break-all">{p.qr_token}</p>
    </div>
  );
}
