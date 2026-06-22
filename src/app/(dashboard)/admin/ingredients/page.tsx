import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Salad } from "lucide-react";
import { db } from "@/lib/db";
import { ingredients, inventory } from "@/db/schema";
import IngredientsClient from "./ingredients-client";

export default async function IngredientsPage() {
    // Fetch ingredients and inventory rows in parallel to optimize query execution time
    const [ingredientListPromise, inventoryRowsPromise] = await Promise.all([
        db.select().from(ingredients).orderBy(ingredients.name),
        db
            .select({
                ingredientId: inventory.ingredientId,
                stockQuantity: inventory.stockQuantity,
            })
            .from(inventory)
    ]);

    const ingredientList = ingredientListPromise;
    const inventoryRows = inventoryRowsPromise;

    const stockByIngredientId = new Map<number, number>();
    for (const row of inventoryRows) {
        stockByIngredientId.set(
            row.ingredientId,
            (stockByIngredientId.get(row.ingredientId) ?? 0) + row.stockQuantity
        );
    }

    const ingredientsWithStock = ingredientList.map((ingredient) => ({
        ...ingredient,
        totalStock: stockByIngredientId.get(ingredient.id) ?? 0,
    }));

    const lowStockCount = ingredientsWithStock.filter(
        (ingredient) => ingredient.totalStock < ingredient.minStockThreshold
    ).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bahan Baku</h1>
                    <p className="text-muted-foreground">Kelola bahan baku untuk membuat burger</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Salad className="h-5 w-5" />
                            Daftar Bahan Baku
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {lowStockCount > 0 && (
                                <Badge variant="destructive">{lowStockCount} stok rendah</Badge>
                            )}
                            <Badge variant="secondary">{ingredientList.length} bahan</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <IngredientsClient ingredients={ingredientsWithStock} />
                </CardContent>
            </Card>
        </div>
    );
}
