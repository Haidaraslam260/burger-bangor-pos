import { inventory, products, recipes, transactionItems, transactions } from "@/db/schema";
import { db } from "@/lib/db";
import { and, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";

export async function getActiveProductsWithAvailability() {
    const activeProducts = await db
        .select()
        .from(products)
        .where(eq(products.isActive, 1))
        .orderBy(products.category, products.name);

    const productIds = activeProducts.map((product) => product.id);
    const productRecipes = productIds.length > 0
        ? await db.select().from(recipes).where(inArray(recipes.productId, productIds))
        : [];
    const ingredientIds = [...new Set(productRecipes.map((recipe) => recipe.ingredientId))];
    const today = new Date().toISOString().split("T")[0];

    const stockRows = ingredientIds.length > 0
        ? await db
            .select()
            .from(inventory)
            .where(and(
                inArray(inventory.ingredientId, ingredientIds),
                or(isNull(inventory.expiryDate), gte(inventory.expiryDate, today))
            ))
        : [];

    const reservedRows = ingredientIds.length > 0
        ? await db
            .select({
                ingredientId: recipes.ingredientId,
                quantity: transactionItems.quantity,
                quantityNeeded: recipes.quantityNeeded,
            })
            .from(transactions)
            .innerJoin(transactionItems, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(recipes, eq(recipes.productId, transactionItems.productId))
            .where(and(
                eq(transactions.status, "pending"),
                eq(transactions.paymentStatus, "pending"),
                gt(transactions.reservationExpiresAt, new Date()),
                inArray(recipes.ingredientId, ingredientIds)
            ))
        : [];

    const stockByIngredientId = new Map<number, number>();
    for (const stock of stockRows) {
        stockByIngredientId.set(
            stock.ingredientId,
            (stockByIngredientId.get(stock.ingredientId) ?? 0) + stock.stockQuantity
        );
    }

    for (const row of reservedRows) {
        stockByIngredientId.set(
            row.ingredientId,
            (stockByIngredientId.get(row.ingredientId) ?? 0) - row.quantity * row.quantityNeeded
        );
    }

    const availabilityByProductId: Record<number, number | null> = {};
    for (const product of activeProducts) {
        const recipeItems = productRecipes.filter((recipe) => recipe.productId === product.id);

        if (recipeItems.length === 0) {
            availabilityByProductId[product.id] = null;
            continue;
        }

        availabilityByProductId[product.id] = Math.max(0, Math.min(
            ...recipeItems.map((recipe) => {
                const availableStock = stockByIngredientId.get(recipe.ingredientId) ?? 0;
                return Math.floor(availableStock / recipe.quantityNeeded);
            })
        ));
    }

    return { activeProducts, availabilityByProductId };
}
