# Diyarbakır Rehberi

Mobil, tablet ve masaüstünde çalışan; ilanları, çoklu fotoğrafları ve iletişim bilgilerini tek sayfada gösteren Türkçe ilan rehberi. İlanlar ve site ayarları `/ragnar` yönetim panelinden yönetilir.

## Özellikler

- Yayın durumu ve sırası yönetilebilen ilanlar
- Kesintisiz kayan çoklu fotoğraf şeritleri
- İlana özel telefon, WhatsApp numarası ve hazır mesaj
- Düzenlenebilir yer etiketi: Apart, Otel, Ev, ikili seçenekler veya serbest metin
- Yönetim panelinden fotoğraf yükleme
- Yönetim panelinden SEO, WhatsApp, geçiş hızı ve sayfa altı metni ayarları
- Yönetici rolü ve satır bazlı erişim kurallarıyla korunan yönetim işlemleri

## Kod Düzenleme Haritası

| Düzenlenecek alan | Dosya / ayar |
| --- | --- |
| Header başlığı ve site adı | `src/data/listings.ts` içindeki `siteName` ve `src/routes/index.tsx` |
| Header sol logo harfleri (`DR`) | `src/routes/index.tsx` |
| Dikkat kutusu ve Bilgi Al metinleri | `src/data/listings.ts` içindeki `banner` ve `promos` |
| WhatsApp numarası ve varsayılan mesaj | `src/routes/index.tsx` ve `/ragnar` ayarları |
| SEO başlığı ve açıklaması | `src/routes/index.tsx` içindeki `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION`; yayınlanan değerler `/ragnar` panelinden değiştirilebilir |
| Renkler, gradyanlar ve ışıltılar | `src/styles.css` |
| Lovable Cloud bağlantısı | `.env` içindeki `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` |

> `.env` dosyasına yalnızca yayınlanabilir istemci anahtarını yazın. Yönetici veya gizli servis anahtarlarını kaynak koda, tarayıcıya ya da Git deposuna eklemeyin.

## Yerel Geliştirme

### Gereksinimler

- Node.js 20 veya 22 LTS
- npm 10 veya üzeri
- Çalışan Lovable Cloud projesi ve bağlantı değerleri

### Kurulum

```bash
git clone <depo-adresi>
cd <proje-klasörü>
npm install
```

Proje kökünde `.env` oluşturun:

```dotenv
VITE_SUPABASE_URL=https://<proje-adresi>
VITE_SUPABASE_PUBLISHABLE_KEY=<yayınlanabilir-anahtar>
```

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Üretim çıktısını kontrol edin:

```bash
npm run build
```

## VPS / VDS Kurulumu

Aşağıdaki örnek Ubuntu/Debian tabanlı bir sunucu içindir. Alan adının DNS kaydını önceden sunucunun IP adresine yönlendirin.

### 1. Node.js ve temel paketler

Node.js 20 veya 22 LTS kurun. Örnek olarak Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node --version
npm --version
```

### 2. Projeyi hazırlama

```bash
sudo mkdir -p /var/www/diyarbakir-rehberi
sudo chown -R "$USER":"$USER" /var/www/diyarbakir-rehberi
git clone <depo-adresi> /var/www/diyarbakir-rehberi
cd /var/www/diyarbakir-rehberi
npm install
```

Proje kökünde `.env` dosyasını oluşturup bağlantı değerlerini ekleyin:

```dotenv
VITE_SUPABASE_URL=https://<proje-adresi>
VITE_SUPABASE_PUBLISHABLE_KEY=<yayınlanabilir-anahtar>
```

Ardından üretim çıktısını oluşturun:

```bash
npm run build
```

### 3. PM2 ile çalıştırma

```bash
sudo npm install -g pm2
cd /var/www/diyarbakir-rehberi
PORT=3000 pm2 start .output/server/index.mjs --name diyabakir-rehberi
pm2 save
pm2 startup
```

`pm2 startup` komutunun ekranda verdiği `sudo ...` komutunu bir kez çalıştırın. Durumu kontrol etmek için:

```bash
pm2 status
pm2 logs diyabakir-rehberi
```

Yeni sürüm yüklediğinizde:

```bash
cd /var/www/diyarbakir-rehberi
git pull
npm install
npm run build
pm2 restart diyabakir-rehberi --update-env
```

### 4. Nginx reverse proxy

`/etc/nginx/sites-available/diyarbakir-rehberi` dosyasını oluşturun:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name alanadiniz.com www.alanadiniz.com;

    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Yapılandırmayı etkinleştirin:

```bash
sudo ln -s /etc/nginx/sites-available/diyarbakir-rehberi /etc/nginx/sites-enabled/diyarbakir-rehberi
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Let's Encrypt SSL

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alanadiniz.com -d www.alanadiniz.com
sudo certbot renew --dry-run
```

## Plesk Panel Kurulumu

1. **Node.js desteğini açın:** Plesk'te alan adını seçip **Node.js** bölümüne girin ve Node.js 20/22 sürümünü etkinleştirin.
2. **Dosyaları yükleyin:** Proje dosyalarını alan adının uygulama klasörüne aktarın veya Git üzerinden çekin.
3. **Ortam değişkenlerini ekleyin:** Node.js ekranındaki ortam değişkenlerine `VITE_SUPABASE_URL` ve `VITE_SUPABASE_PUBLISHABLE_KEY` değerlerini girin.
4. **Bağımlılıkları kurun:** Plesk'teki **NPM Install** işlemini çalıştırın.
5. **Üretim çıktısını oluşturun:** Plesk terminalinde proje klasöründe `npm run build` çalıştırın.
6. **Document Root:** `.output/public` olarak ayarlayın.
7. **Application Startup File:** `.output/server/index.mjs` olarak ayarlayın.
8. **Application Mode:** `production` seçin; `PORT` değerini Plesk'in sağladığı biçimde bırakın.
9. **Uygulamayı yeniden başlatın:** **Restart App** düğmesini kullanın.
10. **SSL'i açın:** Plesk **SSL/TLS Certificates** bölümünden Let's Encrypt sertifikasını alan adına tanımlayın ve HTTP'den HTTPS'e yönlendirmeyi etkinleştirin.

Plesk sürümüne göre alan adlarının adı küçük farklılık gösterebilir. Sunucu başlangıç dosyasını çalıştıramıyorsa Node.js sürümünün 20 veya 22 ve uygulama modunun üretim olduğundan emin olun.

## Yönetim

- Yönetim paneli: `/ragnar`
- Yeni ilan ekleme, düzenleme, sıralama, yayınlama ve fotoğraf yükleme panelden yapılır.
- Yeni fotoğraflar yüklendikten sonra **Kaydet** düğmesine basılmalıdır.
- SEO ve paylaşım açıklamaları paneldeki SEO ayarlarından yönetilir.
- Açık kullanıcı kaydı yoktur; yönetim erişimi yalnızca yetkili yönetici hesabına verilir.

## Sorun Giderme

- **Boş sayfa veya 500 hatası:** `pm2 logs diyabakir-rehberi` çıktısını ve `.env` değerlerini kontrol edin.
- **Fotoğraf görünmüyor:** Depolama alanı erişim kurallarını, dosya yolunu ve tarayıcı ağ isteklerini kontrol edin.
- **Yönetim paneli açılmıyor:** Hesabın yönetici rolüne sahip olduğundan ve oturumun açık olduğundan emin olun.
- **Yeni sürüm görünmüyor:** Yeniden `npm run build` çalıştırıp PM2 uygulamasını `--update-env` ile yeniden başlatın.
- **Nginx hatası:** Önce `sudo nginx -t`, ardından `sudo systemctl reload nginx` çalıştırın.
## Canlı İstatistik (VPS'te de aynen çalışır)

- Sayaçlar `track_listing_event` veritabanı fonksiyonuyla hem toplam (`listing_stats`) hem günlük (`listing_daily_stats`, Türkiye saati) olarak kaydedilir.
- `/ragnar` → **İstatistik** sekmesinde bu haftanın günlük notları görünür; 7 gün dolunca köşeye "1. Hafta", "2. Hafta" rapor düğmeleri eklenir, tıklayınca haftalık rapor açılır.
- Veriler buluttaki veritabanında tutulduğu için VPS'te yalnızca `.env` değerlerini girmeniz yeterlidir; ek sunucu ayarı gerekmez.
- Rehber kutularının fotoğrafları `/ragnar` → **SEO & Bölgeler** → ilgili kutu → **Fotoğraf seç** ile yüklenir, ardından **Kaydet**.
