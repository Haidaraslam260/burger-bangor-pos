import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { db } from "@/lib/db";
import { products } from "@/db/schema";
import ProductsClient from "./products-client";

export default async function ProductsPage() {
    const productList = await db.select().from(products).orderBy(products.category, products.name);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Produk</h1>
                    <p className="text-muted-foreground">Kelola menu burger dan produk lainnya</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Daftar Produk
                        </CardTitle>
                        <Badge variant="secondary">{productList.length} produk</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <ProductsClient products={productList} />
                </CardContent>
            </Card>
        </div>
    );
}
