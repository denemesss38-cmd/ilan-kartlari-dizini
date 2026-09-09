import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, MapPin, MessageCircle, Phone } from "lucide-react";

import { PhotoCarousel } from "@/components/PhotoCarousel";
import { siteConfig, type Listing } from "@/data/listings";
import { getPublishedListings } from "@/lib/listings.functions";

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

/** Büyük, çerçeveli ilan kartı: fotoğraf slider'ı, rozetler ve iletişim aksiyonları. */
function ListingCard({ item }: { item: Listing }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border/80 bg-card/80 shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)] backdrop-blur">
      <div className="relative">
        <PhotoCarousel
          photos={item.photos}
          alt={item.name}
          className="h-56 w-full xs:h-72 md:h-96"
        />
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold text-primary-foreground ring-1 ring-border md:right-4 md:top-4 md:text-xs">
          <BadgeCheck className="size-3.5 shrink-0 text-primary md:size-4" />
          <span className="text-foreground">Onaylı ilan</span>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 p-3 xs:p-4 md:p-5">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black tracking-tight text-foreground xs:text-xl md:text-2xl">
            {item.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.location && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border md:text-xs">
                <MapPin className="size-3 shrink-0 text-primary md:size-3.5" />
                <span className="truncate">{item.location}</span>
              </span>
            )}
            {item.badge && (
              <span className="max-w-full truncate rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-foreground ring-1 ring-primary/50 md:text-xs">
                {item.badge}
              </span>
            )}
          </div>
          {item.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground md:text-sm">
              {item.description}
            </p>
          )}
          <a
            href={`tel:${item.phone}`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-foreground underline-offset-2 hover:underline md:text-sm"
            aria-label={`${item.name} telefon numarası ${item.phone}`}
          >
            <Phone className="size-3.5 shrink-0 text-primary md:size-4" />
            {formatPhone(item.phone)}
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <a
            href={`https://wa.me/${item.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.name} WhatsApp`}
            className="grid size-12 place-items-center rounded-full bg-cta-alt ring-1 ring-border md:size-14"
          >
            <MessageCircle className="size-6 text-primary-foreground md:size-7" />
          </a>
          <a
            href={`tel:${item.phone}`}
            aria-label={`${item.name} ara`}
            className="grid size-12 place-items-center rounded-full bg-cta ring-1 ring-border md:size-14"
          >
            <Phone className="size-6 text-primary-foreground md:size-7" />
          </a>
        </div>
      </div>
    </article>
  );
}

function Index() {
  const listings = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-3 pb-14 pt-6 xs:px-4 md:px-6 md:pt-10">
        <header className="text-center">
          <h1 className="text-3xl font-black leading-none tracking-tight text-foreground xs:text-4xl md:text-6xl">
            {siteConfig.city}
          </h1>
          <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.3em] text-primary xs:text-sm">
            {siteConfig.title}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">{siteConfig.subtitle}</p>
        </header>

        <section className="mt-5 flex items-start gap-2.5 rounded-full border border-border bg-background/70 px-3.5 py-2.5 md:mt-7 md:gap-3 md:px-5 md:py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent md:size-5" />
          <p className="min-w-0 text-[11px] leading-relaxed text-muted-foreground md:text-xs">
            <span className="font-black text-foreground">{siteConfig.banner.title} </span>
            {siteConfig.banner.text}
          </p>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-6">
          {siteConfig.promos.map((promo) => (
            <a
              key={promo.title}
              href={promo.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-3xl p-4 ring-1 ring-border md:p-5 ${
                promo.variant === "primary" ? "bg-cta" : "bg-cta-alt"
              }`}
            >
              <h2 className="text-sm font-black tracking-wide text-primary-foreground md:text-base">
                {promo.title}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-primary-foreground/90 md:text-xs">
                {promo.text}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-background/25 px-3 py-1.5 text-[11px] font-bold text-primary-foreground md:text-xs">
                {promo.ctaLabel}
              </span>
            </a>
          ))}
        </div>

        {listings.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Şu anda yayınlanmış ilan bulunmuyor.
          </p>
        ) : (
          <div className="mt-5 space-y-4 md:mt-8 md:space-y-6">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground md:text-xs">
          {siteConfig.footerNote}
        </p>
      </main>
    </div>
  );
}
