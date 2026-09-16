import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Yönetici Girişi — İlan Rehberi" },
      { name: "description", content: "İlan Rehberi yönetim paneline giriş yapın." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Yönetici Girişi — İlan Rehberi" },
      { property: "og:description", content: "İlan Rehberi yönetim paneline giriş." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("Giriş yapıldı.");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h1 className="text-lg font-black tracking-widest text-primary">YÖNETİCİ GİRİŞİ</h1>
        <p className="mt-1 text-xs text-muted-foreground">E-posta ve şifrenizle giriş yapın.</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
          {mode === "login" ? (
            <input
              type="password"
              required
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Lütfen bekleyin..." : mode === "login" ? "Giriş yap" : "Bağlantı gönder"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "forgot" : "login")}
            className="text-primary underline"
          >
            {mode === "login" ? "Şifremi unuttum" : "Girişe dön"}
          </button>
          <Link to="/" className="text-muted-foreground underline">
            Ana sayfa
          </Link>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Kayıt herkese açık değildir. İlk yönetici hesabı için{" "}
          <Link to="/kurulum" className="underline">
            kurulum sayfası
          </Link>
          nı kullanın.
        </p>
      </div>
    </div>
  );
}
