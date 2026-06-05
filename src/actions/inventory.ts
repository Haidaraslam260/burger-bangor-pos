"use server";

import { db } from "@/lib/db";
import { inventory, ingredients, activityLogs, suppliers, inventoryAdjustments } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

type AdjustmentType = "waste" | "spoilage" | "transfer" | "opname";

function parsePositiveInteger(value: FormDataEntryValue | null) {
    const numberValue = Number(value);
    return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function parseNonNegativeInteger(value: FormDataEntryValue | null) {
    const numberValue = Number(value);
    return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : null;
}

async function requireInventoryAccess() {
    const session = await auth();

    if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
        return { session: null, error: "Unauthorized" };
    }

    return { session, error: null };
}

async function findOrCreateSupplier(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const [existingSupplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.name, trimmedName))
        .limit(1);

    if (existingSupplier) return existingSupplier;

    const [newSupplier] = await db
        .insert(suppliers)
        .values({ name: trimmedName })
        .returning();

    return newSupplier;
}

async function getIngredientName(ingredientId: number) {
    const [ingredient] = await db
        .select({ name: ingredients.name })
        .from(ingredients)
        .where(eq(ingredients.id, ingredientId))
        .limit(1);

    return ingredient?.name ?? `Bahan #${ingredientId}`;
}

/**
 * Update stock quantity for an inventory item (direct edit)
 */
export async function updateStock(
    inventoryId: number,
    newQuantity: number
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        if (newQuantity < 0) {
            return { success: false, error: "Stok tidak boleh negatif" };
        }

        // Get current inventory to log the change
        const [current] = await db
            .select({
                stockQuantity: inventory.stockQuantity,
                ingredientName: ingredients.name,
            })
            .from(inventory)
            .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
            .where(eq(inventory.id, inventoryId));

        if (!current) {
            return { success: false, error: "Data inventori tidak ditemukan" };
        }

        const diff = newQuantity - current.stockQuantity;
        const diffText = diff >= 0 ? `+${diff}` : `${diff}`;

        await db
            .update(inventory)
            .set({
                stockQuantity: newQuantity,
                updatedAt: new Date(),
            })
            .where(eq(inventory.id, inventoryId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: diff >= 0 ? "RESTOCK" : "ADJUST",
            tableName: "inventory",
            recordId: String(inventoryId),
            details: `${current.ingredientName}: ${current.stockQuantity} -> ${newQuantity} (${diffText})`,
        });

        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/logs");
        return {
            success: true,
            message: `Stok ${current.ingredientName} berhasil diupdate!`,
        };
    } catch (error) {
        console.error("Update stock error:", error);
        return { success: false, error: "Gagal mengupdate stok" };
    }
}

/**
 * Add stock with supplier and optional expiry metadata.
 */
export async function addInventoryBatch(formData: FormData): Promise<ActionResult> {
    try {
        const { session, error } = await requireInventoryAccess();
        if (!session) return { success: false, error };

        const ingredientId = parsePositiveInteger(formData.get("ingredientId"));
        const stockQuantity = parsePositiveInteger(formData.get("stockQuantity"));
        const expiryDate = String(formData.get("expiryDate") ?? "").trim();
        const supplierName = String(formData.get("supplierName") ?? "").trim();
        const receivedDate = String(formData.get("receivedDate") ?? new Date().toISOString().split("T")[0]);
        const notes = String(formData.get("notes") ?? "").trim();

        if (!ingredientId || !stockQuantity) {
            return { success: false, error: "Bahan dan jumlah wajib diisi" };
        }

        const supplier = await findOrCreateSupplier(supplierName);
        const ingredientName = await getIngredientName(ingredientId);

        const [newBatch] = await db
            .insert(inventory)
            .values({
                ingredientId,
                supplierId: supplier?.id ?? null,
                stockQuantity,
                receivedDate,
                expiryDate: expiryDate || null,
                notes: notes || null,
            })
            .returning();

        await db.insert(inventoryAdjustments).values({
            inventoryId: newBatch.id,
            ingredientId,
            type: "restock",
            quantityChange: stockQuantity,
            quantityBefore: 0,
            quantityAfter: stockQuantity,
            reason: notes || "Stok masuk",
            reference: null,
            userId: session.user.id,
        });

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "RESTOCK",
            tableName: "inventory",
            recordId: String(newBatch.id),
            details: `Stok masuk ${ingredientName}: +${stockQuantity}, supplier ${supplier?.name ?? "-"}`,
        });

        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/logs");
        return { success: true, message: "Stok berhasil ditambahkan!" };
    } catch (error) {
        console.error("Add inventory batch error:", error);
        return { success: false, error: "Gagal menambahkan stok" };
    }
}

/**
 * Record waste/spoilage/transfer/opname adjustment and mutate stock by FIFO.
 */
export async function adjustInventory(formData: FormData): Promise<ActionResult> {
    try {
        const { session, error } = await requireInventoryAccess();
        if (!session) return { success: false, error };

        const ingredientId = parsePositiveInteger(formData.get("ingredientId"));
        const type = String(formData.get("type") ?? "") as AdjustmentType;
        const quantity = parsePositiveInteger(formData.get("quantity"));
        const opnameQuantity = parseNonNegativeInteger(formData.get("opnameQuantity"));
        const reason = String(formData.get("reason") ?? "").trim();

        if (!ingredientId || !["waste", "spoilage", "transfer", "opname"].includes(type)) {
            return { success: false, error: "Data adjustment tidak valid" };
        }

        const ingredientName = await getIngredientName(ingredientId);
        const batches = await db
            .select()
            .from(inventory)
            .where(eq(inventory.ingredientId, ingredientId))
            .orderBy(asc(inventory.expiryDate), asc(inventory.id));

        const currentTotal = batches.reduce((sum, batch) => sum + batch.stockQuantity, 0);

        if (type === "opname") {
            if (opnameQuantity === null) {
                return { success: false, error: "Jumlah hasil opname wajib diisi" };
            }

            const diff = opnameQuantity - currentTotal;

            if (diff > 0) {
                const [newBatch] = await db
                    .insert(inventory)
                    .values({
                        ingredientId,
                        stockQuantity: diff,
                        unitCost: "0",
                        receivedDate: new Date().toISOString().split("T")[0],
                        expiryDate: null,
                        notes: reason || "Selisih opname",
                    })
                    .returning();

                await db.insert(inventoryAdjustments).values({
                    inventoryId: newBatch.id,
                    ingredientId,
                    type: "opname",
                    quantityChange: diff,
                    quantityBefore: currentTotal,
                    quantityAfter: opnameQuantity,
                    reason: reason || "Opname stok",
                    userId: session.user.id,
                });
            } else if (diff < 0) {
                await deductStockBatches({
                    batches,
                    ingredientId,
                    quantity: Math.abs(diff),
                    type: "opname",
                    reason: reason || "Opname stok",
                    userId: session.user.id,
                    totalBefore: currentTotal,
                    finalAfter: opnameQuantity,
                });
            }

            await db.insert(activityLogs).values({
                userId: session.user.id,
                action: "ADJUST",
                tableName: "inventory",
                recordId: String(ingredientId),
                details: `Opname ${ingredientName}: ${currentTotal} -> ${opnameQuantity}`,
            });

            revalidatePath("/manager/inventory");
            revalidatePath("/admin/ingredients");
            revalidatePath("/manager/logs");
            return { success: true, message: "Opname stok berhasil disimpan!" };
        }

        if (!quantity) {
            return { success: false, error: "Jumlah adjustment wajib diisi" };
        }

        if (quantity > currentTotal) {
            return { success: false, error: "Jumlah melebihi stok tersedia" };
        }

        await deductStockBatches({
            batches,
            ingredientId,
            quantity,
            type,
            reason: reason || type,
            userId: session.user.id,
            totalBefore: currentTotal,
            finalAfter: currentTotal - quantity,
        });

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "ADJUST",
            tableName: "inventory",
            recordId: String(ingredientId),
            details: `${type.toUpperCase()} ${ingredientName}: -${quantity} (${currentTotal} -> ${currentTotal - quantity})`,
        });

        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/logs");
        return { success: true, message: "Adjustment stok berhasil disimpan!" };
    } catch (error) {
        console.error("Adjust inventory error:", error);
        return { success: false, error: "Gagal menyimpan adjustment stok" };
    }
}

async function deductStockBatches({
    batches,
    ingredientId,
    quantity,
    type,
    reason,
    userId,
    totalBefore,
    finalAfter,
}: {
    batches: { id: number; stockQuantity: number }[];
    ingredientId: number;
    quantity: number;
    type: AdjustmentType;
    reason: string;
    userId: string;
    totalBefore: number;
    finalAfter: number;
}) {
    let remaining = quantity;
    let runningBefore = totalBefore;

    for (const batch of batches) {
        if (remaining <= 0) break;
        if (batch.stockQuantity <= 0) continue;

        const deducted = Math.min(batch.stockQuantity, remaining);
        const batchAfter = batch.stockQuantity - deducted;

        await db
            .update(inventory)
            .set({
                stockQuantity: batchAfter,
                updatedAt: new Date(),
            })
            .where(eq(inventory.id, batch.id));

        await db.insert(inventoryAdjustments).values({
            inventoryId: batch.id,
            ingredientId,
            type,
            quantityChange: -deducted,
            quantityBefore: runningBefore,
            quantityAfter: remaining - deducted === 0 ? finalAfter : runningBefore - deducted,
            reason,
            userId,
        });

        runningBefore -= deducted;
        remaining -= deducted;
    }
}

/**
 * Add stock to an existing inventory (legacy restock/increment)
 */
export async function addStock(
    inventoryId: number,
    addQuantity: number
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        if (addQuantity <= 0) {
            return { success: false, error: "Jumlah harus lebih dari 0" };
        }

        // Get current inventory
        const [current] = await db
            .select({
                stockQuantity: inventory.stockQuantity,
                ingredientName: ingredients.name,
            })
            .from(inventory)
            .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
            .where(eq(inventory.id, inventoryId));

        if (!current) {
            return { success: false, error: "Data inventori tidak ditemukan" };
        }

        const newQuantity = current.stockQuantity + addQuantity;

        await db
            .update(inventory)
            .set({
                stockQuantity: newQuantity,
                updatedAt: new Date(),
            })
            .where(eq(inventory.id, inventoryId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "RESTOCK",
            tableName: "inventory",
            recordId: String(inventoryId),
            details: `Restock ${current.ingredientName}: +${addQuantity} (Total: ${newQuantity})`,
        });

        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/logs");
        return {
            success: true,
            message: `Berhasil menambahkan ${addQuantity} ${current.ingredientName}!`,
        };
    } catch (error) {
        console.error("Add stock error:", error);
        return { success: false, error: "Gagal menambahkan stok" };
    }
}

export async function updateMinimumStock(
    ingredientId: number,
    minStockThreshold: number
): Promise<ActionResult> {
    try {
        const { session, error } = await requireInventoryAccess();
        if (!session) return { success: false, error };

        if (!Number.isInteger(minStockThreshold) || minStockThreshold < 0) {
            return { success: false, error: "Minimum stok tidak valid" };
        }

        await db
            .update(ingredients)
            .set({ minStockThreshold, updatedAt: new Date() })
            .where(eq(ingredients.id, ingredientId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "ingredients",
            recordId: String(ingredientId),
            details: `Minimum stok diubah menjadi ${minStockThreshold}`,
        });

        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/logs");
        return { success: true, message: "Minimum stok berhasil diupdate!" };
    } catch (error) {
        console.error("Update minimum stock error:", error);
        return { success: false, error: "Gagal mengupdate minimum stok" };
    }
}
