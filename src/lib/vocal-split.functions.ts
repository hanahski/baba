import { createServerFn } from "@tanstack/react-start";

const RAPIDAPI_HOST = "voice-separation-api.p.rapidapi.com";

type VocalSplitResponse = {
  vocalsUrl: string;
  instrumentsUrl: string;
  cached?: boolean;
  fileInfo?: { duration?: number };
  usage?: { remaining?: number };
};

export const separateVocals = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error("Expected audio upload");
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");
    if (file.size > 50 * 1024 * 1024) throw new Error("Max 50 MB");
    return data;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) throw new Error("Vocal remover is not configured");

    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Missing file");

    const out = new FormData();
    out.append("file", file, file.name || "audio");

    let res: Response;
    try {
      res = await fetch(`https://${RAPIDAPI_HOST}/api/rapidapi/separate-audio`, {
        method: "POST",
        headers: {
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": apiKey,
        },
        body: out,
      });
    } catch (error) {
      console.error("[vocal-split] upstream fetch failed", error);
      throw new Error("Could not reach the vocal remover service. Try again shortly.");
    }

    const text = await res.text();
    let parsed: VocalSplitResponse;
    try {
      parsed = JSON.parse(text) as VocalSplitResponse;
    } catch {
      console.error("[vocal-split] non-json upstream response", text.slice(0, 500));
      throw new Error("Vocal remover returned an unreadable response");
    }

    if (!res.ok) {
      const upstream = parsed as Partial<VocalSplitResponse> & {
        error?: string;
        upstream?: { error?: string };
      };
      const message =
        upstream.error ||
        upstream.upstream?.error ||
        `Separation failed (${res.status})`;
      throw new Error(message);
    }

    if (!parsed.vocalsUrl || !parsed.instrumentsUrl) {
      throw new Error("Vocal remover did not return both stems");
    }

    return {
      vocalsUrl: parsed.vocalsUrl,
      instrumentsUrl: parsed.instrumentsUrl,
      cached: !!parsed.cached,
      fileInfo: { duration: parsed.fileInfo?.duration },
      usage: { remaining: parsed.usage?.remaining },
    };
  });