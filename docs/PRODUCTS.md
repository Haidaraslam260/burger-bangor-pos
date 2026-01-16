# Dokumentasi Fitur Manajemen Produk

## 1. Overview
Fitur ini memungkinkan Admin untuk mengelola daftar menu/produk yang dijual. Produk dapat memiliki kategori (Burger, Minuman, Snack) dan status aktif/nonaktif.

## 2. Database Schema
### Tabel: `products`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial | Primary Key (Auto Increment) |
| `name` | varchar | Nama produk |
| `description` | text | Deskripsi opsional |
| `price` | decimal | Harga jual |
| `category` | varchar | Kategori produk |
| `imageUrl` | varchar | URL gambar (opsional) |
| `isActive` | integer | 1 = Aktif, 0 = Nonaktif |

## 3. Server Actions & APIs
File referensi: `src/actions/products.ts`

### A. Create Product
Menambahkan produk baru ke database.
- **Function**: `createProduct`
- **Access**: Admin Only

**Request Body (FormData):**
| Key | Tipe | Wajib | Keterangan |
|-----|------|-------|------------|
| `name` | string | Ya | Nama produk |
| `category` | string | Ya | Pilihan dari list kategori |
| `price` | number | Ya | Harga dalam rupiah |
| `description` | string | Tidak | Keterangan produk |
| `isActive` | boolean | Ya | Default true |

**Response (Success):**
```json
{
  "success": true,
  "message": "Produk berhasil ditambahkan!",
  "data": { ...productObject }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Pesan error validasi"
}
```

### B. Read Products (Data Fetching)
Mengambil daftar produk.
- **Method**: Server Component Data Fetching (`db.select()...`)
- **Query**:
```sql
SELECT * FROM products ORDER BY category, name;
```

### C. Update Product
Mengupdate informasi produk.
- **Function**: `updateProduct`
- **Access**: Admin Only

**Request Body (FormData):**
Sama dengan Create Product.

### D. Delete Product
Menghapus produk selamanya.
- **Function**: `deleteProduct`
- **Access**: Admin Only
- **Input**: `productId` (number)

**Response:**
```json
{
  "success": true,
  "message": "Produk berhasil dihapus!"
}
```

### E. Toggle Status
Mengubah status aktif/nonaktif produk agar muncul/hilang di POS tanpa menghapus data.
- **Function**: `toggleProductStatus`
- **Input**: `productId` (number), `currentStatus` (number)

## 4. Activity Log
Setiap aksi CUD (Create, Update, Delete) akan dicatat otomatis ke tabel `activity_logs` dengan user ID pelakunya.
