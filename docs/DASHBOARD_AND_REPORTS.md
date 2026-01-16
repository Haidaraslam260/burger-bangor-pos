# Dokumentasi Dashboard, Inventori & Laporan

## 1. Dashboard (`/dashboard`)
Halaman utama setelah login. Menampilkan ringkasan cepat bisnis.

### Data Fetching (Server Side)
- **Total Penjualan Hari Ini**: Sum `totalAmount` dari transaksi hari ini.
- **Total Transaksi**: Count `id` transaksi hari ini.
- **Stok Menipis**: Count item `inventory` dengan `stockQuantity < 20`.

### UI Components
- **Stats Cards**: Menggunakan Lucide icons.
- **Quick Actions**: Link pintas berdasarkan role user (kasir ke POS, admin ke Produk, dll).

---

## 2. Inventori Manager (`/manager/inventory`)
Memantau stok bahan baku real-time.

### Data Fetching
- Mengambil data dari tabel `inventory` JOIN `ingredients`.
- Menggunakan logic Javascript untuk memfilter:
  - **Low Stock**: Stok < threshold tertentu (misal 20).
  - **Expiring**: Tanggal expired < 3 hari dari sekarang.

### Warning System
Banner peringatan otomatis muncul jika ada item yang low stock atau akan kadaluarsa, membantu manager mengambil keputusan restock cepat.

---

## 3. Laporan / Reports (`/manager/reports`)
Analisis performa penjualan.

### Data Aggregation
Sistem melakukan agregasi data transaksi real-time.
- **Omset Hari Ini**: SQL Sum query.
- **Total Revenue**: SQL Sum query (All time).
- **Rata-rata Order**: Total Revenue / Total Transactions.

### Top Products
Query untuk mencari produk terlaris:
```sql
SELECT product.name, SUM(item.quantity) as sold
FROM transaction_items
JOIN products ON ...
GROUP BY product.name
ORDER BY sold DESC
LIMIT 5
```

---

## 4. Activity Logs (`/manager/logs`)
Audit trail untuk keamanan dan tracking.

### Recorded Actions
- `CREATE`: Input data baru.
- `UPDATE`: Edit data.
- `DELETE`: Hapus data.
- `CHECKOUT`: Transaksi kasir.
- `RESTOCK`: Penambahan stok inventori.

### Display
Log ditampilkan dalam bentuk timeline vertikal, diurutkan dari yang terbaru (DESC), lengkap dengan nama user pelakunya dan detail perubahan.
