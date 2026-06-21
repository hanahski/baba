// Daily cron endpoint — auto-generates an EBSU news post from saved sources.
import { createFileRoute } from "@tanstack/react-router";
import { _autoGenerateForCron } from "@/lib/ebsu-news.functions";

export const Route = createFileRoute("/api/public/hooks/auto-ebsu-news")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const r = await _autoGenerateForCron();
          return Response.json({ ok: true, result: r });
        } catch (e: any) {
          console.error("[auto-ebsu-news] failed", e);
          return Response.json({ ok: false, error: e?.message ?? "failed" }, { status: 500 });
        }
      },
    },
  },
});
