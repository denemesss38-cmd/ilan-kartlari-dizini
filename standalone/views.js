/** Sunucu tarafı HTML şablonları (bağımlılık yok). */

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let d = digits.startsWith("0") ? digits.slice(1) : digits;
  if (d.length === 10) d = `90${d}`;
  if (d.length === 12 && d.startsWith("90")) {
    return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  }
  return raw || "";
}

function layout({ title, description, keywords, canonical, body, admin }) {
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${keywords ? `<meta name="keywords" content="${esc(keywords)}" />` : ""}
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
${canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : ""}
${admin ? '<meta name="robots" content="noindex,nofollow" />' : ""}
<link rel="stylesheet" href="/static/styles.css" />
</head>
<body>
${body}
<script src="/static/app.js" defer></script>
</body>
</html>`;
}

function icon(name) {
  const paths = {
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.36 1.78.7 2.62a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.46-1.27a2 2 0 0 1 2.11-.45c.84.34 1.72.57 2.62.7A2 2 0 0 1 22 16.92z"/>',
    whatsapp:
      '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    check: '<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

function carousel(photos, alt, intervalSeconds) {
  const list = (photos || []).filter(Boolean);
  if (list.length === 0) {
    return `<div class="gallery empty"><span>Fotoğraf yok</span></div>`;
  }
  const slots = [0, 1, 2]
    .map(
      (i) =>
        `<div class="slot"><img src="${esc(list[i % list.length])}" alt="${esc(alt)} fotoğraf ${i + 1}" loading="lazy" draggable="false" /></div>`,
    )
    .join("");
  const multi = list.length > 1;
  const dots = multi
    ? `<div class="dots">${list
        .map(
          (_, i) =>
            `<button type="button" data-dot="${i}" aria-current="${i === 0}" aria-label="${i + 1}. fotoğraf grubunu göster"></button>`,
        )
        .join("")}</div>`
    : "";
  const nav = multi
    ? '<button class="nav prev" type="button" aria-label="Önceki fotoğraf">‹</button><button class="nav next" type="button" aria-label="Sonraki fotoğraf">›</button>'
    : "";
  return `<div class="gallery" data-photos="${esc(JSON.stringify(list))}" data-interval="${Number(intervalSeconds) || 0}">${slots}${nav}${dots}</div>`;
}

function listingCard(item, intervalSeconds) {
  return `<article class="card">
  <div class="card-media">
    ${carousel(item.photos, item.name, intervalSeconds)}
    <div class="badges">
      <span class="badge"><i class="i">${icon("check")}</i>Onaylı ilan</span>
      ${item.venue ? `<span class="badge"><i class="i">${icon("home")}</i>${esc(item.venue)}</span>` : ""}
    </div>
  </div>
  <div class="card-body">
    <div class="card-row">
      <div class="card-info">
        <h2>${esc(item.name)}</h2>
        <div class="chips">
          ${item.location ? `<span class="chip"><i class="i">${icon("pin")}</i>${esc(item.location)}</span>` : ""}
          ${item.badge ? `<span class="chip accent">${esc(item.badge)}</span>` : ""}
        </div>
        ${item.description ? `<p class="desc">${esc(item.description)}</p>` : ""}
      </div>
      <div class="actions">
        <a class="act alt" href="https://wa.me/${esc(item.whatsapp)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.name)} WhatsApp"><i class="i">${icon("whatsapp")}</i></a>
        <a class="act" href="tel:${esc(item.phone)}" aria-label="${esc(item.name)} ara"><i class="i">${icon("phone")}</i></a>
      </div>
    </div>
    <a class="phone" href="tel:${esc(item.phone)}"><i class="i">${icon("phone")}</i><span>${esc(formatPhone(item.phone))}</span></a>
  </div>
</article>`;
}

function homePage({ listings, settings, siteUrl }) {
  const wa = settings.promo_whatsapp || "905551112233";
  const interval = Number(settings.carousel_interval_seconds || 3);
  const title = settings.seo_title || `${settings.site_city} ${settings.site_title} — Güncel İlanlar`;
  const description =
    settings.seo_description ||
    "Güncel ilanları inceleyin, telefon veya WhatsApp üzerinden tek dokunuşla iletişime geçin.";

  const body = `<main class="wrap">
  <header class="hero">
    <h1>${esc(settings.site_city)}</h1>
    <p class="kicker">${esc(settings.site_title)}</p>
    <p class="sub">${esc(settings.site_subtitle)}</p>
  </header>

  <div class="promos">
    <a class="promo primary" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer">
      <h2>İLANINIZI ÖNE ÇIKARIN</h2>
      <p>Vitrinin en üstünde yayınlanmak için hemen yazın.</p>
      <span class="pill">Reklam ver</span>
    </a>
  </div>

  ${
    listings.length === 0
      ? `<p class="empty-note">Şu anda yayınlanmış ilan bulunmuyor.</p>`
      : `<div class="list">${listings.map((l) => listingCard(l, interval)).join("")}</div>`
  }

  <a class="promo alt wide" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener noreferrer">
    <h2>GÜVENLİ İLETİŞİM</h2>
    <p>Tüm görüşmeleri telefon veya WhatsApp üzerinden yapın.</p>
    <span class="pill">Bilgi al</span>
  </a>

  <footer class="foot">
    <p>Bu site yalnızca ilan yayınlar; hizmet sunmaz ve aracılık yapmaz.</p>
    <p class="copy">© ${new Date().getFullYear()} ${esc(settings.site_name)}. Tüm hakları saklıdır.</p>
  </footer>
</main>`;

  return layout({
    title,
    description,
    keywords: settings.seo_keywords,
    canonical: siteUrl ? `${siteUrl.replace(/\/$/, "")}/` : "",
    body,
  });
}

function loginPage(error) {
  return layout({
    title: "Yönetim Girişi",
    description: "Yönetim paneli girişi",
    admin: true,
    body: `<main class="wrap narrow">
  <h1 class="page-title">Yönetim Girişi</h1>
  ${error ? `<p class="error">${esc(error)}</p>` : ""}
  <form method="post" action="/admin/login" class="panel">
    <label>Yönetici şifresi
      <input type="password" name="password" autocomplete="current-password" required />
    </label>
    <button class="btn" type="submit">Giriş yap</button>
  </form>
</main>`,
  });
}

function adminPage({ listings, settings }) {
  const row = (l) => `<form class="panel listing" method="post" action="/admin/listings/${l.id}" enctype="multipart/form-data">
  <div class="grid2">
    <label>İlan adı<input name="name" value="${esc(l.name)}" required /></label>
    <label>Konum<input name="location" value="${esc(l.location)}" /></label>
    <label>Telefon<input name="phone" value="${esc(l.phone)}" /></label>
    <label>WhatsApp<input name="whatsapp" value="${esc(l.whatsapp)}" /></label>
    <label>Rozet (örn. VIP)<input name="badge" value="${esc(l.badge || "")}" /></label>
    <label>Görüşme yeri
      <select name="venue">
        ${["", "Kendi yeri var", "Apart", "Otel", "Ev", "Rezidans"]
          .map(
            (v) =>
              `<option value="${esc(v)}"${(l.venue || "") === v ? " selected" : ""}>${v === "" ? "Belirtilmedi" : esc(v)}</option>`,
          )
          .join("")}
      </select>
    </label>
    <label>Sıra<input type="number" name="sort_order" value="${Number(l.sort_order)}" /></label>
    <label class="check">Yayında
      <input type="checkbox" name="is_published"${l.is_published ? " checked" : ""} />
    </label>
  </div>
  <label>Kısa açıklama<textarea name="description" rows="2">${esc(l.description)}</textarea></label>
  <div class="thumbs">
    ${(l.photos || [])
      .map(
        (p) =>
          `<span class="thumb"><img src="${esc(p)}" alt="" /><a href="/admin/listings/${l.id}/photo/delete?url=${encodeURIComponent(p)}" title="Kaldır">×</a></span>`,
      )
      .join("")}
  </div>
  <label>Fotoğraf ekle (birden çok seçebilirsiniz)<input type="file" name="photos" accept="image/*" multiple /></label>
  <div class="row">
    <button class="btn" type="submit">Kaydet</button>
    <a class="btn ghost" href="/admin/listings/${l.id}/delete" onclick="return confirm('İlan silinsin mi?')">Sil</a>
  </div>
</form>`;

  return layout({
    title: "Yönetim Paneli",
    description: "İlan yönetimi",
    admin: true,
    body: `<main class="wrap">
  <div class="admin-head">
    <h1 class="page-title">Yönetim Paneli</h1>
    <a class="btn ghost" href="/admin/logout">Çıkış</a>
  </div>

  <form class="panel" method="post" action="/admin/settings">
    <h2>Site ayarları</h2>
    <div class="grid2">
      <label>Şehir<input name="site_city" value="${esc(settings.site_city)}" /></label>
      <label>Başlık<input name="site_title" value="${esc(settings.site_title)}" /></label>
      <label>Alt başlık<input name="site_subtitle" value="${esc(settings.site_subtitle)}" /></label>
      <label>Site adı<input name="site_name" value="${esc(settings.site_name)}" /></label>
      <label>Reklam WhatsApp<input name="promo_whatsapp" value="${esc(settings.promo_whatsapp)}" /></label>
      <label>Galeri hızı (saniye, 0 = kapalı)<input type="number" min="0" max="30" name="carousel_interval_seconds" value="${esc(settings.carousel_interval_seconds)}" /></label>
      <label>SEO başlığı<input name="seo_title" value="${esc(settings.seo_title)}" /></label>
      <label>SEO anahtar kelimeler<input name="seo_keywords" value="${esc(settings.seo_keywords)}" /></label>
    </div>
    <label>SEO açıklaması<textarea name="seo_description" rows="2">${esc(settings.seo_description)}</textarea></label>
    <button class="btn" type="submit">Ayarları kaydet</button>
  </form>

  <form class="panel" method="post" action="/admin/listings">
    <h2>Yeni ilan ekle</h2>
    <div class="grid2">
      <label>İlan adı<input name="name" required /></label>
      <label>Konum<input name="location" /></label>
      <label>Telefon<input name="phone" /></label>
      <label>WhatsApp<input name="whatsapp" /></label>
    </div>
    <button class="btn" type="submit">Ekle</button>
  </form>

  <h2 class="page-title">İlanlar (${listings.length})</h2>
  ${listings.map(row).join("")}
</main>`,
  });
}

module.exports = { homePage, adminPage, loginPage, esc };
