import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, MapPin, MessageCircle, Phone } from "lucide-react";

import { siteConfig, type Listing } from "@/data/listings";
import { getPublishedListings } from "@/lib/listings.functions";
import { photoUrl } from "@/lib/photos";

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

/** Kompakt yatay ilan kartı: solda kapak, sağda bilgi ve aksiyonlar. */
function ListingCard({ item }: { item: Listing }) {
  return (
    <article className="flex items-stretch gap-3 rounded-xl border border-border bg-card p-2 xs:gap-3.5 xs:p-2.5 md:gap-4 md:rounded-2xl md:p-3">
      <img
        src={photoUrl(item.photos?.[0])}
        alt={`${item.name} kapak fotoğrafı`}
        loading="lazy"
        className="size-20 shrink-0 rounded-lg object-cover xs:size-24 md:size-28 md:rounded-xl"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <h2 className="truncate text-sm font-extrabold tracking-tight text-foreground xs:text-base md:text-lg">
              {item.name}
            </h2>
            {item.badge ? (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground md:text-[11px]">
                {item.badge}
              </span>
            ) : null}
          </div>

          {item.location ? (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary md:text-xs">
              <MapPin className="size-3 shrink-0 md:size-3.5" />
              <span className="truncate">{item.location}</span>
            </p>
          ) : null}

          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground xs:text-xs md:mt-1.5 md:line-clamp-2 md:text-sm">
            {item.description}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 md:mt-3">
          <a
            href={`tel:${item.phone}`}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 text-[11px] font-bold text-secondary-foreground xs:px-3 xs:text-xs md:h-9 md:text-sm"
          >
            <Phone className="size-3.5 shrink-0" />
            Ara
          </a>
          <a
            href={`https://wa.me/${item.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-[11px] font-black text-primary-foreground xs:text-xs md:h-9 md:flex-none md:px-5 md:text-sm"
          >
            <MessageCircle className="size-3.5 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </a>
        </div>
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
          <div className="mt-4 space-y-2 xs:space-y-2.5 md:mt-6 md:space-y-3">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground md:text-xs">
          {siteConfig.footerNote}
        </p>
        <p className="mt-3 text-center text-[11px] text-muted-foreground md:text-xs">
          <Link to="/admin" className="underline">
            Yönetim paneli
          </Link>
        </p>
      </main>
    </div>
  );
}
