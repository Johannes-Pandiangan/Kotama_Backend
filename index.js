const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const getStatusGudang = (stok) => (stok === 0 ? "Habis" : stok < 20 ? "Menipis" : "Aman");
const getStatusBarangJadi = (stok) => (stok === 0 ? "Habis" : stok <= 10 ? "Menipis" : "Aman");

// ==========================================
// API DATA PENGRAJIN
// ==========================================
app.get("/api/pengrajin", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pengrajin ORDER BY nama ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pengrajin", async (req, res) => {
  const { nama } = req.body;
  try {
    const result = await pool.query("INSERT INTO pengrajin (nama) VALUES ($1) RETURNING *", [nama]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Nama pengrajin sudah ada atau terjadi kesalahan." });
  }
});

app.delete("/api/pengrajin/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM pengrajin WHERE id=$1", [req.params.id]);
    res.json({ message: "Pengrajin berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API DATA GUDANG (MATERIAL)
// ==========================================
app.get("/api/gudang", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM barang_gudang ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gudang", async (req, res) => {
  const { nama, kategori, type, stok, satuan } = req.body;
  const status = getStatusGudang(stok);
  try {
    // 1. Simpan barang baru
    const result = await pool.query(
      "INSERT INTO barang_gudang (nama, kategori, type, stok, satuan, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [nama, kategori, type, stok, satuan, status]
    );

    // 2. Catat ke riwayat sebagai "stok awal"
    await pool.query(
      "INSERT INTO riwayat_gudang (nama, kategori, type, aktivitas, jumlah, pengambil, tanggal) VALUES ($1, $2, $3, 'stok awal', $4, 'Admin', CURRENT_TIMESTAMP)",
      [nama, kategori, type, stok]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/gudang/:id", async (req, res) => {
  const { id } = req.params;
  const { nama, kategori, type, stok, satuan } = req.body;
  const status = getStatusGudang(stok);
  try {
    await pool.query(
      "UPDATE barang_gudang SET nama=$1, kategori=$2, type=$3, stok=$4, satuan=$5, status=$6 WHERE id=$7",
      [nama, kategori, type, stok, satuan, status, id]
    );
    res.json({ message: "Barang berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/gudang/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM barang_gudang WHERE id=$1", [req.params.id]);
    res.json({ message: "Barang berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/gudang/stok/:id", async (req, res) => {
  const { id } = req.params;
  const { delta, pergerakan, pengambil } = req.body; 
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); 
    const itemRes = await client.query("SELECT * FROM barang_gudang WHERE id = $1", [id]);
    if (itemRes.rows.length === 0) throw new Error("Barang tidak ditemukan");
    const item = itemRes.rows[0];

    // Gunakan Number() agar hitungan desimal (koma) aman dan tidak menjadi string
    let currentStok = Number(item.stok);
    let updateDelta = Number(delta);
    let newStok = pergerakan === "masuk" ? currentStok + updateDelta : currentStok - updateDelta;
    
    if (newStok < 0) return res.status(400).json({ error: "Gagal: Jumlah pengeluaran melebihi stok yang tersedia!" });
    
    const newStatus = getStatusGudang(newStok);
    await client.query("UPDATE barang_gudang SET stok = $1, status = $2 WHERE id = $3", [newStok, newStatus, id]);

    const namaPengambil = pergerakan === "masuk" ? "Admin" : pengambil;
    
    await client.query(
      "INSERT INTO riwayat_gudang (nama, kategori, type, aktivitas, jumlah, pengambil, tanggal) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)",
      [item.nama, item.kategori, item.type, pergerakan, delta, namaPengambil]
    );

    await client.query("COMMIT");
    res.json({ message: "Stok berhasil diupdate dan riwayat tercatat!" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// API DATA BARANG JADI (SEPATU)
// ==========================================

app.get("/api/barang-jadi", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM barang_jadi ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/barang-jadi", async (req, res) => {
  const { kode_barang, nama, ukuran, stok } = req.body; 
  const status = getStatusBarangJadi(stok);
  try {
    // 1. Simpan barang jadi baru
    const result = await pool.query(
      "INSERT INTO barang_jadi (kode_barang, nama, ukuran, stok, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [kode_barang, nama, ukuran, stok, status]
    );

    // 2. Catat ke riwayat sebagai "stok awal"
    await pool.query(
      "INSERT INTO riwayat_barang_jadi (kode_barang, nama, ukuran, aktivitas, jumlah, tanggal) VALUES ($1, $2, $3, 'stok awal', $4, CURRENT_TIMESTAMP)",
      [kode_barang, nama, ukuran, stok]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/barang-jadi/:id", async (req, res) => {
  const { kode_barang, nama, ukuran, stok } = req.body;
  const status = getStatusBarangJadi(stok);
  try {
    await pool.query(
      "UPDATE barang_jadi SET kode_barang=$1, nama=$2, ukuran=$3, stok=$4, status=$5 WHERE id=$6",
      [kode_barang, nama, ukuran, stok, status, req.params.id]
    );
    res.json({ message: "Sepatu berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/barang-jadi/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM barang_jadi WHERE id=$1", [req.params.id]);
    res.json({ message: "Sepatu berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/barang-jadi/stok/:id", async (req, res) => {
  const { delta, pergerakan } = req.body;
  try {
    const itemRes = await pool.query("SELECT * FROM barang_jadi WHERE id = $1", [req.params.id]);
    const item = itemRes.rows[0];

    // Gunakan Number() agar hitungan aman
    let currentStok = Number(item.stok);
    let updateDelta = Number(delta);
    let newStok = pergerakan === "masuk" ? currentStok + updateDelta : currentStok - updateDelta;
    
    if (newStok < 0) return res.status(400).json({ error: "Gagal: Jumlah pengeluaran melebihi stok sepatu saat ini!" });
    
    await pool.query("UPDATE barang_jadi SET stok=$1, status=$2 WHERE id=$3", [newStok, getStatusBarangJadi(newStok), req.params.id]);
    
    await pool.query(
      "INSERT INTO riwayat_barang_jadi (kode_barang, nama, ukuran, aktivitas, jumlah, tanggal) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)",
      [item.kode_barang, item.nama, item.ukuran, pergerakan, delta]
    );

    res.json({ message: "Stok sepatu berhasil diupdate dan dicatat ke riwayat" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API RIWAYAT GUDANG & BARANG JADI
// ==========================================

app.get("/api/riwayat", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM riwayat_gudang ORDER BY tanggal DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/riwayat-sepatu", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM riwayat_barang_jadi ORDER BY tanggal DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RUTE HALAMAN DEPAN
// ==========================================
app.get("/", (req, res) => {
  res.send("🚀 Server Backend Kotama Warehouse Berjalan Normal dan Siap Menerima Data!");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});