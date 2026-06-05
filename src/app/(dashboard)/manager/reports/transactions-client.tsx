"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { refundTransaction, voidTransaction } from "@/actions/transactions";
import type { PaymentMethod, TransactionStatus, TransactionType } from "@/db/schema";
import { CURRENCY_FORMAT, PAYMENT_METHOD_LABELS, TRANSACTION_STATUS_LABELS } from "@/constants";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface TransactionRow {
    id: number;
    transactionDate: Date;
    type: TransactionType;
    status: TransactionStatus;
    totalAmount: string;
    paymentMethod: PaymentMethod;
    customerName: string | null;
    cashierName: string | null;
}

interface TransactionsClientProps {
    transactions: TransactionRow[];
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getStatusClass(status: TransactionStatus) {
    if (status === "completed") return "bg-green-100 text-green-700 border-green-200";
    if (status === "voided") return "bg-red-100 text-red-700 border-red-200";
    return "bg-[#F1FFD0] text-[#5f8500] border-[#D6F58A]";
}

export default function TransactionsClient({ transactions }: TransactionsClientProps) {
    const [isPending, startTransition] = useTransition();
    const [dialog, setDialog] = useState<{
        type: "void" | "refund";
        transaction: TransactionRow;
    } | null>(null);
    const [reason, setReason] = useState("");

    function handleSubmit() {
        if (!dialog) return;

        startTransition(async () => {
            const action = dialog.type === "void" ? voidTransaction : refundTransaction;
            const result = await action(dialog.transaction.id, reason);

            if (result.success) {
                toast.success(result.message);
                setDialog(null);
                setReason("");
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Metode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Belum ada transaksi
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-mono">#{transaction.id}</TableCell>
                                <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{transaction.customerName || "-"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {transaction.cashierName || "Unknown"} - {transaction.type === "dine_in" ? "Dine In" : "Take Away"}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>{PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={getStatusClass(transaction.status)}>
                                        {TRANSACTION_STATUS_LABELS[transaction.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {CURRENCY_FORMAT.format(Number(transaction.totalAmount))}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-[#6f9900]"
                                            disabled={transaction.status !== "completed"}
                                            onClick={() => setDialog({ type: "refund", transaction })}
                                            title="Refund transaksi"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600"
                                            disabled={transaction.status !== "completed"}
                                            onClick={() => setDialog({ type: "void", transaction })}
                                            title="Void transaksi"
                                        >
                                            <Ban className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.type === "void" ? "Void Transaksi" : "Refund Transaksi"}
                        </DialogTitle>
                        <DialogDescription>
                            Stok bahan dari transaksi #{dialog?.transaction.id} akan dikembalikan berdasarkan resep produk.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Alasan</label>
                        <Input
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Pesanan dibatalkan, salah input, refund customer..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>
                            Batal
                        </Button>
                        <Button
                            variant={dialog?.type === "void" ? "destructive" : "default"}
                            className={dialog?.type === "refund" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                            disabled={isPending || reason.trim().length < 3}
                            onClick={handleSubmit}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Konfirmasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
