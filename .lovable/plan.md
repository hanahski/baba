# Build plan — chat, feed, market, banners, book composer, admin, tools

You selected all four batches. I'll ship them across **4 turns**, smallest-risk first, so each turn leaves the app in a working state. After each turn I'll confirm before moving to the next.

---

## Turn 1 — Quick wins (small, low risk)

**Goal:** ship visible fixes immediately so the rest is built on a clean base.

- **Book composer toolbar fix** — `RichTextEditor` toolbar currently floats over the first lines of the chapter. Make it sticky inside its own container with proper top padding so text is never obscured.
- **`/tools/qr-generate`** — new route. Tabs for URL / Text / WiFi / vCard. 10 design templates (classic, rounded, dots, dots-rounded, framed, gradient-blue, gradient-sunset, mono-dark, mono-light, logo-center). Download as PNG/SVG. Pure client-side via `qrcode` lib — no credits, no backend.
- **`useDraft` hook** + restore banner on post composer and market new-listing form (localStorage, survives reload).
- Fix runtime error: dynamic-import failure on `virtual:tanstack-start-client-entry` (stale dev chunk after recent edits).

---

## Turn 2 — Chat + Feed + Market upgrades

**Chat**
- Active Now strip above DMs: horizontal avatars of online students who share a thread with you, with unread badge dot, search input, 30s presence re-tick (`setInterval` invalidating presence query), dedup by user id.
- Verify presence heartbeat in `src/lib/auth.tsx` writes `last_seen_at` every 60s + on focus + on visibility change (already present — audit only).
- Realtime DM channel: filter `postgres_changes` on `dm_messages` by `thread_id=in.(...your thread ids)` instead of subscribing globally.

**Feed**
- Optimistic likes & reposts: `useMutation` with `onMutate` toggling cache, `onError` rollback.
- "Load more posts": cursor pagination using `created_at` + `id`, 20 per page.

**Market**
- "Load more listings": same cursor pattern.
- Sold-listing filter toggle (default hides sold).
- Draft persistence on new-listing form via `useDraft`.

---

## Turn 3 — Banners composer + analytics

- New `/admin/banners` editor: WhatsApp-style preview with 6 layouts (image-left, image-right, image-top, image-bg, text-only, split). Drag-drop image upload to `banners` bucket, accent color picker, light/dark variants.
- Schema additions to `banner_slides`: `publish_at`, `expire_at`, `layout`, `accent`, `variant`, `sort_idx`.
- Scheduled publish + auto-expire (filter on `home` query: `publish_at <= now() AND (expire_at IS NULL OR expire_at > now())`).
- Autosave drafts + 30-step undo/redo (in-memory stack).
- Drag-and-drop ordering (`@dnd-kit/sortable` — already in deps if present, else add).
- New table `banner_events(id, banner_id, kind impressions|clicks, user_id?, at)`. CTR computed in admin panel. Frontend logs impression on first view + click on tap.

---

## Turn 4 — Book composer full pack + Admin + Tools

**Book Composer**
- AI cover generation (Lovable AI image gateway, credit-gated via `spend_credits`).
- AI inline images via slash command.
- AI writing assistant: continue / rewrite / expand / shorten / grammar (Lovable AI `google/gemini-3-flash-preview`).
- Drag-reorder chapters (`@dnd-kit`), persist `idx`.
- EPUB export (`epub-gen-memory`) + PDF export (`jspdf` + `html2canvas` per chapter).
- Word count + reading time in sidebar.
- 6 cover templates (gradient + title typography presets, render to canvas).
- Find & replace dialog across chapters.
- Auto TOC generator (insert chapter list with anchors at chapter 0).
- Publish preview dialog (renders read view in modal before publish).
- Collaborator share link → new public route `/books/preview/$token`, new column `user_books.share_token`.
- Per-chapter undo/redo via Tiptap history (already built-in — wire Ctrl+Z properly).

**Admin**
- `/admin-login` staff page (email/password gated, redirects to `/admin` if `has_role('admin')`).
- Tool Editor "Test API" button — calls the override endpoint with sample params and shows raw response.
- Tool Prices admin panel reads/writes `tool_prices` table.
- Pre-seed RapidAPI overrides via migration insert.
- Smarter `aiParseToolSnippet`: detect `{{placeholder}}` and map to action params.

---

## Technical notes

- **Schema migrations** are batched per turn — I won't issue ad-hoc DDL during component work.
- **Realtime cost**: scoping DM channel by thread ids prevents fanout to every signed-in user.
- **Credit gating**: AI image + AI writing call `spend_credits` server-side before invoking the gateway; UI shows the cost up-front.
- **Storage**: book-covers, banners, post-* buckets already exist — no new buckets needed except possibly `book-exports` for EPUB/PDF (or stream as download blob, no bucket required — preferred).
- **Backwards compatibility**: every new column is nullable or has a default; no existing row breaks.

---

## What I need from you

Reply **"go"** and I'll start Turn 1 immediately. If you want me to reorder (e.g. banners before chat), say so now.
