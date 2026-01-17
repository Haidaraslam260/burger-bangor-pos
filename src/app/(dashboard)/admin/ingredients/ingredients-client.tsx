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
import { Plus, Trash2, Loader2, Salad } from "lucide-react";
import { createIngredient, deleteIngredient } from "@/actions/ingredients";
import { toast } from "sonner";
import type { Ingredient } from "@/db/schema";

const UNIT_OPTIONS = ["Pcs", "Gram", "Ml", "Slice"];

interface IngredientsClientProps {
    ingredients: Ingredient[];
}

export default function IngredientsClient({ ingredients }: IngredientsClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [deleteId, setDeleteId] = useState<number | null>(null);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createIngredient(null, formData);
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
            const result = await deleteIngredient(id);
            if (result.success) {
                toast.success(result.message);
                setDeleteId(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <>
            {/* Add Ingredient Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Bahan
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Bahan Baru</DialogTitle>
                        <DialogDescription>
                            Isi form berikut untuk menambahkan bahan baku baru.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Bahan</Label>
                            <Input id="name" name="name" placeholder="Contoh: Daging Sapi" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">Satuan</Label>
                            <Select name="unit" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih satuan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNIT_OPTIONS.map((unit) => (
                                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                        <DialogTitle>Hapus Bahan?</DialogTitle>
                        <DialogDescription>
                            Bahan yang masih digunakan di resep tidak bisa dihapus.
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

            {/* Ingredients Table */}
            {ingredients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Salad className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Belum ada bahan baku.</p>
                    <p className="text-sm">Klik tombol &quot;Tambah Bahan&quot; untuk memulai.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">ID</TableHead>
                            <TableHead>Nama Bahan</TableHead>
                            <TableHead>Satuan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ingredients.map((ingredient) => (
                            <TableRow key={ingredient.id}>
                                <TableCell className="font-mono text-muted-foreground">{ingredient.id}</TableCell>
                                <TableCell className="font-medium">{ingredient.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{ingredient.unit}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeleteId(ingredient.id)}
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
