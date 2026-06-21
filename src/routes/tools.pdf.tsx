import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { fetchToolCost } from "@/lib/tool-prices";

export const Route = createFileRoute("/tools/pdf")({ component: TextToPdf });

function TextToPdf() {
  const { user, refreshProfile } = useAuth();
  const [title, setTitle] = useState("My document");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!user) return toast.error("Sign in first");
    if (!body.trim()) return toast.error("Type or paste some text");
    setBusy(true);
    try {
      const cost = await fetchToolCost("/tools/pdf", 10);
      if (cost > 0) {
        const { error } = await supabase.rpc("spend_credits", {
          _amount: cost, _reason: "tool:text_to_pdf", _metadata: { title },
        });
        if (error) {
          if (error.message.includes("INSUFFICIENT_CREDITS")) throw new Error("Not enough credits");
          throw error;
        }
      }
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      doc.text(title, margin, margin);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      const lines = doc.splitTextToSize(body, maxWidth);
      let y = margin + 28;
      const pageH = doc.internal.pageSize.getHeight() - margin;
      for (const line of lines) {
        if (y > pageH) { doc.addPage(); y = margin; }
        doc.text(line, margin, y); y += 16;
      }
      doc.save(`${title.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
      toast.success(cost > 0 ? `PDF downloaded. −${cost} credits` : "PDF downloaded");
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-card space-y-4">
      <Link to="/tools" className="text-xs text-primary inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />All tools</Link>
      <div>
        <h2 className="text-xl font-bold font-display">Text → PDF</h2>
        <p className="text-sm text-muted-foreground">Costs 10 credits per PDF.</p>
      </div>
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></div>
      <div><Label>Body</Label><Textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste or write your content here…" /></div>
      <Button onClick={generate} disabled={busy} className="w-full">
        <Download className="w-4 h-4 mr-2" />{busy ? "Generating…" : "Generate PDF (−10)"}
      </Button>
    </div>
  );
}