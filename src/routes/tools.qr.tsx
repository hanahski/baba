import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, CheckCircle2, History, ScanLine, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { playTicketScanChime, playTicketScanFail } from "@/lib/sounds";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/tools/qr")({ component: QrScanner });


function QrScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ value: string; ok: boolean; meta?: any } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [failFlash, setFailFlash] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);
  const regionId = "qr-region";
  const { user, isAdmin } = useAuth();


  const teardown = async () => {
    const s = scannerRef.current;
    if (!s) return;
    scannerRef.current = null;
    try { await s.stop(); } catch {}
    try { s.clear(); } catch {}
  };

  const start = async () => {
    setResult(null);
    setFailFlash(null);
    await teardown();
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          const token = decoded.startsWith("SP-TICKET:") ? decoded.slice("SP-TICKET:".length) : decoded;
          // Double-scan guard: ignore the same token within 5 seconds so the
          // success animation never re-triggers from a held-up phone.
          const now = Date.now();
          const last = lastScanRef.current;
          if (last && last.token === token && now - last.at < 5000) {
            return;
          }
          lastScanRef.current = { token, at: now };
          await teardown();
          setScanning(false);
          const { data } = await supabase.rpc("verify_ticket", { _qr_token: token });
          const valid = (data as any)?.valid === true;
          setResult({ value: decoded, ok: valid, meta: data });
          if (valid) {
            playTicketScanChime();
            setCelebrate(true);
            setTimeout(() => setCelebrate(false), 1800);
          } else {
            playTicketScanFail();
            const reason = (data as any)?.reason;
            const msg = reason === "not_found"
              ? "Invalid QR — this ticket is not in our system or the code is wrong."
              : "Ticket could not be verified. Try again or contact the seller.";
            setFailFlash(msg);
            toast.error(msg);
            setTimeout(() => setFailFlash(null), 2200);
          }
        },
        () => {},

      );
      setScanning(true);
    } catch (e: any) {
      toast.error(e?.message || "Cannot access camera");
      scannerRef.current = null;
    }
  };

  const stop = async () => {
    await teardown();
    setScanning(false);
  };

  useEffect(() => () => { void teardown(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link to="/tools" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-3 h-3" />All tools
      </Link>

      {/* Hero / header card */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-card">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-glow shrink-0">
            <ScanLine className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold font-display leading-tight">Ticket Scanner</h2>
            <p className="text-sm text-muted-foreground">Point at any Market Plug ticket QR to verify instantly.</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="w-3 h-3" /> Secure verify</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary"><Sparkles className="w-3 h-3" /> Auto-detect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="relative rounded-3xl overflow-hidden border bg-black aspect-[4/5] sm:aspect-square shadow-card-lg">
        <div id={regionId} className="absolute inset-0 [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

        {/* Idle placeholder */}
        {!scanning && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 pointer-events-none">
            <div className="qr-aurora" aria-hidden />
            <div className="relative w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Camera className="w-9 h-9" />
            </div>
            <p className="text-sm relative">Tap below to start the camera</p>
          </div>
        )}

        {/* Active scan overlay */}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dim outside the viewfinder */}
            <div
              className="absolute inset-0 bg-black/55"
              style={{ clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,0 18%,18% 18%,18% 82%,82% 82%,82% 18%,0 18%)" }}
            />
            {/* Viewfinder square (64% of the smaller side) */}
            <div className="absolute left-[18%] right-[18%] top-[18%] bottom-[18%]">
              {/* Pulse rings */}
              <span className="qr-ring" />
              <span className="qr-ring r2" />
              {/* Drifting grid inside */}
              <span className="absolute inset-2 rounded-2xl qr-grid opacity-70" aria-hidden />
              {/* Corner brackets */}
              {[
                "-left-1 -top-1 border-l-[3px] border-t-[3px] rounded-tl-2xl",
                "-right-1 -top-1 border-r-[3px] border-t-[3px] rounded-tr-2xl",
                "-left-1 -bottom-1 border-l-[3px] border-b-[3px] rounded-bl-2xl",
                "-right-1 -bottom-1 border-r-[3px] border-b-[3px] rounded-br-2xl",
              ].map((c) => (
                <span key={c} className={`qr-corner absolute w-10 h-10 border-primary ${c}`} />
              ))}
              {/* Sweeping laser */}
              <span className="absolute inset-x-3 h-[3px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_22px_6px] shadow-primary qr-scanline" />
            </div>
            {/* Tip pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md text-white text-xs flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-primary" />
              Hold the QR steady inside the frame
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-2">
        {!scanning ? (
          <Button onClick={start} size="lg" className="w-full h-14 text-base rounded-2xl shadow-glow">
            <Camera className="w-5 h-5 mr-2" />Start scanning
          </Button>
        ) : (
          <Button onClick={stop} variant="outline" size="lg" className="w-full h-14 text-base rounded-2xl">
            Stop camera
          </Button>
        )}
      </div>

      {/* Result card */}
      {result && (
        <div className={`rounded-2xl border p-4 shadow-card ${result.ok ? "bg-success/10 border-success/40" : "bg-destructive/10 border-destructive/40"}`}>
          <div className="flex items-center gap-2 font-bold">
            {result.ok ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
            {result.ok ? "Valid ticket" : "Invalid or unknown ticket"}
          </div>
          {result.ok && result.meta && (
            <div className="text-sm mt-2 space-y-0.5">
              <div><strong>Event:</strong> {result.meta.title}</div>
              <div><strong>Holder:</strong> {result.meta.buyer ?? "—"}</div>
            </div>
          )}
          {!result.ok && (
            <p className="text-sm mt-1 text-destructive">
              {(result.meta as any)?.reason === "not_found"
                ? "We couldn't find this QR. It may be a fake, mistyped, or from a different system."
                : "The ticket couldn't be verified right now."}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2 break-all font-mono">{result.value}</p>
        </div>
      )}

      {user && (
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-sm font-semibold text-primary inline-flex items-center gap-1.5 hover:underline"
          >
            <History className="w-4 h-4" />
            {showHistory ? "Hide" : "Show"} my scan history
          </button>
          {showHistory && <ScanHistoryList scope={isAdmin ? "all" : "mine"} />}
        </div>
      )}

      {celebrate && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-400/30 blur-3xl animate-ping" />
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl rotate-3 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow animate-scale-in">
              <svg viewBox="0 0 52 52" className="w-20 h-20 sm:w-24 sm:h-24 text-white -rotate-3">
                <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" />
                <path
                  d="M14 27 l8 8 l16 -18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-draw"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-8 text-2xl sm:text-3xl font-bold font-display text-center px-4 animate-fade-in">
            Ticket admitted ✓
          </h2>
          {result?.meta?.title && (
            <p className="mt-2 text-sm sm:text-base text-muted-foreground text-center px-6 max-w-sm animate-fade-in">
              {result.meta.title}{result.meta.buyer ? ` · ${result.meta.buyer}` : ""}
            </p>
          )}
        </div>
      )}

      {failFlash && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in"
          role="status"
          aria-live="assertive"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-red-500/30 blur-3xl animate-ping" />
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl -rotate-3 bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-glow animate-scale-in">
              <XCircle className="w-20 h-20 sm:w-24 sm:h-24 text-white rotate-3" />
            </div>
          </div>
          <h2 className="mt-8 text-2xl sm:text-3xl font-bold font-display text-center px-4 animate-fade-in">
            Ticket rejected
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground text-center px-6 max-w-sm animate-fade-in">
            {failFlash}
          </p>
        </div>
      )}
    </div>
  );
}

function ScanHistoryList({ scope }: { scope: "mine" | "all" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["scan-history", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_scans" as any)
        .select("id, scanned_at, scanner_id, ticket:tickets(title), scanner:profiles!ticket_scans_scanner_id_fkey(display_name)")
        .order("scanned_at", { ascending: false })
        .limit(50);
      if (error) {
        // Fallback without joins if FK alias is unavailable.
        const fb = await supabase.from("ticket_scans" as any).select("*").order("scanned_at", { ascending: false }).limit(50);
        return fb.data ?? [];
      }
      return data ?? [];
    },
  });
  if (isLoading) return <p className="text-xs text-muted-foreground mt-2">Loading…</p>;
  const rows: any[] = data ?? [];
  if (!rows.length) return <p className="text-xs text-muted-foreground mt-2">No scans recorded yet.</p>;
  return (
    <ul className="mt-2 divide-y border rounded-xl bg-muted/30 text-xs">
      {rows.map((r) => (
        <li key={r.id} className="px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{r.ticket?.title ?? "Ticket"}</p>
            <p className="text-muted-foreground">
              {scope === "all" && r.scanner?.display_name ? `${r.scanner.display_name} · ` : ""}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
            </p>
          </div>
          <time className="text-muted-foreground whitespace-nowrap">{new Date(r.scanned_at).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}
