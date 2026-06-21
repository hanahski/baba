import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PORTAL_URL =
  "https://portal.ebsu.edu.ng/modules/admission/CheckAdmissionStatus.aspx";

const inputSchema = z.object({
  jambRegNumber: z
    .string()
    .trim()
    .min(6, "JAMB reg number too short")
    .max(20, "JAMB reg number too long")
    .regex(/^[A-Za-z0-9/\-]+$/, "Only letters, numbers, / and - allowed"),
  session: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Session must look like 2024-2025"),
});

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function extractField(html: string, name: string): string {
  const re = new RegExp(
    `name="${name}"[^>]*value="([^"]*)"|value="([^"]*)"[^>]*name="${name}"`,
    "i",
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? "") : "";
}

function extractSessionMap(html: string): Record<string, string> {
  // <option value="28">2025-2026</option>
  const map: Record<string, string> = {};
  const re = /<option[^>]*value="(\d+)"[^>]*>\s*(\d{4}-\d{4})\s*<\/option>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) map[m[2]] = m[1];
  return map;
}

function mergeSetCookie(jar: Map<string, string>, headers: Headers) {
  const raw = (headers as any).getSetCookie?.() ?? [];
  const list: string[] = Array.isArray(raw) && raw.length ? raw : [];
  if (!list.length) {
    const single = headers.get("set-cookie");
    if (single) list.push(...single.split(/,(?=[^;]+=)/));
  }
  for (const c of list) {
    const pair = c.split(";")[0].trim();
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

// Manually follow redirects so cookies are carried across hops.
async function fetchFollow(
  url: string,
  init: RequestInit,
  jar: Map<string, string>,
  maxHops = 5,
): Promise<{ res: Response; finalUrl: string }> {
  let currentUrl = url;
  let currentInit: RequestInit = { ...init, redirect: "manual" };
  for (let i = 0; i < maxHops; i++) {
    const headers = new Headers(currentInit.headers || {});
    const ch = cookieHeader(jar);
    if (ch) headers.set("Cookie", ch);
    const res = await fetch(currentUrl, { ...currentInit, headers });
    mergeSetCookie(jar, res.headers);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { res, finalUrl: currentUrl };
      currentUrl = new URL(loc, currentUrl).toString();
      currentInit = { method: "GET", redirect: "manual", headers: currentInit.headers };
      continue;
    }
    return { res, finalUrl: currentUrl };
  }
  throw new Error("Too many redirects");
}

export const verifyEbsuStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const jamb = data.jambRegNumber.toUpperCase();

    // 1. GET the form (manually following redirects so cookies persist).
    const jar = new Map<string, string>();
    let getRes: Response;
    let formUrl: string;
    try {
      const r = await fetchFollow(
        PORTAL_URL,
        { method: "GET", headers: { "User-Agent": UA, Accept: "text/html" } },
        jar,
      );
      getRes = r.res;
      formUrl = r.finalUrl;
    } catch (e: any) {
      return { ok: false as const, error: "Couldn't reach the EBSU portal. Try again." };
    }
    const getHtml = await getRes.text();

    const viewState = extractField(getHtml, "__VIEWSTATE");
    const viewStateGen = extractField(getHtml, "__VIEWSTATEGENERATOR");
    const eventValidation = extractField(getHtml, "__EVENTVALIDATION");
    const sessionMap = extractSessionMap(getHtml);
    const sessionValue = sessionMap[data.session];

    if (!viewState || !sessionValue) {
      return {
        ok: false as const,
        error: !sessionValue
          ? `Session ${data.session} is not available on the EBSU portal.`
          : "EBSU portal returned an unexpected page. Try again later.",
      };
    }

    // 2. POST the form (same URL as the form action), carrying cookies.
    const body = new URLSearchParams({
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGen,
      __EVENTVALIDATION: eventValidation,
      ddlSession: sessionValue,
      txtName: jamb,
      btnProceed: "Proceed",
    });

    let postRes: Response;
    try {
      const r = await fetchFollow(
        formUrl,
        {
          method: "POST",
          headers: {
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "text/html",
            Referer: formUrl,
            Origin: "https://portal.ebsu.edu.ng",
          },
          body: body.toString(),
        },
        jar,
      );
      postRes = r.res;
    } catch (e: any) {
      return { ok: false as const, error: "Couldn't reach the EBSU portal. Try again." };
    }
    const respHtml = await postRes.text();

    const notFound = /record not found in admission list/i.test(respHtml);
    const congrats = /congratulations/i.test(respHtml);
    const found = congrats && !notFound;

    // Log attempt regardless of outcome.
    await supabaseAdmin.from("student_verifications").insert({
      user_id: userId,
      jamb_reg_number: jamb,
      verified: found,
      response: {
        session: data.session,
        not_found: notFound,
        congrats,
        status: postRes.status,
      },
    });

    if (!found) {
      return {
        ok: false as const,
        error: notFound
          ? "Record not found in the Admission List for that session. If you used your EBSU reg number, try your JAMB registration number instead — and double-check the session."
          : "We couldn't confirm your admission on the EBSU portal. Try a different session, or try your JAMB number if you used your EBSU reg number.",
      };
    }

    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_verified: true } as any)
      .eq("id", userId);
    if (updErr) {
      return { ok: false as const, error: updErr.message };
    }

    return { ok: true as const, jambRegNumber: jamb, session: data.session };
  });
