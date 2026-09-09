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
          "Güncel ilanları fotoğraflarıyla inceleyin, telefon veya WhatsApp üzerinden tek dokunuşla iletişime geçin.",
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

function ListingCard({ item }: { item: Listing }) {
  const photos = item.photos?.length ? item.photos : [];
  const main = photos[0];
  const rest = photos.slice(1, 3);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div className="grid grid-cols-3 gap-1 p-1">
        <div className="col-span-2 overflow-hidden rounded-xl">
          <img
            src={photoUrl(main)}
            alt={`${item.name} ilan fotoğrafı`}
            loading="lazy"
            className="h-44 w-full object-cover sm:h-56"
          />
        </div>
        <div className="grid grid-rows-2 gap-1">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl">
              <img
                src={photoUrl(rest[i] ?? main)}
                alt={`${item.name} ek fotoğraf ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-lg font-extrabold tracking-tight text-foreground">
            {item.name}
          </h2>
          {item.badge ? (
            <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-black text-primary-foreground">
              {item.badge}
            </span>
          ) : null}
        </div>

        {item.location ? (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-primary">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`tel:${item.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold text-secondary-foreground transition-colors hover:bg-accent"
          >
            <Phone className="size-4" />
            Ara
          </a>
          <a
            href={`https://wa.me/${item.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="size-4" />
            WhatsApp
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
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-widest text-primary sm:text-lg">
              {siteConfig.title}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">{siteConfig.subtitle}</p>
          </div>
          <a
            href={siteConfig.banner.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-primary px-3 py-1.5 text-xs font-bold text-primary"
          >
            İletişim
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 pb-12 pt-4">
        <section className="overflow-hidden rounded-2xl border border-primary/40 bg-secondary">
          <div className="flex items-center gap-2 bg-primary px-4 py-2 text-primary-foreground">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-sm font-black tracking-wide">{siteConfig.banner.title}</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm leading-relaxed text-foreground">{siteConfig.banner.text}</p>
            <a
              href={siteConfig.banner.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"
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
          <div className="mt-6 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          {siteConfig.footerNote}
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/admin" className="underline">
            Yönetim paneli
          </Link>
        </p>
      </main>
    </div>
  );
}
