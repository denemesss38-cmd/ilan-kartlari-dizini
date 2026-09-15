import fallback1 from "@/assets/placeholder-1.jpg";
import fallback2 from "@/assets/placeholder-2.jpg";
import fallback3 from "@/assets/placeholder-3.jpg";

import { supabase } from "@/integrations/supabase/client";

const fallbacks = [fallback1, fallback2, fallback3];
const BUCKET = "listing-photos";
const ONE_WEEK = 60 * 60 * 24 * 7;
const CACHE_KEY = "listing-photo-urls-v1";
// Önbelleği imza süresinden kısa tut ki süresi dolan bağlantı gösterilmesin.
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 5;

type UrlCache = Record<string, { url: string; ts: number }>;

function readCache(): UrlCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UrlCache;
    const now = Date.now();
    const fresh: UrlCache = {};
    for (const [path, entry] of Object.entries(parsed)) {
      if (entry?.url && now - entry.ts < CACHE_TTL_MS) fresh[path] = entry;
    }
    return fresh;
  } catch {
    return {};
  }
}

function writeCache(cache: UrlCache) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Kota dolarsa sessizce geç; bir sonraki açılışta yeniden imzalanır.
  }
}

/** Tam URL'yi olduğu gibi döndürür, boş değerlerde güvenli yer tutucu verir. */
export function photoUrl(path: string | undefined | null, index = 0): string {
  if (!path) return fallbacks[index % fallbacks.length] ?? fallback1;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  return fallbacks[index % fallbacks.length] ?? fallback1;
}

/**
 * Depodaki yolları gösterilebilir adreslere çevirir.
 * İmzalı adresler tarayıcıda önbelleğe alınır; tekrar açılışlarda ağ isteği olmadan anında gelir.
 */
export async function resolvePhotoUrls(paths: (string | null | undefined)[]): Promise<string[]> {
  const list = paths.filter((p): p is string => !!p);
  const storagePaths = list.filter((p) => !p.startsWith("http") && !p.startsWith("/"));
  const map = new Map<string, string>();

  if (storagePaths.length > 0) {
    const cache = readCache();
    const missing: string[] = [];
    for (const p of storagePaths) {
      const hit = cache[p];
      if (hit) map.set(p, hit.url);
      else missing.push(p);
    }

    if (missing.length > 0) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, ONE_WEEK);
      let changed = false;
      for (const row of data ?? []) {
        if (row.path && row.signedUrl) {
          map.set(row.path, row.signedUrl);
          cache[row.path] = { url: row.signedUrl, ts: Date.now() };
          changed = true;
        }
      }
      if (changed) writeCache(cache);
    }
  }

  return list.map((p, i) => (p.startsWith("http") || p.startsWith("/") ? p : (map.get(p) ?? photoUrl(null, i))));
}

/** Tek fotoğraf için gösterilebilir adres. */
export async function resolvePhotoUrl(path: string | null | undefined, index = 0): Promise<string> {
  if (!path) return photoUrl(null, index);
  const [url] = await resolvePhotoUrls([path]);
  return url ?? photoUrl(null, index);
}

export const fallbackPhoto = fallback1;
