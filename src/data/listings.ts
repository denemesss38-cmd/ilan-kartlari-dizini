/**
 * SİTE AYARLARI — metinleri serbestçe değiştirebilirsiniz.
 * İlanlar artık yönetim panelinden (/admin) yönetilir.
 */
export const siteConfig = {
  title: "İLAN REHBERİ",
  subtitle: "Güncel ilanlar",
  banner: {
    title: "DİKKAT!",
    text: "Ödeme öncesi kimlik veya kapora isteyen kişilere karşı dikkatli olun. Tüm ilanlar kullanıcılar tarafından eklenmiştir.",
    ctaLabel: "Reklam vermek için tıklayın",
    ctaHref: "https://wa.me/905551112233",
  },
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
  sort_order: number;
  is_published: boolean;
};
