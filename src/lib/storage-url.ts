// Workspace policy forbids public buckets, so `/object/public/...` URLs we
// stored in the past 400 out. This helper re-signs them on demand for display.
// The bucket has a `public SELECT` RLS policy, so anon users can sign too.
import { supabase } from "@/integrations/supabase/client";

const SIGN_BUCKETS = ["post-media", "post-images", "covers", "book-covers", "blog-images", "banners", "book-pdfs"];

/** Try to extract { bucket, path } from any Supabase storage URL we may have stored. */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    // matches /storage/v1/object/{public|authenticated|sign}/{bucket}/{...path}
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2].split("?")[0]) };
  } catch {
    return null;
  }
}

const cache = new Map<string, { url: string; exp: number }>();

/** Resolve a (possibly private) storage URL to a signed URL that <img>/<video> can load. */
export async function resolveStorageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const parsed = parseStorageUrl(url);
  if (!parsed || !SIGN_BUCKETS.includes(parsed.bucket)) return url;
  const cached = cache.get(url);
  if (cached && cached.exp > Date.now()) return cached.url;
  const ttl = 60 * 60 * 24 * 7; // 1 week
  const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, ttl);
  if (!data?.signedUrl) return url;
  cache.set(url, { url: data.signedUrl, exp: Date.now() + (ttl - 60) * 1000 });
  return data.signedUrl;
}

/** Batch helper. */
export async function resolveStorageUrls(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(urls.map(resolveStorageUrl));
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);
}
