import { db } from "@/lib/db";
import { inventory, recipes, transactionItems, transactions } from "@/db/schema";
import { and, asc, eq, gt, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const CUSTOMER_RESERVATION_MINUTES = 15;

export interface StockRequirement {
    ingredientId: number;
    needed: number;
}

export async function getStockRequirements(
    tx: TransactionClient,
    items: { productId: number; quantity: number }[]
): Promise<StockRequirement[]> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    if (productIds.length === 0) return [];

    const recipeRows = await tx
        .select()
        .from(recipes)
        .where(inArray(recipes.productId, productIds));

    const required = new Map<number, number>();
    for (const item of items) {
        for (const recipe of recipeRows) {
            if (recipe.productId !== item.productId) continue;
            required.set(
                recipe.ingredientId,
                (required.get(recipe.ingredientId) ?? 0) + recipe.quantityNeeded * item.quantity
            );
        }
    }

    return Array.from(required, ([ingredientId, needed]) => ({ ingredientId, needed }));
}

export async function lockInventoryRows(
    tx: TransactionClient,
    ingredientIds: number[]
) {
    if (ingredientIds.length === 0) return;
    const values = sql.join(ingredientIds.map((id) => sql`${id}`), sql`, `);
    await tx.execute(sql`select id from inventory where ingredient_id in (${values}) for update`);
}

async function getReservedQuantities(
    tx: TransactionClient,
    ingredientIds: number[],
    excludeTransactionId?: number
) {
    if (ingredientIds.length === 0) return new Map<number, number>();

    const conditions = [
        eq(transactions.status, "pending"),
        eq(transactions.paymentStatus, "pending"),
        gt(transactions.reservationExpiresAt, new Date()),
        inArray(recipes.ingredientId, ingredientIds),
    ];
    if (excludeTransactionId) {
        conditions.push(ne(transactions.id, excludeTransactionId));
    }

    const rows = await tx
        .select({
            ingredientId: recipes.ingredientId,
            quantity: transactionItems.quantity,
            quantityNeeded: recipes.quantityNeeded,
        })
        .from(transactions)
        .innerJoin(transactionItems, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(recipes, eq(recipes.productId, transactionItems.productId))
        .where(and(...conditions));

    const reserved = new Map<number, number>();
    for (const row of rows) {
        reserved.set(
            row.ingredientId,
            (reserved.get(row.ingredientId) ?? 0) + row.quantity * row.quantityNeeded
        );
    }
    return reserved;
}

export async function assertStockCanBeReserved(
    tx: TransactionClient,
    requirements: StockRequirement[],
    excludeTransactionId?: number
) {
    const ingredientIds = requirements.map((item) => item.ingredientId);
    await lockInventoryRows(tx, ingredientIds);

    const today = new Date().toISOString().split("T")[0];
    const stockRows = ingredientIds.length > 0
        ? await tx
            .select()
            .from(inventory)
            .where(and(
                inArray(inventory.ingredientId, ingredientIds),
                or(isNull(inventory.expiryDate), gte(inventory.expiryDate, today))
            ))
        : [];
    const reserved = await getReservedQuantities(tx, ingredientIds, excludeTransactionId);

    for (const requirement of requirements) {
        const physical = stockRows
            .filter((stock) => stock.ingredientId === requirement.ingredientId)
            .reduce((sum, stock) => sum + stock.stockQuantity, 0);
        const available = physical - (reserved.get(requirement.ingredientId) ?? 0);
        if (available < requirement.needed) {
            throw new Error(
                `Stok tidak cukup. Dibutuhkan ${requirement.needed}, tersedia ${Math.max(available, 0)} setelah reservasi.`
            );
        }
    }
}

export async function deductStockLocked(
    tx: TransactionClient,
    requirements: StockRequirement[],
    excludeTransactionId?: number
) {
    await assertStockCanBeReserved(tx, requirements, excludeTransactionId);
    const today = new Date().toISOString().split("T")[0];

    for (const requirement of requirements) {
        const stocks = await tx
            .select()
            .from(inventory)
            .where(and(
                eq(inventory.ingredientId, requirement.ingredientId),
                or(isNull(inventory.expiryDate), gte(inventory.expiryDate, today))
            ))
            .orderBy(asc(inventory.expiryDate), asc(inventory.id));

        let remaining = requirement.needed;
        for (const stock of stocks) {
            if (remaining <= 0) break;
            const deducted = Math.min(stock.stockQuantity, remaining);
            await tx
                .update(inventory)
                .set({ stockQuantity: stock.stockQuantity - deducted })
                .where(eq(inventory.id, stock.id));
            remaining -= deducted;
        }
    }
}
