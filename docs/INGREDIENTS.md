# Dokumentasi Fitur Manajemen Bahan Baku (Ingredients)

## 1. Overview
Digunakan untuk mencatat bahan-bahan mentah yang digunakan untuk membuat produk. Ini adalah dasar dari sistem inventori.

## 2. Database Schema
### Tabel: `ingredients`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial | Primary Key |
| `name` | varchar | Nama bahan (contoh: Daging Sapi) |
| `unit` | varchar | Satuan (Pcs, Gram, Ml, dll) |

### Tabel: `inventory` (Relasi 1:1)
Setiap ingredient otomatis memiliki entri di inventori untuk tracking stok.

## 3. Server Actions & APIs
File referensi: `src/actions/ingredients.ts`

### A. Create Ingredient
Menambahkan jenis bahan baku baru.
- **Function**: `createIngredient`
- **Access**: Admin Only

**Request Body (FormData):**
| Key | Tipe | Wajib | Keterangan |
|-----|------|-------|------------|
| `name` | string | Ya | Nama bahan |
| `unit` | string | Ya | Satuan pengukuran |

**Response (Success):**
```json
{
  "success": true,
  "message": "Bahan berhasil ditambahkan!",
  "data": { ...ingredientObject }
}
```

### B. Read Ingredients
Mengambil daftar bahan baku.
- **Method**: Server Component Data Fetching
- **Query**:
```sql
SELECT * FROM ingredients ORDER BY name;
```

### C. Delete Ingredient
Menghapus bahan baku.
- **Function**: `deleteIngredient`
- **Access**: Admin Only
- **Constraint**: Tidak bisa dihapus jika bahan tersebut sedang digunakan dalam **Resep (Recipes)** produk apapun.

**Response (Error jika terpakai):**
```json
{
  "success": false,
  "error": "Gagal menghapus bahan (mungkin masih digunakan di resep)"
}
```

## 4. Validasi
Sistem menggunakan **Zod** schema untuk memvalidasi input nama dan satuan sebelum diproses ke database.
