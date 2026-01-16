# Dokumentasi Fitur Autentikasi

## 1. Overview
Sistem autentikasi menggunakan **NextAuth.js v5** dengan custom credentials provider. Sistem mendukung:
- Login dengan Email & Password.
- Role-based Access Control (RBAC) untuk user: `admin`, `manager`, `kasir`.
- Session management aman dengan HTTP-only cookies.

## 2. Database Schema
### Tabel: `users`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `email` | varchar | Unique, Email user |
| `password` | varchar | Hashed password (bcrypt) |
| `fullName` | varchar | Nama lengkap |
| `role` | enum | `admin`, `manager`, `kasir` |
| `createdAt` | timestamp | Waktu pembuatan akun |

## 3. Server Actions & APIs

### A. Login
Digunakan untuk masuk ke dalam aplikasi.
- **File**: `src/actions/auth.ts` -> `login()`
- **Method**: POST (Form Action)

**Request Body (FormData):**
| Key | Tipe | Wajib | Keterangan |
|-----|------|-------|------------|
| `email` | string | Ya | Email terdaftar |
| `password` | string | Ya | Min 6 karakter |

**Response (Success):**
```json
{
  "success": true,
  "message": "Login berhasil!"
}
```
*Redirects to `/dashboard` on success.*

**Response (Error):**
```json
{
  "error": "Email atau password salah"
}
```

### B. Register (Admin Only - via Seed/Console)
Saat ini registrasi user baru dilakukan melalui seeding database atau manual insert oleh admin database, bukan fitur publik.
- **Validasi**:
  - Email format valid
  - Password min 6 chars
  - Role harus salah satu dari enum yang tersedia

### C. Logout
Menghapus sesi user.
- **File**: `src/actions/auth.ts` -> `logout()`
- **Method**: Function Call

**Response:**
*Redirects to `/login`.*

## 4. Middleware Protection
Middleware (`src/middleware.ts`) melindungi route berdasarkan role:
- `/dashboard`: Semua user login.
- `/admin/*`: Hanya role `admin`.
- `/manager/*`: Role `admin` & `manager`.
- `/pos`: Role `admin`, `manager`, `kasir`.

User yang mencoba akses route terlarang akan diredirect ke halaman dashboard utama mereka atau login page.
