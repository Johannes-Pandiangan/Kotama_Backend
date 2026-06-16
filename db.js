const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barang_gudang (id SERIAL PRIMARY KEY, nama VARCHAR(150), kategori VARCHAR(50), type VARCHAR(50), stok INT, satuan VARCHAR(20), status VARCHAR(20));
      CREATE TABLE IF NOT EXISTS barang_jadi (id SERIAL PRIMARY KEY, kode_barang VARCHAR(50), nama VARCHAR(150), ukuran INT, stok INT, status VARCHAR(20));
      CREATE TABLE IF NOT EXISTS riwayat_gudang (id SERIAL PRIMARY KEY, nama VARCHAR(150), kategori VARCHAR(50), type VARCHAR(50), aktivitas VARCHAR(20), jumlah INT, pengambil VARCHAR(100), tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS riwayat_barang_jadi (id SERIAL PRIMARY KEY, kode_barang VARCHAR(50), nama VARCHAR(150), ukuran INT, aktivitas VARCHAR(20), jumlah INT, tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      
      -- TABEL BARU: DATA PENGRAJIN
      CREATE TABLE IF NOT EXISTS pengrajin (
        id SERIAL PRIMARY KEY, 
        nama VARCHAR(150) NOT NULL UNIQUE, 
        tanggal_bergabung TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database Neon.tech terhubung & Semua Tabel Siap!");
  } catch (err) {
    console.error("❌ GAGAL MEMBUAT TABEL. ALASAN:", err.message);
  }
};

initDB();
module.exports = pool;