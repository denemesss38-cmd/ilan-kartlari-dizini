import { supabase } from "@/integrations/supabase/client";

export type StatKind = "view" | "wa" | "call";

// Ziyaretçi sayacı: güvenli veritabanı fonksiyonu ile birer artırır.
export async function trackListing(listingId: string, kind: StatKind): Promise<number | null> {
  try {
    const { data, error } = await (supabase.rpc as any)("track_listing_event", { _listing_id: listingId, _kind: kind });
    if (error) return null;
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}
