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
    imageUrl: z.string().trim().refine((value) => {
        if (!value) return true;
        if (value.startsWith("/")) return true;

        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }, "URL gambar tidak valid").optional(),
    isActive: z.number().min(0).max(1).default(1),
});

export type ProductInput = z.infer<typeof productSchema>;

// ===========================================
// INGREDIENT SCHEMAS
// ===========================================
export const ingredientSchema = z.object({
    name: z.string().min(1, "Nama bahan wajib diisi"),
    unit: z.string().min(1, "Satuan wajib dipilih"),
    minStockThreshold: z.coerce.number().int().min(0, "Minimum stok tidak boleh negatif").default(10),
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
    expiryDate: z.string().optional(),
});

export const restockSchema = z.object({
    ingredientId: z.number().positive("Pilih bahan"),
    quantity: z.number().positive("Jumlah harus lebih dari 0"),
    expiryDate: z.string().optional(),
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
    subtotalAmount: z.number().nonnegative("Subtotal tidak boleh negatif"),
    discountAmount: z.number().nonnegative("Diskon tidak boleh negatif").default(0),
    taxAmount: z.number().nonnegative("Pajak tidak boleh negatif").default(0),
    serviceChargeAmount: z.number().nonnegative("Service charge tidak boleh negatif").default(0),
    roundingAmount: z.number().default(0),
    totalAmount: z.number().nonnegative("Total tidak boleh negatif"),
    promoCode: z.string().trim().optional(),
    paymentMethod: z.enum(["cash", "qris", "debit", "e_wallet"]),
    amountPaid: z.number().nonnegative("Jumlah bayar tidak boleh negatif"),
    changeAmount: z.number().nonnegative("Kembalian tidak boleh negatif").default(0),
    paymentStatus: z.enum(["paid", "pending", "failed"]).default("paid"),
    customerName: z.string().optional(),
    notes: z.string().optional(),
}).superRefine((data, ctx) => {
    const subtotalAmount = data.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = subtotalAmount
        - data.discountAmount
        + data.taxAmount
        + data.serviceChargeAmount
        + data.roundingAmount;

    if (Math.abs(data.subtotalAmount - subtotalAmount) > 0.01) {
        ctx.addIssue({
            code: "custom",
            path: ["subtotalAmount"],
            message: "Subtotal transaksi tidak sesuai dengan item",
        });
    }

    if (data.discountAmount > subtotalAmount) {
        ctx.addIssue({
            code: "custom",
            path: ["discountAmount"],
            message: "Diskon tidak boleh lebih besar dari subtotal",
        });
    }

    if (Math.abs(data.totalAmount - totalAmount) > 0.01) {
        ctx.addIssue({
            code: "custom",
            path: ["totalAmount"],
            message: "Total transaksi tidak sesuai dengan komponen pembayaran",
        });
    }

    if (data.paymentStatus === "paid" && data.amountPaid < data.totalAmount) {
        ctx.addIssue({
            code: "custom",
            path: ["amountPaid"],
            message: "Jumlah bayar kurang dari total transaksi",
        });
    }

    if (data.paymentMethod !== "cash" && data.changeAmount !== 0) {
        ctx.addIssue({
            code: "custom",
            path: ["changeAmount"],
            message: "Kembalian hanya berlaku untuk pembayaran cash",
        });
    }
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

export const createUserSchema = userSchema.extend({
    password: z.string().min(6, "Password minimal 6 karakter"),
});

export const updateUserSchema = userSchema.extend({
    password: z.string().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
