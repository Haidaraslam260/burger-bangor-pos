"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createTable, toggleTableStatus } from "@/actions/tables";
import type { RestaurantTable } from "@/db/schema";
import { Copy, Download, Loader2, Plus, Power } from "lucide-react";

interface TablesClientProps {
    tables: RestaurantTable[];
}

function getOrigin() {
    if (typeof window === "undefined") return "";
    return window.location.origin;
}

function buildMenuUrl(origin: string, tableNumber: string) {
    return `${origin}/menu?table=${encodeURIComponent(tableNumber)}`;
}

export default function TablesClient({ tables }: TablesClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [origin, setOrigin] = useState("");
    const [qrByTableId, setQrByTableId] = useState<Record<number, string>>({});

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setOrigin(getOrigin());
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const activeTables = useMemo(() => tables.filter((table) => table.isActive === 1), [tables]);

    useEffect(() => {
        if (!origin) return;

        let cancelled = false;
        async function generateQrCodes() {
            const entries = await Promise.all(
                tables.map(async (table) => {
                    const url = buildMenuUrl(origin, table.tableNumber);
                    const dataUrl = await QRCode.toDataURL(url, {
                        errorCorrectionLevel: "M",
                        margin: 2,
                        width: 220,
                        color: {
                            dark: "#111827",
                            light: "#ffffff",
                        },
                    });
                    return [table.id, dataUrl] as const;
                })
            );

            if (!cancelled) {
                setQrByTableId(Object.fromEntries(entries));
            }
        }

        generateQrCodes().catch((error) => {
            console.error("QR generation error:", error);
            toast.error("Gagal membuat QR code");
        });

        return () => {
            cancelled = true;
        };
    }, [origin, tables]);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createTable(formData);
            if (result.success) {
                toast.success(result.message);
                setIsOpen(false);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleToggle(tableId: number) {
        startTransition(async () => {
            const result = await toggleTableStatus(tableId);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.error);
            }
        });
    }

    async function copyLink(tableNumber: string) {
        const url = buildMenuUrl(origin || getOrigin(), tableNumber);
        await navigator.clipboard.writeText(url);
        toast.success("Link QR disalin");
    }

    function downloadQr(table: RestaurantTable) {
        const qrDataUrl = qrByTableId[table.id];
        if (!qrDataUrl) {
            toast.error("QR belum siap");
            return;
        }

        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `qr-menu-meja-${table.tableNumber}.png`;
        link.click();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{activeTables.length} aktif</Badge>
                    <Badge variant="outline">{tables.length - activeTables.length} nonaktif</Badge>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                            <Plus className="mr-2 h-4 w-4" />
                            Tambah Meja
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Tambah Meja</DialogTitle>
                            <DialogDescription>
                                Nomor meja akan dipakai di link menu pelanggan.
                            </DialogDescription>
                        </DialogHeader>
                        <form action={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="tableNumber">Nomor Meja</Label>
                                <Input id="tableNumber" name="tableNumber" placeholder="Contoh: 01" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="label">Label Opsional</Label>
                                <Input id="label" name="label" placeholder="Indoor, outdoor, VIP..." />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {tables.length === 0 ? (
                <div className="rounded-lg border py-12 text-center text-muted-foreground">
                    <p>Belum ada meja.</p>
                    <p className="text-sm">Tambahkan meja untuk membuat QR menu pelanggan.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Meja</TableHead>
                            <TableHead>QR</TableHead>
                            <TableHead>Link Menu</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tables.map((table) => {
                            const menuUrl = origin ? buildMenuUrl(origin, table.tableNumber) : `/menu?table=${table.tableNumber}`;
                            const qrDataUrl = qrByTableId[table.id];

                            return (
                                <TableRow key={table.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-semibold">Meja {table.tableNumber}</p>
                                            <p className="text-xs text-muted-foreground">{table.label || "-"}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-white p-1">
                                            {qrDataUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={qrDataUrl} alt={`QR meja ${table.tableNumber}`} className="h-full w-full" />
                                            ) : (
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="max-w-[280px] truncate font-mono text-xs text-muted-foreground">
                                            {menuUrl}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={table.isActive === 1 ? "secondary" : "outline"}>
                                            {table.isActive === 1 ? "Aktif" : "Nonaktif"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => copyLink(table.tableNumber)}
                                                title="Copy link"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-[#6f9900]"
                                                onClick={() => downloadQr(table)}
                                                title="Download QR"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={isPending}
                                                onClick={() => handleToggle(table.id)}
                                                title={table.isActive === 1 ? "Nonaktifkan" : "Aktifkan"}
                                            >
                                                <Power className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
