"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    transactions,
    transactionItems,
    inventory,
    recipes,
    products,
    activityLogs,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { checkoutSchema } from "@/lib/validations";
import type { CheckoutResult, RequiredIngredient } from "@/types";

/**
 * Checkout Server Action
 * Menggunakan database transaction untuk memastikan data integrity:
 * 1. Validasi input
 * 2. Hitung total
 * 3. Ambil resep untuk semua produk
 * 4. Cek ketersediaan stok
 * 5. Potong stok dengan FIFO (berdasarkan expiry date)
 * 6. Buat record transaksi
 * 7. Buat record detail transaksi
 * 8. Log aktivitas
 */
export async function checkout(
    formData: FormData
): Promise<CheckoutResult> {
    try {
        // 1. Get current session
        const session = await auth();
        if (!session?.user) {
            return {
                success: false,
                message: "Unauthorized",
                error: "Silakan login terlebih dahulu",
            };
        }

        // 2. Parse and validate input
        const rawData = JSON.parse(formData.get("data") as string);
        const validationResult = checkoutSchema.safeParse(rawData);

        if (!validationResult.success) {
            return {
                success: false,
                message: "Validation Error",
                error: validationResult.error.issues[0].message,
            };
        }

        const { items, type, customerName, notes } = validationResult.data;

        // 3. Calculate total
        const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

        // 4. Execute in transaction
        const result = await db.transaction(async (tx) => {
            // Get all product IDs
            const productIds = items.map((item) => item.productId);

            // Get recipes for all products
            const allRecipes = await tx
                .select()
                .from(recipes)
                .where(inArray(recipes.productId, productIds));

            // Calculate required ingredients
            const requiredIngredients = new Map<number, { name: string; needed: number }>();

            for (const item of items) {
                const productRecipes = allRecipes.filter(
                    (r) => r.productId === item.productId
                );

                for (const recipe of productRecipes) {
                    const current = requiredIngredients.get(recipe.ingredientId) || {
                        name: "",
                        needed: 0,
                    };
                    requiredIngredients.set(recipe.ingredientId, {
                        name: current.name,
                        needed: current.needed + recipe.quantityNeeded * item.quantity,
                    });
                }
            }

            // Check and deduct inventory using FIFO
            for (const [ingredientId, requirement] of requiredIngredients) {
                // Get all inventory for this ingredient, ordered by expiry date (FIFO)
                const stocks = await tx
                    .select()
                    .from(inventory)
                    .where(eq(inventory.ingredientId, ingredientId))
                    .orderBy(asc(inventory.expiryDate));

                let totalAvailable = stocks.reduce(
                    (sum, stock) => sum + stock.stockQuantity,
                    0
                );

                // Check if we have enough stock
                if (totalAvailable < requirement.needed) {
                    throw new Error(
                        `Stok tidak cukup untuk bahan ID ${ingredientId}. Dibutuhkan: ${requirement.needed}, Tersedia: ${totalAvailable}`
                    );
                }

                // Deduct stock using FIFO
                let remaining = requirement.needed;

                for (const stock of stocks) {
                    if (remaining <= 0) break;

                    if (stock.stockQuantity <= remaining) {
                        // Use all stock from this batch
                        remaining -= stock.stockQuantity;
                        await tx
                            .update(inventory)
                            .set({ stockQuantity: 0 })
                            .where(eq(inventory.id, stock.id));
                    } else {
                        // Partial deduction
                        await tx
                            .update(inventory)
                            .set({ stockQuantity: stock.stockQuantity - remaining })
                            .where(eq(inventory.id, stock.id));
                        remaining = 0;
                    }
                }
            }

            // Create transaction record
            const [newTransaction] = await tx
                .insert(transactions)
                .values({
                    type,
                    totalAmount: totalAmount.toString(),
                    cashierId: session.user.id,
                    customerName,
                    notes,
                })
                .returning();

            // Create transaction items
            await tx.insert(transactionItems).values(
                items.map((item) => ({
                    transactionId: newTransaction.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice.toString(),
                    subtotal: item.subtotal.toString(),
                }))
            );

            // Log activity
            await tx.insert(activityLogs).values({
                userId: session.user.id,
                action: "CHECKOUT",
                tableName: "transactions",
                recordId: newTransaction.id.toString(),
                details: JSON.stringify({
                    type,
                    itemCount: items.length,
                    totalAmount,
                    customerName,
                }),
            });

            return newTransaction;
        });

        return {
            success: true,
            transactionId: result.id,
            message: `Transaksi #${result.id} berhasil dibuat!`,
        };
    } catch (error) {
        console.error("Checkout error:", error);
        return {
            success: false,
            message: "Checkout Failed",
            error: error instanceof Error ? error.message : "Terjadi kesalahan saat checkout",
        };
    }
}

/**
 * Check stock availability before checkout
 */
export async function checkStockAvailability(
    items: { productId: number; quantity: number }[]
): Promise<{ available: boolean; details: RequiredIngredient[] }> {
    try {
        const productIds = items.map((item) => item.productId);

        // Get recipes for all products
        const allRecipes = await db
            .select({
                productId: recipes.productId,
                ingredientId: recipes.ingredientId,
                quantityNeeded: recipes.quantityNeeded,
                ingredientName: products.name,
            })
            .from(recipes)
            .leftJoin(products, eq(recipes.ingredientId, products.id))
            .where(inArray(recipes.productId, productIds));

        // Calculate required ingredients
        const requiredIngredients = new Map<
            number,
            { name: string; needed: number }
        >();

        for (const item of items) {
            const productRecipes = allRecipes.filter(
                (r) => r.productId === item.productId
            );

            for (const recipe of productRecipes) {
                const current = requiredIngredients.get(recipe.ingredientId) || {
                    name: recipe.ingredientName || "",
                    needed: 0,
                };
                requiredIngredients.set(recipe.ingredientId, {
                    name: current.name,
                    needed: current.needed + recipe.quantityNeeded * item.quantity,
                });
            }
        }

        // Check availability for each ingredient
        const details: RequiredIngredient[] = [];
        let allAvailable = true;

        for (const [ingredientId, requirement] of requiredIngredients) {
            const stocks = await db
                .select()
                .from(inventory)
                .where(eq(inventory.ingredientId, ingredientId));

            const totalAvailable = stocks.reduce(
                (sum, stock) => sum + stock.stockQuantity,
                0
            );

            const isAvailable = totalAvailable >= requirement.needed;
            if (!isAvailable) allAvailable = false;

            details.push({
                ingredientId,
                ingredientName: requirement.name,
                totalNeeded: requirement.needed,
                availableStock: totalAvailable,
                isAvailable,
            });
        }

        return { available: allAvailable, details };
    } catch (error) {
        console.error("Stock check error:", error);
        return { available: false, details: [] };
    }
}
