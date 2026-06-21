import { supabase } from "@/integrations/supabase/client";

/**
 * The `banners` bucket is private (public buckets are blocked by the
 * workspace), so stored public URLs return 404. This resolves whatever is
 * stored in `banner_slides.image_url` into a usable signed URL.
 *
 * Handles three stored shapes:
 *  - a bare storage path (new uploads)               → "1781190748132-abc.png"
 *  - a legacy Supabase public URL (.../banners/...)  → extract path, sign it
 *  - an external http(s) URL                         → returned as-is
 */
export function bannerStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const value = stored.trim();
  if (!value) return null;
  const marker = "/banners/";
  const idx = value.indexOf(marker);
  if (idx !== -1) return value.slice(idx + marker.length);
  // Bare path (no protocol) → treat as a storage key inside the bucket.
  if (!/^https?:\/\//i.test(value)) return value;
  return null; // external URL — not a storage object
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function resolveBannerUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  const path = bannerStoragePath(stored);
  if (!path) return stored.trim() || null; // external URL, use directly
  const { data } = await supabase.storage.from("banners").createSignedUrl(path, ONE_YEAR);
  return data?.signedUrl ?? null;
}

export async function resolveBannerUrls<T extends { image_url?: string | null }>(
  rows: T[],
): Promise<(T & { image_url: string | null })[]> {
  return Promise.all(
    rows.map(async (r) => ({ ...r, image_url: await resolveBannerUrl(r.image_url) })),
  );
}
