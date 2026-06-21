import { Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Phone, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { getOrCreateDmThread } from "@/lib/dm";
import { toast } from "sonner";

export type PlugShare = {
  kind: "market" | "ticket" | "book";
  id: string;
  href: string;
  contact?: string | null;
  authorId?: string | null;
};

const MARKER = "[[plug-share]]";

/** Parse and strip a plug-share marker from a post body. */
export function extractPlugShare(body: string | null | undefined): {
  share: PlugShare | null;
  body: string | null;
} {
  if (!body) return { share: null, body: body ?? null };
  const idx = body.lastIndexOf(MARKER);
  if (idx < 0) return { share: null, body };
  try {
    const json = body.slice(idx + MARKER.length).trim();
    const share = JSON.parse(json) as PlugShare;
    return { share, body: body.slice(0, idx).trimEnd() || null };
  } catch {
    return { share: null, body };
  }
}

export function encodePlugShare(share: PlugShare): string {
  return `\n\n${MARKER}${JSON.stringify(share)}`;
}

function buildContactHref(c: string): string | null {
  const v = c.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return `mailto:${v}`;
  const digits = v.replace(/[^\d+]/g, "");
  if (digits.length >= 7) {
    const wa = digits.replace(/^\+/, "");
    return `https://wa.me/${wa}`;
  }
  return null;
}

export function PlugShareActions({
  share,
  authorLabel,
}: {
  share: PlugShare;
  authorLabel?: string;
}) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [opening, setOpening] = useState(false);
  const contactHref = share.contact ? buildContactHref(share.contact) : null;

  const openChat = async () => {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (!share.authorId || share.authorId === user.id) {
      nav({ to: "/chat" });
      return;
    }
    setOpening(true);
    try {
      const tid = await getOrCreateDmThread(user.id, share.authorId);
      nav({ to: "/chat", search: { t: tid } as any });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open chat");
    } finally {
      setOpening(false);
    }
  };

  const sellerLabel =
    share.kind === "ticket"
      ? "Chat host"
      : share.kind === "book"
        ? "Chat writer"
        : "Chat seller";

  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Link
        to={share.href as any}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View {share.kind === "ticket" ? "ticket" : share.kind === "book" ? "book" : "listing"}
      </Link>
      <button
        type="button"
        onClick={openChat}
        disabled={opening}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-foreground text-xs font-semibold hover:bg-muted/70"
      >
        {opening ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <MessageCircle className="w-3.5 h-3.5" />
        )}
        {sellerLabel}
        {authorLabel ? ` · ${authorLabel}` : ""}
      </button>
      {contactHref && (
        <a
          href={contactHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:opacity-90"
        >
          <Phone className="w-3.5 h-3.5" />
          Contact
        </a>
      )}
    </div>
  );
}
