import fallback from "@/assets/placeholder-1.jpg";

/** Depodaki fotoğraf yolunu (veya tam URL'yi) görüntülenebilir adrese çevirir. */
export function photoUrl(path: string | undefined | null): string {
  if (!path) return fallback;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/api/public/foto?p=${encodeURIComponent(path)}`;
}

export const fallbackPhoto = fallback;
