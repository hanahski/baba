import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Radar, MessageCircle, Power, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EBSU_ZONES, resolveZone, haversineKm } from "@/lib/ebsu-zones";
import { getOrCreateDmThread } from "@/lib/dm";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type NearbyProfile = {
  id: string;
  display_name: string;
  avatar_key: string;
  current_lat: number | null;
  current_lng: number | null;
  current_zone: string | null;
  location_updated_at: string | null;
  share_location: boolean;
};

/**
 * Shared Campus / Nearby tab.
 * - mode="campus": shows which EBSU zone you're in + everyone in the same zone.
 * - mode="nearby": shows a radius-based list of students sharing location.
 * No chat preview, no composer — pure location-based discovery.
 */
export function CampusLocationView({
  meId,
  mode,
}: {
  meId: string;
  mode: "campus" | "nearby";
}) {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2);
  const [pingTarget, setPingTarget] = useState<NearbyProfile | null>(null);
  const [pingMsg, setPingMsg] = useState("");
  const [pingBusy, setPingBusy] = useState(false);

  // Pull current share_location flag once
  useEffect(() => {
    let alive = true;
    supabase
      .from("profiles")
      .select("share_location,current_lat,current_lng")
      .eq("id", meId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        setSharing(!!data.share_location);
        if (data.current_lat != null && data.current_lng != null) {
          setCoords({ lat: data.current_lat, lng: data.current_lng });
        }
      });
    return () => {
      alive = false;
    };
  }, [meId]);

  const myZone = useMemo(() => (coords ? resolveZone(coords) : null), [coords]);

  const updateMyLocation = async (
    next: { lat: number; lng: number } | null,
    shareFlag: boolean,
  ) => {
    const zone = next ? resolveZone(next) : null;
    const payload = {
      share_location: shareFlag,
      location_updated_at: new Date().toISOString(),
      current_lat: next ? next.lat : null,
      current_lng: next ? next.lng : null,
      current_zone: next ? (zone?.zone.id ?? null) : null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", meId);
    if (error) toast.error(error.message);
  };

  const turnOn = () => {
    if (!("geolocation" in navigator)) return toast.error("Geolocation not supported");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        setSharing(true);
        await updateMyLocation(c, true);
        setBusy(false);
        toast.success("Location on — friends can find you");
      },
      (err) => {
        setBusy(false);
        toast.error(err.message || "Couldn't get your location");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const turnOff = async () => {
    setBusy(true);
    setSharing(false);
    await updateMyLocation(null, false);
    setBusy(false);
    toast.success("Location off — you're invisible now");
  };

  // Live-refresh location every 60s while sharing is on
  useEffect(() => {
    if (!sharing) return;
    const id = setInterval(() => {
      if (!("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const c = { lat: p.coords.latitude, lng: p.coords.longitude };
          setCoords(c);
          void updateMyLocation(c, true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharing]);

  const { data: nearby = [], refetch, isFetching } = useQuery<NearbyProfile[]>({
    queryKey: ["nearby-profiles", mode, myZone?.zone.id ?? "none"],
    enabled: sharing && !!coords,
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,display_name,avatar_key,current_lat,current_lng,current_zone,location_updated_at,share_location",
        )
        .eq("share_location", true)
        .neq("id", meId)
        .gte("location_updated_at", cutoff)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as NearbyProfile[];
    },
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!coords) return [];
    return nearby
      .map((p) => ({
        ...p,
        _dist:
          p.current_lat != null && p.current_lng != null
            ? haversineKm(coords, { lat: p.current_lat, lng: p.current_lng })
            : Infinity,
      }))
      .filter((p) => {
        if (mode === "campus") return p.current_zone === myZone?.zone.id;
        return p._dist <= radiusKm;
      })
      .sort((a, b) => a._dist - b._dist);
  }, [nearby, coords, mode, myZone, radiusKm]);

  const startDm = async (otherId: string) => {
    try {
      const tid = await getOrCreateDmThread(meId, otherId);
      navigate({ to: "/chat", search: { tab: "dms", t: tid } });
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't start chat");
    }
  };

  if (!sharing) {
    return (
      <div className="bg-card border rounded-2xl p-6 text-center min-h-[40vh] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          {mode === "campus" ? (
            <MapPin className="w-7 h-7 text-primary" />
          ) : (
            <Radar className="w-7 h-7 text-primary" />
          )}
        </div>
        <h2 className="font-display text-lg font-bold">
          {mode === "campus" ? "Pin where you are on campus" : "Find friends around you"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Turn on your location so EBSU students can see you{" "}
          {mode === "campus" ? "in the same campus area." : "nearby."} You can turn it off anytime.
        </p>
        <Button onClick={turnOn} disabled={busy} className="mt-4">
          <Power className="w-4 h-4 mr-1" /> {busy ? "Locating…" : "Turn location on"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Status header */}
      <div className="p-3 border-b flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          {myZone ? (
            <>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                You're {myZone.inside ? "at" : "near"}
              </div>
              <div className="font-display text-lg font-bold flex items-center gap-1.5">
                <span>{myZone.zone.emoji}</span>
                <span>{myZone.zone.name}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                {coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}
                {!myZone.inside && <span> · {myZone.distanceKm.toFixed(2)} km away</span>}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Locating you…</div>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={turnOff} disabled={busy}>
          <Power className="w-4 h-4 mr-1" /> Turn off
        </Button>
      </div>

      {mode === "nearby" && (
        <>
          <div className="px-3 py-2 border-b flex items-center gap-2 text-xs">
            <Radar className="w-3.5 h-3.5 text-primary" />
            Radius <strong>{radiusKm} km</strong>
            <input
              type="range"
              min={0.2}
              max={10}
              step={0.2}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={() => refetch()}
              className="text-primary font-semibold disabled:opacity-50"
              disabled={isFetching}
            >
              {isFetching ? "…" : "Refresh"}
            </button>
          </div>
          <div className="flex flex-col items-center justify-center py-6 border-b bg-gradient-to-b from-primary/5 to-transparent">
            <div className="radar-stage">
              <div className="radar-sweep" />
              <div className="radar-ring r1" />
              <div className="radar-ring r2" />
              <div className="radar-ring r3" />
              <div className="radar-center" />
            </div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-2">
              {isFetching ? "Scanning…" : `${filtered.length} found in range`}
            </div>
          </div>
        </>
      )}

      {mode === "campus" && (
        <CampusZonePicker
          activeId={myZone?.zone.id ?? null}
          onPick={(z) => {
            void supabase.from("profiles").update({ current_zone: z.id }).eq("id", meId);
            toast.success(`Set to ${z.name}`);
          }}
        />
      )}

      {/* People list */}
      <ul className="divide-y">
        {filtered.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">
            {mode === "campus"
              ? "No one else in this zone right now. Be the first 👋"
              : "No students within this radius. Widen the search or check back later."}
          </li>
        ) : (
          filtered.map((p) => {
            const zone = EBSU_ZONES.find((z) => z.id === p.current_zone);
            return (
              <li key={p.id} className="p-3 flex items-center gap-3">
                <Link to="/profile/$id" params={{ id: p.id }}>
                  <AvatarDisplay avatarKey={p.avatar_key} size={44} online />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to="/profile/$id"
                    params={{ id: p.id }}
                    className="font-semibold text-sm truncate block hover:underline"
                  >
                    {p.display_name}
                  </Link>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    {zone ? (
                      <>
                        <span>{zone.emoji}</span>
                        <span className="truncate">{zone.name}</span>
                      </>
                    ) : (
                      <MapPin className="w-3 h-3" />
                    )}
                    {Number.isFinite(p._dist) && p._dist < 50 && (
                      <span> · {p._dist < 0.1 ? "right here" : `${p._dist.toFixed(2)} km`}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => { setPingTarget(p); setPingMsg(""); }}
                    title="Send a found-you ping"
                  >
                    <Sparkles className="w-4 h-4 mr-1" /> Ping
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startDm(p.id)}>
                    <MessageCircle className="w-4 h-4 mr-1" /> Chat
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Dialog open={!!pingTarget} onOpenChange={(o) => !o && setPingTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Ping {pingTarget?.display_name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            They'll get a "found you!" postcard with your name and a quick note.
          </p>
          <Textarea
            value={pingMsg}
            onChange={(e) => setPingMsg(e.target.value.slice(0, 140))}
            placeholder="Saw you near the library… let's link up?"
            rows={3}
          />
          <div className="text-[11px] text-right text-muted-foreground">{pingMsg.length}/140</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPingTarget(null)} disabled={pingBusy}>
              Cancel
            </Button>
            <Button
              disabled={pingBusy || !pingTarget}
              onClick={async () => {
                if (!pingTarget) return;
                setPingBusy(true);
                const { error } = await supabase.from("hide_seek_pings").insert({
                  sender_id: meId,
                  receiver_id: pingTarget.id,
                  message: pingMsg.trim() || null,
                });
                setPingBusy(false);
                if (error) return toast.error(error.message);
                toast.success(`Ping sent to ${pingTarget.display_name}`);
                setPingTarget(null);
              }}
            >
              <Sparkles className="w-4 h-4 mr-1" /> Send ping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function CampusZonePicker({
  activeId,
  onPick,
}: {
  activeId: string | null;
  onPick: (z: (typeof EBSU_ZONES)[number]) => void;
}) {
  return (
    <div className="px-3 py-2 border-b overflow-x-auto">
      <div className="flex gap-1.5 min-w-max">
        {EBSU_ZONES.map((z) => (
          <button
            key={z.id}
            onClick={() => onPick(z)}
            className={`px-2.5 py-1 rounded-full text-[11px] border whitespace-nowrap transition ${
              z.id === activeId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            <span className="mr-1">{z.emoji}</span>
            {z.name}
          </button>
        ))}
      </div>
    </div>
  );
}
