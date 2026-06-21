import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function generateCover(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Editorial cover photo for a Nigerian university study post. Clean, modern, vibrant, magazine quality. Real subject relevant to the topic. NO text, NO letters, NO logos. Subject: ${prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("img gen failed", res.status, await res.text());
      return null;
    }
    const j: any = await res.json();
    const parts = j.choices?.[0]?.message?.images ?? j.choices?.[0]?.message?.content;
    // Two known shapes: images array or data url inside content
    let b64: string | undefined;
    if (Array.isArray(parts)) {
      const url: string | undefined = parts[0]?.image_url?.url ?? parts[0]?.url;
      if (url?.startsWith("data:")) b64 = url.split(",")[1];
    }
    if (!b64 && typeof parts === "string") {
      const m = parts.match(/data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)/);
      if (m) b64 = m[1];
    }
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (e) {
    console.error("img gen err", e);
    return null;
  }
}

export const postFromScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; courseId?: string | null }) => ({
    title: String(d.title ?? "").trim().slice(0, 160),
    body: String(d.body ?? "").trim().slice(0, 20000),
    courseId: d.courseId || null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.title) throw new Error("Title required");
    if (!data.body) throw new Error("Body required");
    const userId = context.userId;

    // Best-effort image
    const promptHint = data.body.slice(0, 400);
    const img = await generateCover(promptHint);
    let image_url: string | null = null;
    if (img) {
      const path = `${userId}/${Date.now()}.png`;
      const { error } = await supabaseAdmin.storage
        .from("post-images")
        .upload(path, img, { contentType: "image/png", upsert: false });
      if (!error) {
        image_url = supabaseAdmin.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      } else {
        console.error("upload err", error);
      }
    }

    const { data: post, error: insErr } = await supabaseAdmin
      .from("posts")
      .insert({
        author_id: userId,
        post_type: "past_question",
        title: data.title,
        body: data.body,
        course_id: data.courseId,
        image_url,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    return { id: post.id, image_url };
  });
