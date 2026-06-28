import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/admin-ids";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { encodePlugShare } from "@/components/PlugShareActions";
import { toast } from "sonner";
import {
  Package, Ticket, BookOpen, Megaphone, ArrowLeft, ArrowRight, Loader2, CheckCircle2, ImagePlus, X, Megaphone as Mega,
} from "lucide-react";
import { useDraft } from "@/hooks/use-draft";

export const Route = createFileRoute("/market/new")({
  component: NewListing,
  validateSearch: (s: Record<string, unknown>) => ({ kind: (s.kind as string | undefined) ?? undefined }),
});

type Kind = "products" | "tickets" | "books" | "advert";

const KIND_META: Record<Kind, { label: string; tagline: string; icon: any; tone: string }> = {
  products: { label: "Sell a product",        tagline: "Phones, fashion, hostel items, anything you own.", icon: Package,    tone: "from-sky-500 to-indigo-500" },
  tickets:  { label: "Sell a ticket",         tagline: "Events, parties, conferences, hostels.",            icon: Ticket,     tone: "from-fuchsia-500 to-rose-500" },
  books:    { label: "Sell a book",           tagline: "Textbooks, novels, study materials.",               icon: BookOpen,   tone: "from-emerald-500 to-teal-500" },
  advert:   { label: "Advertise on the site", tagline: "Get your brand featured to every StudentsPlug user.", icon: Megaphone, tone: "from-amber-500 to-orange-500" },
};

const BUCKET = "post-media"; // existing public bucket

function NewListing() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) {
      const redirect = typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/market/new";
      nav({ to: "/login", search: { redirect } });
    }
  }, [user, loading, nav]);

  const search = Route.useSearch();
  const initial = (search.kind as Kind | undefined) ?? null;
  const [kind, setKind] = useState<Kind | null>(initial);

  const { data: profile } = useQuery({
    queryKey: ["my-badges", user?.id],
    enabled: !!user?.id,
    queryFn: async () => (await supabase.from("profiles").select("is_sure_plug,is_legit,is_star").eq("id", user!.id).maybeSingle()).data,
  });

  if (!kind) return <KindPicker onPick={setKind} />;

  // Badge gates
  if (kind === "products" && !isAdmin && !profile?.is_sure_plug) {
    return <BadgeGate kind={kind} need="sure_plug" onBack={() => setKind(null)} />;
  }
  return <ComposerForm kind={kind} onBack={() => setKind(null)} userId={user?.id} />;
}

function BadgeGate({ kind, need, onBack }: { kind: Kind; need: "sure_plug" | "legit" | "star"; onBack: () => void }) {
  const labels: Record<string, { title: string; msg: string }> = {
    sure_plug: { title: "Sure Plug badge required", msg: "Only trusted sellers (Sure Plug) can post products. Apply for the badge to unlock product listings." },
    legit: { title: "Legit badge required", msg: "Only Legit contributors can post news. Apply for the Legit badge to share verified news." },
    star: { title: "Star badge required", msg: "Only Star authors can compose books. Apply for the Star badge to unlock the book composer." },
  };
  const l = labels[need];
  return (
    <AppShell>
      <div className="max-w-xl mx-auto text-center space-y-4 py-10">
        <h1 className="text-2xl font-bold font-display">{l.title}</h1>
        <p className="text-sm text-muted-foreground">{l.msg}</p>
        <div className="flex justify-center gap-2">
          <Button asChild><a href="/apply-badge">Apply for badge</a></Button>
          <Button variant="outline" onClick={onBack}>Pick a different category</Button>
        </div>
      </div>
    </AppShell>
  );
}

function KindPicker({ onPick }: { onPick: (k: Kind) => void }) {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">What do you want to post?</h1>
          <p className="text-muted-foreground text-sm mt-1">Pick the category that fits — we'll ask the right questions.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(KIND_META) as Kind[]).map((k) => {
            const m = KIND_META[k];
            const Icon = m.icon;
            return (
              <button
                key={k}
                onClick={() => onPick(k)}
                className="group text-left bg-card border rounded-2xl p-5 hover:shadow-card hover:border-primary transition"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.tone} flex items-center justify-center text-white mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold font-display text-lg">{m.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{m.tagline}</p>
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-3 group-hover:gap-2 transition-all">
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

type Field = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "textarea" | "number" | "select" | "photos" | "toggle";
  options?: string[];
  placeholder?: string;
};

const FIELDS: Record<Kind, Field[]> = {
  products: [
    { key: "title",       label: "What are you selling?",           required: true, placeholder: "e.g. HP Pavilion laptop — perfect condition" },
    { key: "category",    label: "Which category?",                 type: "select", options: ["electronics","fashion","hostel","services","other"], required: true },
    { key: "description", label: "Tell buyers more about it",       type: "textarea", placeholder: "Condition, specs, why you're selling…", required: true },
    { key: "price",       label: "Price (₦)",                       type: "number", required: true, placeholder: "0 for free / negotiable" },
    { key: "location",    label: "Where can buyers pick it up?",    placeholder: "e.g. CAS Campus, Abakaliki" },
    { key: "contact",     label: "Best way to reach you",           required: true, placeholder: "Phone, WhatsApp, or @username" },
    { key: "photos",      label: "Add up to 4 photos or videos",    type: "photos", hint: "Images or short videos (mp4/webm)." },
  ],
  tickets: [
    { key: "title",       label: "What event is the ticket for?",   required: true, placeholder: "e.g. EBSU Cultural Night 2026" },
    { key: "description", label: "Event details",                   type: "textarea", placeholder: "Date, venue, time, what's included…", required: true },
    { key: "price",       label: "Ticket price (₦)",                type: "number", required: true },
    { key: "category",    label: "Ticket type",                     type: "select", options: ["regular","vip","table","group","other"], required: true },
    { key: "location",    label: "Venue",                           placeholder: "e.g. EBSU Sports Complex" },
    { key: "contact",     label: "Best way to reach you",           required: true },
    { key: "photos",      label: "Photos, flyer or video (up to 4)", type: "photos", hint: "Images or short videos (mp4/webm)." },
  ],
  books: [
    { key: "title",       label: "Book title",                      required: true, placeholder: "e.g. Calculus, Early Transcendentals" },
    { key: "author",      label: "Author(s)",                       required: true, placeholder: "e.g. James Stewart" },
    { key: "category",    label: "Type of book",                    type: "select", options: ["textbook","novel","past_question","handout","other"], required: true },
    { key: "edition",     label: "Edition / year (optional)",       placeholder: "e.g. 8th edition, 2019" },
    { key: "course_code", label: "Course code (optional)",          placeholder: "e.g. MTH 101 — helps students find it" },
    { key: "condition",   label: "Condition",                       type: "select", options: ["brand_new","like_new","good","fair","worn"], required: true },
    { key: "is_donation", label: "Donate this book for free",       type: "toggle", hint: "Turn on if you're giving it away — price will be set to ₦0." },
    { key: "price",       label: "Price (₦)",                       type: "number", required: true, placeholder: "Set 0 to donate" },
    { key: "location",    label: "Pickup location",                 placeholder: "e.g. Faculty of Science", required: true },
    { key: "description", label: "Anything else buyers should know?", type: "textarea", placeholder: "Highlights, missing pages, why you're letting it go…" },
    { key: "contact",     label: "Best way to reach you",           required: true, placeholder: "Phone, WhatsApp, or @username" },
    { key: "photos",      label: "Photos or video of the book (up to 4)", type: "photos", hint: "Front cover + a page inside builds trust. Short videos also welcome." },
  ],
  advert: [
    { key: "title",       label: "What are you advertising?",       required: true, placeholder: "e.g. Mama Chika Restaurant" },
    { key: "description", label: "Describe what you want students to see", type: "textarea", required: true, placeholder: "Product/service, headline, call to action…" },
    { key: "category",    label: "Where should it appear?",         type: "select", options: ["home_banner","feed_card","sidebar","any"], required: true },
    { key: "price",       label: "Your budget (₦, optional)",       type: "number" },
    { key: "location",    label: "Audience focus (optional)",       placeholder: "e.g. Final-year students, hostel residents" },
    { key: "contact",     label: "How should we reach you?",        required: true, placeholder: "Phone, WhatsApp, email" },
    { key: "photos",      label: "Product / brand images or video (up to 4)", type: "photos" },
  ],
};

function ComposerForm({ kind, onBack, userId }: { kind: Kind; onBack: () => void; userId?: string }) {
  const nav = useNavigate();
  const baseFields = FIELDS[kind];

  // Admin-managed categories override the hard-coded option list per kind.
  const { data: categories } = useQuery({
    queryKey: ["marketplace-categories", kind],
    queryFn: async () =>
      (
        await supabase
          .from("marketplace_categories" as any)
          .select("slug,label,is_active,sort_order")
          .eq("kind", kind)
          .eq("is_active", true)
          .order("sort_order")
          .order("label")
      ).data ?? [],
  });

  const fields = baseFields.map((f) => {
    if (f.key !== "category" || !categories || categories.length === 0) return f;
    return {
      ...f,
      options: (categories as any[]).map((c) => c.slug),
      optionLabels: Object.fromEntries((categories as any[]).map((c) => [c.slug, c.label])) as Record<string, string>,
    } as Field & { optionLabels?: Record<string, string> };
  });
  const m = KIND_META[kind];
  const Icon = m.icon;
  const [values, setValues] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);

  // Draft persistence (kind-scoped; photos are not persisted by design).
  const draft = useDraft(
    `market-new:${userId ?? "anon"}:${kind}`,
    { values: {} as Record<string, any> },
    { enabled: !!userId },
  );
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (!userId || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    if (draft.value.values && Object.keys(draft.value.values).length) {
      setValues(draft.value.values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    draft.setValue((v) => ({ ...v, values }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, userId]);

  const set = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const onPickPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []).slice(0, 4 - photos.length);
    if (!list.length) return;
    setPhotos((p) => [...p, ...list]);
    list.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPreviews((p) => [...p, url]);
    });
    e.target.value = "";
  };
  const removePhoto = (i: number) => {
    setPhotos((p) => p.filter((_, j) => j !== i));
    setPreviews((p) => {
      const dead = p[i];
      if (dead?.startsWith("blob:")) URL.revokeObjectURL(dead);
      return p.filter((_, j) => j !== i);
    });
  };

  const submit = async () => {
    if (!userId) return;
    for (const f of fields) {
      // Skip required check for price when the user picked "donate".
      if (kind === "books" && f.key === "price" && values.is_donation) continue;
      if (f.required && f.type !== "photos" && !String(values[f.key] ?? "").trim()) {
        toast.error(`"${f.label}" is required`);
        return;
      }
    }
    setSaving(true);
    try {
      // Upload photos/videos and sign them (bucket is private per workspace policy)
      const photoUrls: string[] = [];
      for (const file of photos) {
        const path = `${userId}/market/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-z0-9_.-]+/gi, "_")}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || "application/octet-stream", upsert: false,
        });
        if (upErr) throw upErr;
        // Long-lived signed URL so <img>/<video> can load without runtime signing.
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
        const fallback = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        photoUrls.push(signed?.signedUrl ?? fallback);
      }

      // For the books composer, fold the smart fields into a clean description block.
      let description = String(values.description ?? "").trim();
      let title = String(values.title ?? "").trim();
      if (kind === "books") {
        const author = String(values.author ?? "").trim();
        if (author && !/by\s/i.test(title)) title = `${title} — by ${author}`;
        const meta: string[] = [];
        if (author) meta.push(`Author: ${author}`);
        if (values.edition) meta.push(`Edition: ${String(values.edition).trim()}`);
        if (values.course_code) meta.push(`Course: ${String(values.course_code).trim().toUpperCase()}`);
        if (values.condition) meta.push(`Condition: ${String(values.condition).replace(/_/g, " ")}`);
        if (values.is_donation) meta.push(`Free / donation`);
        description = [meta.join(" · "), description].filter(Boolean).join("\n\n");
      }
      const finalPrice = kind === "books" && values.is_donation ? 0 : Number(values.price) || 0;

      const { data, error } = await supabase
        .from("market_listings")
        .insert({
          seller_id: userId,
          title,
          description: description || null,
          price: finalPrice,
          category: String(values.category ?? "other"),
          contact: String(values.contact ?? "").trim(),
          location: String(values.location ?? "").trim() || null,
          listing_kind: kind,
          photos: photoUrls,
          cover_url: photoUrls[0] ?? null,
          ...(kind === "books"
            ? {
                author: String(values.author ?? "").trim() || null,
                edition: String(values.edition ?? "").trim() || null,
                course_code: String(values.course_code ?? "").trim().toUpperCase() || null,
                condition: values.condition ? String(values.condition) : null,
                is_donation: !!values.is_donation,
              }
            : {}),
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      // Optionally cross-post to the feed with action buttons.
      if (shareToFeed && kind !== "advert" && data?.id) {
        const share = encodePlugShare({
          kind: kind === "tickets" ? "ticket" : kind === "books" ? "book" : "market",
          id: data.id,
          href: `/market/${data.id}`,
          contact: String(values.contact ?? "").trim() || null,
          authorId: userId,
        });
        const body =
          (String(values.description ?? "").trim() ||
            `For sale: ${String(values.title ?? "").trim()}`) +
          `\n\nPrice: ₦${Number(values.price) || 0}` +
          share;
        await supabase.from("posts").insert({
          author_id: userId,
          post_type: kind === "tickets" ? "ticket" : kind === "books" ? "book" : "listing",
          title: String(values.title ?? "").trim(),
          body,
          image_url: photoUrls[0] ?? null,
        } as any);
      }

      draft.clear();
      if (kind === "advert") {
        toast.success("Advert submitted — our team will review it shortly.");
        nav({ to: "/market" });
      } else {
        toast.success(shareToFeed ? "Listing posted & shared to the feed!" : "Listing posted!");
        nav({ to: "/market/$id", params: { id: data.id } });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Could not post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={onBack} className="text-xs text-primary inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Change type
        </button>

        <header className={`rounded-3xl p-6 bg-gradient-to-br ${m.tone} text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">{m.label}</h1>
              <p className="text-xs text-white/80">{m.tagline}</p>
            </div>
          </div>
        </header>

        {draft.hasRestored && (
          <div className="flex items-start gap-3 rounded-2xl border bg-primary/5 border-primary/30 p-3">
            <div className="text-xs flex-1">
              <p className="font-semibold">Draft restored</p>
              <p className="text-muted-foreground">We brought back what you started before. Photos aren't saved — re-attach them if you need.</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => { draft.clear(); setValues({}); }}>Clear</Button>
            <Button type="button" size="sm" variant="ghost" onClick={draft.dismissRestoredBanner}>Dismiss</Button>
          </div>
        )}

        <div className="bg-card border rounded-3xl p-6 shadow-card space-y-5">
          {fields.map((f) => (
            <div key={f.key}>
              <Label>
                {f.label}
                {f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {f.hint && <p className="text-[11px] text-muted-foreground mb-1">{f.hint}</p>}

              {f.type === "textarea" ? (
                <Textarea rows={4} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <Select value={values[f.key] ?? ""} onValueChange={(v) => set(f.key, v)}>
                  <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>
                    {f.options!.map((o) => {
                      const labels = (f as any).optionLabels as Record<string, string> | undefined;
                      return (
                        <SelectItem key={o} value={o} className="capitalize">
                          {labels?.[o] ?? o.replace(/_/g, " ")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : f.type === "number" ? (
                <Input
                  type="number"
                  min="0"
                  value={kind === "books" && f.key === "price" && values.is_donation ? 0 : values[f.key] ?? ""}
                  disabled={kind === "books" && f.key === "price" && !!values.is_donation}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : f.type === "toggle" ? (
                <label className="flex items-start gap-3 p-3 rounded-2xl border bg-muted/30 cursor-pointer hover:bg-muted/50 transition">
                  <Switch
                    checked={!!values[f.key]}
                    onCheckedChange={(v) => set(f.key, v)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground flex-1">
                    {f.hint ?? "Turn on to enable."}
                  </span>
                </label>
              ) : f.type === "photos" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2">
                    {previews.map((src, i) => {
                      const file = photos[i];
                      const isVideo = file?.type.startsWith("video/");
                      return (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border bg-muted">
                          {isVideo ? (
                            <video src={src} className="w-full h-full object-cover" muted playsInline />
                          ) : (
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          )}
                          <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {photos.length < 4 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 text-muted-foreground text-xs">
                        <ImagePlus className="w-5 h-5 mb-1" /> Add
                        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPickPhotos} />
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">First file becomes the cover. Images or short videos.</p>
                </div>
              ) : (
                <Input value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
              )}
            </div>
          ))}

          {kind !== "advert" && (
            <label className="flex items-start gap-3 p-3 rounded-2xl border bg-muted/40 cursor-pointer hover:bg-muted/60 transition">
              <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} className="mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <Mega className="w-4 h-4 text-primary" /> Do you want this to appear in the feed?
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When on, we'll cross-post this to the main feed with quick action buttons
                  ({kind === "tickets" ? "Chat host" : kind === "books" ? "Chat writer" : "Chat seller"},
                  Contact) so more students see it.
                </p>
              </div>
            </label>
          )}

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            {kind === "advert" ? "Submit advert" : shareToFeed ? "Post listing & share to feed" : "Post listing"}
          </Button>

          {kind === "advert" && (
            <p className="text-[11px] text-muted-foreground text-center">
              Adverts don't appear in the market feed. Our team reviews and places approved adverts on the home banner, post cards, or sidebar.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}