import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { photoUrl } from "@/lib/photos";

type Props = {
  photos: string[] | null | undefined;
  alt: string;
  /** 0 ise otomatik akış kapalıdır. */
  intervalSeconds?: number;
  className?: string;
  /** Aynı anda yan yana gösterilecek fotoğraf sayısı. */
  split?: number;
  lightboxOpen?: boolean;
  onLightboxOpenChange?: (open: boolean) => void;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Kesintisiz kayan fotoğraf şeridi ve tam ekran görsel inceleyici. */
export function PhotoCarousel({
  photos,
  alt,
  intervalSeconds = 4,
  className,
  split: splitProp,
  lightboxOpen,
  onLightboxOpenChange,
}: Props) {
  const list = useMemo(() => (photos ?? []).filter(Boolean), [photos]);
  const count = list.length;
  const split = Math.max(1, Math.min(3, splitProp ?? 1));
  const reduced = usePrefersReducedMotion();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pressed, setPressed] = useState(false);
  const lightboxTouch = useRef<{ x: number; y: number } | null>(null);
  const open = lightboxOpen ?? internalOpen;
  const setOpen = onLightboxOpenChange ?? setInternalOpen;

  const displayList = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: Math.max(split, count) }, (_, index) => list[index % count] ?? list[0]);
  }, [count, list, split]);

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      setActiveIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") go(activeIndex - 1);
      if (event.key === "ArrowRight") go(activeIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, go, open]);

  const openAt = (index: number) => {
    setActiveIndex(index % count);
    setOpen(true);
  };

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

  const animationPaused = reduced || intervalSeconds === 0 || pressed;

  return (
    <>
      <div
        className={`photo-marquee group relative overflow-hidden bg-secondary/70 ${className ?? ""}`}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
      >
        <div
          className={`photo-marquee-track flex h-full w-max ${animationPaused ? "is-paused" : ""}`}
          aria-label={`${alt} fotoğraf galerisi`}
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex h-full shrink-0" aria-hidden={copy === 1}>
              {displayList.map((src, index) => {
                const originalIndex = index % count;
                return (
                  <Button
                    key={`${copy}-${index}-${src}`}
                    type="button"
                    variant="ghost"
                    aria-label={`${alt} fotoğraf ${originalIndex + 1} tam ekran göster`}
                    tabIndex={copy === 1 ? -1 : 0}
                    onClick={() => openAt(originalIndex)}
                    className="photo-marquee-item h-full shrink-0 overflow-hidden rounded-none p-0 hover:bg-transparent"
                  >
                    <img
                      src={photoUrl(src, originalIndex)}
                      alt={`${alt} fotoğraf ${originalIndex + 1}`}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="h-[100dvh] max-h-none w-screen max-w-none border-0 bg-background/95 p-0 shadow-none sm:rounded-none [&>button]:hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogTitle className="sr-only">{alt} fotoğrafları</DialogTitle>
          <DialogDescription className="sr-only">
            Fotoğraflar arasında önceki ve sonraki düğmeleriyle gezinin.
          </DialogDescription>

          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) lightboxTouch.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = lightboxTouch.current;
              const end = event.changedTouches[0];
              lightboxTouch.current = null;
              if (!start || !end) return;
              const dx = end.clientX - start.x;
              const dy = end.clientY - start.y;
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                go(activeIndex + (dx < 0 ? 1 : -1));
              }
            }}
            style={{ touchAction: "pan-y" }}
          >
            <img
              src={photoUrl(list[activeIndex], activeIndex)}
              alt={`${alt} fotoğraf ${activeIndex + 1}`}
              className="max-h-[100dvh] w-full object-contain"
            />

            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Galeriyi kapat"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-20 size-11 rounded-full bg-background/80 text-foreground backdrop-blur md:right-6 md:top-6"
            >
              <X className="size-5" />
            </Button>

            {count > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Önceki fotoğraf"
                  onClick={() => go(activeIndex - 1)}
                  className="absolute left-3 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/80 text-foreground backdrop-blur md:left-6 md:size-12"
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Sonraki fotoğraf"
                  onClick={() => go(activeIndex + 1)}
                  className="absolute right-3 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/80 text-foreground backdrop-blur md:right-6 md:size-12"
                >
                  <ChevronRight className="size-6" />
                </Button>
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden="true">
                  {list.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeIndex ? "w-6 bg-primary" : "w-1.5 bg-foreground/45"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}