import { z } from "zod";

// ===========================================
// AUTH SCHEMAS
// ===========================================
export const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    fullName: z.string().min(2, "Nama minimal 2 karakter"),
});

// ===========================================
// PRODUCT SCHEMAS
// ===========================================
export const productSchema = z.object({
    name: z.string().min(1, "Nama produk wajib diisi"),
    category: z.string().min(1, "Kategori wajib dipilih"),
    price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Format harga tidak valid"),
    description: z.string().optional(),
    imageUrl: z.string().url("URL gambar tidak valid").optional().or(z.literal("")),
    isActive: z.number().min(0).max(1).default(1),
});

export type ProductInput = z.infer<typeof productSchema>;

// ===========================================
// INGREDIENT SCHEMAS
// ===========================================
export const ingredientSchema = z.object({
    name: z.string().min(1, "Nama bahan wajib diisi"),
    unit: z.string().min(1, "Satuan wajib dipilih"),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;

// ===========================================
// RECIPE SCHEMAS
// ===========================================
export const recipeItemSchema = z.object({
    ingredientId: z.number().positive("Pilih bahan"),
    quantityNeeded: z.number().positive("Jumlah harus lebih dari 0"),
});

export const recipeSchema = z.object({
    productId: z.number().positive("Pilih produk"),
    items: z.array(recipeItemSchema).min(1, "Minimal 1 bahan diperlukan"),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

// ===========================================
// INVENTORY SCHEMAS
// ===========================================
export const inventorySchema = z.object({
    ingredientId: z.number().positive("Pilih bahan"),
    stockQuantity: z.number().positive("Jumlah harus lebih dari 0"),
    expiryDate: z.string().min(1, "Tanggal kadaluarsa wajib diisi"),
});

export const restockSchema = z.object({
    ingredientId: z.number().positive("Pilih bahan"),
    quantity: z.number().positive("Jumlah harus lebih dari 0"),
    expiryDate: z.string().min(1, "Tanggal kadaluarsa wajib diisi"),
});

export type InventoryInput = z.infer<typeof inventorySchema>;
export type RestockInput = z.infer<typeof restockSchema>;

// ===========================================
// CHECKOUT SCHEMAS
// ===========================================
export const cartItemSchema = z.object({
    productId: z.number().positive(),
    productName: z.string(),
    unitPrice: z.number().positive(),
    quantity: z.number().positive("Jumlah harus lebih dari 0"),
    subtotal: z.number().positive(),
});

export const checkoutSchema = z.object({
    items: z.array(cartItemSchema).min(1, "Keranjang tidak boleh kosong"),
    type: z.enum(["dine_in", "take_away"]),
    customerName: z.string().optional(),
    notes: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ===========================================
// USER SCHEMAS
// ===========================================
export const userSchema = z.object({
    email: z.string().email("Email tidak valid"),
    fullName: z.string().min(2, "Nama minimal 2 karakter"),
    role: z.enum(["admin", "manager", "kasir"]),
    password: z.string().min(6, "Password minimal 6 karakter").optional(),
});

export type UserInput = z.infer<typeof userSchema>;
