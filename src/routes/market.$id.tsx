import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Phone, MapPin, Trash2, CheckCircle2 } from "lucide-react";
import { getIsAdminUser } from "@/lib/admin-role";

export const Route = createFileRoute("/market/$id")({
  component: ListingDetail,
  head: ({ params }) => {
    const url = `/market/${params.id}`;
    return {
      meta: [
        { title: "Market listing — StudentsPlug" },
        { name: "description", content: "Browse and buy from verified EBSU student sellers on the StudentsPlug market." },
        { property: "og:title", content: "Market listing — StudentsPlug" },
        { property: "og:description", content: "Buy and sell with verified EBSU students on StudentsPlug Market." },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: listing, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => (await supabase.from("market_listings").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: seller } = useQuery({
    queryKey: ["seller", listing?.seller_id],
    enabled: !!listing?.seller_id,
    queryFn: async () => (await supabase.from("profiles").select("id,display_name,avatar_key").eq("id", listing!.seller_id).single()).data,
  });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => getIsAdminUser(user!.id),
  });

  if (!listing) return <AppShell><p>Loading…</p></AppShell>;
  const canManage = user && (user.id === listing.seller_id || isAdmin);

  const markSold = async () => {
    await supabase.from("market_listings").update({ is_sold: !listing.is_sold }).eq("id", id);
    toast.success(listing.is_sold ? "Marked as available" : "Marked as sold");
    refetch();
  };
  const del = async () => {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("market_listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); nav({ to: "/market" }); }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4">
        <Link to="/market" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-4 h-4" />Back to market</Link>
        <div className="bg-card border rounded-3xl p-6 shadow-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-display">{listing.title}</h1>
                {listing.is_sold && <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive font-semibold">SOLD</span>}
              </div>
              <p className="text-3xl font-bold text-primary mt-2">₦{Number(listing.price).toLocaleString()}</p>
              <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-muted">{listing.category}</span>
                {listing.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{listing.location}</span>}
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markSold}><CheckCircle2 className="w-4 h-4 mr-1" />{listing.is_sold ? "Mark available" : "Mark sold"}</Button>
                <Button variant="destructive" size="sm" onClick={del}><Trash2 className="w-4 h-4" /></Button>
              </div>
            )}
          </div>
          {listing.description && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{listing.description}</p>}
          <div className="mt-6 p-4 rounded-2xl bg-muted/40 border">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Contact seller</p>
            <p className="flex items-center gap-2 font-medium"><Phone className="w-4 h-4 text-primary" />{listing.contact}</p>
            {seller && <p className="text-xs text-muted-foreground mt-2">Posted by <Link to="/profile/$id" params={{ id: seller.id }} className="text-primary hover:underline">{seller.display_name}</Link></p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}