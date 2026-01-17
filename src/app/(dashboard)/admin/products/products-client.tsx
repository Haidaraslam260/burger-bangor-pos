"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Plus, Trash2, Loader2, Power } from "lucide-react";
import { createProduct, deleteProduct, toggleProductStatus } from "@/actions/products";
import { CURRENCY_FORMAT, PRODUCT_CATEGORIES } from "@/constants";
import { toast } from "sonner";
import type { Product } from "@/db/schema";

interface ProductsClientProps {
    products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createProduct(null, formData);
            if (result.success) {
                toast.success(result.message);
                setIsOpen(false);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleDelete(id: number) {
        startTransition(async () => {
            const result = await deleteProduct(id);
            if (result.success) {
                toast.success(result.message);
                setDeleteId(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleToggleStatus(id: number, currentStatus: number) {
        startTransition(async () => {
            const result = await toggleProductStatus(id, currentStatus);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <>
            {/* Add Product Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Produk
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Produk Baru</DialogTitle>
                        <DialogDescription>
                            Isi form berikut untuk menambahkan produk baru.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Produk</Label>
                            <Input id="name" name="name" placeholder="Burger Spesial" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Select name="category" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRODUCT_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Harga</Label>
                            <Input id="price" name="price" type="number" placeholder="25000" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi (opsional)</Label>
                            <Input id="description" name="description" placeholder="Burger dengan topping spesial..." />
                        </div>
                        <input type="hidden" name="isActive" value="true" />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-orange-500 hover:bg-orange-600">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus Produk?</DialogTitle>
                        <DialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Produk akan dihapus secara permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteId && handleDelete(deleteId)}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Products Table */}
            {products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>Belum ada produk. Klik tombol &quot;Tambah Produk&quot; untuk memulai.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">ID</TableHead>
                            <TableHead>Nama Produk</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-mono text-muted-foreground">{product.id}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{product.name}</p>
                                        {product.description && (
                                            <p className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</p>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{product.category}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {CURRENCY_FORMAT.format(Number(product.price))}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={product.isActive === 1 ? "default" : "secondary"}
                                        className={product.isActive === 1 ? "bg-green-100 text-green-700 border-green-200" : ""}
                                    >
                                        {product.isActive === 1 ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleToggleStatus(product.id, product.isActive)}
                                            title={product.isActive === 1 ? "Nonaktifkan" : "Aktifkan"}
                                        >
                                            <Power className={`h-4 w-4 ${product.isActive === 1 ? "text-green-600" : "text-gray-400"}`} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeleteId(product.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </>
    );
}
