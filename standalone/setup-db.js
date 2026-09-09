/** Şemayı oluşturur ve örnek ilan yoksa iki tane ekler. */
const fs = require("fs");
const path = require("path");
const { pool } = require("./db");

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM listings");
  if (rows[0].c === 0) {
    await pool.query(
      `INSERT INTO listings (name, description, location, phone, whatsapp, badge, venue, sort_order)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,1),
        ($8,$9,$10,$11,$12,$13,$14,2)`,
      [
        "Örnek İlan 1",
        "Kısa açıklama buraya. Panelden düzenleyebilirsiniz.",
        "Bağlar",
        "905551112233",
        "905551112233",
        "VIP",
        "Kendi yeri var",
        "Örnek İlan 2",
        "İkinci örnek ilan açıklaması.",
        "Kayapınar",
        "905551112244",
        "905551112244",
        null,
        "Apart",
      ],
    );
    console.log("Örnek ilanlar eklendi.");
  }

  console.log("Veritabanı hazır.");
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
