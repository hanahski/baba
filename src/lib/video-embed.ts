// Detects video-share URLs from common social platforms and returns an
// iframe-embed descriptor when possible. Falls back to null so callers can
// route the URL through ReactPlayer (YouTube / Vimeo / mp4 / etc.).

export type EmbedInfo = {
  src: string;
  /** width / height ratio. Most social embeds default to 16/9, vertical 9/16. */
  aspect: number;
  allow?: string;
  /** display label for accessibility. */
  platform: string;
};

const DEFAULT_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";

export function getSocialEmbed(rawUrl: string): EmbedInfo | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");

  // ── Instagram (post / reel / tv) ────────────────────────────────────────
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (m) {
      return {
        src: `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned`,
        aspect: m[1] === "reel" ? 9 / 16 : 1,
        platform: "Instagram",
      };
    }
  }

  // ── TikTok ──────────────────────────────────────────────────────────────
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const m = url.pathname.match(/\/video\/(\d+)/) || url.pathname.match(/^\/v\/(\d+)/);
    if (m) {
      return {
        src: `https://www.tiktok.com/embed/v2/${m[1]}`,
        aspect: 9 / 16,
        platform: "TikTok",
        allow: DEFAULT_ALLOW,
      };
    }
  }

  // ── Facebook (videos, reels, watch) ─────────────────────────────────────
  if (host === "facebook.com" || host === "fb.watch" || host.endsWith(".facebook.com")) {
    const u = encodeURIComponent(rawUrl);
    return {
      src: `https://www.facebook.com/plugins/video.php?href=${u}&show_text=false&autoplay=false`,
      aspect: 16 / 9,
      platform: "Facebook",
      allow: DEFAULT_ALLOW,
    };
  }

  // ── Twitter / X (tweet, video) ─ uses the platform.twitter widgets
  if (host === "twitter.com" || host === "x.com" || host.endsWith(".twitter.com") || host.endsWith(".x.com")) {
    const m = url.pathname.match(/\/status\/(\d+)/);
    if (m) {
      return {
        src: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&theme=dark&hideCard=false&hideThread=true`,
        aspect: 16 / 11,
        platform: "X (Twitter)",
      };
    }
  }

  // ── Reddit videos ───────────────────────────────────────────────────────
  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    return {
      src: `https://www.redditmedia.com${url.pathname}?embed=true&showmedia=true`,
      aspect: 16 / 9,
      platform: "Reddit",
    };
  }

  // ── Streamable ──────────────────────────────────────────────────────────
  if (host === "streamable.com") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    if (id) {
      return {
        src: `https://streamable.com/e/${id}`,
        aspect: 16 / 9,
        platform: "Streamable",
        allow: DEFAULT_ALLOW,
      };
    }
  }

  return null;
}
