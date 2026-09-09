import { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

import { photoUrl } from "@/lib/photos";

type Props = {
  photos: string[] | null | undefined;
  alt: string;
  /** Otomatik geçiş süresi (ms). */
  interval?: number;
  className?: string;
};

/**
 * İlan fotoğrafları için otomatik geçişli, dokunmatik kaydırmayı destekleyen slider.
 * Fotoğraf yoksa zarif bir yer tutucu, tek fotoğraf varsa sabit görsel gösterir.
 */
export function PhotoCarousel({ photos, alt, interval = 3800, className }: Props) {
  const list = (photos ?? []).filter(Boolean);
  const count = list.length;
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const paused = useRef(false);

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, interval);
    return () => window.clearInterval(id);
  }, [count, interval]);

  if (count === 0) {
    return (
      <div
        className={`grid place-items-center bg-secondary/70 text-muted-foreground ${className ?? ""}`}
      >
        <div className="flex flex-col items-center gap-1.5 px-4 text-center">
          <ImageOff className="size-7 opacity-70" />
          <span className="text-[11px] font-medium">Fotoğraf eklenmedi</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-secondary/70 ${className ?? ""}`}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={(e) => {
        paused.current = true;
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        paused.current = false;
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchStart.current = null;
        if (start == null || end == null) return;
        const dx = end - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div
        className="flex h-full w-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {list.map((p, i) => (
          <img
            key={`${p}-${i}`}
            src={photoUrl(p, i)}
            alt={`${alt} fotoğraf ${i + 1}`}
            loading="lazy"
            draggable={false}
            className="h-full w-full shrink-0 grow-0 basis-full object-cover"
          />
        ))}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}. fotoğrafı göster`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
