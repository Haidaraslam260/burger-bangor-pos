import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { inventory, ingredients, suppliers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import InventoryClient from "./inventory-client";

export default async function InventoryPage() {
    const rows = await db
        .select({
            id: inventory.id,
            ingredientId: inventory.ingredientId,
            stockQuantity: inventory.stockQuantity,
            receivedDate: inventory.receivedDate,
            expiryDate: inventory.expiryDate,
            notes: inventory.notes,
            name: ingredients.name,
            unit: ingredients.unit,
            minStockThreshold: ingredients.minStockThreshold,
            supplierName: suppliers.name,
        })
        .from(inventory)
        .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
        .leftJoin(suppliers, eq(inventory.supplierId, suppliers.id))
        .orderBy(asc(ingredients.name));

    const itemsByIngredient = new Map<number, {
        ingredientId: number;
        name: string;
        unit: string;
        minStockThreshold: number;
        totalStock: number;
        nearestExpiryDate: string | null;
        batches: {
            id: number;
            stockQuantity: number;
            receivedDate: string;
            expiryDate: string | null;
            supplierName: string | null;
            notes: string | null;
        }[];
    }>();

    for (const row of rows) {
        const existing = itemsByIngredient.get(row.ingredientId) ?? {
            ingredientId: row.ingredientId,
            name: row.name,
            unit: row.unit,
            minStockThreshold: row.minStockThreshold,
            totalStock: 0,
            nearestExpiryDate: null,
            batches: [],
        };

        existing.totalStock += row.stockQuantity;

        if (row.stockQuantity > 0 && row.expiryDate) {
            if (!existing.nearestExpiryDate || row.expiryDate < existing.nearestExpiryDate) {
                existing.nearestExpiryDate = row.expiryDate;
            }
        }

        existing.batches.push({
            id: row.id,
            stockQuantity: row.stockQuantity,
            receivedDate: row.receivedDate,
            expiryDate: row.expiryDate,
            supplierName: row.supplierName,
            notes: row.notes,
        });

        itemsByIngredient.set(row.ingredientId, existing);
    }

    const inventoryItems = Array.from(itemsByIngredient.values());

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventori</h1>
                    <p className="text-muted-foreground">Pantau dan kelola stok bahan baku</p>
                </div>
            </div>

            {/* Tools Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari bahan baku..."
                        className="pl-9"
                    />
                </div>
                <Badge variant="secondary">{inventoryItems.length} bahan</Badge>
            </div>

            {/* Inventory Client Component */}
            <InventoryClient
                inventoryItems={inventoryItems}
            />
        </div>
    );
}
