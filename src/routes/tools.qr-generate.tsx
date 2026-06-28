import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, QrCode, Wifi, User, Link as LinkIcon, Type as TypeIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tools/qr-generate")({
  component: QrGeneratePage,
  head: () => ({
    meta: [
      { title: "QR Code Generator — StudentsPlug Tools" },
      { name: "description", content: "Free QR generator with 10 design templates. Make URL, text, WiFi and contact QR codes and download as PNG or SVG." },
    ],
  }),
});

type TemplateId =
  | "classic"
  | "rounded"
  | "dots"
  | "dots-rounded"
  | "framed"
  | "gradient-blue"
  | "gradient-sunset"
  | "mono-dark"
  | "mono-light"
  | "high-contrast";

type TemplateDef = {
  id: TemplateId;
  label: string;
  fg: string;
  bg: string;
  gradient?: [string, string];
  /** Render style for the QR modules. */
  style: "square" | "rounded" | "dots";
  /** Optional frame ring inside the SVG. */
  frame?: boolean;
};

const TEMPLATES: TemplateDef[] = [
  { id: "classic",         label: "Classic",        fg: "#000000", bg: "#ffffff", style: "square" },
  { id: "rounded",         label: "Rounded",        fg: "#1f2937", bg: "#ffffff", style: "rounded" },
  { id: "dots",            label: "Dots",           fg: "#0f172a", bg: "#ffffff", style: "dots" },
  { id: "dots-rounded",    label: "Soft Dots",      fg: "#1e293b", bg: "#f8fafc", style: "dots" },
  { id: "framed",          label: "Framed",         fg: "#111827", bg: "#ffffff", style: "rounded", frame: true },
  { id: "gradient-blue",   label: "Ocean",          fg: "#1e40af", bg: "#ffffff", gradient: ["#0ea5e9", "#1e3a8a"], style: "rounded" },
  { id: "gradient-sunset", label: "Sunset",         fg: "#b91c1c", bg: "#ffffff", gradient: ["#f97316", "#db2777"], style: "rounded" },
  { id: "mono-dark",       label: "Mono Dark",      fg: "#ffffff", bg: "#0f172a", style: "square" },
  { id: "mono-light",      label: "Mono Light",     fg: "#0f172a", bg: "#f1f5f9", style: "square" },
  { id: "high-contrast",   label: "High Contrast",  fg: "#000000", bg: "#facc15", style: "square", frame: true },
];

type Mode = "url" | "text" | "wifi" | "vcard";

function buildWifi(ssid: string, password: string, security: "WPA" | "WEP" | "nopass", hidden: boolean) {
  const esc = (s: string) => s.replace(/([\\;,":])/g, "\\$1");
  return `WIFI:T:${security};S:${esc(ssid)};${security !== "nopass" ? `P:${esc(password)};` : ""}${hidden ? "H:true;" : ""};`;
}

function buildVCard(p: { firstName: string; lastName: string; phone: string; email: string; org: string; url: string }) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${p.lastName};${p.firstName}`,
    `FN:${`${p.firstName} ${p.lastName}`.trim()}`,
    p.org && `ORG:${p.org}`,
    p.phone && `TEL;TYPE=CELL:${p.phone}`,
    p.email && `EMAIL:${p.email}`,
    p.url && `URL:${p.url}`,
    "END:VCARD",
  ].filter(Boolean).join("\n");
}

/** Build an SVG with the chosen template applied. */
async function renderTemplatedSvg(payload: string, t: TemplateDef): Promise<string> {
  // Generate the raw module matrix via qrcode lib.
  const code = QRCode.create(payload || " ", { errorCorrectionLevel: "M" });
  const size = code.modules.size;
  const data = code.modules.data; // Uint8Array, row-major, 1 = dark
  const px = 12;            // module size in svg units
  const margin = 4 * px;    // quiet zone
  const total = size * px + margin * 2;

  const id = `g${Math.random().toString(36).slice(2, 8)}`;
  const fillRef = t.gradient ? `url(#${id})` : t.fg;
  const grad = t.gradient
    ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${t.gradient[0]}"/><stop offset="100%" stop-color="${t.gradient[1]}"/></linearGradient></defs>`
    : "";

  let modules = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!data[y * size + x]) continue;
      const cx = margin + x * px;
      const cy = margin + y * px;
      if (t.style === "dots") {
        modules += `<circle cx="${cx + px / 2}" cy="${cy + px / 2}" r="${px / 2.2}" fill="${fillRef}"/>`;
      } else if (t.style === "rounded") {
        modules += `<rect x="${cx}" y="${cy}" width="${px}" height="${px}" rx="${px / 3}" ry="${px / 3}" fill="${fillRef}"/>`;
      } else {
        modules += `<rect x="${cx}" y="${cy}" width="${px}" height="${px}" fill="${fillRef}"/>`;
      }
    }
  }

  const frame = t.frame
    ? `<rect x="${margin / 2}" y="${margin / 2}" width="${total - margin}" height="${total - margin}" rx="${px * 2}" ry="${px * 2}" fill="none" stroke="${t.fg}" stroke-width="${px / 1.5}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}">
${grad}
<rect width="100%" height="100%" fill="${t.bg}"/>
${frame}
${modules}
</svg>`;
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const sized = svg.match(/width="(\d+)"/);
  const w = sized ? Number(sized[1]) : 512;
  const img = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = w * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function QrGeneratePage() {
  const [mode, setMode] = useState<Mode>("url");
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [url, setUrl] = useState("https://studentsplug.app");
  const [text, setText] = useState("");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" as "WPA" | "WEP" | "nopass", hidden: false });
  const [vcard, setVcard] = useState({ firstName: "", lastName: "", phone: "", email: "", org: "", url: "" });

  const payload = useMemo(() => {
    if (mode === "url") return url.trim();
    if (mode === "text") return text;
    if (mode === "wifi") return wifi.ssid ? buildWifi(wifi.ssid, wifi.password, wifi.security, wifi.hidden) : "";
    return vcard.firstName || vcard.lastName ? buildVCard(vcard) : "";
  }, [mode, url, text, wifi, vcard]);

  const def = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0];
  const [svg, setSvg] = useState<string>("");
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!payload.trim()) { setSvg(""); return; }
    renderTemplatedSvg(payload, def).then((s) => { if (!cancelled) setSvg(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, [payload, def]);

  const onDownloadSvg = () => {
    if (!svg) return;
    downloadBlob(`qr-${template}.svg`, new Blob([svg], { type: "image/svg+xml" }));
    toast.success("SVG downloaded");
  };
  const onDownloadPng = async () => {
    if (!svg) return;
    try {
      const blob = await svgToPngBlob(svg, 3);
      downloadBlob(`qr-${template}.png`, blob);
      toast.success("PNG downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not render PNG");
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto pb-16">
        <header className="mb-5 rounded-3xl p-6 bg-gradient-to-br from-primary via-primary/80 to-accent text-primary-foreground shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><QrCode className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-bold font-display leading-tight">QR Code Generator</h1>
              <p className="text-xs opacity-90">URL, Text, WiFi or contact card. 10 design templates. Download as PNG or SVG.</p>
            </div>
          </div>
        </header>

        <div className="grid md:grid-cols-[1fr_320px] gap-5">
          <section className="bg-card border rounded-2xl p-5 space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="url" className="text-xs gap-1"><LinkIcon className="w-3.5 h-3.5" />URL</TabsTrigger>
                <TabsTrigger value="text" className="text-xs gap-1"><TypeIcon className="w-3.5 h-3.5" />Text</TabsTrigger>
                <TabsTrigger value="wifi" className="text-xs gap-1"><Wifi className="w-3.5 h-3.5" />WiFi</TabsTrigger>
                <TabsTrigger value="vcard" className="text-xs gap-1"><User className="w-3.5 h-3.5" />vCard</TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-2 pt-4">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
              </TabsContent>

              <TabsContent value="text" className="space-y-2 pt-4">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Plain text</Label>
                <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Anything — message, code, note…" />
              </TabsContent>

              <TabsContent value="wifi" className="space-y-3 pt-4">
                <div>
                  <Label className="text-xs">Network name (SSID)</Label>
                  <Input value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Password</Label>
                  <Input type="text" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Security</Label>
                    <Select value={wifi.security} onValueChange={(v: any) => setWifi({ ...wifi, security: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA / WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="nopass">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-end gap-2 text-xs pb-2">
                    <input type="checkbox" checked={wifi.hidden} onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })} />
                    Hidden
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="vcard" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">First name</Label><Input value={vcard.firstName} onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })} /></div>
                  <div><Label className="text-xs">Last name</Label><Input value={vcard.lastName} onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Phone</Label><Input value={vcard.phone} onChange={(e) => setVcard({ ...vcard, phone: e.target.value })} /></div>
                <div><Label className="text-xs">Email</Label><Input value={vcard.email} onChange={(e) => setVcard({ ...vcard, email: e.target.value })} /></div>
                <div><Label className="text-xs">Organisation</Label><Input value={vcard.org} onChange={(e) => setVcard({ ...vcard, org: e.target.value })} /></div>
                <div><Label className="text-xs">Website</Label><Input value={vcard.url} onChange={(e) => setVcard({ ...vcard, url: e.target.value })} /></div>
              </TabsContent>
            </Tabs>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">Design template</Label>
              <div className="grid grid-cols-5 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`aspect-square rounded-xl border-2 p-1 text-[10px] font-semibold flex flex-col items-center justify-center gap-0.5 transition ${template === t.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                    style={{ background: t.bg, color: t.gradient ? t.gradient[1] : t.fg }}
                    title={t.label}
                  >
                    <span className="w-5 h-5 rounded" style={{ background: t.gradient ? `linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})` : t.fg }} />
                    <span className="truncate w-full text-center">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="bg-card border rounded-2xl p-5 space-y-3 h-fit md:sticky md:top-20">
            <div ref={previewRef} className="aspect-square w-full bg-muted/30 rounded-xl flex items-center justify-center overflow-hidden p-2">
              {svg ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: svg }} />
              ) : (
                <div className="text-center text-xs text-muted-foreground p-4">
                  <QrCode className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  Fill out the form to preview your QR.
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={onDownloadPng} disabled={!svg}><Download className="w-4 h-4 mr-1" />PNG</Button>
              <Button variant="outline" onClick={onDownloadSvg} disabled={!svg}><Download className="w-4 h-4 mr-1" />SVG</Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Works offline — your QR is generated in your browser. Nothing is uploaded.</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
