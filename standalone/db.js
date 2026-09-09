require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL tanımlı değil. .env dosyasını doldurun.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Aynı sunucudaki PostgreSQL için SSL kapalıdır; uzak sunucu için DATABASE_SSL=true yapın.
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

module.exports = { pool };
