import { db } from "@/lib/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import POSClient from "./pos-client";

export default async function POSPage() {
    // Fetch active products only
    const activeProducts = await db
        .select()
        .from(products)
        .where(eq(products.isActive, 1))
        .orderBy(products.category, products.name);

    return <POSClient products={activeProducts} />;
}
