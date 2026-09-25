import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Listing } from "@/data/listings";

type DayRow = { listing_id: string; day: string; views: number; wa_clicks: number; call_clicks: number };
type Sum = { v: number; w: number; c: number };

const DAY_MS = 86400000;
const toDay = (s: string) => Date.parse(`${s}T00:00:00Z`);
const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", weekday: "short", timeZone: "UTC" });
const add = (a: Sum, r: DayRow): Sum => ({ v: a.v + r.views, w: a.w + r.wa_clicks, c: a.c + r.call_clicks });
const zero = (): Sum => ({ v: 0, w: 0, c: 0 });

function todayIstanbul() {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  return toDay(s);
}

export function WeeklyReport({ items }: { items: Listing[] }) {
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

  const names = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);

  const weeks = useMemo(() => {
    const rows = q.data ?? [];
    const today = todayIstanbul();
    const start = rows.length ? toDay(rows[0].day) : today;
    const count = Math.floor((today - start) / DAY_MS / 7) + 1;
    return Array.from({ length: count }, (_, w) => {
      const from = start + w * 7 * DAY_MS;
      const days = Array.from({ length: 7 }, (_, d) => from + d * DAY_MS);
      const inWeek = rows.filter((r) => {
        const t = toDay(r.day);
        return t >= from && t < from + 7 * DAY_MS;
      });
      const perDay = days.map((t) => ({ t, s: inWeek.filter((r) => toDay(r.day) === t).reduce(add, zero()) }));
      const perListing = new Map<string, Sum>();
      for (const r of inWeek) perListing.set(r.listing_id, add(perListing.get(r.listing_id) ?? zero(), r));
      return {
        n: w + 1,
        from,
        done: today >= from + 7 * DAY_MS,
        total: inWeek.reduce(add, zero()),
        perDay: perDay.filter((d) => d.t <= today),
        perListing: [...perListing.entries()].sort((a, b) => b[1].v - a[1].v),
      };
    });
  }, [q.data]);

  if (q.isLoading) return <p className="mt-4 text-sm text-muted-foreground">Günlük veriler yükleniyor…</p>;
  if (q.error) return <p className="mt-4 text-sm text-destructive">Günlük veriler alınamadı.</p>;

  const current = weeks[weeks.length - 1];
  const done = weeks.filter((w) => w.done);
  const shown = openWeek != null ? weeks[openWeek - 1] : null;

  return (
    <div className="relative mt-4 rounded-2xl border border-border bg-card p-3">
      {done.length ? (
        <div className="absolute right-2 top-2 flex max-w-[60%] flex-wrap justify-end gap-1">
          {done.map((w) => (
            <button
              key={w.n}
              type="button"
              onClick={() => setOpenWeek(w.n)}
              className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground"
            >
              {w.n}. Hafta
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-xs font-black uppercase text-muted-foreground">Günlük not · {current.n}. Hafta</p>
      <div className="mt-3 space-y-1.5">
        {current.perDay.map(({ t, s }) => (
          <div key={t} className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.5rem)] gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
            <span className="font-bold">{fmt(t)}</span>
            <span className="text-center font-black text-destructive">{s.v}</span>
            <span className="text-center font-black text-whatsapp">{s.w}</span>
            <span className="text-center font-black text-chart-3">{s.c}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Sütunlar: Görüntü · WP · Arama. 7 gün dolunca rapor köşeye “{current.n}. Hafta” olarak eklenir.</p>

      <Dialog open={!!shown} onOpenChange={(o) => !o && setOpenWeek(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>{shown?.n}. Hafta Raporu</DialogTitle>
          <DialogDescription>
            {shown ? `${fmt(shown.from)} – ${fmt(shown.from + 6 * DAY_MS)}` : ""}
          </DialogDescription>
          {shown ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {([["Görüntü", shown.total.v], ["WhatsApp", shown.total.w], ["Arama", shown.total.c]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-secondary p-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">{l}</p>
                    <p className="text-xl font-black">{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {shown.perDay.map(({ t, s }) => (
                  <div key={t} className="flex justify-between text-sm">
                    <span>{fmt(t)}</span>
                    <span className="font-bold">{s.v} / {s.w} / {s.c}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2">
                {shown.perListing.length ? shown.perListing.map(([id, s]) => (
                  <div key={id} className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{names.get(id) ?? "Silinmiş ilan"}</span>
                    <span className="shrink-0 font-bold">{s.v} / {s.w} / {s.c}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Bu hafta veri yok.</p>}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
