import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { photoUrl, resolvePhotoUrl } from "@/lib/photos";
import type { Listing } from "@/data/listings";
import { parseFooterBoxes, serializeFooterBoxes, type FooterBox } from "@/lib/footer-boxes";
import { StatsPanel } from "@/components/StatsPanel";
import { WeeklyReport } from "@/components/WeeklyReport";

export const Route = createFileRoute("/_authenticated/ragnar")({
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

const DEFAULT_LISTING_WA_MESSAGE = "Merhaba, Nova'dan geliyorum bilgi alabilir miyim?";

const emptyDraft: Draft = {
  name: "",
  location: "",
  description: "",
  photos: [],
  phone: "",
  whatsapp: "",
  badge: "",
  venue: "",
  whatsapp_message: DEFAULT_LISTING_WA_MESSAGE,
  age: "",
  height: "",
  weight: "",
  district: "",
  meeting: "",
  price_note: "",
  scroll_direction: "left",
  sort_order: 0,
  is_published: true,
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tab, setTab] = useState<"listings" | "showcase" | "seo" | "stats">("listings");

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
    // Vitrin anında güncellensin.
    queryClient.invalidateQueries({ queryKey: ["public-listings"] });
    queryClient.invalidateQueries({ queryKey: ["public-settings"] });
  };

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
        whatsapp_message: item.whatsapp_message?.trim() || DEFAULT_LISTING_WA_MESSAGE,
        age: item.age?.trim() || null,
        height: item.height?.trim() || null,
        weight: item.weight?.trim() || null,
        district: item.district?.trim() || null,
        meeting: item.meeting?.trim() || null,
        price_note: item.price_note?.trim() || null,
        scroll_direction: item.scroll_direction === "right" ? "right" : "left",
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
        const img = await toWebp(file);
        const path = `${crypto.randomUUID()}.${img.ext}`;
        const { error } = await supabase.storage
          .from("listing-photos")
          .upload(path, img.blob, { contentType: img.type });
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
        {/* Sekmeli düzen: her başlık kendi bölümünü açar, sayfa karışmaz. */}
        <nav className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-secondary/60 p-1">
          {(
            [
              { key: "listings", label: `İlanlar (${items.length})` },
              { key: "showcase", label: "Vitrin & Hız" },
              { key: "seo", label: "SEO & Bölgeler" },
              { key: "stats", label: "Veriler" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`truncate rounded-xl px-2 py-2.5 text-[11px] font-black transition-colors md:text-xs ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "showcase" ? (
          <div className="mt-4 space-y-4">
            <CarouselSpeedSetting />
            <WhatsAppSettings />
          </div>
        ) : null}

        {tab === "seo" ? <SeoSettings /> : null}

        {tab === "stats" ? (<><StatsPanel items={items} /><WeeklyReport items={items} /></>) : null}

        {tab === "listings" ? (
        <>
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
              <div>
                <label className="text-xs font-bold text-muted-foreground">
                  Görüşme yeri (isteğe bağlı)
                </label>
                <input
                  list="venue-options"
                  value={draft.venue ?? ""}
                  onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                  placeholder="Seçin veya özel bir seçenek yazın"
                  maxLength={60}
                  className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground"
                />
                <datalist id="venue-options">
                  <option value="Kendi yeri var" />
                  <option value="Apart" />
                  <option value="Otel" />
                  <option value="Ev" />
                  <option value="Rezidans" />
                  <option value="Ev & Apart" />
                  <option value="Otel & Apart" />
                  <option value="Kendi Yeri & Apart" />
                </datalist>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Listeden seçebilir veya istediğiniz yer bilgisini yazabilirsiniz.
                </p>
              </div>
              <Field
                label="WhatsApp hazır mesajı"
                value={draft.whatsapp_message ?? ""}
                onChange={(v) => setDraft({ ...draft, whatsapp_message: v })}
                max={200}
              />
              <div className="rounded-xl border border-border bg-secondary/50 p-3">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((open) => !open)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black text-foreground">Detay sayfası bilgileri</span>
                    <span className="text-[10px] text-muted-foreground">Yaş, boy, kilo, semt ve görüşme</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-primary">{detailsOpen ? "Kapat" : "Aç"}</span>
                </button>
                {detailsOpen ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <Field label="Yaş" value={draft.age ?? ""} onChange={(v) => setDraft({ ...draft, age: v })} max={20} />
                    <Field label="Boy" value={draft.height ?? ""} onChange={(v) => setDraft({ ...draft, height: v })} max={20} />
                    <Field label="Kilo" value={draft.weight ?? ""} onChange={(v) => setDraft({ ...draft, weight: v })} max={20} />
                    <Field label="Semt" value={draft.district ?? ""} onChange={(v) => setDraft({ ...draft, district: v })} max={60} />
                    <div className="col-span-2">
                      <Field label="Görüşme" value={draft.meeting ?? ""} onChange={(v) => setDraft({ ...draft, meeting: v })} max={100} />
                    </div>
                    <div className="col-span-2">
                      <Field label="Ek not kutucuğu (örn. Ücret elden)" value={draft.price_note ?? ""} onChange={(v) => setDraft({ ...draft, price_note: v })} max={60} />
                    </div>
                  </div>
                ) : null}
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
                      <Thumb path={p} index={i} className="size-20 rounded-lg object-cover" />
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
                  <div className="mt-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <Loader2 className="size-3.5 animate-spin" />
                      Yükleniyor... {progress.done}/{progress.total} (
                      {progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%)
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    İlk fotoğraf kartta büyük gösterilir. Tek dosya en fazla 10 MB. Fotoğrafları
                    ekledikten sonra aşağıdaki <strong className="text-foreground">Kaydet</strong>{" "}
                    düğmesine basın.
                  </p>
                )}
              </div>

              <button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending || uploading || !draft.name.trim()}
                className="sticky bottom-3 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-black text-primary-foreground shadow-lg disabled:opacity-60"
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
                <Thumb
                  path={item.photos?.[0] ?? null}
                  index={0}
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

              {/* Fotoğraf akış yönü: her ilan ayrı yöne dönebilir. */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground">Fotoğraf yönü:</span>
                <button
                  onClick={() =>
                    patchMutation.mutate({ id: item.id, values: { scroll_direction: "left" } })
                  }
                  aria-label="Fotoğraflar sola dönsün"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    (item.scroll_direction ?? "left") !== "right"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  <ChevronLeft className="size-3.5" /> Sola
                </button>
                <button
                  onClick={() =>
                    patchMutation.mutate({ id: item.id, values: { scroll_direction: "right" } })
                  }
                  aria-label="Fotoğraflar sağa dönsün"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    item.scroll_direction === "right"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  Sağa <ChevronRight className="size-3.5" />
                </button>
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
                      whatsapp_message: item.whatsapp_message ?? DEFAULT_LISTING_WA_MESSAGE,
                      age: item.age ?? "",
                      height: item.height ?? "",
                      weight: item.weight ?? "",
                      district: item.district ?? "",
                      meeting: item.meeting ?? "",
                      price_note: item.price_note ?? "",
                      scroll_direction: item.scroll_direction ?? "left",
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
        </>
        ) : null}
      </main>
    </div>
  );
}

/** Site genelinde kayan şeridin tam tur süresi. 0 = otomatik akış kapalı. */
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
      return Number(data?.value ?? 22);
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

  const current = value ?? String(settingQuery.data ?? 22);

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-black text-foreground">Fotoğraf geçiş hızı</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Fotoğraf şeridinin bir tam tur süresi. Küçük sayı daha hızlıdır; 0 akışı kapatır.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
           max={60}
          value={current}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <span className="text-xs text-muted-foreground">saniye</span>
        <button
          onClick={() => {
             const n = Math.min(60, Math.max(0, Math.round(Number(current) || 0)));
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
  const [openFooterBox, setOpenFooterBox] = useState<number | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    keywords: string;
    footerBoxes: FooterBox[];
  } | null>(null);

  const seoQuery = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["seo_title", "seo_description", "seo_keywords", "footer_text"]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      const str = (k: string) => (typeof map.get(k) === "string" ? String(map.get(k)) : "");
      return {
        title: str("seo_title"),
        description: str("seo_description"),
        keywords: str("seo_keywords"),
        footerBoxes: parseFooterBoxes(str("footer_text")),
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (v: { title: string; description: string; keywords: string; footerBoxes: FooterBox[] }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("site_settings").upsert(
        [
          { key: "seo_title", value: v.title.trim(), updated_at: now },
          { key: "seo_description", value: v.description.trim(), updated_at: now },
          { key: "seo_keywords", value: v.keywords.trim(), updated_at: now },
          { key: "footer_text", value: serializeFooterBoxes(v.footerBoxes), updated_at: now },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SEO ayarları kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["seo-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current =
    draft ?? seoQuery.data ?? { title: "", description: "", keywords: "", footerBoxes: [] };

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
        <div className="rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-foreground">Sayfa altı bölge kutuları</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Bölge adını ve metnini ayrı ayrı düzenleyebilirsiniz.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                (() => {
                  setOpenFooterBox(current.footerBoxes.length);
                  setDraft({
                    ...current,
                    footerBoxes: [...current.footerBoxes, { title: "Yeni Bölge", text: "" }],
                  });
                })()
              }
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-black text-primary-foreground"
            >
              <Plus className="size-3.5" />
              Kutucuk ekle
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {current.footerBoxes.map((box, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenFooterBox(openFooterBox === index ? null : index)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-xs font-black text-foreground">
                      {box.title || `Kutucuk ${index + 1}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {openFooterBox === index ? "Kapat" : "Düzenlemek için aç"}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${box.title || `Kutucuk ${index + 1}`} sil`}
                    onClick={() => {
                      setOpenFooterBox(null);
                      setDraft({
                        ...current,
                        footerBoxes: current.footerBoxes.filter((_, itemIndex) => itemIndex !== index),
                      });
                    }}
                    className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {openFooterBox === index ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="mb-3 flex items-center gap-3">
                      {box.image ? (
                        <Thumb path={box.image} className="size-16 rounded-xl object-cover" />
                      ) : (
                        <div className="grid size-16 place-items-center rounded-xl bg-secondary text-[10px] text-muted-foreground">Foto yok</div>
                      )}
                      <label className="cursor-pointer rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground">
                        Fotoğraf seç
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;
                            const img = await toWebp(file);
                            const path = `rehber/${crypto.randomUUID()}.${img.ext}`;
                            const { error } = await supabase.storage
                              .from("listing-photos")
                              .upload(path, img.blob, { contentType: img.type });
                            if (error) { toast.error(error.message); return; }
                            const boxes = current.footerBoxes.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, image: path } : item,
                            );
                            setDraft({ ...current, footerBoxes: boxes });
                            toast.success('Fotoğraf yüklendi. "Kaydet"e basın.');
                          }}
                        />
                      </label>
                      {box.image ? (
                        <button
                          type="button"
                          className="text-xs font-bold text-destructive"
                          onClick={() =>
                            setDraft({
                              ...current,
                              footerBoxes: current.footerBoxes.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, image: "" } : item,
                              ),
                            })
                          }
                        >
                          Kaldır
                        </button>
                      ) : null}
                    </div>
                    <input
                      value={box.title}
                      maxLength={50}
                      placeholder="Bölge adı"
                      onChange={(event) => {
                        const boxes = current.footerBoxes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item,
                        );
                        setDraft({ ...current, footerBoxes: boxes });
                      }}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <textarea
                      value={box.text}
                      maxLength={1000}
                      rows={3}
                      placeholder="Bölge metni"
                      onChange={(event) => {
                        const boxes = current.footerBoxes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, text: event.target.value } : item,
                        );
                        setDraft({ ...current, footerBoxes: boxes });
                      }}
                      className="mt-2 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <textarea
                      value={box.detail ?? ""}
                      maxLength={20000}
                      rows={8}
                      placeholder="Uzun detay yazısı (kutuya tıklanınca açılır)"
                      onChange={(event) => {
                        const boxes = current.footerBoxes.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, detail: event.target.value } : item,
                        );
                        setDraft({ ...current, footerBoxes: boxes });
                      }}
                      className="mt-2 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                ) : null}
              </div>
            ))}
            {current.footerBoxes.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-muted-foreground">
                Henüz bölge kutusu yok. “Kutucuk ekle” ile oluşturabilirsiniz.
              </p>
            ) : null}
          </div>
        </div>
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

/** Depodaki fotoğrafı imzalı adresle gösterir. */
function Thumb({
  path,
  index = 0,
  className,
}: {
  path: string | null | undefined;
  index?: number;
  className?: string;
}) {
  const [src, setSrc] = useState(() => photoUrl(null, index));

  useEffect(() => {
    let active = true;
    resolvePhotoUrl(path, index).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [path, index]);

  return <img src={src} alt="Fotoğraf" loading="lazy" className={className} />;
}

/** WhatsApp numarası ve butonlara tıklanınca gidecek hazır mesaj. */
function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{ number: string; message: string } | null>(null);

  const waQuery = useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["whatsapp_number", "whatsapp_message"]);
      if (error) throw error;
      const map = new Map((data ?? []).map((r) => [r.key, r.value]));
      const str = (k: string) => (typeof map.get(k) === "string" ? String(map.get(k)) : "");
      return { number: str("whatsapp_number"), message: str("whatsapp_message") };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (v: { number: string; message: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("site_settings").upsert(
        [
          { key: "whatsapp_number", value: v.number.replace(/\D/g, ""), updated_at: now },
          { key: "whatsapp_message", value: v.message.trim(), updated_at: now },
        ],
        { onConflict: "key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WhatsApp ayarları kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const current = draft ?? waQuery.data ?? { number: "", message: "" };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-black text-foreground">WhatsApp / reklam iletişimi</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Reklam ve bilgi butonlarının açacağı numara ile otomatik yazılacak mesaj.
      </p>
      <div className="mt-3 space-y-3">
        <Field
          label="WhatsApp numarası (örn. 905551112233)"
          value={current.number}
          onChange={(v) => setDraft({ ...current, number: v })}
          max={20}
        />
        <Field
          label="Hazır mesaj"
          value={current.message}
          onChange={(v) => setDraft({ ...current, message: v })}
          max={200}
          textarea
        />
      </div>
      <button
        onClick={() => saveMutation.mutate(current)}
        disabled={saveMutation.isPending}
        className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground disabled:opacity-60"
      >
        {saveMutation.isPending ? "Kaydediliyor..." : "WhatsApp ayarlarını kaydet"}
      </button>
    </section>
  );
}
