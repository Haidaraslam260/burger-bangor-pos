"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { completeCustomerOrder } from "@/actions/customer-orders";
import { CURRENCY_FORMAT, PAYMENT_METHOD_LABELS } from "@/constants";
import type { PaymentMethod } from "@/db/schema";
import { Banknote, CheckCircle2, Clock, CreditCard, Loader2, QrCode, Wallet } from "lucide-react";
import { toast } from "sonner";

interface PendingOrder {
    id: number;
    transactionDate: Date;
    totalAmount: string;
    customerName: string | null;
    notes: string | null;
    items: {
        id: number;
        productName: string;
        quantity: number;
        unitPrice: string;
        subtotal: string;
    }[];
}

interface CustomerOrdersClientProps {
    orders: PendingOrder[];
}

const paymentOptions: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "qris", label: "QRIS", icon: QrCode },
    { value: "debit", label: "Debit", icon: CreditCard },
    { value: "e_wallet", label: "E-Wallet", icon: Wallet },
];

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function extractTable(notes: string | null) {
    if (!notes) return "-";
    const match = notes.match(/^Meja\s+(.+?)(?:\s+-|$)/i);
    return match?.[1] ?? "-";
}

export default function CustomerOrdersClient({ orders }: CustomerOrdersClientProps) {
    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [amountPaid, setAmountPaid] = useState("");
    const [isPending, startTransition] = useTransition();

    const totalAmount = selectedOrder ? Number(selectedOrder.totalAmount) : 0;
    const paidAmount = paymentMethod === "cash" ? Number(amountPaid || 0) : totalAmount;
    const changeAmount = paymentMethod === "cash" ? Math.max(paidAmount - totalAmount, 0) : 0;
    const isPaymentInsufficient = paymentMethod === "cash" && paidAmount < totalAmount;

    function openPayment(order: PendingOrder) {
        setSelectedOrder(order);
        setPaymentMethod("cash");
        setAmountPaid(String(Math.ceil(Number(order.totalAmount) / 1000) * 1000));
    }

    function handleComplete() {
        if (!selectedOrder) return;

        const formData = new FormData();
        formData.set("orderId", String(selectedOrder.id));
        formData.set("paymentMethod", paymentMethod);
        formData.set("amountPaid", String(paidAmount));

        startTransition(async () => {
            const result = await completeCustomerOrder(formData);
            if (result.success) {
                toast.success(result.message);
                setSelectedOrder(null);
                setAmountPaid("");
            } else {
                toast.error(result.error);
            }
        });
    }

    if (orders.length === 0) {
        return (
            <div className="rounded-lg border py-12 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
                <p>Tidak ada pesanan meja yang menunggu.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4 lg:grid-cols-2">
                {orders.map((order) => {
                    const tableNumber = extractTable(order.notes);
                    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

                    return (
                        <article key={order.id} className="rounded-lg border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-bold">Order #{order.id}</h2>
                                        <Badge variant="outline">Meja {tableNumber}</Badge>
                                    </div>
                                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        {formatDate(order.transactionDate)}
                                    </p>
                                </div>
                                <Badge variant="destructive">Menunggu</Badge>
                            </div>

                            <div className="mt-4 space-y-2">
                                {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between gap-3 text-sm">
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.quantity} x {CURRENCY_FORMAT.format(Number(item.unitPrice))}
                                            </p>
                                        </div>
                                        <p className="font-semibold">{CURRENCY_FORMAT.format(Number(item.subtotal))}</p>
                                    </div>
                                ))}
                            </div>

                            <Separator className="my-4" />

                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">{itemCount} item</p>
                                    <p className="text-xl font-bold text-[#6f9900]">
                                        {CURRENCY_FORMAT.format(Number(order.totalAmount))}
                                    </p>
                                </div>
                                <Button className="bg-[#A3DF02] text-black hover:bg-[#92c902]" onClick={() => openPayment(order)}>
                                    Proses Bayar
                                </Button>
                            </div>
                        </article>
                    );
                })}
            </div>

            <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Selesaikan Pesanan #{selectedOrder?.id}</DialogTitle>
                        <DialogDescription>
                            Setelah pembayaran dikonfirmasi, stok bahan akan otomatis berkurang.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-lg border p-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-bold">{CURRENCY_FORMAT.format(totalAmount)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {paymentOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={paymentMethod === option.value ? "default" : "outline"}
                                        className={paymentMethod === option.value ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                        onClick={() => setPaymentMethod(option.value)}
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </div>

                        {paymentMethod === "cash" ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Bayar</label>
                                <Input
                                    type="number"
                                    min={totalAmount}
                                    step="1000"
                                    value={amountPaid}
                                    onChange={(event) => setAmountPaid(event.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                Pembayaran: <span className="font-semibold">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
                            </div>
                        )}

                        <div className="rounded-lg border p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Dibayar</span>
                                <span>{CURRENCY_FORMAT.format(paidAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Kembalian</span>
                                <span className={isPaymentInsufficient ? "font-medium text-red-600" : "font-medium"}>
                                    {isPaymentInsufficient
                                        ? `Kurang ${CURRENCY_FORMAT.format(totalAmount - paidAmount)}`
                                        : CURRENCY_FORMAT.format(changeAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedOrder(null)}>Batal</Button>
                        <Button
                            className="bg-[#A3DF02] text-black hover:bg-[#92c902]"
                            disabled={isPending || isPaymentInsufficient}
                            onClick={handleComplete}
                        >
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Konfirmasi Bayar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
