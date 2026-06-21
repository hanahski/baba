import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  imageDataUrl: z.string().min(32).max(20_000_000), // up to ~15MB base64
  mimeType: z.string().min(3).max(64).default("image/png"),
});

const SYSTEM = `You are an expert OCR engine for Nigerian university past questions, lecture notes, and handwritten student work.
Extract ALL text from the image with maximum fidelity. Handle BOTH printed text and handwriting.
Detect language automatically (English, Pidgin, Igbo, Yoruba, Hausa, etc.) and preserve it.

Rules — CRITICAL:
1. Convert EVERY mathematical, physics, or chemistry expression to LaTeX, wrapped in $...$ (inline) or $$...$$ (block).
   - Superscripts: 10⁸ → $10^{8}$ ;  x² → $x^{2}$
   - Subscripts: H₂O → $H_{2}O$ ;  CO₂ → $CO_{2}$
   - Multiplication sign × → \\times  (NEVER output bare "x" for multiplication)
   - Division: a/b inside formulas → $\\frac{a}{b}$  (e.g. dy/dx → $\\frac{dy}{dx}$, 5/9 → $\\frac{5}{9}$)
   - Scientific notation: 1.6×10⁻¹³ → $1.6 \\times 10^{-13}$
   - Greek letters: Σ→\\Sigma, π→\\pi, μ→\\mu, λ→\\lambda, θ→\\theta, Δ→\\Delta
   - Arrows: → \\rightarrow, ⇌ \\rightleftharpoons (for chem equilibria)
   - Roots: √x → $\\sqrt{x}$
   - Units stay OUTSIDE math: "$310$ m/s" not "$310 m/s$"
   - Display equations (formulas on their own line) MUST use $$...$$ on their own line.
2. Preserve question numbering EXACTLY (1., 1a., (i), (ii), Q1, etc.). Keep blank lines between questions.
3. Preserve line breaks and paragraph structure.
4. Fix obvious OCR errors using context (e.g. "rn" misread as "m", "0" vs "O", "1" vs "l"), but NEVER invent content.
5. NEVER output a bare "$", "&", "\\\\", or stray symbol outside a valid math expression. If you cannot identify what a symbol means, omit it.
6. If the image contains a figure/diagram/screenshot you cannot transcribe as text, write a single short bracketed line like "[Figure: brief description]" and continue with the surrounding text.
7. NEVER add commentary, intros, or "Here is the text". Output ONLY the extracted text.`;


export const extractTextFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI service is not configured." };
    }

    // Accept data URL OR raw base64; normalize to data URL for the model.
    let dataUrl = data.imageDataUrl;
    if (!dataUrl.startsWith("data:")) {
      dataUrl = `data:${data.mimeType};base64,${dataUrl}`;
    }

    const started = Date.now();
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract all text from this image. Follow every rule." },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Too many scans right now. Wait a minute and try again." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "AI credits exhausted. Add credits in workspace settings." };
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[ocr] gateway error", res.status, body.slice(0, 500));
        return { ok: false as const, error: `Scanner service error (${res.status}).` };
      }

      const json: any = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "";
      const clean = String(text).trim();
      if (!clean) {
        return { ok: false as const, error: "No text could be detected in this image." };
      }
      return {
        ok: true as const,
        text: clean,
        elapsedMs: Date.now() - started,
        model: "google/gemini-2.5-pro",
      };
    } catch (e: any) {
      console.error("[ocr] threw", e?.message);
      return { ok: false as const, error: e?.message || "Scanner crashed." };
    }
  });

const FeedbackInput = z.object({
  originalText: z.string().min(1).max(50_000),
  correctedText: z.string().min(1).max(50_000),
  note: z.string().max(2000).optional(),
});

export const submitOcrCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("ocr_corrections").insert({
      user_id: userId,
      original_text: data.originalText,
      corrected_text: data.correctedText,
      note: data.note ?? null,
    });
    if (error) {
      console.error("[ocr] feedback insert failed", error.message);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });
