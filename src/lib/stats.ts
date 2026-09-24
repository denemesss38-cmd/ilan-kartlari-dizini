import { supabase } from "@/integrations/supabase/client";

export type StatKind = "view" | "wa" | "call";

const inFlight = new Set<string>();

// Aynı ziyaretçi aynı oturumda bir ilanı / tuşu yalnızca 1 kez sayılır.
export async function trackListing(listingId: string, kind: StatKind): Promise<number | null> {
  const key = `nova-stat:${kind}:${listingId}`;
  let already = false;
  try {
    already = sessionStorage.getItem(key) === "1";
  } catch {}
  if (inFlight.has(key)) return null;

  if (already) {
    if (kind !== "view") return null;
    // Sayma, sadece güncel görüntülenme sayısını oku.
    const { data } = await (supabase.from as any)("listing_stats").select("views").eq("listing_id", listingId).maybeSingle();
    return data?.views ?? null;
  }

  inFlight.add(key);
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
  try {
    const { data, error } = await (supabase.rpc as any)("track_listing_event", { _listing_id: listingId, _kind: kind });
    if (error) return null;
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  } finally {
    inFlight.delete(key);
  }
}
