import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { resolvePhotoUrls } from "@/lib/photos";
import type { Listing } from "@/data/listings";

const DEFAULT_MESSAGE = "Merhaba, Nova'dan geliyorum bilgi alabilir miyim?";

export const Route = createFileRoute("/ilan/$id")({
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
      <Button asChild variant="outline" className="h-11 w-full justify-start rounded-none border-primary/40 bg-card font-black text-foreground">
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
        <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center justify-center gap-2 bg-whatsapp px-4 font-black text-primary-foreground"><MessageCircle className="size-5" />{phoneDisplay(number)}</a>
        <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`} className="flex h-14 items-center justify-center gap-2 bg-chart-3 px-4 font-black text-primary-foreground"><Phone className="size-5" />{phoneDisplay(item.phone)}</a>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="min-h-20 border border-chart-3/50 bg-chart-3/10 p-3">
            <p className="text-[10px] font-black uppercase text-chart-3">{label}</p>
            <p className="mt-1 text-sm font-black text-foreground">{value || "Belirtilmedi"}</p>
          </div>
        ))}
      </section>
    </main>
  );
}