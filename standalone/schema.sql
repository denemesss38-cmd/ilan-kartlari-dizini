-- Tamamen bağımsız kurulum için veritabanı şeması (PostgreSQL)

CREATE TABLE IF NOT EXISTS listings (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  location      TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  whatsapp      TEXT NOT NULL DEFAULT '',
  badge         TEXT,
  venue         TEXT,
  photos        TEXT[] NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_order_idx ON listings (sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES
  ('carousel_interval_seconds', '3'),
  ('site_city', 'DİYARBAKIR'),
  ('site_title', 'İLAN REHBERİ'),
  ('site_subtitle', 'Güncel ilanlar ve iletişim'),
  ('site_name', 'Diyarbakır İlan Rehberi'),
  ('promo_whatsapp', '905551112233'),
  ('seo_title', ''),
  ('seo_description', ''),
  ('seo_keywords', '')
ON CONFLICT (key) DO NOTHING;
