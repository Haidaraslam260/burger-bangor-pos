import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { inventory, ingredients } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import InventoryClient from "./inventory-client";

export default async function InventoryPage() {
    // Fetch inventory joined with ingredients (1:1 relationship)
    const inventoryItems = await db
        .select({
            id: inventory.id,
            ingredientId: inventory.ingredientId,
            stockQuantity: inventory.stockQuantity,
            name: ingredients.name,
            unit: ingredients.unit,
        })
        .from(inventory)
        .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
        .orderBy(asc(ingredients.name));

    const lowStockThreshold = 50;

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
                lowStockThreshold={lowStockThreshold}
            />
        </div>
    );
}
