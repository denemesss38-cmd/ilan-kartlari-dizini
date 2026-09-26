import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/data/listings";

type StatRow = { listing_id: string; views: number; wa_clicks: number; call_clicks: number };

export function StatsPanel({ items }: { items: Listing[] }) {
  const statsQuery = useQuery({
    queryKey: ["admin-stats", "today"],
    queryFn: async () => {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
      const { data, error } = await (supabase.from as any)("listing_daily_stats").select("listing_id, views, wa_clicks, call_clicks").eq("day", today);
      if (error) throw error;
      return (data ?? []) as StatRow[];
    },
    refetchInterval: 30000,
  });
  const map = new Map((statsQuery.data ?? []).map((s) => [s.listing_id, s]));
  const rows = items
    .map((i) => ({ item: i, s: map.get(i.id) ?? { listing_id: i.id, views: 0, wa_clicks: 0, call_clicks: 0 } }))
    .sort((a, b) => b.s.views - a.s.views);
  const total = rows.reduce((t, r) => ({ v: t.v + r.s.views, w: t.w + r.s.wa_clicks, c: t.c + r.s.call_clicks }), { v: 0, w: 0, c: 0 });
  const cards: [string, number][] = [["Görüntülenme", total.v], ["WhatsApp", total.w], ["Arama", total.c]];

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-black uppercase text-muted-foreground">Günlük rapor · bugün (00.00'da sıfırlanır)</p>
      <div className="grid grid-cols-3 gap-2">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground">{l}</p>
            <p className="text-2xl font-black text-destructive">{v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_repeat(4,3rem)] gap-2 border-b border-border bg-secondary/60 px-3 py-2 text-[10px] font-black uppercase text-muted-foreground">
          <span>#</span><span>İlan</span><span className="text-center">Görüntü</span><span className="text-center">WP</span><span className="text-center">Arama</span><span className="text-center">Oran</span>
        </div>
        {statsQuery.isLoading ? <p className="p-4 text-sm text-muted-foreground">Yükleniyor…</p> : rows.map(({ item, s }, i) => (
          <div key={item.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_repeat(4,3rem)] gap-2 border-b border-border px-3 py-2.5 text-sm last:border-0">
            <span className="font-black text-muted-foreground">{i + 1}</span>
            <span className="truncate font-bold">{item.name}</span>
            <span className="text-center font-black text-destructive">{s.views}</span>
            <span className="text-center font-black text-whatsapp">{s.wa_clicks}</span>
            <span className="text-center font-black text-chart-3">{s.call_clicks}</span>
            <span className="text-center text-xs font-bold text-muted-foreground">{s.views ? `%${Math.round(((s.wa_clicks + s.call_clicks) / s.views) * 100)}` : "-"}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Bugünün gerçek verileri; gece 00.00'da (TR) liste sıfırdan başlar, gün haftalık rapora eklenir. Oran = (WP + Arama) / Görüntü. 30 sn'de bir yenilenir.</p>
    </div>
  );
}
