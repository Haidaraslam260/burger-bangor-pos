"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    transactions,
    transactionItems,
    inventory,
    recipes,
    ingredients,
    activityLogs,
} from "@/db/schema";
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { checkoutSchema } from "@/lib/validations";
import type { CheckoutResult, RequiredIngredient } from "@/types";
import { revalidatePath } from "next/cache";
import { deductStockLocked, getStockRequirements } from "@/lib/stock-reservations";

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

        const {
            items,
            type,
            subtotalAmount,
            discountAmount,
            taxAmount,
            serviceChargeAmount,
            roundingAmount,
            totalAmount,
            promoCode,
            paymentMethod,
            amountPaid,
            paymentStatus,
            customerName,
            notes,
        } = validationResult.data;

        // 3. Calculate payment change from final total
        const changeAmount = paymentMethod === "cash" ? amountPaid - totalAmount : 0;
        // 4. Execute in transaction
        const result = await db.transaction(async (tx) => {
            const requirements = await getStockRequirements(tx, items);
            await deductStockLocked(tx, requirements);

            // Create transaction record
            const [newTransaction] = await tx
                .insert(transactions)
                .values({
                    type,
                    subtotalAmount: subtotalAmount.toString(),
                    discountAmount: discountAmount.toString(),
                    taxAmount: taxAmount.toString(),
                    serviceChargeAmount: serviceChargeAmount.toString(),
                    roundingAmount: roundingAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    promoCode: promoCode || null,
                    paymentMethod,
                    amountPaid: amountPaid.toString(),
                    changeAmount: changeAmount.toString(),
                    paymentStatus,
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
                    subtotalAmount,
                    discountAmount,
                    taxAmount,
                    serviceChargeAmount,
                    roundingAmount,
                    totalAmount,
                    promoCode,
                    paymentMethod,
                    amountPaid,
                    changeAmount,
                    paymentStatus,
                    customerName,
                }),
            });

            return newTransaction;
        });

        revalidatePath("/manager/logs");
        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/pos");
        revalidatePath("/dashboard");

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
        const today = new Date().toISOString().split("T")[0];

        // Get recipes for all products
        const allRecipes = await db
            .select({
                productId: recipes.productId,
                ingredientId: recipes.ingredientId,
                quantityNeeded: recipes.quantityNeeded,
                ingredientName: ingredients.name,
            })
            .from(recipes)
            .leftJoin(ingredients, eq(recipes.ingredientId, ingredients.id))
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
                .where(and(
                    eq(inventory.ingredientId, ingredientId),
                    or(isNull(inventory.expiryDate), gte(inventory.expiryDate, today))
                ));

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
