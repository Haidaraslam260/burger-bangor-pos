import { getActiveProductsWithAvailability } from "@/lib/product-availability";
import CustomerMenuClient from "./customer-menu-client";

export const dynamic = "force-dynamic";

export default async function CustomerMenuPage({
    searchParams,
}: {
    searchParams: Promise<{ table?: string }>;
}) {
    const params = await searchParams;
    const tableNumber = typeof params.table === "string" ? params.table : "";

    const { activeProducts, availabilityByProductId } = await getActiveProductsWithAvailability();

    return (
        <CustomerMenuClient
            products={activeProducts}
            availabilityByProductId={availabilityByProductId}
            initialTableNumber={tableNumber}
        />
    );
}
