# Dokumentasi Fitur Inventori (Model Sederhana)

## 1. Overview
Sistem inventori menggunakan model **1:1** antara Ingredients dan Inventory untuk kemudahan pengelolaan stok.

## 2. Hubungan Data

### **Ingredients (Bahan Baku) = Master Data**
- Mendefinisikan nama dan satuan bahan.
- Dikelola oleh **Admin** di `/admin/ingredients`.

### **Inventory (Stok) = Data Stok**
- **Otomatis dibuat** saat ingredient baru ditambahkan (stok awal: 0).
- Dikelola oleh **Manager** di `/manager/inventory`.
- **Relasi 1:1**: Setiap ingredient memiliki tepat 1 entri inventory.

```
┌─────────────────┐         ┌─────────────────┐
│   INGREDIENTS   │  1 : 1  │    INVENTORY    │
├─────────────────┤ ──────► ├─────────────────┤
│ id              │         │ id              │
│ name            │         │ ingredientId    │
│ unit            │         │ stockQuantity   │
└─────────────────┘         └─────────────────┘
```

## 3. Alur Kerja

### A. Admin Menambah Bahan Baru
1. Admin masuk ke `/admin/ingredients`.
2. Klik "Tambah Bahan", isi nama dan satuan.
3. Sistem **otomatis** membuat entri inventory dengan stok = 0.

### B. Manager Mengelola Stok
1. Manager masuk ke `/manager/inventory`.
2. Setiap kartu bahan menampilkan stok saat ini.
3. **Edit langsung**: Klik icon pensil → ubah angka → simpan.
4. **Tambah stok**: Klik "Tambah Stok" → input jumlah → simpan.

## 4. Server Actions

### A. Update Stock (Direct Edit)
Mengubah jumlah stok secara langsung.
- **Function**: `updateStock(inventoryId, newQuantity)`
- **Access**: Admin, Manager

**Contoh**: Stok Burger Bun diubah dari 100 → 150.

### B. Add Stock (Increment)
Menambahkan sejumlah stok ke jumlah saat ini.
- **Function**: `addStock(inventoryId, addQuantity)`
- **Access**: Admin, Manager

**Contoh**: Stok Burger Bun + 50 → Total jadi 150.

## 5. Deduksi Stok Saat Transaksi
Ketika kasir checkout produk:
1. Sistem membaca resep produk.
2. Untuk setiap bahan di resep, stok di inventory dikurangi.
3. Jika stok < yang dibutuhkan → **Transaksi GAGAL**.

## 6. Fitur UI
- **Low Stock Warning**: Banner merah jika stok < threshold (default: 50).
- **Inline Edit**: Ubah stok langsung tanpa dialog.
- **Quick Restock**: Tombol cepat untuk menambah stok.
