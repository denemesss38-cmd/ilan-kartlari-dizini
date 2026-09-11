# Akıcı ilan kartı ve tam ekran galeri

## Yapılacaklar
- Mevcut ilan kartlarındaki adım adım carousel’i, fotoğraf listesini iki kez yan yana kullanan kesintisiz yatay şeride dönüştürmek.
- Şeridi 25–30 saniyelik doğrusal sonsuz animasyonla akıtmak; kartın üzerine gelince veya dokununca durdurup ayrılınca devam ettirmek.
- Fotoğraf alanına koyu alt geçiş eklemek ve kart hover durumunda hafif yükselme ile turuncu/altın kenarlık ışıltısı uygulamak.
- Fotoğrafa veya kartın görsel alanına basıldığında açılan tam ekran galeri eklemek; önceki/sonraki, mobil kaydırma, kapatma, klavye ve erişilebilir etiketleri desteklemek.
- Sol üste yeşil, nabız animasyonlu “Aktif / Müsait” rozeti eklemek.
- Telefon ve WhatsApp bağlantılarının mevcut ilan verilerini kullanmasını ve galeri tıklamasıyla çakışmadan çalışmasını korumak.

## Teknik ayrıntılar
- Veritabanı, yönetim paneli, ilan alanları ve ayarlar değişmeyecek.
- Hareket azaltma tercihlerinde şerit ve nabız animasyonları duracak.
- Tek fotoğrafta gereksiz çoğaltma hissi azaltılacak; fotoğrafsız ilanlarda mevcut güvenli boş durum korunacak.
- Değişiklikler mevcut semantik renk sistemiyle `PhotoCarousel`, ilan kartı ve global stillerde yapılacak.

## Doğrulama
- 320px, 390px, 480px ve masaüstünde taşma, kart düzeni, animasyon ve tam ekran galeri kontrol edilecek.
- Telefon/WhatsApp bağlantıları, galeri okları, kaydırma, kapatma ve klavye davranışları test edilecek.
- Son derleme durumu ve tarayıcı hataları kontrol edilecek.
