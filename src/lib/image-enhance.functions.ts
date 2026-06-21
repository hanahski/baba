import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  imageDataUrl: z.string().min(64).max(15_000_000),
});

const ENHANCE_PROMPT =
  "Enhance this photo: subtly sharpen details, improve lighting and color balance, reduce noise and compression artifacts, and boost clarity. Keep the subject, framing, pose, identity, and composition IDENTICAL. Do not add, remove, or restyle anything. Output a clean, natural, higher-quality version of the same image.";

export const enhanceImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI not configured" };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: ENHANCE_PROMPT },
                { type: "image_url", image_url: { url: data.imageDataUrl } },
              ],
            },
          ],
        }),
      });

      if (res.status === 429) return { ok: false as const, error: "Rate limited" };
      if (res.status === 402) return { ok: false as const, error: "AI credits exhausted" };
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("[enhance] gateway error", res.status, t.slice(0, 300));
        return { ok: false as const, error: `Enhance error ${res.status}` };
      }
      const json: any = await res.json();
      const url: string | undefined = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url || !url.startsWith("data:")) {
        return { ok: false as const, error: "No image in response" };
      }
      return { ok: true as const, imageDataUrl: url };
    } catch (e: any) {
      console.error("[enhance] threw", e?.message);
      return { ok: false as const, error: e?.message || "Enhance failed" };
    }
  });
