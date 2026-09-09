import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MessageCircle, Phone } from "lucide-react";

import { siteConfig, type Listing } from "@/data/listings";
import { getPublishedListings } from "@/lib/listings.functions";
import { photoTrio } from "@/lib/photos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "İlan Rehberi — Güncel İlanlar ve İletişim" },
      {
        name: "description",
        content:
          "Güncel ilanları inceleyin, telefon veya WhatsApp üzerinden tek dokunuşla iletişime geçin.",
      },
      { property: "og:title", content: "İlan Rehberi — Güncel İlanlar" },
      {
        property: "og:description",
        content: "Fotoğraflı ilanlar, telefon ve WhatsApp ile hızlı iletişim.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPublishedListings(),
  component: Index,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">
        İlanlar şu anda yüklenemedi. Lütfen sayfayı yenileyin.
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">Sayfa bulunamadı.</p>
    </div>
  ),
});

/** 905543344455 gibi ham numarayı +90 554 334 44 55 biçiminde gösterir. */
function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let d = digits.startsWith("0") ? digits.slice(1) : digits;
  if (d.length === 10) d = `90${d}`;
  if (d.length === 12 && d.startsWith("90")) {
    return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return raw;
}


/** Tam genişlikte fotoğraf kolajı; üst/alt düz turuncu ayraç, isim etiketi ve yuvarlak iletişim ikonları. */
function ListingCard({ item }: { item: Listing }) {
  const photos = photoTrio(item.photos);

  return (
    <article className="relative w-full bg-primary">
      {/* üst düz turuncu ayraç */}
      <div className="pointer-events-none h-1 w-full bg-primary" />

      <div className="grid grid-cols-3 gap-[3px] px-0 py-[3px] md:gap-1 md:py-1">
        {photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${item.name} fotoğraf ${i + 1}`}
            loading="lazy"
            className="h-36 w-full object-cover xs:h-44 md:h-56"
          />
        ))}
      </div>

      {/* alt düz turuncu ayraç */}
      <div className="pointer-events-none h-1 w-full bg-primary" />

      {/* isim etiketi */}
      <div className="absolute bottom-5 left-0 z-20 max-w-[62%] bg-primary/90 px-3 py-1.5 pr-5 md:bottom-8 md:px-5 md:py-2.5">
        <h2 className="truncate text-lg font-extrabold italic tracking-tight text-primary-foreground xs:text-xl md:text-3xl">
          {item.name}
        </h2>
        <p className="truncate text-xs font-semibold text-primary-foreground/90 md:text-base">
          {item.location || item.badge || "Hepsi"}
        </p>
        <a
          href={`tel:${item.phone}`}
          className="mt-0.5 flex items-center gap-1 truncate text-xs font-black text-primary-foreground underline-offset-2 hover:underline md:text-base"
          aria-label={`${item.name} telefon numarası ${item.phone}`}
        >
          <Phone className="size-3 shrink-0 md:size-4" />
          {formatPhone(item.phone)}
        </a>
      </div>

      {/* iletişim ikonları */}
      <div className="absolute bottom-4 right-2.5 z-20 flex items-center gap-2 md:bottom-7 md:right-5 md:gap-3">
        <a
          href={`https://wa.me/${item.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.name} WhatsApp`}
          className="grid size-12 place-items-center rounded-full bg-primary ring-4 ring-background/40 xs:size-14 md:size-16"
        >
          <MessageCircle className="size-6 text-primary-foreground xs:size-7 md:size-8" />
        </a>
        <a
          href={`tel:${item.phone}`}
          aria-label={`${item.name} ara`}
          className="grid size-12 place-items-center rounded-full bg-primary ring-4 ring-background/40 xs:size-14 md:size-16"
        >
          <Phone className="size-6 text-primary-foreground xs:size-7 md:size-8" />
        </a>
      </div>
    </article>
  );
}

function Index() {
  const listings = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 xs:px-4 md:px-6 md:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black tracking-widest text-primary xs:text-base md:text-xl">
              {siteConfig.title}
            </h1>
            <p className="truncate text-[10px] text-muted-foreground md:text-xs">
              {siteConfig.subtitle}
            </p>
          </div>
          <a
            href={siteConfig.banner.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-primary px-2.5 py-1 text-[11px] font-bold text-primary md:px-4 md:py-1.5 md:text-sm"
          >
            İletişim
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 pb-12 pt-3 xs:px-4 md:px-6 md:pt-6">
        <section className="overflow-hidden rounded-xl border border-primary/40 bg-secondary md:rounded-2xl">
          <div className="flex items-center gap-2 bg-primary px-3 py-1.5 text-primary-foreground md:px-4 md:py-2">
            <AlertTriangle className="size-3.5 shrink-0 md:size-4" />
            <span className="text-xs font-black tracking-wide md:text-sm">
              {siteConfig.banner.title}
            </span>
          </div>
          <div className="px-3 py-2.5 md:px-4 md:py-3">
            <p className="text-[11px] leading-relaxed text-foreground xs:text-xs md:text-sm">
              {siteConfig.banner.text}
            </p>
            <a
              href={siteConfig.banner.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground md:mt-3 md:rounded-xl md:py-2.5 md:text-sm"
            >
              {siteConfig.banner.ctaLabel}
            </a>
          </div>
        </section>

        {listings.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Şu anda yayınlanmış ilan bulunmuyor.
          </p>
        ) : (
          <div className="-mx-3 mt-4 space-y-3 xs:-mx-4 md:mx-0 md:mt-6 md:space-y-4">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground md:text-xs">
          {siteConfig.footerNote}
        </p>
      </main>
    </div>
  );
}
