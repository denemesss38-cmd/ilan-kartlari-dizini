import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Yeni Şifre Belirle — İlan Rehberi" },
      { name: "description", content: "Hesabınız için yeni bir şifre belirleyin." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Yeni Şifre Belirle — İlan Rehberi" },
      { property: "og:description", content: "Hesabınız için yeni bir şifre belirleyin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Şifreniz güncellendi.");
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Şifre güncellenemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <h1 className="text-lg font-black tracking-widest text-primary">YENİ ŞİFRE</h1>
        <p className="mt-1 text-xs text-muted-foreground">En az 8 karakter kullanın.</p>
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Yeni şifre"
          className="mt-5 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Kaydediliyor..." : "Şifreyi kaydet"}
        </button>
      </form>
    </div>
  );
}
