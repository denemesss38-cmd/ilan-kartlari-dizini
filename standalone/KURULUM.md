# Tamamen Bağımsız Kurulum (Plesk / cPanel / VPS)

Bu klasör **hiçbir dış servise bağlı değildir**. Veriler kendi sunucunuzdaki
PostgreSQL veritabanında, fotoğraflar kendi sunucunuzdaki `uploads` klasöründe
tutulur. Yönetim paneline **tek bir yönetici şifresi** ile girilir.

## 1. Veritabanı oluştur

Plesk → Databases → Add Database → tür olarak **PostgreSQL** seçin.
Kullanıcı adı, şifre ve veritabanı adını not alın.

## 2. Dosyaları yükle

Bu klasörün içeriğini domaininizin klasörüne (örn. `httpdocs/ilan`) yükleyin.

## 3. Ayar dosyasını hazırla

`.env.example` dosyasını `.env` olarak kopyalayın ve doldurun:

```
DATABASE_URL=postgres://kullanici:sifre@localhost:5432/veritabani_adi
ADMIN_PASSWORD=panele-gireceginiz-sifre
SESSION_SECRET=32-karakterden-uzun-rastgele-metin
SITE_URL=https://alanadiniz.com
```

Plesk'te Node.js uygulaması kurarken bu değerleri
**Custom environment variables** bölümüne de girebilirsiniz.

## 4. Node.js uygulaması olarak çalıştır

Plesk → Node.js → Enable Node.js:

- **Application root:** bu klasör
- **Application startup file:** `server.js`
- **NPM install** düğmesine basın
- Sonra `npm run setup` komutunu çalıştırın (tabloları oluşturur)
- **Restart App**

Terminal erişiminiz varsa aynısı:

```bash
npm install
npm run setup
npm start
```

## 5. Kullanım

- Site: `https://alanadiniz.com/`
- Yönetim paneli: `https://alanadiniz.com/admin` (şifre: `.env` içindeki `ADMIN_PASSWORD`)

Panelden ilan ekleyip; isim, açıklama, konum, telefon, WhatsApp, görüşme yeri,
rozet, sıra, yayın durumu ve fotoğrafları yönetebilirsiniz. Her ilanda **3
fotoğraf** yan yana gösterilir; 3'ten fazla yüklerseniz otomatik olarak döner.

## 6. Şifreyi değiştirme

`.env` içindeki `ADMIN_PASSWORD` değerini değiştirip uygulamayı yeniden
başlatın. Şifre veritabanında tutulmaz.

## 7. Yedekleme

- Veritabanı: `pg_dump` ile
- Fotoğraflar: `uploads` klasörünü kopyalayın

## Notlar

- Node.js 18 veya üstü gerekir.
- Fotoğraf başına 8 MB, tek seferde 12 dosya sınırı vardır (`server.js` içinde değiştirilebilir).
- Panel arama motorlarına kapalıdır (`noindex`).
