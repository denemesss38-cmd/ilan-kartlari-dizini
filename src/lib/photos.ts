import fallback1 from "@/assets/placeholder-1.jpg";
import fallback2 from "@/assets/placeholder-2.jpg";
import fallback3 from "@/assets/placeholder-3.jpg";

const fallbacks = [fallback1, fallback2, fallback3];

/** Depodaki fotoğraf yolunu (veya tam URL'yi) görüntülenebilir adrese çevirir. */
export function photoUrl(path: string | undefined | null, index = 0): string {
  if (!path) return fallbacks[index % fallbacks.length] ?? fallback1;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/api/public/foto?p=${encodeURIComponent(path)}`;
}

/** Kart kolajı için 3 fotoğraf slotu döndürür (eksikler yer tutucu ile tamamlanır). */
export function photoTrio(photos: string[] | null | undefined): string[] {
  return [0, 1, 2].map((i) => photoUrl(photos?.[i], i));
}

export const fallbackPhoto = fallback1;
