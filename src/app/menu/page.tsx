import { db } from "@/lib/db";
import { inventory, products, recipes } from "@/db/schema";
import { and, eq, gte, inArray, isNull, or } from "drizzle-orm";
import CustomerMenuClient from "./customer-menu-client";

export const dynamic = "force-dynamic";

export default async function CustomerMenuPage({
    searchParams,
}: {
    searchParams: Promise<{ table?: string }>;
}) {
    const params = await searchParams;
    const tableNumber = typeof params.table === "string" ? params.table : "";

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

    const stockByIngredientId = new Map<number, number>();
    for (const stock of stockRows) {
        stockByIngredientId.set(
            stock.ingredientId,
            (stockByIngredientId.get(stock.ingredientId) ?? 0) + stock.stockQuantity
        );
    }

    const availabilityByProductId: Record<number, number | null> = {};
    for (const product of activeProducts) {
        const recipeItems = productRecipes.filter((recipe) => recipe.productId === product.id);

        if (recipeItems.length === 0) {
            availabilityByProductId[product.id] = null;
            continue;
        }

        availabilityByProductId[product.id] = Math.min(
            ...recipeItems.map((recipe) => {
                const availableStock = stockByIngredientId.get(recipe.ingredientId) ?? 0;
                return Math.floor(availableStock / recipe.quantityNeeded);
            })
        );
    }

    return (
        <CustomerMenuClient
            products={activeProducts}
            availabilityByProductId={availabilityByProductId}
            initialTableNumber={tableNumber}
        />
    );
}
