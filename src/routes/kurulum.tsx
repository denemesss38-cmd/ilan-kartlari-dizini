import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/kurulum")({
  head: () => ({
    meta: [
      { title: "İlk Yönetici Kurulumu — İlan Rehberi" },
      { name: "description", content: "Sitenin ilk yönetici hesabını tek seferlik olarak oluşturun." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "İlk Yönetici Kurulumu — İlan Rehberi" },
      { property: "og:description", content: "İlk yönetici hesabını oluşturun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Kurulum,
});

function Kurulum() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_exists");
      if (error) throw error;
      return { exists: data === true };
    },
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;

      if (signUpData.session) {
        toast.success("Yönetici hesabı oluşturuldu.");
        navigate({ to: "/ragnar", replace: true });
      } else {
        toast.success("Hesap oluşturuldu. E-postanızdaki doğrulama bağlantısına tıklayın.");
        navigate({ to: "/auth" });
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kurulum başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h1 className="text-lg font-black tracking-widest text-primary">İLK KURULUM</h1>

        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Kontrol ediliyor...</p>
        ) : data?.exists ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Yönetici hesabı zaten oluşturulmuş. Bu sayfa artık kullanılamaz.{" "}
            <Link to="/auth" className="text-primary underline">
              Giriş yap
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">
              Bu ekran yalnızca hiç yönetici yokken çalışır. Hesabı oluşturduktan sonra kapanır.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Yönetici e-postası"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifre (en az 8 karakter)"
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Oluşturuluyor..." : "Yönetici hesabı oluştur"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
