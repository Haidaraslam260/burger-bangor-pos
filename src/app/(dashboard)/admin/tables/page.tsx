import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Armchair } from "lucide-react";
import { db } from "@/lib/db";
import { restaurantTables } from "@/db/schema";
import { asc } from "drizzle-orm";
import TablesClient from "./tables-client";

export default async function TablesPage() {
    const tables = await db
        .select()
        .from(restaurantTables)
        .orderBy(asc(restaurantTables.tableNumber));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meja & QR Menu</h1>
                <p className="text-muted-foreground">Kelola nomor meja dan download QR untuk menu pelanggan</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Armchair className="h-5 w-5" />
                            Daftar Meja
                        </CardTitle>
                        <Badge variant="secondary">{tables.length} meja</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <TablesClient tables={tables} />
                </CardContent>
            </Card>
        </div>
    );
}
