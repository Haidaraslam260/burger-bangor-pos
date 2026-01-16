import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Salad } from "lucide-react";
import { db } from "@/lib/db";
import { ingredients } from "@/db/schema";
import IngredientsClient from "./ingredients-client";

export default async function IngredientsPage() {
    const ingredientList = await db.select().from(ingredients).orderBy(ingredients.name);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bahan Baku</h1>
                    <p className="text-muted-foreground">Kelola bahan baku untuk membuat burger</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Salad className="h-5 w-5" />
                            Daftar Bahan Baku
                        </CardTitle>
                        <Badge variant="secondary">{ingredientList.length} bahan</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <IngredientsClient ingredients={ingredientList} />
                </CardContent>
            </Card>
        </div>
    );
}
