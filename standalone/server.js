require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { pool } = require("./db");
const { homePage, adminPage, loginPage } = require("./views");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const SITE_URL = process.env.SITE_URL || "";
const PORT = process.env.PORT || 3000;
const COOKIE = "ilan_admin";
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!ADMIN_PASSWORD || !SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error("ADMIN_PASSWORD ve 32+ karakterlik SESSION_SECRET .env içinde tanımlı olmalı.");
  process.exit(1);
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable("x-powered-by");
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(path.join(__dirname, "public"), { maxAge: "7d" }));
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d" }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || ".jpg").toLowerCase().slice(0, 5);
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

/* ---------------- oturum ---------------- */

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function makeToken() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 14);
  return `${exp}.${sign(exp)}`;
}

function isValidToken(token) {
  if (!token || !token.includes(".")) return false;
  const [exp, mac] = token.split(".");
  const expected = sign(exp);
  if (mac.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

function passwordMatches(input) {
  const a = crypto.createHash("sha256").update(String(input), "utf8").digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (isValidToken(req.cookies[COOKIE])) return next();
  return res.redirect("/admin/login");
}

/* ---------------- veri ---------------- */

async function getSettings() {
  const { rows } = await pool.query("SELECT key, value FROM site_settings");
  const out = {
    carousel_interval_seconds: "3",
    site_city: "DİYARBAKIR",
    site_title: "İLAN REHBERİ",
    site_subtitle: "Güncel ilanlar ve iletişim",
    site_name: "İlan Rehberi",
    promo_whatsapp: "905551112233",
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  };
  rows.forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

async function saveSetting(key, value) {
  await pool.query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, String(value ?? "")],
  );
}

const LISTING_COLUMNS =
  "id, name, description, location, phone, whatsapp, badge, venue, photos, sort_order, is_published";

/* ---------------- herkese açık ---------------- */

app.get("/", async (_req, res, next) => {
  try {
    const [settings, listings] = await Promise.all([
      getSettings(),
      pool.query(
        `SELECT ${LISTING_COLUMNS} FROM listings WHERE is_published = TRUE ORDER BY sort_order ASC, created_at DESC`,
      ),
    ]);
    res.type("html").send(homePage({ listings: listings.rows, settings, siteUrl: SITE_URL }));
  } catch (err) {
    next(err);
  }
});

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\n`);
});

/* ---------------- yönetim ---------------- */

app.get("/admin/login", (req, res) => {
  if (isValidToken(req.cookies[COOKIE])) return res.redirect("/admin");
  res.type("html").send(loginPage(req.query.hata ? "Şifre hatalı." : ""));
});

app.post("/admin/login", (req, res) => {
  if (!passwordMatches(req.body.password || "")) return res.redirect("/admin/login?hata=1");
  res.cookie(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
    maxAge: 1000 * 60 * 60 * 24 * 14,
    path: "/",
  });
  res.redirect("/admin");
});

app.get("/admin/logout", (_req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.redirect("/admin/login");
});

app.get("/admin", requireAdmin, async (_req, res, next) => {
  try {
    const [settings, listings] = await Promise.all([
      getSettings(),
      pool.query(`SELECT ${LISTING_COLUMNS} FROM listings ORDER BY sort_order ASC, created_at DESC`),
    ]);
    res.type("html").send(adminPage({ listings: listings.rows, settings }));
  } catch (err) {
    next(err);
  }
});

app.post("/admin/settings", requireAdmin, async (req, res, next) => {
  try {
    const keys = [
      "site_city",
      "site_title",
      "site_subtitle",
      "site_name",
      "promo_whatsapp",
      "seo_title",
      "seo_description",
      "seo_keywords",
    ];
    for (const k of keys) await saveSetting(k, req.body[k]);
    const secs = Math.min(30, Math.max(0, parseInt(req.body.carousel_interval_seconds, 10) || 0));
    await saveSetting("carousel_interval_seconds", String(secs));
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

app.post("/admin/listings", requireAdmin, upload.array("photos", 12), async (req, res, next) => {
  try {
    const newUrls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    const sortOrder = parseInt(req.body.sort_order, 10);
    await pool.query(
      `INSERT INTO listings (name, description, location, phone, whatsapp, badge, venue, photos, sort_order, is_published)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8::text[],
               COALESCE($9, (SELECT MAX(sort_order) + 1 FROM listings), 1), $10)`,
      [
        req.body.name,
        req.body.description || "",
        req.body.location || "",
        req.body.phone || "",
        req.body.whatsapp || "",
        req.body.badge || "",
        req.body.venue || "",
        newUrls,
        Number.isFinite(sortOrder) ? sortOrder : null,
        req.body.is_published === undefined ? true : Boolean(req.body.is_published),
      ],
    );
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});


app.post("/admin/listings/:id", requireAdmin, upload.array("photos", 12), async (req, res, next) => {
  try {
    const newUrls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    await pool.query(
      `UPDATE listings SET
         name = $1, description = $2, location = $3, phone = $4, whatsapp = $5,
         badge = NULLIF($6, ''), venue = NULLIF($7, ''),
         sort_order = $8, is_published = $9,
         photos = photos || $10::text[], updated_at = now()
       WHERE id = $11`,
      [
        req.body.name,
        req.body.description || "",
        req.body.location || "",
        req.body.phone || "",
        req.body.whatsapp || "",
        req.body.badge || "",
        req.body.venue || "",
        parseInt(req.body.sort_order, 10) || 0,
        Boolean(req.body.is_published),
        newUrls,
        req.params.id,
      ],
    );
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

/** Yayın durumunu tek dokunuşla açar/kapatır. */
app.get("/admin/listings/:id/toggle", requireAdmin, async (req, res, next) => {
  try {
    await pool.query("UPDATE listings SET is_published = NOT is_published, updated_at = now() WHERE id = $1", [
      req.params.id,
    ]);
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

/** İlanı bir üste veya bir alta taşır (komşusuyla sıra değiştirir). */
app.get("/admin/listings/:id/move", requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const dir = req.query.dir === "up" ? "up" : "down";
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT id, sort_order FROM listings ORDER BY sort_order ASC, created_at DESC",
    );
    const index = rows.findIndex((r) => String(r.id) === String(req.params.id));
    const target = dir === "up" ? index - 1 : index + 1;
    if (index !== -1 && target >= 0 && target < rows.length) {
      // Sıra numaraları eşit olabileceği için listeyi baştan yeniden numaralandırıyoruz.
      const ordered = rows.slice();
      const [moved] = ordered.splice(index, 1);
      ordered.splice(target, 0, moved);
      for (let i = 0; i < ordered.length; i += 1) {
        await client.query("UPDATE listings SET sort_order = $1, updated_at = now() WHERE id = $2", [
          i + 1,
          ordered[i].id,
        ]);
      }
    }
    await client.query("COMMIT");
    res.redirect("/admin");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

app.get("/admin/listings/:id/photo/delete", requireAdmin, async (req, res, next) => {
  try {
    const url = String(req.query.url || "");
    await pool.query("UPDATE listings SET photos = array_remove(photos, $1), updated_at = now() WHERE id = $2", [
      url,
      req.params.id,
    ]);
    if (url.startsWith("/uploads/")) {
      const file = path.join(UPLOAD_DIR, path.basename(url));
      fs.promises.unlink(file).catch(() => {});
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

/** Fotoğrafı sırada sola/sağa taşır veya kapak yapar. */
app.get("/admin/listings/:id/photo/move", requireAdmin, async (req, res, next) => {
  try {
    const url = String(req.query.url || "");
    const dir = String(req.query.dir || "left");
    const { rows } = await pool.query("SELECT photos FROM listings WHERE id = $1", [req.params.id]);
    const photos = rows[0]?.photos || [];
    const index = photos.indexOf(url);
    if (index !== -1) {
      const next = photos.slice();
      next.splice(index, 1);
      const target = dir === "cover" ? 0 : dir === "left" ? Math.max(0, index - 1) : Math.min(next.length, index + 1);
      next.splice(target, 0, url);
      await pool.query("UPDATE listings SET photos = $1::text[], updated_at = now() WHERE id = $2", [
        next,
        req.params.id,
      ]);
    }
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});


app.get("/admin/listings/:id/delete", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query("DELETE FROM listings WHERE id = $1 RETURNING photos", [req.params.id]);
    (rows[0]?.photos || []).forEach((url) => {
      if (url.startsWith("/uploads/")) {
        fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
      }
    });
    res.redirect("/admin");
  } catch (err) {
    next(err);
  }
});

app.use((_req, res) => res.status(404).type("html").send("<p>Sayfa bulunamadı.</p>"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).type("html").send("<p>Bir hata oluştu. Lütfen tekrar deneyin.</p>");
});

app.listen(PORT, () => console.log(`Sunucu çalışıyor: http://localhost:${PORT}`));
