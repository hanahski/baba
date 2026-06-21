import { createFileRoute } from "@tanstack/react-router";

function parseLimit(request: Request) {
  const raw = new URL(request.url).searchParams.get("max");
  return raw ? Math.max(1, Math.min(500, Number.parseInt(raw, 10) || 500)) : 500;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function syncResponse(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { syncFreeBookCentre } = await import("@/lib/freebookcentre-sync.server");
    const results = await syncFreeBookCentre(parseLimit(request));
    return Response.json({ ok: true, source: "freebookcentre.net", results });
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/sync-library-books")({
  server: {
    handlers: {
      GET: ({ request }) => syncResponse(request),
      POST: ({ request }) => syncResponse(request),
    },
  },
});
