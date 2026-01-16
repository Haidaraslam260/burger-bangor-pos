import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat } from "lucide-react";
import { db } from "@/lib/db";
import { recipes, products, ingredients } from "@/db/schema";
import { eq } from "drizzle-orm";
import RecipesClient from "./recipes-client";

export default async function RecipesPage() {
    // Get all products and ingredients
    const productList = await db.select().from(products).orderBy(products.name);
    const ingredientList = await db.select().from(ingredients).orderBy(ingredients.name);

    // Get all recipes with ingredient names
    const recipeList = await db
        .select({
            id: recipes.id,
            productId: recipes.productId,
            ingredientName: ingredients.name,
            ingredientUnit: ingredients.unit,
            quantityNeeded: recipes.quantityNeeded,
        })
        .from(recipes)
        .innerJoin(ingredients, eq(recipes.ingredientId, ingredients.id))
        .orderBy(recipes.productId);

    // Group recipes by product
    const recipesByProduct: Record<number, typeof recipeList> = {};
    recipeList.forEach((recipe) => {
        if (!recipesByProduct[recipe.productId]) {
            recipesByProduct[recipe.productId] = [];
        }
        recipesByProduct[recipe.productId].push(recipe);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Resep</h1>
                    <p className="text-muted-foreground">Kelola komposisi bahan untuk setiap produk</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                    {recipeList.length} total bahan
                </Badge>
            </div>

            {productList.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Belum ada produk untuk dibuat resep.</p>
                            <p className="text-sm">Tambahkan produk terlebih dahulu di halaman Produk.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <RecipesClient
                    products={productList}
                    ingredients={ingredientList}
                    recipesByProduct={recipesByProduct}
                />
            )}
        </div>
    );
}
