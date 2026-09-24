import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Parametresiz vitrin adresi: en güncel yayındaki ilanın detay sayfasına gider.
 * Böylece önizleme çubuğundaki sayfa listesinde de görünür.
 */
export const Route = createFileRoute("/diyarbakir-ilanlar-sayfasi/")({
  loader: async () => {
    const { data } = await supabase
      .from("listings")
      .select("id")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      throw redirect({
        to: "/diyarbakir-ilanlar-sayfasi/$id",
        params: { id: data.id },
        replace: true,
      });
    }

    throw redirect({ to: "/", replace: true });
  },
});
