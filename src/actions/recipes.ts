"use server";

import { db } from "@/lib/db";
import { recipes, activityLogs, products, ingredients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

interface RecipeItemInput {
    ingredientId: number;
    quantityNeeded: number;
}

/**
 * Add or update a recipe item for a product
 */
export async function upsertRecipeItem(
    productId: number,
    ingredientId: number,
    quantityNeeded: number
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        // Check if recipe item already exists
        const [existingRecipe] = await db
            .select()
            .from(recipes)
            .where(and(eq(recipes.productId, productId), eq(recipes.ingredientId, ingredientId)));

        if (existingRecipe) {
            // Update
            await db
                .update(recipes)
                .set({ quantityNeeded })
                .where(eq(recipes.id, existingRecipe.id));
        } else {
            // Insert
            await db.insert(recipes).values({
                productId,
                ingredientId,
                quantityNeeded,
            });
        }

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: existingRecipe ? "UPDATE" : "CREATE",
            tableName: "recipes",
            recordId: `${productId}-${ingredientId}`,
            details: `Resep produk #${productId}: bahan #${ingredientId} = ${quantityNeeded}`,
        });

        revalidatePath("/admin/recipes");
        return { success: true, message: "Resep berhasil disimpan!" };
    } catch (error) {
        console.error("Upsert recipe error:", error);
        return { success: false, error: "Gagal menyimpan resep" };
    }
}

/**
 * Delete a recipe item
 */
export async function deleteRecipeItem(recipeId: number): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        await db.delete(recipes).where(eq(recipes.id, recipeId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "DELETE",
            tableName: "recipes",
            recordId: String(recipeId),
            details: `Item resep dihapus`,
        });

        revalidatePath("/admin/recipes");
        return { success: true, message: "Item resep berhasil dihapus!" };
    } catch (error) {
        console.error("Delete recipe item error:", error);
        return { success: false, error: "Gagal menghapus item resep" };
    }
}

/**
 * Set full recipe for a product (replace all items)
 */
export async function setProductRecipe(
    productId: number,
    items: RecipeItemInput[]
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        // Delete existing recipes for this product
        await db.delete(recipes).where(eq(recipes.productId, productId));

        // Insert new recipes
        if (items.length > 0) {
            await db.insert(recipes).values(
                items.map((item) => ({
                    productId,
                    ingredientId: item.ingredientId,
                    quantityNeeded: item.quantityNeeded,
                }))
            );
        }

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "recipes",
            recordId: String(productId),
            details: `Resep produk #${productId} diperbarui dengan ${items.length} bahan`,
        });

        revalidatePath("/admin/recipes");
        return { success: true, message: "Resep berhasil diperbarui!" };
    } catch (error) {
        console.error("Set product recipe error:", error);
        return { success: false, error: "Gagal memperbarui resep" };
    }
}
