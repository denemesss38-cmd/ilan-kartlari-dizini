import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, MapPin, MessageCircle, Phone, Send, Sparkles } from "lucide-react";

import { PhotoCarousel } from "@/components/PhotoCarousel";
import { supabase } from "@/integrations/supabase/client";
import { resolvePhotoUrls } from "@/lib/photos";
import { siteConfig, type Listing } from "@/data/listings";
import { parseFooterBoxes } from "@/lib/footer-boxes";
import girlImage1 from "@/assets/girl-promo.jpg";
import girlImage2 from "@/assets/girl-2.jpg";
import girlImage3 from "@/assets/girl-3.jpg";

const FOOTER_IMAGES = [girlImage1, girlImage2, girlImage3];

const DEFAULT_TITLE = "Diyarbakır İlan Rehberi — Güncel İlanlar ve İletişim";
const DEFAULT_DESCRIPTION =
  "Diyarbakır'daki güncel ilanları inceleyin, telefon veya WhatsApp üzerinden tek dokunuşla iletişime geçin.";
const DEFAULT_WA_MESSAGE = "Merhaba, Nova'dan geldim bilgi alabilir miyim?";

const QUERY_STALE = 5 * 60 * 1000;
const QUERY_GC = 30 * 60 * 1000;
const listingsQueryOptions = {
  queryKey: ["public-listings"],
  staleTime: QUERY_STALE,
  gcTime: QUERY_GC,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, name, location, description, photos, phone, whatsapp, badge, venue, whatsapp_message, age, height, weight, district, meeting, price_note, sort_order, is_published",
      )
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Listing[];
    // Tüm fotoğrafları TEK istekte imzala; ilan başına ayrı istek açılışı yavaşlatıyordu.
    const allPaths = rows.flatMap((r) => r.photos ?? []);
    const resolved = await resolvePhotoUrls(allPaths);
    let cursor = 0;
    return rows.map((row) => {
      const count = (row.photos ?? []).filter(Boolean).length;
      const photos = resolved.slice(cursor, cursor + count);
      cursor += count;
      return { ...row, photos };
    });
  },
};

const settingsQueryOptions = {
  queryKey: ["public-settings"],
  staleTime: QUERY_STALE,
  gcTime: QUERY_GC,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "carousel_interval_seconds",
        "whatsapp_number",
        "whatsapp_message",
        "seo_title",
        "seo_description",
        "footer_text",
      ]);
    const map = new Map((data ?? []).map((r) => [r.key, r.value]));
    const raw = Number(map.get("carousel_interval_seconds") ?? 22);
    const str = (k: string, fallback: string) => {
      const v = map.get(k);
      return typeof v === "string" && v.trim() ? v.trim() : fallback;
    };
    return {
      carouselIntervalSeconds: Number.isFinite(raw) && raw >= 0 && raw <= 60 ? raw : 22,
      whatsappNumber: str("whatsapp_number", "905551112233"),
      whatsappMessage: str("whatsapp_message", DEFAULT_WA_MESSAGE),
      seoTitle: str("seo_title", DEFAULT_TITLE),
      seoDescription: str("seo_description", DEFAULT_DESCRIPTION),
      footerText: str("footer_text", ""),
    };
  },
};

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    // Backend geçici olarak yanıt vermezse sayfa tamamen çökmesin;
    // veriler istemcide tekrar denenir.
    const [listings, settings] = await Promise.all([
      context.queryClient.ensureQueryData(listingsQueryOptions).catch(() => undefined),
      context.queryClient.ensureQueryData(settingsQueryOptions).catch(() => undefined),
    ]);
    return { listings, settings };
  },
  head: ({ loaderData }) => {
    const settings = loaderData?.settings;
    const title = settings?.seoTitle || DEFAULT_TITLE;
    const description = settings?.seoDescription || DEFAULT_DESCRIPTION;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://ilan-kartlari-dizini.lovable.app/" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "https://ilan-kartlari-dizini.lovable.app/" }],
    };
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

/** Hazır mesajlı WhatsApp bağlantısı. */
function waLink(number: string, message: string) {
  const digits = (number || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || DEFAULT_WA_MESSAGE)}`;
}

/** Resmî WhatsApp logosu (dolgu yol). */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.057-.371-.058-.52-.115-.148-.694-1.672-.95-2.289-.235-.564-.472-.487-.644-.496-.167-.008-.358-.01-.55-.01-.19 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/** Tam genişlikte, kesintisiz kayan fotoğraf şeridi ve üzerine binen bilgiler. */
function ListingStrip({
  item,
  intervalSeconds,
  message,
  priority = false,
}: {
  item: Listing;
  intervalSeconds: number;
  message: string;
  priority?: boolean;
}) {
  return (
    <article className="group relative w-full overflow-hidden">
      <Link
        to="/diyarbakir-ilanlar-sayfasi/$id"
        params={{ id: item.id }}
        aria-label={`${item.name} ilan detayını aç`}
        className="block"
      >
      <PhotoCarousel
        photos={item.photos}
        alt={item.name}
        intervalSeconds={intervalSeconds}
        split={3}
        interactive={false}
        priority={priority}
        className="h-[178px] w-full md:h-72"
      />

      <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 flex max-w-[70%] flex-col items-end gap-1.5 md:right-5 md:top-4 md:gap-2">
        <span className="rounded-full bg-pink-500/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:py-1 md:text-[11px]">

          {item.venue?.trim() || ""}
        </span>
        <h2 className="rounded-full bg-sky-500/90 px-3 py-0.5 text-[10px] font-semibold leading-snug tracking-wide text-white backdrop-blur-md md:px-4 md:py-1 md:text-sm">
          {item.name}
        </h2>
        <span className="rounded-full bg-violet-500/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur-md md:px-3 md:py-1 md:text-[11px]">
          {item.price_note?.trim() || ""}
        </span>
      </div>
      </Link>
      {/* Sol altta küçük, siyah zeminli telefon kapsülü (tel:) */}
      <a
        href={`tel:${(item.phone || item.whatsapp || "").replace(/[^\d+]/g, "")}`}
        aria-label={`${item.name} numarasını ara`}
        className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/90 px-2.5 py-1 text-[10px] font-semibold leading-none text-white ring-1 ring-white/15 transition-colors hover:bg-black md:bottom-5 md:left-6 md:px-3 md:py-1.5 md:text-xs"
      >
        <Phone className="size-3 md:size-3.5" />
        <span className="tracking-wide">{formatPhone(item.phone || item.whatsapp || "")}</span>
      </a>
      <a
        href={waLink(item.whatsapp || item.phone, item.whatsapp_message?.trim() || message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${item.name} WhatsApp ile yaz`}
        className="whatsapp-shake absolute bottom-3 right-3 z-30 grid size-11 place-items-center rounded-full bg-whatsapp text-white shadow-lg ring-1 ring-border md:bottom-5 md:right-6 md:size-14"
      >
        <WhatsAppGlyph className="size-6 md:size-7" />
      </a>
    </article>
  );
}

function Index() {
  const loaderData = Route.useLoaderData();
  const listingsQuery = useQuery({ ...listingsQueryOptions, initialData: loaderData.listings });

  const settingsQuery = useQuery({ ...settingsQueryOptions, initialData: loaderData.settings });

  const listings = listingsQuery.data ?? [];
  const settings = settingsQuery.data ?? {
    carouselIntervalSeconds: 22,
    whatsappNumber: "905551112233",
    whatsappMessage: DEFAULT_WA_MESSAGE,
    seoTitle: DEFAULT_TITLE,
    seoDescription: DEFAULT_DESCRIPTION,
    footerText: "",
  };
  const contactHref = waLink(settings.whatsappNumber, settings.whatsappMessage);
  const footerBoxes = parseFooterBoxes(settings.footerText);

  return (
    <div className="min-h-screen">
      <div className="relative z-40 overflow-hidden border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary"
        />
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 xs:px-4 md:px-6">
          <img
            src="/favicon.png"
            alt="Logo"
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-2xl shadow-glow-gold"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-foreground md:text-base">
              {siteConfig.siteName}
            </p>
            <p className="truncate text-[10px] font-semibold text-muted-foreground md:text-[11px]">
              {siteConfig.subtitle}
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary ring-1 ring-primary/30">
            {listings.length} İlan
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl pb-14 pt-5 md:pt-8">


        <section className="relative mx-3 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl bg-cta-hot p-3 shadow-glow-gold ring-1 ring-primary/50 xs:mx-4 md:mx-6 md:mt-6 md:p-4">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-12 left-1/2 h-28 w-48 -translate-x-1/2 rounded-full bg-primary-foreground/25 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/80 to-transparent"
          />
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-background/25 text-primary-foreground ring-1 ring-primary-foreground/35 backdrop-blur-md">
            <BellRing className="size-5" />
          </span>
          <span className="relative min-w-0">
            <h2 className="text-xs font-black uppercase text-primary-foreground drop-shadow-sm md:text-sm">{siteConfig.banner.title}</h2>
            <span className="mt-0.5 line-clamp-2 block text-[10px] font-semibold leading-relaxed text-primary-foreground/95 md:text-xs">
              {siteConfig.banner.text}
            </span>
          </span>
          <a
            href={contactHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={siteConfig.banner.ctaLabel}
            className="relative shrink-0 rounded-full bg-background/25 px-3 py-2 text-[11px] font-black text-primary-foreground ring-1 ring-primary-foreground/40 backdrop-blur-md transition-transform hover:scale-105"
          >
            <Send className="size-4" />
          </a>
        </section>

        <div className="mx-auto mt-4 w-full max-w-2xl px-3 xs:px-4 md:mt-5 md:px-6">
          {siteConfig.promos
            .filter((promo) => promo.title !== "GÜVENLİ İLETİŞİM")
            .map((promo) => (
              <a
                key={promo.title}
                href={contactHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl p-3 text-left ring-1 ${
                  promo.variant === "primary"
                    ? "bg-cta-hot shadow-glow-gold ring-primary/50 transition-transform duration-200 hover:scale-[1.015]"
                    : "bg-cta-alt ring-border"
                }`}
              >
                {promo.variant === "primary" ? (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-12 left-1/2 h-28 w-48 -translate-x-1/2 rounded-full bg-primary-foreground/25 blur-3xl"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/80 to-transparent"
                    />
                  </>
                ) : null}
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-background/25 text-primary-foreground ring-1 ring-primary-foreground/35 backdrop-blur-md">
                  <MessageCircle className="size-5" aria-hidden />
                </span>
                <span className="relative min-w-0">
                  <span className="block text-xs font-black uppercase text-primary-foreground drop-shadow-sm md:text-sm">
                    {promo.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] font-semibold leading-relaxed text-primary-foreground/95 md:text-xs">
                    {promo.text}
                  </span>
                </span>
                <span className="relative shrink-0 rounded-full bg-background/25 px-3 py-2 text-[11px] font-black text-primary-foreground ring-1 ring-primary-foreground/40 backdrop-blur-md">
                  {promo.ctaLabel}
                </span>
              </a>
            ))}
        </div>

        {listingsQuery.isLoading ? (
          <div className="mt-5 md:mt-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[178px] w-full animate-pulse bg-secondary/60 md:h-72" />
            ))}
          </div>
        ) : listings.length === 0 ? (

          <p className="mt-10 text-center text-sm text-muted-foreground">
            Şu anda yayınlanmış ilan bulunmuyor.
          </p>
        ) : (
          <div className="mt-5 space-y-[3px] bg-background md:mt-8">
            {listings.map((item, index) => (
              <ListingStrip
                key={item.id}
                item={item}
                intervalSeconds={settings.carouselIntervalSeconds}
                message={settings.whatsappMessage}
                priority={index === 0}
              />
            ))}
          </div>
        )}

        {footerBoxes.length ? (
          <section className="mx-3 mt-10 xs:mx-4 md:mx-6 md:mt-14">
            <div className="mb-4 flex items-center gap-2.5 px-1 md:mb-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-cta text-primary-foreground shadow-glow-gold">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <h2 className="text-base font-black tracking-[0.08em] text-foreground md:text-lg">
                Diyarbakır
              </h2>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary ring-1 ring-primary/25 md:text-[10px]">
                Rehber
              </span>
            </div>

            <div className="space-y-3 md:space-y-4">
              {footerBoxes.map((box, i) => (
                  <div
                    key={i}
                    className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border border-primary/25 bg-showcase-card p-3 shadow-[0_16px_40px_-26px_var(--card-glow)] ring-1 ring-primary/10 md:gap-4 md:p-4"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                    />
                    <img
                      src={FOOTER_IMAGES[i % FOOTER_IMAGES.length]}
                      alt={box.title || `Bölge ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="size-20 shrink-0 rounded-xl object-cover ring-1 ring-primary/20 md:size-24"
                    />
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-primary ring-1 ring-primary/25 md:text-[10px]">
                        <MapPin className="size-3" aria-hidden />
                        {box.title || `Bölge ${i + 1}`}
                      </span>
                      <p className="mt-2 whitespace-pre-line text-[11px] font-medium leading-relaxed text-foreground/80 md:text-xs">
                        {box.text}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-border/60 px-3 pb-4 pt-6 text-center xs:px-4 md:px-6">
          <p className="text-[11px] text-muted-foreground/80 md:text-xs">

            © {new Date().getFullYear()} {siteConfig.siteName}. Tüm hakları saklıdır.
          </p>
        </footer>
      </main>
    </div>
  );
}
