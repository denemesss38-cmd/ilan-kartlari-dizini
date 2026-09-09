import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { photoUrl } from "@/lib/photos";

type Props = {
  photos: string[] | null | undefined;
  alt: string;
  /** Otomatik geçiş süresi (saniye). 0 = kapalı. */
  intervalSeconds?: number;
  className?: string;
  /** Aynı anda yan yana gösterilecek fotoğraf sayısı. 1 = tekli carousel, 3 = üçlü kolaj. */
  split?: number;
};

/** Kullanıcı hareket azaltmayı tercih ediyor mu? */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * İlan fotoğrafları için otomatik geçişli galeri.
 * - Tekli (split=1) veya üçlü kolaj (split=3) modu.
 * - Mobilde yatay swipe, masaüstünde önce/sonra kontrolleri ve noktalar.
 * - Dokunma/kaydırma/fare ile etkileşimde otomatik geçiş duraklar, sonra devam eder.
 * - Tek fotoğrafta kontroller ve otomatik geçiş gösterilmez; fotoğraf yoksa zarif yer tutucu.
 */
export function PhotoCarousel({
  photos,
  alt,
  intervalSeconds = 4,
  className,
  split: splitProp,
}: Props) {
  const list = (photos ?? []).filter(Boolean);
  const count = list.length;
  const split = Math.max(1, Math.min(3, splitProp ?? 1));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const touch = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const resume = useRef<number | null>(null);

  const canTriptych = count >= split && split > 1;
  const slideCount = canTriptych ? count : count > 1 ? count : 1;
  const single = count <= 1;
  const autoplay = slideCount > 1 && intervalSeconds > 0 && !reduced;

  const go = useCallback(
    (next: number) => {
      if (slideCount < 2) return;
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  /** Etkileşimden sonra otomatik geçişi kısa bir gecikmeyle sürdürür. */
  const pauseThenResume = useCallback((delay = 2500) => {
    setPaused(true);
    if (resume.current) window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => setPaused(false), delay);
  }, []);

  useEffect(() => () => void (resume.current && window.clearTimeout(resume.current)), []);

  useEffect(() => {
    if (!autoplay || paused) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slideCount),
      Math.max(1, intervalSeconds) * 1000,
    );
    return () => window.clearInterval(id);
  }, [autoplay, paused, slideCount, intervalSeconds]);

  if (count === 0) {
    return (
      <div
        className={`grid place-items-center bg-secondary/60 text-muted-foreground ring-1 ring-inset ring-border/60 ${className ?? ""}`}
      >
        <div className="flex flex-col items-center gap-1.5 px-4 text-center">
          <ImageOff className="size-7 opacity-70" />
          <span className="text-[11px] font-medium">Fotoğraf eklenmedi</span>
        </div>
      </div>
    );
  }

  /** Üçlü kolajdaki bir slot için görsel indeksi (döngüsel). */
  const slotIndex = (slide: number, offset: number) => {
    if (canTriptych) return (slide + offset) % count;
    // Yetersiz fotoğraf varsa mevcutları tekrarla.
    return offset % count;
  };

  const imageWidthPct = canTriptych ? 100 / split : 100;

  return (
    <div
      className={`group relative overflow-hidden bg-secondary/70 ${className ?? ""}`}
      onMouseEnter={() => !single && setPaused(true)}
      onMouseLeave={() => !single && setPaused(false)}
      onTouchStart={(e) => {
        if (single) return;
        const t = e.touches[0];
        if (!t) return;
        touch.current = { x: t.clientX, y: t.clientY, horizontal: null };
        setPaused(true);
      }}
      onTouchMove={(e) => {
        const start = touch.current;
        const t = e.touches[0];
        if (!start || !t) return;
        if (start.horizontal === null) {
          const dx = Math.abs(t.clientX - start.x);
          const dy = Math.abs(t.clientY - start.y);
          if (dx < 8 && dy < 8) return;
          // Dikey sayfa kaydırmasıyla çakışmayı önlemek için yön kilidi.
          start.horizontal = dx > dy;
        }
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        pauseThenResume();
        const end = e.changedTouches[0];
        if (!start || !end || start.horizontal !== true) return;
        const dx = end.clientX - start.x;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      style={single ? undefined : { touchAction: "pan-y" }}
    >
      <div
        className={`flex h-full w-full ${reduced ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {Array.from({ length: slideCount }).map((_, slide) => (
          <div
            key={slide}
            className="flex h-full w-full shrink-0 grow-0 basis-full"
          >
            {Array.from({ length: canTriptych ? split : 1 }).map((__, offset) => {
              const photoIndex = slotIndex(slide, offset);
              const src = list[photoIndex];
              return (
                <img
                  key={`${slide}-${offset}-${src}`}
                  src={photoUrl(src, photoIndex)}
                  alt={`${alt} fotoğraf ${photoIndex + 1}`}
                  loading="lazy"
                  draggable={false}
                  className="h-full shrink-0 grow-0 object-cover"
                  style={{ width: `${imageWidthPct}%` }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {!single && (
        <>
          <button
            type="button"
            aria-label="Önceki fotoğraf"
            onClick={() => {
              go(index - 1);
              pauseThenResume();
            }}
            className="absolute left-1.5 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-background/70 p-2 text-foreground ring-1 ring-border transition-opacity hover:bg-background md:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Sonraki fotoğraf"
            onClick={() => {
              go(index + 1);
              pauseThenResume();
            }}
            className="absolute right-1.5 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-background/70 p-2 text-foreground ring-1 ring-border transition-opacity hover:bg-background md:grid"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}. fotoğraf grubunu göster`}
                aria-current={i === index}
                onClick={() => {
                  go(i);
                  pauseThenResume();
                }}
                className="grid h-6 w-4 place-items-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-bold text-foreground ring-1 ring-border">
            {index + 1}/{slideCount}
          </div>
        </>
      )}
    </div>
  );
}
