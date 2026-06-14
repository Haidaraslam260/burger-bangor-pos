import POSClient from "./pos-client";
import { getActiveProductsWithAvailability } from "@/lib/product-availability";

export default async function POSPage() {
    const { activeProducts, availabilityByProductId } = await getActiveProductsWithAvailability();

    return <POSClient products={activeProducts} availabilityByProductId={availabilityByProductId} />;
}
