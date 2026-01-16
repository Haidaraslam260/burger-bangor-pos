"use server";

import { db } from "@/lib/db";
import { inventory, ingredients, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

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
            details: `${current.ingredientName}: ${current.stockQuantity} → ${newQuantity} (${diffText})`,
        });

        revalidatePath("/manager/inventory");
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
 * Add stock to an existing inventory (restock/increment)
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
        return {
            success: true,
            message: `Berhasil menambahkan ${addQuantity} ${current.ingredientName}!`,
        };
    } catch (error) {
        console.error("Add stock error:", error);
        return { success: false, error: "Gagal menambahkan stok" };
    }
}
