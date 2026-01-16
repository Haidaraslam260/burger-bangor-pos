"use server";

import { db } from "@/lib/db";
import { ingredients, inventory, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ingredientSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Create a new ingredient (also creates inventory entry with 0 stock)
 */
export async function createIngredient(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name"),
            unit: formData.get("unit"),
        };

        const validationResult = ingredientSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        // Create ingredient
        const [newIngredient] = await db
            .insert(ingredients)
            .values({
                name: validationResult.data.name,
                unit: validationResult.data.unit,
            })
            .returning();

        // Auto-create inventory entry with 0 stock
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 10);

        await db.insert(inventory).values({
            ingredientId: newIngredient.id,
            stockQuantity: 0,
            expiryDate: farFuture.toISOString().split("T")[0],
        });

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "CREATE",
            tableName: "ingredients",
            recordId: String(newIngredient.id),
            details: `Bahan baru: ${newIngredient.name}`,
        });

        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/inventory");
        return { success: true, message: "Bahan berhasil ditambahkan!", data: newIngredient };
    } catch (error) {
        console.error("Create ingredient error:", error);
        return { success: false, error: "Gagal menambahkan bahan" };
    }
}

/**
 * Update an existing ingredient
 */
export async function updateIngredient(
    ingredientId: number,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name"),
            unit: formData.get("unit"),
        };

        const validationResult = ingredientSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const [updatedIngredient] = await db
            .update(ingredients)
            .set({
                name: validationResult.data.name,
                unit: validationResult.data.unit,
                updatedAt: new Date(),
            })
            .where(eq(ingredients.id, ingredientId))
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "ingredients",
            recordId: String(ingredientId),
            details: `Bahan diupdate: ${updatedIngredient.name}`,
        });

        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/inventory");
        return { success: true, message: "Bahan berhasil diupdate!" };
    } catch (error) {
        console.error("Update ingredient error:", error);
        return { success: false, error: "Gagal mengupdate bahan" };
    }
}

/**
 * Delete an ingredient (also deletes its inventory entry via cascade)
 */
export async function deleteIngredient(ingredientId: number): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const [deletedIngredient] = await db
            .delete(ingredients)
            .where(eq(ingredients.id, ingredientId))
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "DELETE",
            tableName: "ingredients",
            recordId: String(ingredientId),
            details: `Bahan dihapus: ${deletedIngredient.name}`,
        });

        revalidatePath("/admin/ingredients");
        revalidatePath("/manager/inventory");
        return { success: true, message: "Bahan berhasil dihapus!" };
    } catch (error) {
        console.error("Delete ingredient error:", error);
        return { success: false, error: "Gagal menghapus bahan (mungkin masih digunakan di resep)" };
    }
}
