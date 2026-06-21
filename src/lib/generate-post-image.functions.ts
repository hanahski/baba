import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";
// gpt-image-2 accepts the OpenAI-style `prompt` body used below.
// Gemini image models on this endpoint require messages+modalities instead.
const MODEL = "openai/gpt-image-2";

const InputSchema = z.object({
  prompt: z.string().min(3).max(800),
});

/**
 * Generate an AI image from a text prompt and upload it to the
 * `post-images` bucket. Returns the public URL.
 */
export const generatePostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: `${data.prompt}. Editorial, high quality, vibrant, suitable for a social media post.`,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`AI image failed (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");

    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const path = `${userId}/${Date.now()}-ai.png`;
    const up = await supabaseAdmin.storage
      .from("post-images")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = supabaseAdmin.storage.from("post-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
