import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { products, restaurantTables, transactionItems, transactions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import CustomerOrdersClient from "./customer-orders-client";

export default async function CustomerOrdersPage() {
    const rows = await db
        .select({
            transactionId: transactions.id,
            transactionDate: transactions.transactionDate,
            totalAmount: transactions.totalAmount,
            tableNumber: restaurantTables.tableNumber,
            customerName: transactions.customerName,
            notes: transactions.notes,
            reservationExpiresAt: transactions.reservationExpiresAt,
            itemId: transactionItems.id,
            productName: products.name,
            quantity: transactionItems.quantity,
            unitPrice: transactionItems.unitPrice,
            subtotal: transactionItems.subtotal,
        })
        .from(transactions)
        .innerJoin(transactionItems, eq(transactionItems.transactionId, transactions.id))
        .innerJoin(products, eq(products.id, transactionItems.productId))
        .leftJoin(restaurantTables, eq(restaurantTables.id, transactions.restaurantTableId))
        .where(eq(transactions.status, "pending"))
        .orderBy(desc(transactions.transactionDate));

    const ordersById = new Map<number, {
        id: number;
        transactionDate: Date;
        totalAmount: string;
        tableNumber: string | null;
        customerName: string | null;
        notes: string | null;
        reservationExpiresAt: Date | null;
        items: {
            id: number;
            productName: string;
            quantity: number;
            unitPrice: string;
            subtotal: string;
        }[];
    }>();

    for (const row of rows) {
        const existing = ordersById.get(row.transactionId) ?? {
            id: row.transactionId,
            transactionDate: row.transactionDate,
            totalAmount: row.totalAmount,
            tableNumber: row.tableNumber,
            customerName: row.customerName,
            notes: row.notes,
            reservationExpiresAt: row.reservationExpiresAt,
            items: [],
        };

        existing.items.push({
            id: row.itemId,
            productName: row.productName,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            subtotal: row.subtotal,
        });
        ordersById.set(row.transactionId, existing);
    }

    const orders = Array.from(ordersById.values());

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pesanan Meja</h1>
                    <p className="text-muted-foreground">Pesanan pelanggan yang menunggu pembayaran kasir</p>
                </div>
                <Badge variant={orders.length > 0 ? "destructive" : "secondary"}>
                    {orders.length} menunggu
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        Daftar Pesanan Masuk
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerOrdersClient orders={orders} />
                </CardContent>
            </Card>
        </div>
    );
}
