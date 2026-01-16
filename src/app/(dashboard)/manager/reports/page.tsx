import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    CreditCard,
    CalendarRange,
    ArrowUpRight
} from "lucide-react";
import { CURRENCY_FORMAT } from "@/constants";
import { db } from "@/lib/db";
import { transactions, transactionItems, products } from "@/db/schema";
import { sql, sum, count, desc, eq } from "drizzle-orm";

export default async function ReportsPage() {
    // 1. Fetch Real Stats
    // Today's Sales
    const [todayStats] = await db
        .select({
            sales: sum(transactions.totalAmount),
            count: count(transactions.id)
        })
        .from(transactions)
        .where(sql`DATE(${transactions.transactionDate}) = DATE('now')`);

    // Total Revenue (All Time)
    const [totalStats] = await db
        .select({
            sales: sum(transactions.totalAmount),
            count: count(transactions.id)
        })
        .from(transactions);

    // Top Products (by quantity sold)
    const topProducts = await db
        .select({
            name: products.name,
            sold: sum(transactionItems.quantity),
            revenue: sum(transactionItems.subtotal)
        })
        .from(transactionItems)
        .innerJoin(products, eq(transactionItems.productId, products.id))
        .groupBy(products.name)
        .orderBy(desc(sum(transactionItems.quantity)))
        .limit(5);

    const stats = {
        today: {
            sales: Number(todayStats?.sales) || 0,
            transactions: Number(todayStats?.count) || 0,
        },
        total: {
            sales: Number(totalStats?.sales) || 0,
            transactions: Number(totalStats?.count) || 0,
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
                    <p className="text-muted-foreground">Analisis performa bisnis secara realtime</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
                    <CalendarRange className="h-4 w-4" />
                    <span>{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Omset Hari Ini</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{CURRENCY_FORMAT.format(stats.today.sales)}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                            Realtime update
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
                        <CreditCard className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.today.transactions}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Nota berhasil
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{CURRENCY_FORMAT.format(stats.total.sales)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Akumulasi semua periode
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rata-rata Order</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.total.transactions > 0
                                ? CURRENCY_FORMAT.format(stats.total.sales / stats.total.transactions)
                                : "Rp 0"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Per transaksi
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Top Products */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Produk Terlaris</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="flex items-center gap-4 group">
                                    <div className={`
                    flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm
                    ${index === 0 ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-200' :
                                            index === 1 ? 'bg-gray-100 text-gray-600' :
                                                index === 2 ? 'bg-orange-50 text-orange-800' : 'bg-muted text-muted-foreground'}
                  `}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium text-sm leading-none">{product.name}</p>
                                        <div className="flex items-center text-xs text-muted-foreground">
                                            <div className="w-full max-w-[100px] h-1.5 bg-muted rounded-full overflow-hidden mr-2">
                                                <div
                                                    className="h-full bg-orange-500 rounded-full"
                                                    style={{ width: `${(Number(product.sold) / Number(topProducts[0].sold)) * 100}%` }}
                                                />
                                            </div>
                                            {product.sold} terjual
                                        </div>
                                    </div>
                                    <div className="font-semibold text-sm">
                                        {CURRENCY_FORMAT.format(Number(product.revenue))}
                                    </div>
                                </div>
                            ))}

                            {topProducts.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    Belum ada data penjualan
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Placeholder for future chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Metode Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg m-4 border-2 border-dashed">
                        <div className="text-center">
                            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Grafik akan tersedia setelah<br />transaksi lebih banyak</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
