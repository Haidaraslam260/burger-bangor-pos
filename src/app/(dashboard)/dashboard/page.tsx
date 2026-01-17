import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
    DollarSign,
    Package,
    FileText,
    UtensilsCrossed,
    ChefHat,
    TrendingUp,
    AlertTriangle,
    ArrowRight,
    ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, inventory } from "@/db/schema";
import { sql, count, sum, lt } from "drizzle-orm";

export default async function DashboardPage() {
    const session = await auth();
    const user = session?.user;

    // Real Data Fetching
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Sales Today
    const [salesResult] = await db
        .select({ total: sum(transactions.totalAmount) })
        .from(transactions)
        .where(sql`DATE(${transactions.transactionDate}) = DATE('now')`);

    const totalSales = Number(salesResult?.total) || 0;

    // 2. Low Stock Items (Stock < 10)
    const [lowStockResult] = await db
        .select({ count: count() })
        .from(inventory)
        .where(lt(inventory.stockQuantity, 10));

    const lowStockCount = lowStockResult?.count || 0;

    // 3. Total Transactions Today
    const [trxCountResult] = await db
        .select({ count: count() })
        .from(transactions)
        .where(sql`DATE(${transactions.transactionDate}) = DATE('now')`);

    const totalTrx = trxCountResult?.count || 0;

    // Quick Actions Config based on Role
    const quickActions = [
        {
            title: "Buat Transaksi",
            description: "Masuk ke menu POS kasir",
            icon: ShoppingCart,
            href: "/pos",
            color: "text-green-600",
            bg: "bg-green-100 dark:bg-green-900/20",
            roles: ["admin", "manager", "kasir"],
        },
        {
            title: "Kelola Menu",
            description: "Tambah atau update produk",
            icon: UtensilsCrossed,
            href: "/admin/products",
            color: "text-orange-600",
            bg: "bg-orange-100 dark:bg-orange-900/20",
            roles: ["admin"],
        },
        {
            title: "Cek Inventori",
            description: "Lihat stok bahan baku",
            icon: Package,
            href: "/manager/inventory",
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/20",
            roles: ["admin", "manager"],
        },
        {
            title: "Laporan",
            description: "Analisis penjualan harian",
            icon: TrendingUp,
            href: "/manager/reports",
            color: "text-purple-600",
            bg: "bg-purple-100 dark:bg-purple-900/20",
            roles: ["admin", "manager"],
        },
    ];

    const allowedActions = quickActions.filter((action) =>
        action.roles.includes(user?.role || "")
    );

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Selamat datang kembali, <span className="font-medium text-foreground">{user?.fullName}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
                    <ChefHat className="h-4 w-4" />
                    <span className="capitalize">{user?.role} Access</span>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Hari ini
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTrx}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Order hari ini
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-red-600" : "text-gray-400"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : ""}`}>
                            {lowStockCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Item perlu restock
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    Akses Cepat
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {allowedActions.map((action) => (
                        <Link key={action.href} href={action.href}>
                            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-dashed hover:border-solid">
                                <CardHeader>
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${action.bg}`}>
                                        <action.icon className={`h-6 w-6 ${action.color}`} />
                                    </div>
                                    <CardTitle className="text-base">{action.title}</CardTitle>
                                    <CardDescription>{action.description}</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
