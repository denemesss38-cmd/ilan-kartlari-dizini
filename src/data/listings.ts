import ph1 from "@/assets/placeholder-1.jpg";
import ph2 from "@/assets/placeholder-2.jpg";
import ph3 from "@/assets/placeholder-3.jpg";

/**
 * SİTE AYARLARI — buradaki metinleri serbestçe değiştirebilirsiniz.
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
  phone: string; // tel: bağlantısı için
  whatsapp: string; // uluslararası format, + ve boşluk olmadan
  badge?: string;
};

/**
 * İLANLAR — yeni ilan eklemek için listeye yeni bir nesne ekleyin.
 */
export const listings: Listing[] = [
  {
    id: "1",
    name: "Ayşe Y.",
    location: "İstanbul / Kadıköy",
    description: "Profesyonel özel ders ve etüt desteği. Hafta içi her saat müsait.",
    photos: [ph1, ph2, ph3],
    phone: "+905551112233",
    whatsapp: "905551112233",
    badge: "VIP",
  },
  {
    id: "2",
    name: "Mehmet K.",
    location: "Ankara / Çankaya",
    description: "Ev ve ofis taşıma, montaj hizmeti. Şehir içi hızlı çözüm.",
    photos: [ph2, ph3, ph1],
    phone: "+905552223344",
    whatsapp: "905552223344",
  },
  {
    id: "3",
    name: "Zeynep D.",
    location: "İzmir / Bornova",
    description: "Kurumsal fotoğraf ve ürün çekimi. Portföy talep üzerine gönderilir.",
    photos: [ph3, ph1, ph2],
    phone: "+905553334455",
    whatsapp: "905553334455",
    badge: "YENİ",
  },
  {
    id: "4",
    name: "Burak A.",
    location: "Bursa / Nilüfer",
    description: "Klima bakım ve tesisat işleri. Aynı gün randevu imkanı.",
    photos: [ph1, ph3, ph2],
    phone: "+905554445566",
    whatsapp: "905554445566",
  },
];
