"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Package,
    AlertTriangle,
    Loader2,
    Plus,
    Save,
    Edit2,
} from "lucide-react";
import { updateStock, addStock } from "@/actions/inventory";
import { toast } from "sonner";

interface InventoryItem {
    id: number;
    stockQuantity: number;
    name: string;
    unit: string;
    ingredientId: number;
}

interface InventoryClientProps {
    inventoryItems: InventoryItem[];
    lowStockThreshold: number;
}

export default function InventoryClient({
    inventoryItems,
    lowStockThreshold,
}: InventoryClientProps) {
    const [isPending, startTransition] = useTransition();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [addingId, setAddingId] = useState<number | null>(null);
    const [addValue, setAddValue] = useState<string>("");

    // Count low stock items
    const lowStockItems = inventoryItems.filter(
        (item) => item.stockQuantity < lowStockThreshold
    );

    function handleStartEdit(item: InventoryItem) {
        setEditingId(item.id);
        setEditValue(String(item.stockQuantity));
        setAddingId(null);
    }

    function handleSaveEdit(inventoryId: number) {
        const newQty = parseInt(editValue);
        if (isNaN(newQty) || newQty < 0) {
            toast.error("Masukkan angka yang valid (>= 0)");
            return;
        }

        startTransition(async () => {
            const result = await updateStock(inventoryId, newQty);
            if (result.success) {
                toast.success(result.message);
                setEditingId(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleStartAdd(item: InventoryItem) {
        setAddingId(item.id);
        setAddValue("");
        setEditingId(null);
    }

    function handleAddStock(inventoryId: number) {
        const qty = parseInt(addValue);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Masukkan angka yang valid (> 0)");
            return;
        }

        startTransition(async () => {
            const result = await addStock(inventoryId, qty);
            if (result.success) {
                toast.success(result.message);
                setAddingId(null);
                setAddValue("");
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Warning Banner */}
            {lowStockItems.length > 0 && (
                <div className="border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-red-900 dark:text-red-200">
                            Stok Menipis
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {lowStockItems.length} bahan perlu segera di-restock (Stok &lt;{" "}
                            {lowStockThreshold}).
                        </p>
                    </div>
                </div>
            )}

            {/* Inventory Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inventoryItems.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Belum ada bahan baku.</p>
                        <p className="text-sm">Tambahkan bahan di menu Admin → Bahan Baku.</p>
                    </div>
                ) : (
                    inventoryItems.map((item) => {
                        const isLow = item.stockQuantity < lowStockThreshold;
                        const isEditing = editingId === item.id;
                        const isAdding = addingId === item.id;

                        return (
                            <Card
                                key={item.id}
                                className={`transition-all hover:shadow-md ${isLow ? "border-red-200 dark:border-red-900/50" : ""
                                    }`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base font-semibold">
                                                {item.name}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Package className="h-3 w-3" /> {item.unit}
                                            </p>
                                        </div>
                                        {isLow && (
                                            <Badge variant="destructive" className="h-6">
                                                Low
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {/* Stock Display/Edit */}
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="h-10 text-lg font-bold"
                                                    min="0"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    className="h-10 w-10 bg-green-500 hover:bg-green-600"
                                                    onClick={() => handleSaveEdit(item.id)}
                                                    disabled={isPending}
                                                >
                                                    {isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-3xl font-bold">
                                                        {item.stockQuantity}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground ml-1">
                                                        {item.unit}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleStartEdit(item)}
                                                    title="Edit stok"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Quick Add Stock */}
                                        <div className="pt-3 border-t">
                                            {isAdding ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={addValue}
                                                        onChange={(e) => setAddValue(e.target.value)}
                                                        placeholder="Jumlah"
                                                        className="h-9"
                                                        min="1"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="h-9 bg-orange-500 hover:bg-orange-600"
                                                        onClick={() => handleAddStock(item.id)}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Plus className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9"
                                                        onClick={() => setAddingId(null)}
                                                    >
                                                        Batal
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-9 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                                                    onClick={() => handleStartAdd(item)}
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Tambah Stok
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
