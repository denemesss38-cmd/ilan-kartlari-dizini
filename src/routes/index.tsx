import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Home, MapPin, MessageCircle, Phone } from "lucide-react";

import { PhotoCarousel } from "@/components/PhotoCarousel";
import { siteConfig, type Listing } from "@/data/listings";
import { getPublishedListings, getSiteSettings } from "@/lib/listings.functions";

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
  loader: async () => {
    const [listings, settings] = await Promise.all([getPublishedListings(), getSiteSettings()]);
    return { listings, settings };
  },
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

/** Büyük, çerçeveli ilan kartı: üçlü fotoğraf kolajı, rozetler ve iletişim aksiyonları. */
function ListingCard({ item, intervalSeconds }: { item: Listing; intervalSeconds: number }) {
  const hasPhotos = (item.photos ?? []).filter(Boolean).length > 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-border/80 bg-card/80 shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)] backdrop-blur">
      <div className="relative">
        <PhotoCarousel
          photos={item.photos}
          alt={item.name}
          intervalSeconds={intervalSeconds}
          split={3}
          className={
            hasPhotos ? "h-56 w-full xs:h-72 md:h-96" : "h-32 w-full xs:h-36 md:h-44"
          }
        />
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 flex flex-col items-end gap-1.5 md:right-4 md:top-4">
          <span className="flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold text-primary-foreground ring-1 ring-border md:text-xs">
            <BadgeCheck className="size-3.5 shrink-0 text-primary md:size-4" />
            <span className="text-foreground">Onaylı ilan</span>
          </span>
          {item.venue && (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold ring-1 ring-border md:text-xs">
              <Home className="size-3.5 shrink-0 text-primary md:size-4" />
              <span className="text-foreground">{item.venue}</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-3 xs:p-4 md:p-5">
        <div className="flex items-end justify-between gap-3">
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

        <a
          href={`tel:${item.phone}`}
          className="mt-3 inline-flex items-center gap-1.5 whitespace-nowrap font-black text-primary underline-offset-2 hover:underline"
          aria-label={`${item.name} telefon numarası ${item.phone}`}
        >
          <Phone className="size-5 shrink-0 md:size-6" />
          <span className="text-xl leading-none md:text-2xl">{formatPhone(item.phone)}</span>
        </a>
      </div>
    </article>
  );
}

function Index() {
  const { listings, settings } = Route.useLoaderData();

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

        <div className="mx-auto mt-4 grid w-full max-w-2xl gap-3 sm:grid-cols-2 md:mt-6">
          {siteConfig.promos
            .filter((promo) => promo.title !== "GÜVENLİ İLETİŞİM")
            .map((promo) => (
              <a
                key={promo.title}
                href={promo.href}
                target="_blank"
                rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center rounded-3xl p-3 text-center ring-1 ring-border md:p-4 ${
                promo.variant === "primary" ? "bg-cta" : "bg-cta-alt"
              }`}
            >
              <h2 className="text-xs font-black tracking-wide text-primary-foreground md:text-sm">
                {promo.title}
              </h2>
              <p className="mt-1 text-[10px] leading-relaxed text-primary-foreground/90 md:text-[11px]">
                {promo.text}
              </p>
              <span className="mt-2 inline-flex min-h-9 items-center rounded-full bg-background/25 px-3 py-1.5 text-[10px] font-bold text-primary-foreground md:text-xs">
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
              <ListingCard
                key={item.id}
                item={item}
                intervalSeconds={settings.carouselIntervalSeconds}
              />
            ))}
          </div>
        )}

        {(() => {
          const safePromo = siteConfig.promos.find((p) => p.title === "GÜVENLİ İLETİŞİM");
          if (!safePromo) return null;
          return (
            <a
              href={safePromo.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`mx-auto mt-6 flex w-full max-w-2xl flex-col items-center justify-center rounded-3xl p-4 text-center ring-1 ring-border md:mt-8 md:p-5 ${
                safePromo.variant === "primary" ? "bg-cta" : "bg-cta-alt"
              }`}
            >
              <h2 className="text-sm font-black tracking-wide text-primary-foreground md:text-base">
                {safePromo.title}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-primary-foreground/90 md:text-xs">
                {safePromo.text}
              </p>
              <span className="mt-3 inline-flex min-h-11 items-center rounded-full bg-background/25 px-4 py-2 text-[11px] font-bold text-primary-foreground md:text-xs">
                {safePromo.ctaLabel}
              </span>
            </a>
          );
        })()}

        <footer className="mt-10 border-t border-border/60 pt-6 pb-4 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground md:text-xs">
            {siteConfig.footerNote}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/80 md:text-xs">
            © {new Date().getFullYear()} {siteConfig.siteName}. Tüm hakları saklıdır.
          </p>
        </footer>
      </main>
    </div>
  );
}
