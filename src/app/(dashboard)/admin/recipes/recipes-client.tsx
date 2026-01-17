"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { deleteRecipeItem, upsertRecipeItem } from "@/actions/recipes";
import { toast } from "sonner";
import type { Product, Ingredient } from "@/db/schema";

interface RecipeItem {
    id: number;
    productId: number;
    ingredientName: string;
    ingredientUnit: string;
    quantityNeeded: number;
}

interface RecipesClientProps {
    products: Product[];
    ingredients: Ingredient[];
    recipesByProduct: Record<number, RecipeItem[]>;
}

export default function RecipesClient({ products, ingredients, recipesByProduct }: RecipesClientProps) {
    const [isPending, startTransition] = useTransition();
    const [editingProduct, setEditingProduct] = useState<number | null>(null);
    const [selectedIngredient, setSelectedIngredient] = useState<string>("");
    const [quantity, setQuantity] = useState<string>("");

    function handleAddRecipeItem(productId: number) {
        if (!selectedIngredient || !quantity) {
            toast.error("Pilih bahan dan masukkan jumlah");
            return;
        }

        startTransition(async () => {
            const result = await upsertRecipeItem(productId, Number(selectedIngredient), Number(quantity));
            if (result.success) {
                toast.success(result.message);
                setSelectedIngredient("");
                setQuantity("");
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleDeleteRecipeItem(recipeId: number) {
        startTransition(async () => {
            const result = await deleteRecipeItem(recipeId);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => {
                const productRecipes = recipesByProduct[product.id] || [];
                const isEditing = editingProduct === product.id;

                return (
                    <Card key={product.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">{product.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{product.category}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant={productRecipes.length > 0 ? "default" : "outline"}
                                        className={productRecipes.length > 0 ? "bg-green-100 text-green-700 border-green-200" : ""}
                                    >
                                        {productRecipes.length} bahan
                                    </Badge>
                                    <Button
                                        variant={isEditing ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setEditingProduct(isEditing ? null : product.id)}
                                        className={isEditing ? "bg-orange-500 hover:bg-orange-600" : ""}
                                    >
                                        {isEditing ? "Tutup" : "Edit"}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {productRecipes.length === 0 && !isEditing ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    Belum ada resep. Klik &quot;Edit&quot; untuk menambahkan.
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="h-9 text-xs">Bahan</TableHead>
                                                <TableHead className="h-9 text-xs text-right">Qty</TableHead>
                                                {isEditing && <TableHead className="h-9 text-xs w-12"></TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productRecipes.map((recipe) => (
                                                <TableRow key={recipe.id} className="hover:bg-muted/30">
                                                    <TableCell className="py-2 text-sm">{recipe.ingredientName}</TableCell>
                                                    <TableCell className="py-2 text-sm text-right">
                                                        <span className="font-medium">{recipe.quantityNeeded}</span>
                                                        <span className="text-muted-foreground ml-1 text-xs">{recipe.ingredientUnit}</span>
                                                    </TableCell>
                                                    {isEditing && (
                                                        <TableCell className="py-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-500 hover:text-red-700"
                                                                onClick={() => handleDeleteRecipeItem(recipe.id)}
                                                                disabled={isPending}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {isEditing && (
                                        <div className="p-4 border-t bg-muted/20 space-y-3">
                                            <p className="text-xs font-medium text-muted-foreground">Tambah Bahan:</p>
                                            <div className="flex gap-2">
                                                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                                                    <SelectTrigger className="flex-1 h-9">
                                                        <SelectValue placeholder="Pilih bahan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ingredients.map((ing) => (
                                                            <SelectItem key={ing.id} value={String(ing.id)}>
                                                                {ing.name} ({ing.unit})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    placeholder="Qty"
                                                    value={quantity}
                                                    onChange={(e) => setQuantity(e.target.value)}
                                                    className="w-20 h-9"
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-9 bg-orange-500 hover:bg-orange-600"
                                                    onClick={() => handleAddRecipeItem(product.id)}
                                                    disabled={isPending}
                                                >
                                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
