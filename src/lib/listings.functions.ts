import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import type { Listing } from "@/data/listings";

/** Anonim (yayın) erişimi için sunucu tarafı istemci. */
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Herkese açık: yayında olan ilanları getirir. */
export const getPublishedListings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("listings")
    .select("id, name, location, description, photos, phone, whatsapp, badge, venue, sort_order, is_published")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Listing[];
});

/** Herkese açık: site ayarları (şu an fotoğraf geçiş hızı). 0 = otomatik geçiş kapalı. */
export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("site_settings")
    .select("key, value")
    .eq("key", "carousel_interval_seconds")
    .maybeSingle();

  const raw = Number(data?.value ?? 4);
  const seconds = Number.isFinite(raw) && raw >= 0 && raw <= 30 ? raw : 4;
  return { carouselIntervalSeconds: seconds };
});


const setupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

/** İlk yönetici hesabını yalnızca hiç yönetici yoksa oluşturur. */
export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      return { ok: false as const, message: "Yönetici hesabı zaten oluşturulmuş." };
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { ok: false as const, message: error?.message ?? "Hesap oluşturulamadı." };
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true as const, message: "Yönetici hesabı oluşturuldu. Şimdi giriş yapabilirsiniz." };
  });

/** Yönetici hesabı var mı? (kurulum ekranını gizlemek için) */
export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});
