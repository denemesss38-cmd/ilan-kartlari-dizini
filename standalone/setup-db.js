/** Şemayı oluşturur ve örnek ilan yoksa iki tane ekler. */
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM listings");
  if (rows[0].c === 0) {
    // Kutudan çıktığı gibi dolu görünmesi için örnek fotoğraflarla üç ilan.
    const samples = [
      "/static/samples/placeholder-1.jpg",
      "/static/samples/placeholder-2.jpg",
      "/static/samples/placeholder-3.jpg",
    ];
    const demo = [
      ["Ayşe Y.", "Profesyonel özel ders ve etüt desteği.", "Diyarbakır / Bağlar", "905551112233", "VIP", "Kendi yeri var"],
      ["Mehmet K.", "Ev ve ofis taşıma, montaj hizmeti.", "Diyarbakır / Kayapınar", "905551112244", null, "Apart"],
      ["Zeynep D.", "Kurumsal fotoğraf ve ürün çekimi.", "Diyarbakır / Sur", "905551112255", "YENİ", "Otel"],
    ];
    for (let i = 0; i < demo.length; i += 1) {
      const [name, description, location, phone, badge, venue] = demo[i];
      await pool.query(
        `INSERT INTO listings (name, description, location, phone, whatsapp, badge, venue, photos, sort_order)
         VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8)`,
        [name, description, location, phone, badge, venue, samples, i + 1],
      );
    }
    console.log("Örnek ilanlar eklendi.");
  }

  console.log("Veritabanı hazır.");
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
