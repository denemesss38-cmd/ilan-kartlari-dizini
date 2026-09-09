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
  const d = digits.startsWith("0") ? digits.slice(1) : digits;
  if (d.length === 11 && d.startsWith("90")) {
    return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return raw;
}

/** Düz kenarlı, kompakt yatay ilan kartı. */
function ListingCard({ item }: { item: Listing }) {
  const cover = photoUrl(item.photos?.[0], 0);

  return (
    <article className="flex w-full items-stretch overflow-hidden rounded-xl border border-border bg-card">
      {/* kapak fotoğrafı */}
      <div className="shrink-0">
        <img
          src={cover}
          alt={`${item.name} kapak fotoğrafı`}
          loading="lazy"
          className="h-28 w-28 object-cover xs:h-32 xs:w-32 md:h-36 md:w-36"
        />
      </div>

      {/* bilgiler */}
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2.5 xs:px-4 xs:py-3 md:px-5 md:py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-extrabold tracking-tight text-card-foreground xs:text-lg md:text-xl">
            {item.name}
          </h2>
          <p className="truncate text-xs font-semibold text-muted-foreground md:text-sm">
            {item.location || item.badge || "Hepsi"}
          </p>
          <a
            href={`tel:${item.phone}`}
            className="mt-1 flex items-center gap-1 truncate text-xs font-black text-primary underline-offset-2 hover:underline md:text-sm"
            aria-label={`${item.name} telefon numarası ${item.phone}`}
          >
            <Phone className="size-3 shrink-0 md:size-4" />
            {formatPhone(item.phone)}
          </a>
        </div>

        {/* iletişim ikonları */}
        <div className="flex items-center gap-2 md:gap-3">
          <a
            href={`https://wa.me/${item.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.name} WhatsApp`}
            className="grid size-10 place-items-center rounded-full bg-primary xs:size-11 md:size-12"
          >
            <MessageCircle className="size-5 text-primary-foreground md:size-6" />
          </a>
          <a
            href={`tel:${item.phone}`}
            aria-label={`${item.name} ara`}
            className="grid size-10 place-items-center rounded-full bg-primary xs:size-11 md:size-12"
          >
            <Phone className="size-5 text-primary-foreground md:size-6" />
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
