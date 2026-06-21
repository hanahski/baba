// Shared UI for the 3 virtual-number RapidAPI providers. Each provider has
// slightly different response shapes — we normalise them to {label,id,code}
// for countries and a phone string for numbers.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, RefreshCcw, Copy, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Provider = "1" | "2" | "3";

export type VnumTheme = {
  ring: string;
  chip: string;
  icon: string;
};

type Country = { id: string; code: string; name: string };
type NumberItem = { phone: string };
type SmsItem = { from: string; text: string; at: string };

const asArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["data", "countries", "numbers", "messages", "items", "result", "results", "list"]) {
      const v = o[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        const inner = (v as Record<string, unknown>).data;
        if (Array.isArray(inner)) return inner;
      }
    }
  }
  return [];
};

const getStr = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
};

function normalizeCountries(provider: Provider, raw: unknown): Country[] {
  return asArray(raw).flatMap((row): Country[] => {
    if (!row || typeof row !== "object") {
      if (typeof row === "string") return [{ id: row, code: row, name: row }];
      return [];
    }
    const r = row as Record<string, unknown>;
    const name = getStr(r, "name", "country", "countryName", "title", "label");
    const id = getStr(r, "id", "countryId", "country_id", "code", "iso", "iso2", "countryCode", "value");
    const code = getStr(r, "code", "iso", "iso2", "countryCode", "prefix", "id");
    if (!name && !id && !code) return [];
    return [{ id: id || code, code: code || id, name: name || code || id }];
  });
}

function normalizeNumbers(_provider: Provider, raw: unknown): NumberItem[] {
  return asArray(raw).flatMap((row): NumberItem[] => {
    if (typeof row === "string") return [{ phone: row }];
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    const phone = getStr(r, "number", "phone", "phoneNumber", "msisdn", "value");
    return phone ? [{ phone }] : [];
  });
}

function normalizeMessages(_provider: Provider, raw: unknown): SmsItem[] {
  return asArray(raw).flatMap((row): SmsItem[] => {
    if (typeof row === "string") return [{ from: "", text: row, at: "" }];
    if (!row || typeof row !== "object") return [];
    const r = row as Record<string, unknown>;
    return [{
      from: getStr(r, "from", "sender", "originator", "source"),
      text: getStr(r, "text", "body", "message", "content", "sms"),
      at: getStr(r, "receivedAt", "timestamp", "date", "time", "createdAt"),
    }];
  });
}

export function VirtualNumberTool({
  provider,
  title,
  subtitle,
  theme,
}: {
  provider: Provider;
  title: string;
  subtitle: string;
  theme: VnumTheme;
}) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [number, setNumber] = useState<string>("");
  const [messages, setMessages] = useState<SmsItem[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState<"countries" | "numbers" | "messages" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = (params: Record<string, string>) => {
    const q = new URLSearchParams({ provider, ...params }).toString();
    return `/api/public/virtual-number?${q}`;
  };

  useEffect(() => {
    setLoading("countries");
    setError(null);
    setCountries([]);
    setCountry(null);
    setNumbers([]);
    setNumber("");
    setMessages([]);
    fetch(api({ action: "countries" }))
      .then((r) => r.json())
      .then((raw) => {
        const arr = normalizeCountries(provider, raw);
        setCountries(arr);
        if (!arr.length) setError("No countries returned");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const loadNumbers = async (c: Country) => {
    setCountry(c);
    setNumbers([]);
    setNumber("");
    setMessages([]);
    setLoading("numbers");
    setError(null);
    try {
      const res = await fetch(
        api({ action: "numbers", countryId: c.id, country: c.code }),
      );
      const raw = await res.json();
      const arr = normalizeNumbers(provider, raw);
      setNumbers(arr);
      if (!arr.length) setError("No numbers available for this country");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const loadMessages = async (num: string) => {
    setNumber(num);
    setLoading("messages");
    setError(null);
    try {
      const res = await fetch(
        api({
          action: "messages",
          number: num,
          countryId: country?.id || "",
          country: country?.code || "",
        }),
      );
      const raw = await res.json();
      const arr = normalizeMessages(provider, raw);
      setMessages(arr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const filteredCountries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) =>
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countries, filter]);

  return (
    <div className="space-y-5">
      <Link to="/tools" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to tools
      </Link>

      <div className={`bg-card border rounded-2xl p-5 shadow-card space-y-4 ${theme.ring}`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${theme.icon}`}>
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold font-display">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {!country && (
          <>
            <div>
              <Label className="text-xs font-bold">Search country</Label>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="e.g. United States"
                className="mt-1.5"
              />
            </div>
            {loading === "countries" ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading countries…
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
                {filteredCountries.map((c, i) => (
                  <button
                    key={`${c.id}-${i}`}
                    onClick={() => loadNumbers(c)}
                    className={`text-left rounded-lg border px-3 py-2 text-sm hover:bg-accent transition ${theme.chip}`}
                  >
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.code}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {country && !number && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Country:</span>{" "}
                <b>{country.name}</b>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setCountry(null); setNumbers([]); }}>
                Change
              </Button>
            </div>
            {loading === "numbers" ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading numbers…
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {numbers.map((n, i) => (
                  <button
                    key={`${n.phone}-${i}`}
                    onClick={() => loadMessages(n.phone)}
                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-accent transition ${theme.chip}`}
                  >
                    <span className="font-mono text-sm">+{n.phone.replace(/^\+/, "")}</span>
                    <span className="text-[11px] text-muted-foreground">Tap to view SMS</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {country && number && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">Number:</span>{" "}
                <b className="font-mono">+{number.replace(/^\+/, "")}</b>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(number); toast.success("Copied"); }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => loadMessages(number)}>
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setNumber(""); setMessages([]); }}>
                  Back
                </Button>
              </div>
            </div>

            {loading === "messages" ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading inbox…
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No messages yet — tap Refresh after using the number.
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {messages.map((m, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${theme.chip}`}>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <b className="text-foreground">{m.from || "Unknown"}</b>
                      <span>{m.at}</span>
                    </div>
                    <p className="text-sm leading-relaxed break-words">{m.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive break-words">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
