# Dokumentasi Fitur Resep (Recipes)

## 1. Overview
Fitur Resep menghubungkan **Produk** dengan **Bahan Baku**. Satu produk bisa terdiri dari banyak bahan dengan jumlah tertentu. Resep digunakan untuk **deduksi stok otomatis** saat terjadi transaksi.

## 2. Database Schema
### Tabel: `recipes`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial | Primary Key |
| `productId` | integer | Foreign Key ke `products` |
| `ingredientId` | integer | Foreign Key ke `ingredients` |
| `quantityNeeded` | decimal | Jumlah bahan yang dibutuhkan per 1 produk |

Contoh:
- Produk: Burger Jelata
- Resep:
  - 1 Pcs Roti Bun
  - 1 Pcs Patty Sapi
  - 10 Gram Saus

## 3. Server Actions & APIs
File referensi: `src/actions/recipes.ts`

### A. Upsert Recipe Item
Menambah atau mengubah jumlah bahan untuk sebuah produk.
- **Function**: `upsertRecipeItem`
- **Access**: Admin Only

**Request Parameters:**
- `productId`: ID Produk
- `ingredientId`: ID Bahan
- `quantityNeeded`: Jumlah pemakaian

**Logic:**
1. Cek apakah kombinasi `productId` dan `ingredientId` sudah ada.
2. Jika ada -> Update `quantityNeeded`.
3. Jika belum -> Insert row baru.

**Response:**
```json
{
  "success": true,
  "message": "Resep berhasil disimpan!"
}
```

### B. Delete Recipe Item
Menghapus satu bahan dari resep produk.
- **Function**: `deleteRecipeItem`
- **Input**: `recipeId`

### C. Get Recipes (Grouped)
Di halaman admin, resep ditampilkan dengan logika grouping:
1. Fetch semua produk.
2. Fetch semua resep JOIN ingredients.
3. Grouping array resep berdasarkan `productId` di Javascript/Typescript layer sebelum dirender.

## 4. Dampak pada Transaksi
Ketika kasir melakukan checkout produk X:
1. Sistem akan mencari semua resep untuk produk X.
2. Sistem mengurangi stok di tabel `inventory` sesuai `quantityNeeded` dikali jumlah pembelian.
