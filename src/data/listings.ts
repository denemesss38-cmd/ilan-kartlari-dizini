/**
 * SİTE AYARLARI — metinleri serbestçe değiştirebilirsiniz.
 * İlanlar artık yönetim panelinden (/ragnar) yönetilir.
 */
export const siteConfig = {
  title: "İLAN REHBERİ",
  city: "DİYARBAKIR",
  subtitle: "Güncel ilanlar ve iletişim",
  banner: {
    title: "DİKKAT!",
    text: "Ödeme öncesi kimlik veya kapora isteyen kişilere karşı dikkatli olun. Tüm ilanlar kullanıcılar tarafından eklenmiştir.",
    ctaLabel: "Reklam vermek için tıklayın",
    ctaHref: "https://wa.me/905551112233",
  },
  /** Üstteki iki büyük gradyan alan. */
  promos: [
    {
      title: "İLANINIZI ÖNE ÇIKARIN",
      text: "Vitrinin en üstünde yayınlanmak için hemen yazın.",
      ctaLabel: "Bilgi al",
      href: "https://wa.me/905551112233",
      variant: "primary" as const,
    },
    {
      title: "GÜVENLİ İLETİŞİM",
      text: "Tüm görüşmeleri telefon veya WhatsApp üzerinden yapın.",
      ctaLabel: "Bilgi al",
      href: "https://wa.me/905551112233",
      variant: "alt" as const,
    },
  ],
  siteName: "Diyarbakır Rehberi",
  footerNote: "Bu site yalnızca ilan yayınlar; hizmet sunmaz ve aracılık yapmaz.",
};

export type Listing = {
  id: string;
  name: string;
  location: string;
  description: string;
  photos: string[];
  phone: string;
  whatsapp: string;
  badge: string | null;
  /** İlana özel WhatsApp hazır mesajı. */
  whatsapp_message: string;
  /** Görüşme yeri: "Kendi yeri var", "Apart", "Otel" vb. */
  venue: string | null;
  sort_order: number;
  is_published: boolean;
};
