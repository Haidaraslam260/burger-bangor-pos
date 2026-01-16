# Dokumentasi Fitur POS & Transaksi

## 1. Overview
Point of Sales (POS) adalah halaman utama kasir untuk memproses pesanan pelanggan. Fitur ini mencakup browsing produk, keranjang belanja (cart), dan checkout pembayaran.

## 2. Database Schema
### Tabel: `transactions`
Header transaksi.
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid | Primary Key |
| `userId` | uuid | Kasir yang input |
| `transactionDate` | timestamp | Waktu transaksi |
| `totalAmount` | decimal | Total harga |
| `status` | varchar | `paid`, `pending`, `cancelled` |
| `paymentMethod` | varchar | `cash`, `qris` |
| `type` | enum | `dine_in`, `take_away` |
| `customerName` | varchar | Nama pelanggan |

### Tabel: `transaction_items`
Detail item per transaksi.
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `transactionId` | uuid | FK ke transactions |
| `productId` | integer | FK ke products |
| `quantity` | integer | Jumlah beli |
| `price` | decimal | Harga saat transaksi (snapshot) |
| `subtotal` | decimal | quantity * price |

## 3. Pos Flow & API

### A. Fetch Active Products
Halaman POS hanya menampilkan produk yang aktif.
- **Query**: `SELECT * FROM products WHERE isActive = 1`

### B. Checkout Process
Proses checkout adalah transaksi atomik (database transaction) yang kompleks.
- **File**: `src/actions/checkout.ts` -> `checkout()`
- **Method**: Server Action

**Request Payload (JSON Stringified in FormData):**
```json
{
  "items": [
    { "productId": 1, "quantity": 2, "unitPrice": 15000, "subtotal": 30000 }
  ],
  "type": "dine_in",
  "customerName": "Budi"
}
```

**Transaction Steps (All or Nothing):**
1. **Validasi Stock**:
   - Loop setiap item di cart.
   - Ambil resep produk tersebut.
   - Cek stok ingredient di tabel `inventory`.
   - Jika stok kurang -> **Rollback & Error**.

2. **Create Transaction**:
   - Insert ke tabel `transactions`.

3. **Create Transaction Items**:
   - Insert ke tabel `transaction_items`.

4. **Deduct Inventory**:
   - Kurangi stok di `inventory` berdasarkan resep * quantity.

5. **Log Activity**:
   - Catat "CHECKOUT" di `activity_logs`.

**Response (Success):**
```json
{
  "success": true,
  "message": "Transaksi berhasil!"
}
```

**Response (Error - Stok Habis):**
```json
{
  "success": false,
  "message": "Stok bahan tidak cukup untuk membuat: Burger Sultan"
}
```

## 4. Fitur Client Side
- **Cart State**: Menggunakan React `useState` lokal (belum persisten).
- **Search & Filter**: Client-side filtering untuk responsivitas cepat.
- **Live Calculation**: Total harga dihitung realtime di client sebelum dikirim ke server.
