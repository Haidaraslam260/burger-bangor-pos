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
import { ImageIcon, Plus, Loader2, Power, Upload, Pencil } from "lucide-react";
import { createProduct, toggleProductStatus, updateProduct } from "@/actions/products";
import { CURRENCY_FORMAT, PRODUCT_CATEGORIES } from "@/constants";
import { toast } from "sonner";
import type { Product } from "@/db/schema";

interface ProductsClientProps {
    products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [editImageUrl, setEditImageUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createProduct(null, formData);
            if (result.success) {
                toast.success(result.message);
                setIsOpen(false);
                setImageUrl("");
            } else {
                toast.error(result.error);
            }
        });
    }

    function openEditDialog(product: Product) {
        setEditingProduct(product);
        setEditImageUrl(product.imageUrl || "");
    }

    function handleUpdate(formData: FormData) {
        if (!editingProduct) return;

        startTransition(async () => {
            const result = await updateProduct(editingProduct.id, null, formData);
            if (result.success) {
                toast.success(result.message);
                setEditingProduct(null);
                setEditImageUrl("");
            } else {
                toast.error(result.error);
            }
        });
    }

    async function handleUploadImage(file: File | null, onUploaded: (path: string) => void) {
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/uploads/products", {
                method: "POST",
                body: formData,
            });
            const result = await response.json() as { path?: string; error?: string };

            if (!response.ok || !result.path) {
                toast.error(result.error || "Gagal upload gambar");
                return;
            }

            onUploaded(result.path);
            toast.success("Gambar berhasil diupload");
        } catch (error) {
            console.error("Upload product image error:", error);
            toast.error("Gagal upload gambar");
        } finally {
            setIsUploading(false);
        }
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
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) setImageUrl("");
            }}>
                <DialogTrigger asChild>
                    <Button className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Produk
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
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
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">URL Gambar (opsional)</Label>
                            <div className="grid gap-2">
                                <Input
                                    id="imageUrl"
                                    name="imageUrl"
                                    value={imageUrl}
                                    onChange={(event) => setImageUrl(event.target.value)}
                                    placeholder="Upload gambar atau isi URL/path"
                                />
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="imageFile"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(event) => handleUploadImage(
                                            event.target.files?.[0] ?? null,
                                            setImageUrl
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        disabled={isUploading}
                                        onClick={() => document.getElementById("imageFile")?.click()}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Upload dari Komputer
                                    </Button>
                                </div>
                            </div>
                            {imageUrl && (
                                <div className="flex items-center gap-3 rounded-md border p-2">
                                    <div className="h-14 w-14 overflow-hidden rounded bg-muted">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imageUrl} alt="Preview produk" className="h-full w-full object-cover" />
                                    </div>
                                    <p className="min-w-0 truncate text-xs text-muted-foreground">{imageUrl}</p>
                                </div>
                            )}
                        </div>
                        <input type="hidden" name="isActive" value="true" />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={editingProduct !== null} onOpenChange={(open) => {
                if (!open) {
                    setEditingProduct(null);
                    setEditImageUrl("");
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Produk</DialogTitle>
                        <DialogDescription>
                            Ubah detail produk atau upload gambar baru.
                        </DialogDescription>
                    </DialogHeader>
                    {editingProduct && (
                        <form action={handleUpdate} className="min-w-0 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nama Produk</Label>
                                <Input id="edit-name" name="name" defaultValue={editingProduct.name} className="w-full" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Kategori</Label>
                                <Select name="category" defaultValue={editingProduct.category} required>
                                    <SelectTrigger id="edit-category" className="w-full">
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
                                <Label htmlFor="edit-price">Harga</Label>
                                <Input
                                    id="edit-price"
                                    name="price"
                                    type="number"
                                    defaultValue={editingProduct.price}
                                    className="w-full"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Deskripsi (opsional)</Label>
                                <Input
                                    id="edit-description"
                                    name="description"
                                    defaultValue={editingProduct.description || ""}
                                    className="w-full"
                                    placeholder="Burger dengan topping spesial..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-imageUrl">URL Gambar (opsional)</Label>
                                <div className="grid gap-2">
                                    <Input
                                        id="edit-imageUrl"
                                        name="imageUrl"
                                        value={editImageUrl}
                                        onChange={(event) => setEditImageUrl(event.target.value)}
                                        className="w-full"
                                        placeholder="Upload gambar atau isi URL/path"
                                    />
                                    <Input
                                        id="edit-imageFile"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="hidden"
                                        onChange={(event) => handleUploadImage(
                                            event.target.files?.[0] ?? null,
                                            setEditImageUrl
                                        )}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        disabled={isUploading}
                                        onClick={() => document.getElementById("edit-imageFile")?.click()}
                                    >
                                        {isUploading ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Upload className="mr-2 h-4 w-4" />
                                        )}
                                        Upload dari Komputer
                                    </Button>
                                </div>
                                {editImageUrl && (
                                    <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={editImageUrl} alt="Preview produk" className="h-full w-full object-cover" />
                                        </div>
                                        <p className="min-w-0 flex-1 break-all text-xs text-muted-foreground sm:truncate">{editImageUrl}</p>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 self-start sm:self-auto"
                                            onClick={() => setEditImageUrl("")}
                                        >
                                            Hapus
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <input type="hidden" name="isActive" value={editingProduct.isActive === 1 ? "true" : "false"} />
                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => setEditingProduct(null)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-[#A3DF02] text-black hover:bg-[#92c902] sm:w-auto"
                                >
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
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
                            <TableHead className="w-[72px]">Gambar</TableHead>
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
                                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-muted">
                                        {product.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </TableCell>
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
                                            onClick={() => openEditDialog(product)}
                                            title="Edit produk"
                                        >
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleToggleStatus(product.id, product.isActive)}
                                            title={product.isActive === 1 ? "Nonaktifkan" : "Aktifkan"}
                                        >
                                            <Power className={`h-4 w-4 ${product.isActive === 1 ? "text-green-600" : "text-gray-400"}`} />
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
