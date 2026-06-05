"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
    activityLogs,
    ingredients,
    inventory,
    inventoryAdjustments,
    recipes,
    transactionItems,
    transactions,
} from "@/db/schema";
import type { TransactionStatus } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionResult } from "@/types";

async function requireManagerAccess() {
    const session = await auth();

    if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
        return { session: null, error: "Unauthorized" };
    }

    return { session, error: null };
}

function createRestoredExpiryDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split("T")[0];
}

async function restoreStockForTransaction(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    transactionId: number,
    userId: string,
    reason: string,
    status: Exclude<TransactionStatus, "completed">
) {
    const items = await tx
        .select()
        .from(transactionItems)
        .where(eq(transactionItems.transactionId, transactionId));

    if (items.length === 0) return [];

    const productIds = items.map((item) => item.productId);
    const recipeRows = await tx
        .select({
            productId: recipes.productId,
            ingredientId: recipes.ingredientId,
            quantityNeeded: recipes.quantityNeeded,
            ingredientName: ingredients.name,
        })
        .from(recipes)
        .innerJoin(ingredients, eq(recipes.ingredientId, ingredients.id))
        .where(inArray(recipes.productId, productIds));

    const restoredByIngredient = new Map<number, { name: string; quantity: number }>();

    for (const item of items) {
        const productRecipes = recipeRows.filter((recipe) => recipe.productId === item.productId);

        for (const recipe of productRecipes) {
            const current = restoredByIngredient.get(recipe.ingredientId) ?? {
                name: recipe.ingredientName,
                quantity: 0,
            };

            restoredByIngredient.set(recipe.ingredientId, {
                name: current.name,
                quantity: current.quantity + recipe.quantityNeeded * item.quantity,
            });
        }
    }

    const restoredSummary: string[] = [];

    for (const [ingredientId, restored] of restoredByIngredient) {
        const stocksBefore = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.ingredientId, ingredientId))
            .orderBy(asc(inventory.expiryDate));
        const totalBefore = stocksBefore.reduce((sum, stock) => sum + stock.stockQuantity, 0);
        const totalAfter = totalBefore + restored.quantity;

        const [newBatch] = await tx
            .insert(inventory)
            .values({
                ingredientId,
                stockQuantity: restored.quantity,
                unitCost: "0",
                receivedDate: new Date().toISOString().split("T")[0],
                expiryDate: createRestoredExpiryDate(),
                batchNumber: `${status.toUpperCase()}-${transactionId}`,
                notes: `Restore stok dari transaksi #${transactionId}: ${reason}`,
            })
            .returning();

        await tx.insert(inventoryAdjustments).values({
            inventoryId: newBatch.id,
            ingredientId,
            type: "restock",
            quantityChange: restored.quantity,
            quantityBefore: totalBefore,
            quantityAfter: totalAfter,
            reason: `Restore ${status} transaksi #${transactionId}: ${reason}`,
            reference: String(transactionId),
            userId,
        });

        restoredSummary.push(`${restored.name}: +${restored.quantity}`);
    }

    return restoredSummary;
}

export async function voidTransaction(
    transactionId: number,
    reason: string
): Promise<ActionResult> {
    return finalizeTransaction(transactionId, "voided", reason);
}

export async function refundTransaction(
    transactionId: number,
    reason: string
): Promise<ActionResult> {
    return finalizeTransaction(transactionId, "refunded", reason);
}

async function finalizeTransaction(
    transactionId: number,
    status: Exclude<TransactionStatus, "completed">,
    reason: string
): Promise<ActionResult> {
    try {
        const { session, error } = await requireManagerAccess();
        if (!session) return { success: false, error };

        const cleanReason = reason.trim();
        if (cleanReason.length < 3) {
            return { success: false, error: "Alasan minimal 3 karakter" };
        }

        const result = await db.transaction(async (tx) => {
            const [transaction] = await tx
                .select()
                .from(transactions)
                .where(eq(transactions.id, transactionId))
                .limit(1);

            if (!transaction) {
                throw new Error("Transaksi tidak ditemukan");
            }

            if (transaction.status !== "completed") {
                throw new Error("Transaksi sudah pernah di-void/refund");
            }

            const restoredSummary = await restoreStockForTransaction(
                tx,
                transactionId,
                session.user.id,
                cleanReason,
                status
            );

            await tx
                .update(transactions)
                .set({
                    status,
                    paymentStatus: status,
                    refundAmount: status === "refunded" ? transaction.totalAmount : "0",
                    voidReason: cleanReason,
                    refundedAt: status === "refunded" ? new Date() : null,
                    voidedAt: status === "voided" ? new Date() : null,
                    cancelledBy: session.user.id,
                })
                .where(eq(transactions.id, transactionId));

            await tx.insert(activityLogs).values({
                userId: session.user.id,
                action: status === "voided" ? "VOID" : "REFUND",
                tableName: "transactions",
                recordId: String(transactionId),
                details: JSON.stringify({
                    status,
                    reason: cleanReason,
                    refundAmount: status === "refunded" ? Number(transaction.totalAmount) : 0,
                    restoredStock: restoredSummary,
                }),
            });

            return restoredSummary;
        });

        revalidatePath("/manager/reports");
        revalidatePath("/manager/inventory");
        revalidatePath("/manager/logs");
        revalidatePath("/pos");

        return {
            success: true,
            message: status === "voided"
                ? `Transaksi #${transactionId} berhasil di-void dan stok dikembalikan`
                : `Transaksi #${transactionId} berhasil direfund dan stok dikembalikan`,
            data: result,
        };
    } catch (error) {
        console.error("Finalize transaction error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Gagal memproses transaksi",
        };
    }
}
