import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, LogOut, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { photoUrl, resolvePhotoUrl } from "@/lib/photos";
import type { Listing } from "@/data/listings";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Yönetim Paneli — İlan Rehberi" },
      { name: "description", content: "İlanları ekleyin, düzenleyin, sıralayın ve yayınlayın." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Yönetim Paneli — İlan Rehberi" },
      { property: "og:description", content: "İlan yönetimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Draft = Omit<Listing, "id"> & { id?: string };

const emptyDraft: Draft = {
  name: "",
  location: "",
  description: "",
  photos: [],
  phone: "",
  whatsapp: "",
  badge: "",
  venue: "",
  sort_order: 0,
  is_published: true,
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const roleQuery = useQuery({
    queryKey: ["my-admin-role"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    enabled: roleQuery.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-listings"] });

  const saveMutation = useMutation({
    mutationFn: async (item: Draft) => {
      const payload = {
        name: item.name.trim(),
        location: item.location.trim(),
        description: item.description.trim(),
        phone: item.phone.trim(),
        whatsapp: item.whatsapp.replace(/[^0-9]/g, ""),
        badge: item.badge?.trim() ? item.badge.trim() : null,
        venue: item.venue?.trim() ? item.venue.trim() : null,
        photos: item.photos,
        sort_order: Number(item.sort_order) || 0,
        is_published: item.is_published,
      };
      if (item.id) {
        const { error } = await supabase.from("listings").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("listings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Kaydedildi.");
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("İlan silindi.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Listing> }) => {
      const { error } = await supabase.from("listings").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(files: FileList | null) {
    if (!files?.length || !draft) return;
    const all = Array.from(files);
    setUploading(true);
    setProgress({ done: 0, total: all.length });
    try {
      const paths: string[] = [];
      for (const file of all) {
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("listing-photos")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (error) throw error;
        paths.push(path);
        setProgress({ done: paths.length, total: all.length });
      }
      setDraft({ ...draft, photos: [...draft.photos, ...paths] });
      toast.success(`${paths.length} fotoğraf yüklendi. Şimdi "Kaydet" düğmesine basın.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
      setProgress({ done: 0, total: 0 });
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function move(index: number, dir: -1 | 1) {
    const items = listingsQuery.data ?? [];
    const target = items[index + dir];
    const current = items[index];
    if (!target || !current) return;
    patchMutation.mutate({ id: current.id, values: { sort_order: target.sort_order } });
    patchMutation.mutate({ id: target.id, values: { sort_order: current.sort_order } });
  }

  if (roleQuery.isLoading) {
    return <CenterNote text="Yükleniyor..." />;
  }

  if (roleQuery.data !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-black text-foreground">Yetkiniz yok</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bu sayfa yalnızca yönetici hesapları içindir.
          </p>
          <button onClick={signOut} className="mt-4 text-sm text-primary underline">
            Çıkış yap
          </button>
        </div>
      </div>
    );
  }

  const items = listingsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-widest text-primary">
              YÖNETİM PANELİ
            </h1>
            <Link to="/" className="text-[11px] text-muted-foreground underline">
              Siteyi görüntüle
            </Link>
          </div>
          <button
            onClick={signOut}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
          >
            <LogOut className="size-3.5" />
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 pb-16 pt-4">
        <CarouselSpeedSetting />
        <SeoSettings />


        <button
          onClick={() => setDraft({ ...emptyDraft, sort_order: items.length + 1 })}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
        >
          <Plus className="size-4" />
          Yeni ilan ekle
        </button>


        {draft ? (
          <section className="mt-4 rounded-2xl border border-primary/40 bg-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate text-sm font-black text-foreground">
                {draft.id ? "İlanı düzenle" : "Yeni ilan"}
              </h2>
              <button onClick={() => setDraft(null)} className="shrink-0 text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <Field
                label="İsim"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                max={80}
              />
              <Field
                label="Konum"
                value={draft.location}
                onChange={(v) => setDraft({ ...draft, location: v })}
                max={80}
              />
              <Field
                label="Kısa açıklama"
                value={draft.description}
                onChange={(v) => setDraft({ ...draft, description: v })}
                max={300}
                textarea
              />
              <Field
                label="Telefon (örn. +905551112233)"
                value={draft.phone}
                onChange={(v) => setDraft({ ...draft, phone: v })}
                max={20}
              />
              <Field
                label="WhatsApp numarası (örn. 905551112233)"
                value={draft.whatsapp}
                onChange={(v) => setDraft({ ...draft, whatsapp: v })}
                max={20}
              />
              <Field
                label="Etiket (isteğe bağlı)"
                value={draft.badge ?? ""}
                onChange={(v) => setDraft({ ...draft, badge: v })}
                max={12}
              />
              <div>
                <label className="text-xs font-bold text-muted-foreground">
                  Görüşme yeri (isteğe bağlı)
                </label>
                <select
                  value={draft.venue ?? ""}
                  onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                >
                  <option value="">Belirtilmedi</option>
                  <option value="Kendi yeri var">Kendi yeri var</option>
                  <option value="Apart">Apart</option>
                  <option value="Otel">Otel</option>
                  <option value="Ev">Ev</option>
                  <option value="Rezidans">Rezidans</option>
                </select>
              </div>
              <Field
                label="Sıra numarası"
                value={String(draft.sort_order)}
                onChange={(v) => setDraft({ ...draft, sort_order: Number(v.replace(/\D/g, "")) || 0 })}
                max={5}
              />

              <label className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2.5">
                <span className="text-sm text-foreground">Yayında</span>
                <input
                  type="checkbox"
                  checked={draft.is_published}
                  onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
                  className="size-5 accent-current text-primary"
                />
              </label>

              <div className="rounded-xl border border-border bg-secondary p-3">
                <p className="text-xs font-bold text-foreground">Fotoğraflar</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.photos.map((p, i) => (
                    <div key={p + i} className="relative">
                      <img
                        src={photoUrl(p)}
                        alt={`Fotoğraf ${i + 1}`}
                        loading="lazy"
                        className="size-20 rounded-lg object-cover"
                      />
                      <button
                        onClick={() =>
                          setDraft({ ...draft, photos: draft.photos.filter((_, idx) => idx !== i) })
                        }
                        className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                        aria-label="Fotoğrafı kaldır"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files)}
                  className="mt-3 block w-full text-xs text-muted-foreground"
                />
                {uploading ? (
                  <p className="mt-1 text-xs text-primary">Yükleniyor...</p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    İlk fotoğraf kartta büyük gösterilir. Tek dosya en fazla 10 MB.
                  </p>
                )}
              </div>

              <button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending || !draft.name.trim()}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </section>
        ) : null}

        <div className="mt-6 space-y-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-card p-2.5 xs:p-3 md:rounded-2xl md:p-4"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 xs:gap-3 md:gap-4">
                <img
                  src={photoUrl(item.photos?.[0])}
                  alt={item.name}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-lg object-cover xs:size-14 md:size-16"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground md:text-base">
                    {item.name}
                  </h3>
                  <p className="truncate text-[11px] text-muted-foreground md:text-xs">
                    {item.location || "Konum yok"} · sıra {item.sort_order}
                  </p>
                </div>
              </div>


              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-border p-2 text-foreground disabled:opacity-40"
                  aria-label="Yukarı taşı"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="rounded-lg border border-border p-2 text-foreground disabled:opacity-40"
                  aria-label="Aşağı taşı"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button
                  onClick={() =>
                    patchMutation.mutate({
                      id: item.id,
                      values: { is_published: !item.is_published },
                    })
                  }
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    item.is_published
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {item.is_published ? "Yayında" : "Yayında değil"}
                </button>
                <button
                  onClick={() =>
                    setDraft({
                      id: item.id,
                      name: item.name,
                      location: item.location,
                      description: item.description,
                      photos: item.photos ?? [],
                      phone: item.phone,
                      whatsapp: item.whatsapp,
                      badge: item.badge ?? "",
                      venue: item.venue ?? "",
                      sort_order: item.sort_order,
                      is_published: item.is_published,
                    })
                  }
                  className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground"
                >
                  Düzenle
                </button>
                <button
                  onClick={() => {
                    if (confirm(`"${item.name}" ilanını silmek istediğinize emin misiniz?`)) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="ml-auto rounded-lg border border-destructive/50 p-2 text-destructive"
                  aria-label="İlanı sil"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && !listingsQuery.isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Henüz ilan yok.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** Site genelinde fotoğraf geçiş hızı (saniye). 0 = otomatik geçiş kapalı. */
function CarouselSpeedSetting() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState<string | null>(null);

  const settingQuery = useQuery({
    queryKey: ["carousel-interval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "carousel_interval_seconds")
        .maybeSingle();
      if (error) throw error;
      return Number(data?.value ?? 4);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (seconds: number) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "carousel_interval_seconds", value: seconds, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Geçiş hızı kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["carousel-interval"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current = value ?? String(settingQuery.data ?? 4);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-black text-foreground">Fotoğraf geçiş hızı</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Kartlardaki fotoğrafların kaç saniyede bir değişeceği. 0 yazarsanız otomatik geçiş kapanır.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={30}
          value={current}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <span className="text-xs text-muted-foreground">saniye</span>
        <button
          onClick={() => {
            const n = Math.min(30, Math.max(0, Math.round(Number(current) || 0)));
            setValue(String(n));
            saveMutation.mutate(n);
          }}
          disabled={saveMutation.isPending}
          className="ml-auto rounded-xl bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground disabled:opacity-60"
        >
          {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </section>
  );
}

/** Ana sayfa SEO metinleri: sayfa başlığı, açıklama ve anahtar kelimeler. */
function SeoSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    keywords: string;
  } | null>(null);

  const seoQuery = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["seo_title", "seo_description", "seo_keywords"]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      const str = (k: string) => (typeof map.get(k) === "string" ? String(map.get(k)) : "");
      return {
        title: str("seo_title"),
        description: str("seo_description"),
        keywords: str("seo_keywords"),
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (v: { title: string; description: string; keywords: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("site_settings").upsert(
        [
          { key: "seo_title", value: v.title.trim(), updated_at: now },
          { key: "seo_description", value: v.description.trim(), updated_at: now },
          { key: "seo_keywords", value: v.keywords.trim(), updated_at: now },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SEO ayarları kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current =
    draft ?? seoQuery.data ?? { title: "", description: "", keywords: "" };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-black text-foreground">SEO / arama motoru ayarları</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Ana sayfanın arama sonuçlarında görünen başlığı, açıklaması ve anahtar kelimeleri. Boş
        bırakırsanız varsayılan metinler kullanılır.
      </p>
      <div className="mt-3 space-y-3">
        <Field
          label="Sayfa başlığı (en çok 60 karakter önerilir)"
          value={current.title}
          onChange={(v) => setDraft({ ...current, title: v })}
          max={70}
        />
        <Field
          label="Açıklama (en çok 160 karakter önerilir)"
          value={current.description}
          onChange={(v) => setDraft({ ...current, description: v })}
          max={180}
          textarea
        />
        <Field
          label="Anahtar kelimeler (virgülle ayırın)"
          value={current.keywords}
          onChange={(v) => setDraft({ ...current, keywords: v })}
          max={300}
          textarea
        />
      </div>
      <button
        onClick={() => saveMutation.mutate(current)}
        disabled={saveMutation.isPending}
        className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-60"
      >
        {saveMutation.isPending ? "Kaydediliyor..." : "SEO ayarlarını kaydet"}
      </button>
    </section>
  );
}

function CenterNote({ text }: { text: string }) {

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          maxLength={max}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
