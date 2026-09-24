import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { trackListing } from "@/lib/stats";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolvePhotoUrls } from "@/lib/photos";
import type { Listing } from "@/data/listings";

const DEFAULT_MESSAGE = "Merhaba, Nova'dan geliyorum bilgi alabilir miyim?";

/** Resmî WhatsApp logosu (dolgu yol). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.057-.371-.058-.52-.115-.148-.694-1.672-.95-2.289-.235-.564-.472-.487-.644-.496-.167-.008-.358-.01-.55-.01-.19 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export const Route = createFileRoute("/diyarbakir-ilanlar-sayfasi/$id")({
  head: () => ({
    meta: [
      { title: "İlan Detayı — Diyarbakır Rehberi" },
      { name: "description", content: "İlan fotoğrafları, bilgileri ve iletişim seçenekleri." },
      { property: "og:title", content: "İlan Detayı — Diyarbakır Rehberi" },
      { property: "og:description", content: "İlan fotoğrafları, bilgileri ve iletişim seçenekleri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListingDetail,
});

function phoneDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("90") ? digits.slice(2) : digits.startsWith("0") ? digits.slice(1) : digits;
  return local.length === 10 ? `+90 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}` : raw;
}

function ListingDetail() {
  const { id } = Route.useParams();
  const [active, setActive] = useState(0);
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    void trackListing(id, "view").then((n) => { if (alive) setViews(n); });
    return () => { alive = false; };
  }, [id]);
  const query = useQuery({
    queryKey: ["public-listing", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).eq("is_published", true).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...(data as Listing), photos: await resolvePhotoUrls(data.photos ?? []) };
    },
  });

  if (query.isLoading) return <div className="min-h-screen animate-pulse bg-secondary/40" />;
  const item = query.data;
  if (!item) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">İlan bulunamadı.</div>;
  const photos = item.photos ?? [];
  const current = photos[active] ?? photos[0];
  const number = item.whatsapp || item.phone;
  const wa = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(item.whatsapp_message || DEFAULT_MESSAGE)}`;
  const details = [
    ["İsim", item.name], ["Yaş", item.age], ["Boy", item.height], ["Kilo", item.weight],
    ["Semt", item.district || item.location], ["Görüşme", item.meeting || item.venue],
  ];

  const step = (direction: number) => {
    if (photos.length < 2) return;
    setActive((active + direction + photos.length) % photos.length);
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-3 pb-12 pt-3 xs:px-4 md:px-6 md:pt-6">
      <Button asChild className="h-11 w-full justify-center rounded-none bg-sky-600 font-black text-white hover:bg-sky-500">
        <Link to="/"><ArrowLeft /> Vitrine Dön</Link>
      </Button>

      <section className="mt-3 overflow-hidden border border-border bg-card">
        {photos.length ? (
          <>
            <div className="flex gap-2 overflow-x-auto border-b border-border p-2">
              {photos.map((photo, index) => (
                <button key={`${photo}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`${index + 1}. fotoğrafı göster`} className={`h-14 w-16 shrink-0 overflow-hidden border-2 ${active === index ? "border-primary" : "border-transparent"}`}>
                  <img src={photo} alt="" className="h-full w-full object-cover" decoding="async" />
                </button>
              ))}
            </div>
            <div className="relative aspect-[4/5] max-h-[68vh] bg-secondary md:aspect-[16/10]">
              <img src={current} alt={`${item.name} fotoğraf ${active + 1}`} className="h-full w-full object-contain" decoding="async" />
              {photos.length > 1 ? <>
                <Button type="button" size="icon" onClick={() => step(-1)} aria-label="Önceki fotoğraf" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"><ChevronLeft /></Button>
                <Button type="button" size="icon" onClick={() => step(1)} aria-label="Sonraki fotoğraf" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"><ChevronRight /></Button>
              </> : null}
            </div>
          </>
        ) : <div className="grid h-64 place-items-center text-sm text-muted-foreground">Fotoğraf eklenmedi</div>}
      </section>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href={wa} onClick={() => void trackListing(item.id, "wa")} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center justify-center gap-2 bg-whatsapp px-4 font-black text-primary-foreground"><WhatsAppGlyph className="size-5" />{phoneDisplay(number)}</a>
        <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`} onClick={() => void trackListing(item.id, "call")} className="flex h-14 items-center justify-center gap-2 bg-chart-3 px-4 font-black text-primary-foreground"><Phone className="size-5" />{phoneDisplay(item.phone)}</a>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="min-h-20 border border-chart-3/50 bg-chart-3/10 p-3">
            <p className="text-[10px] font-black uppercase text-chart-3">{label}</p>
            <p className="mt-1 text-sm font-black text-foreground">{value || "Belirtilmedi"}</p>
          </div>
        ))}
      </section>

      {views ? (
        <p className="mt-5 flex items-center justify-center gap-2 text-sm font-black text-destructive">
          Bu ilanı {views} kişi görüntüledi
        </p>
      ) : null}
    </main>
  );
}