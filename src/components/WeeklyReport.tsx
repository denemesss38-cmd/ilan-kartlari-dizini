import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Listing } from "@/data/listings";

type DayRow = { listing_id: string; day: string; views: number; wa_clicks: number; call_clicks: number };
type Sum = { v: number; w: number; c: number };

const DAY_MS = 86400000;
const toDay = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "short", timeZone: "UTC" });
const add = (a: Sum, r: DayRow): Sum => ({ v: a.v + r.views, w: a.w + r.wa_clicks, c: a.c + r.call_clicks });
const zero = (): Sum => ({ v: 0, w: 0, c: 0 });
/** Haftanın pazartesi günü (UTC gün değeri). */
const monday = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS;

function todayIstanbul() {
  return toDay(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }));
}

function Nums({ s }: { s: Sum }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {([["Görüntü", s.v, "text-destructive"], ["WhatsApp", s.w, "text-whatsapp"], ["Arama", s.c, "text-chart-3"]] as const).map(([l, v, c]) => (
        <div key={l} className="rounded-xl bg-secondary/70 p-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground">{l}</p>
          <p className={`text-xl font-black ${c}`}>{v}</p>
        </div>
      ))}
    </div>
  );
}

/** "Veriler" sekmesi: her ilanın bağımsız günlük verisi ve kilitli haftalık arşivi. */
export function WeeklyReport({ items }: { items: Listing[] }) {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["admin-daily-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("listing_daily_stats")
        .select("listing_id, day, views, wa_clicks, call_clicks")
        .order("day", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DayRow[];
    },
    refetchInterval: 30000,
  });

  const today = todayIstanbul();
  const thisWeek = monday(today);

  const byListing = useMemo(() => {
    const m = new Map<string, DayRow[]>();
    for (const r of q.data ?? []) m.set(r.listing_id, [...(m.get(r.listing_id) ?? []), r]);
    return m;
  }, [q.data]);

  const detail = useMemo(() => {
    if (!openId) return null;
    const rows = byListing.get(openId) ?? [];
    const todayRow = rows.find((r) => toDay(r.day) === today);
    const current = rows.filter((r) => toDay(r.day) >= thisWeek);
    const days = Array.from({ length: 7 }, (_, d) => thisWeek + d * DAY_MS)
      .filter((t) => t < today)
      .map((t) => ({ t, s: current.filter((r) => toDay(r.day) === t).reduce(add, zero()) }));
    const starts = [...new Set(rows.map((r) => monday(toDay(r.day))).filter((w) => w < thisWeek))].sort((a, b) => a - b).slice(-4);
    const weeks = starts.map((from, i) => {
      const inWeek = rows.filter((r) => { const t = toDay(r.day); return t >= from && t < from + 7 * DAY_MS; });
      return {
        n: i + 1,
        from,
        total: inWeek.reduce(add, zero()),
        perDay: Array.from({ length: 7 }, (_, d) => from + d * DAY_MS).map((t) => ({ t, s: inWeek.filter((r) => toDay(r.day) === t).reduce(add, zero()) })),
      };
    });
    return {
      today: todayRow ? add(zero(), todayRow) : zero(),
      week: current.reduce(add, zero()),
      days,
      weeks,
    };
  }, [openId, byListing, today, thisWeek]);

  const deleteWeek = async (from: number) => {
    if (!openId || !confirm("Bu haftalık arşiv kalıcı olarak silinsin mi?")) return;
    const { error } = await (supabase.from as any)("listing_daily_stats")
      .delete()
      .eq("listing_id", openId)
      .gte("day", iso(from))
      .lte("day", iso(from + 6 * DAY_MS));
    if (error) { toast.error(error.message); return; }
    setOpenWeek(null);
    toast.success("Haftalık arşiv silindi");
    await qc.invalidateQueries({ queryKey: ["admin-daily-stats"] });
    await qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  if (q.isLoading) return <p className="mt-4 text-sm text-muted-foreground">Veriler yükleniyor…</p>;
  if (q.error) return <p className="mt-4 text-sm text-destructive">Veriler alınamadı.</p>;

  const openItem = items.find((i) => i.id === openId);
  const shownWeek = detail?.weeks.find((w) => w.n === openWeek) ?? null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-black uppercase text-muted-foreground">Veriler · ilana bas, günlük raporu aç</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item, i) => {
          const rows = byListing.get(item.id) ?? [];
          const t = rows.find((r) => toDay(r.day) === today);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setOpenId(item.id); setOpenWeek(null); }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase text-muted-foreground">İlan {i + 1}</span>
                <span className="block truncate font-black">{item.name}</span>
              </span>
              <span className="shrink-0 text-right text-xs font-bold text-muted-foreground">
                Bugün<br />
                <span className="text-destructive">{t?.views ?? 0}</span> · <span className="text-whatsapp">{t?.wa_clicks ?? 0}</span> · <span className="text-chart-3">{t?.call_clicks ?? 0}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Görüntü · WhatsApp · Arama. Günlük veri gece yarısı (TR saati) haftaya eklenir, yeni gün sıfırdan başlar.</p>

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setOpenWeek(null); } }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto">
          <DialogTitle>{openItem?.name ?? "İlan"}</DialogTitle>
          <DialogDescription>Bağımsız günlük ve haftalık veriler</DialogDescription>
          {detail ? (
            shownWeek ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button type="button" className="text-sm font-bold text-primary" onClick={() => setOpenWeek(null)}>← Geri</button>
                  <button type="button" onClick={() => deleteWeek(shownWeek.from)} className="flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-xs font-black text-primary-foreground">
                    <Trash2 className="size-3.5" /> Sil
                  </button>
                </div>
                <p className="font-black">{shownWeek.n}. Hafta · {fmt(shownWeek.from)} – {fmt(shownWeek.from + 6 * DAY_MS)}</p>
                <Nums s={shownWeek.total} />
                <div className="space-y-1">
                  {shownWeek.perDay.map(({ t, s }) => (
                    <div key={t} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-sm">
                      <span>{fmt(t)}</span><span className="font-bold">{s.v} / {s.w} / {s.c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-xs font-black uppercase text-muted-foreground">Bugün · {fmt(today)}</p>
                  <Nums s={detail.today} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-black uppercase text-muted-foreground">Bu hafta (toplam)</p>
                  <Nums s={detail.week} />
                  <div className="mt-2 space-y-1">
                    {detail.days.map(({ t, s }) => (
                      <div key={t} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-sm">
                        <span>{fmt(t)}</span><span className="font-bold">{s.v} / {s.w} / {s.c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-black uppercase text-muted-foreground">Kilitli haftalar</p>
                  {detail.weeks.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {detail.weeks.map((w) => (
                        <button key={w.from} type="button" onClick={() => setOpenWeek(w.n)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                          <Lock className="size-3" /> {w.n}. Hafta
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Hafta dolunca burada kilitlenir.</p>}
                </div>
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
