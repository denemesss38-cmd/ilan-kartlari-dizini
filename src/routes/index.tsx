import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, BellRing, Eye, Home, MapPin, MessageCircle, Phone, Radio, Send } from "lucide-react";

import { PhotoCarousel } from "@/components/PhotoCarousel";
import { siteConfig, type Listing } from "@/data/listings";
import { getPublishedListings, getSiteSettings } from "@/lib/listings.functions";

const DEFAULT_TITLE = "İlan Rehberi — Güncel İlanlar ve İletişim";
const DEFAULT_DESCRIPTION =
  "Güncel ilanları inceleyin, telefon veya WhatsApp üzerinden tek dokunuşla iletişime geçin.";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    const title = loaderData?.settings.seoTitle || DEFAULT_TITLE;
    const description = loaderData?.settings.seoDescription || DEFAULT_DESCRIPTION;
    const keywords = loaderData?.settings.seoKeywords || "";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://ilan-kartlari-dizini.lovable.app/" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "https://ilan-kartlari-dizini.lovable.app/" }],
    };
  },
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

/** Kompakt vitrin kartı: tamamı WhatsApp bağlantısı olan akıcı fotoğraf şeridi. */
function ListingCard({ item, intervalSeconds }: { item: Listing; intervalSeconds: number }) {
  const hasPhotos = (item.photos ?? []).filter(Boolean).length > 0;

  return (
    <a
      href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${item.name} WhatsApp ile yaz`}
      className="listing-showcase-card ngy-resim group relative block overflow-hidden rounded-2xl border border-border bg-showcase-card shadow-xl"
    >
      <PhotoCarousel
        photos={item.photos}
        alt={item.name}
        intervalSeconds={intervalSeconds}
        split={3}
        interactive={false}
        className={hasPhotos ? "aspect-[16/10] w-full md:aspect-[21/9]" : "h-32 w-full xs:h-36 md:h-44"}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />

      <span className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-bold text-foreground ring-1 ring-border backdrop-blur md:left-4 md:top-4">
        <span className="active-status-dot relative size-2 shrink-0 rounded-full" />
        Aktif / Müsait
      </span>

      <span className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold ring-1 ring-border backdrop-blur md:right-4 md:top-4">
        <BadgeCheck className="size-3.5 shrink-0 text-primary md:size-4" />
        <span className="text-foreground">Onaylı ilan</span>
      </span>

      <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-end justify-between gap-2 md:inset-x-4 md:bottom-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black tracking-tight text-foreground xs:text-lg md:text-2xl">
            {item.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.location && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-border backdrop-blur md:text-xs">
                <MapPin className="size-3 shrink-0 text-primary" />
                <span className="truncate">{item.location}</span>
              </span>
            )}
            {item.venue && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-border backdrop-blur md:text-xs">
                <Home className="size-3 shrink-0 text-primary" />
                <span className="truncate">{item.venue}</span>
              </span>
            )}
            {item.badge && (
              <span className="max-w-full truncate rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-bold text-foreground ring-1 ring-primary/50 backdrop-blur md:text-xs">
                {item.badge}
              </span>
            )}
          </div>
          <span className="mt-1 flex items-center gap-1 whitespace-nowrap font-black text-primary">
            <Phone className="size-4 shrink-0 md:size-5" />
            <span className="text-sm leading-none xs:text-base md:text-xl">
              {formatPhone(item.phone)}
            </span>
          </span>
        </div>

        <span className="wa-action whatsapp-shake flex shrink-0 items-center gap-1.5 rounded-full bg-whatsapp px-3 py-2 text-xs font-black text-primary-foreground ring-1 ring-border md:px-4 md:py-2.5 md:text-sm">
          <MessageCircle className="size-5 md:size-6" />
          Yaz
        </span>
      </div>
    </a>
  );
}

function Index() {
  const { listings, settings } = Route.useLoaderData();

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 xs:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-full border border-primary bg-secondary text-sm font-black text-primary shadow-[0_0_18px_var(--card-glow)]">
              DR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">{siteConfig.siteName}</p>
              <p className="truncate text-[10px] text-muted-foreground">Güncel ilan vitrini</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="bg-online flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-foreground shadow-lg">
              <span className="active-status-dot relative size-2 rounded-full" />
              <span className="hidden xs:inline">Canlı</span>
            </div>
            <div className="bg-visitors flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-bold text-foreground shadow-lg">
              <Eye className="size-3.5 shrink-0" />
              <span>{listings.length} ilan</span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-3 pb-14 pt-5 xs:px-4 md:px-6 md:pt-8">
        <header className="text-center">
          <h1 className="text-3xl font-black leading-none tracking-tight text-foreground xs:text-4xl md:text-6xl">
            {siteConfig.city}
          </h1>
          <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.3em] text-primary xs:text-sm">
            {siteConfig.title}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">{siteConfig.subtitle}</p>
        </header>

        <section className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-primary/40 bg-showcase-card p-3 shadow-[0_14px_34px_-24px_var(--card-glow)] md:mt-6 md:p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <BellRing className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-black text-primary">{siteConfig.banner.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground md:text-xs">
              {siteConfig.banner.text}
            </p>
          </div>
          <a
            href={siteConfig.banner.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={siteConfig.banner.ctaLabel}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
          >
            <Send className="size-4" />
          </a>
        </section>

        <div className="mx-auto mt-4 grid w-full max-w-2xl gap-3 sm:grid-cols-2 md:mt-5">
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
