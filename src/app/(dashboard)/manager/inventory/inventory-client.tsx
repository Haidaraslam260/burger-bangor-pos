"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Package,
    AlertTriangle,
    Loader2,
    Plus,
    CalendarClock,
    Boxes,
    ClipboardCheck,
    Save,
} from "lucide-react";
import { addInventoryBatch, adjustInventory, updateMinimumStock } from "@/actions/inventory";
import { toast } from "sonner";

interface InventoryBatch {
    id: number;
    stockQuantity: number;
    receivedDate: string;
    expiryDate: string | null;
    supplierName: string | null;
    notes: string | null;
}

interface InventoryItem {
    ingredientId: number;
    totalStock: number;
    name: string;
    unit: string;
    minStockThreshold: number;
    nearestExpiryDate: string | null;
    batches: InventoryBatch[];
}

interface InventoryClientProps {
    inventoryItems: InventoryItem[];
}

function getDaysUntil(dateValue: string | null) {
    if (!dateValue) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateValue);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value));
}

export default function InventoryClient({ inventoryItems }: InventoryClientProps) {
    const [isPending, startTransition] = useTransition();
    const [restockOpen, setRestockOpen] = useState(false);
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
    const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
    const [minimumEditId, setMinimumEditId] = useState<number | null>(null);
    const [minimumValue, setMinimumValue] = useState("");

    const lowStockItems = inventoryItems.filter(
        (item) => item.totalStock < item.minStockThreshold
    );
    const expiringItems = inventoryItems.filter((item) => {
        const days = getDaysUntil(item.nearestExpiryDate);
        return days !== null && days >= 0 && days <= 7;
    });
    const expiredItems = inventoryItems.filter((item) =>
        item.batches.some((batch) => {
            const days = getDaysUntil(batch.expiryDate);
            return batch.stockQuantity > 0 && days !== null && days < 0;
        })
    );

    function handleAddBatch(formData: FormData) {
        startTransition(async () => {
            const result = await addInventoryBatch(formData);
            if (result.success) {
                toast.success(result.message);
                setRestockOpen(false);
                setSelectedIngredientId("");
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleAdjust(formData: FormData) {
        if (!adjustingItem) return;
        formData.set("ingredientId", String(adjustingItem.ingredientId));

        startTransition(async () => {
            const result = await adjustInventory(formData);
            if (result.success) {
                toast.success(result.message);
                setAdjustingItem(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleSaveMinimum(item: InventoryItem) {
        const value = Number(minimumValue);
        if (!Number.isInteger(value) || value < 0) {
            toast.error("Minimum stok tidak valid");
            return;
        }

        startTransition(async () => {
            const result = await updateMinimumStock(item.ingredientId, value);
            if (result.success) {
                toast.success(result.message);
                setMinimumEditId(null);
                setMinimumValue("");
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {expiredItems.length > 0 && (
                        <Badge variant="destructive" className="h-8 px-3">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {expiredItems.length} expired
                        </Badge>
                    )}
                    {lowStockItems.length > 0 && (
                        <Badge variant="destructive" className="h-8 px-3">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {lowStockItems.length} stok rendah
                        </Badge>
                    )}
                    {expiringItems.length > 0 && (
                        <Badge variant="outline" className="h-8 px-3 border-[#D6F58A] text-[#5f8500]">
                            <CalendarClock className="h-4 w-4 mr-1" />
                            {expiringItems.length} mendekati expired
                        </Badge>
                    )}
                </div>

                <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Stok
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Tambah Stok Bahan</DialogTitle>
                            <DialogDescription>
                                Isi bahan dan jumlah stok yang masuk. Detail lain boleh dikosongkan.
                            </DialogDescription>
                        </DialogHeader>
                        <form action={handleAddBatch} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>Bahan</Label>
                                    <Select
                                        name="ingredientId"
                                        value={selectedIngredientId}
                                        onValueChange={setSelectedIngredientId}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih bahan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventoryItems.map((item) => (
                                                <SelectItem key={item.ingredientId} value={String(item.ingredientId)}>
                                                    {item.name} ({item.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="stockQuantity">Jumlah</Label>
                                    <Input id="stockQuantity" name="stockQuantity" type="number" min="1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplierName">Supplier</Label>
                                    <Input id="supplierName" name="supplierName" placeholder="Nama supplier" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="receivedDate">Tanggal Masuk</Label>
                                    <Input
                                        id="receivedDate"
                                        name="receivedDate"
                                        type="date"
                                        defaultValue={new Date().toISOString().split("T")[0]}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDate">Expired</Label>
                                    <Input id="expiryDate" name="expiryDate" type="date" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="notes">Catatan</Label>
                                    <Input id="notes" name="notes" placeholder="Nomor PO, kondisi barang, dll." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setRestockOpen(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Simpan Stok
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {inventoryItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Belum ada bahan baku.</p>
                    <p className="text-sm">Tambahkan bahan di menu Admin - Bahan Baku.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {inventoryItems.map((item) => {
                        const isLow = item.totalStock < item.minStockThreshold;
                        const daysUntilExpiry = getDaysUntil(item.nearestExpiryDate);
                        const activeBatches = item.batches.filter((batch) => batch.stockQuantity > 0);
                        const hasExpired = activeBatches.some(
                            (batch) => {
                                const days = getDaysUntil(batch.expiryDate);
                                return days !== null && days < 0;
                            }
                        );
                        const isExpiring = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

                        return (
                            <Card
                                key={item.ingredientId}
                                className={hasExpired ? "border-red-200 dark:border-red-900/60" : isLow || isExpiring ? "border-[#D6F58A] dark:border-[#A3DF02]/60" : ""}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-base">{item.name}</CardTitle>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                <Package className="h-3 w-3" />
                                                {item.unit}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {hasExpired && <Badge variant="destructive">Expired</Badge>}
                                            {isLow && <Badge variant="destructive">Stok rendah</Badge>}
                                            {isExpiring && (
                                                <Badge variant="outline" className="border-[#D6F58A] text-[#5f8500]">
                                                    Segera expired
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Total Stok</p>
                                            <p className="text-3xl font-bold">
                                                {item.totalStock}
                                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                                    {item.unit}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Batas Minimum</p>
                                            {minimumEditId === item.ingredientId ? (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={minimumValue}
                                                        onChange={(event) => setMinimumValue(event.target.value)}
                                                        className="h-8"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleSaveMinimum(item)}
                                                        disabled={isPending}
                                                    >
                                                        <Save className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="font-medium underline-offset-4 hover:underline"
                                                    onClick={() => {
                                                        setMinimumEditId(item.ingredientId);
                                                        setMinimumValue(String(item.minStockThreshold));
                                                    }}
                                                >
                                                    {item.minStockThreshold} {item.unit}
                                                </button>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Expired Terdekat</p>
                                            <p className={hasExpired ? "font-medium text-red-700" : isExpiring ? "font-medium text-[#5f8500]" : "font-medium"}>
                                                {item.nearestExpiryDate ? formatDate(item.nearestExpiryDate) : "Tidak ada"}
                                            </p>
                                        </div>
                                    </div>

                                    <details className="rounded-md border">
                                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium">
                                            <span className="flex items-center gap-1">
                                                <Boxes className="h-3.5 w-3.5" />
                                                Detail Stok
                                            </span>
                                            <span>{activeBatches.length} catatan</span>
                                        </summary>
                                        <div className="max-h-36 overflow-y-auto border-t">
                                            {activeBatches.length === 0 ? (
                                                <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ada stok aktif</p>
                                            ) : (
                                                activeBatches.map((batch) => {
                                                    const batchExpiryDays = getDaysUntil(batch.expiryDate);
                                                    const isBatchExpired = batchExpiryDays !== null && batchExpiryDays < 0;
                                                    const isBatchExpiring = batchExpiryDays !== null && batchExpiryDays >= 0 && batchExpiryDays <= 7;

                                                    return (
                                                        <div key={batch.id} className="border-b last:border-b-0 px-3 py-2 text-xs">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-medium truncate">
                                                                    Masuk {formatDate(batch.receivedDate)}
                                                                </span>
                                                                <span>{batch.stockQuantity} {item.unit}</span>
                                                            </div>
                                                            <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
                                                                <span className="truncate">{batch.supplierName || "Tanpa supplier"}</span>
                                                                <span className={isBatchExpired ? "text-red-700" : isBatchExpiring ? "text-[#5f8500]" : ""}>
                                                                    {batch.expiryDate
                                                                        ? `${isBatchExpired ? "Expired" : "Exp"} ${formatDate(batch.expiryDate)}`
                                                                        : "Tidak ada expired"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </details>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setAdjustingItem(item)}
                                    >
                                        <ClipboardCheck className="h-4 w-4 mr-2" />
                                        Koreksi Stok
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={adjustingItem !== null} onOpenChange={(open) => !open && setAdjustingItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Koreksi Stok</DialogTitle>
                        <DialogDescription>
                            {adjustingItem ? `${adjustingItem.name} - stok saat ini ${adjustingItem.totalStock} ${adjustingItem.unit}` : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {adjustingItem && (
                        <form action={handleAdjust} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Jenis Koreksi</Label>
                                <Select name="type" defaultValue="waste" required>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="waste">Terbuang</SelectItem>
                                        <SelectItem value="spoilage">Rusak / Expired</SelectItem>
                                        <SelectItem value="transfer">Transfer Keluar</SelectItem>
                                        <SelectItem value="opname">Set Stok Akhir</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="quantity">Jumlah Dikurangi</Label>
                                    <Input id="quantity" name="quantity" type="number" min="1" placeholder="Untuk terbuang/rusak" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="opnameQuantity">Stok Akhir</Label>
                                    <Input id="opnameQuantity" name="opnameQuantity" type="number" min="0" placeholder="Untuk set stok" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason">Catatan</Label>
                                <Input id="reason" name="reason" placeholder="Contoh: expired, rusak, transfer outlet" />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setAdjustingItem(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
