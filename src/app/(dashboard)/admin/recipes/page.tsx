import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat } from "lucide-react";
import { db } from "@/lib/db";
import { recipes, products, ingredients } from "@/db/schema";
import { eq } from "drizzle-orm";
import RecipesClient from "./recipes-client";

export default async function RecipesPage() {
    // Fetch products, ingredients, and recipes in parallel to optimize query execution time
    const [productListPromise, ingredientListPromise, recipeListPromise] = await Promise.all([
        db.select().from(products).orderBy(products.name),
        db.select().from(ingredients).orderBy(ingredients.name),
        db
            .select({
                id: recipes.id,
                productId: recipes.productId,
                ingredientName: ingredients.name,
                ingredientUnit: ingredients.unit,
                quantityNeeded: recipes.quantityNeeded,
            })
            .from(recipes)
            .innerJoin(ingredients, eq(recipes.ingredientId, ingredients.id))
    ]);

    const productList = productListPromise;
    const ingredientList = ingredientListPromise;
    const recipeList = recipeListPromise;

    // Group recipes by product
    const recipesByProduct: Record<number, typeof recipeList> = {};
    for (const recipe of recipeList) {
        if (!recipesByProduct[recipe.productId]) {
            recipesByProduct[recipe.productId] = [];
        }
        recipesByProduct[recipe.productId].push(recipe);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Resep</h1>
                    <p className="text-muted-foreground">Kelola komposisi bahan untuk setiap produk</p>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <ChefHat className="h-5 w-5 text-[#A3DF02]" />
                            <h2 className="font-semibold">Daftar Resep Produk</h2>
                        </div>
                        <Badge variant="secondary">{productList.length} produk</Badge>
                    </div>

                    <RecipesClient
                        products={productList}
                        ingredients={ingredientList}
                        recipesByProduct={recipesByProduct}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
