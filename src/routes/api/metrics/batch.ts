import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Event = z.object({
  event_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  kind: z.enum(["view", "wa", "call"]),
  client_timestamp: z.string().datetime().optional(),
});
const Body = z.object({ events: z.array(Event).min(1).max(100) });

/** Toplu sayaç ucu. Aynı event_id ikinci kez gelirse sayım artmaz. 200 = hepsi tamam, 207 = kısmi. */
export const Route = createFileRoute("/api/metrics/batch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid body" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const events = [...parsed.events].sort((a, b) => (a.client_timestamp ?? "").localeCompare(b.client_timestamp ?? ""));
        const results: { event_id: string; ok: boolean; views?: number | null }[] = [];
        for (const e of events) {
          const { data, error } = await (supabaseAdmin.rpc as any)("track_listing_event_once", {
            _event_id: e.event_id,
            _listing_id: e.listing_id,
            _kind: e.kind,
            _client_ts: e.client_timestamp ?? null,
          });
          results.push({ event_id: e.event_id, ok: !error, views: typeof data === "number" ? data : null });
        }
        const failed = results.some((r) => !r.ok);
        if (failed && results.every((r) => !r.ok)) return Response.json({ results }, { status: 503 });
        return Response.json({ results }, { status: failed ? 207 : 200 });
      },
    },
  },
});
