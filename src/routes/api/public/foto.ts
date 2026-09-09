import { createFileRoute } from "@tanstack/react-router";

const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;

export const Route = createFileRoute("/api/public/foto")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("p") ?? "";
        if (!path || path.includes("..") || !SAFE_PATH.test(path)) {
          return new Response("Geçersiz istek", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("listing-photos").download(path);

        if (error || !data) {
          return new Response("Bulunamadı", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "image/jpeg",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
