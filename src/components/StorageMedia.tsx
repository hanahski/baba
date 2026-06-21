// Drop-in <img>/<video> that lazily signs Supabase storage URLs so private
// buckets render in the feed without changing policies.
import { useEffect, useState } from "react";
import { resolveStorageUrl, isVideoUrl } from "@/lib/storage-url";

type Props = {
  url: string | null | undefined;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Force a particular renderer; otherwise auto-detect by extension. */
  as?: "img" | "video";
};

export function StorageMedia({ url, alt, className, loading = "lazy", as }: Props) {
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolveStorageUrl(url).then((u) => { if (alive) setResolved(u); });
    return () => { alive = false; };
  }, [url]);
  if (!resolved) return <div className={className} aria-hidden />;
  const kind = as ?? (isVideoUrl(resolved) ? "video" : "img");
  if (kind === "video") {
    return (
      <video
        src={resolved}
        className={className}
        controls
        playsInline
        preload="metadata"
      />
    );
  }
  return <img src={resolved} alt={alt ?? ""} loading={loading} className={className} />;
}
