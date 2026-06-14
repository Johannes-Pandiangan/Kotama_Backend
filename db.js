const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Fungsi untuk membuat tabel otomatis
const initDatabase = async () => {
  try {
    const queryText = `
      -- Tabel Data Gudang (Material)
      CREATE TABLE IF NOT EXISTS barang_gudang (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        kategori VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        stok INT DEFAULT 0,
        satuan VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL
      );

      -- Tabel Data Barang Jadi (Sepatu)
      CREATE TABLE IF NOT EXISTS barang_jadi (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        ukuran INT NOT NULL,
        stok INT DEFAULT 0,
        status VARCHAR(20) NOT NULL
      );

      -- Tabel Riwayat Log Gudang
      CREATE TABLE IF NOT EXISTS riwayat_gudang (
        id SERIAL PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        kategori VARCHAR(50),
        type VARCHAR(50),
        aktivitas VARCHAR(20) NOT NULL,
        jumlah INT NOT NULL,
        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(queryText);
    console.log("✅ Semua tabel database berhasil divalidasi/dibuat.");
  } catch (error) {
    console.error("❌ Gagal membuat tabel:", error.message);
  }
};

// Jalankan pembuatan tabel saat file dipanggil
initDatabase();

module.exports = pool;