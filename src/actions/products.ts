"use server";

import { db } from "@/lib/db";
import { products, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { productSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Create a new product
 */
export async function createProduct(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name"),
            category: formData.get("category"),
            price: formData.get("price"),
            description: formData.get("description") || "",
            imageUrl: formData.get("imageUrl") || "",
            isActive: formData.get("isActive") === "true" ? 1 : 0,
        };

        const validationResult = productSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const [newProduct] = await db
            .insert(products)
            .values({
                name: validationResult.data.name,
                category: validationResult.data.category,
                price: validationResult.data.price,
                description: validationResult.data.description || null,
                imageUrl: validationResult.data.imageUrl || null,
                isActive: validationResult.data.isActive,
            })
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "CREATE",
            tableName: "products",
            recordId: String(newProduct.id),
            details: `Produk baru: ${newProduct.name}`,
        });

        revalidatePath("/admin/products");
        revalidatePath("/menu");
        revalidatePath("/pos");
        revalidatePath("/manager/logs");
        return { success: true, message: "Produk berhasil ditambahkan!", data: newProduct };
    } catch (error) {
        console.error("Create product error:", error);
        return { success: false, error: "Gagal menambahkan produk" };
    }
}

/**
 * Update an existing product
 */
export async function updateProduct(
    productId: number,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const rawData = {
            name: formData.get("name"),
            category: formData.get("category"),
            price: formData.get("price"),
            description: formData.get("description") || "",
            imageUrl: formData.get("imageUrl") || "",
            isActive: formData.get("isActive") === "true" ? 1 : 0,
        };

        const validationResult = productSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const [updatedProduct] = await db
            .update(products)
            .set({
                name: validationResult.data.name,
                category: validationResult.data.category,
                price: validationResult.data.price,
                description: validationResult.data.description || null,
                imageUrl: validationResult.data.imageUrl || null,
                isActive: validationResult.data.isActive,
                updatedAt: new Date(),
            })
            .where(eq(products.id, productId))
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "products",
            recordId: String(productId),
            details: `Produk diupdate: ${updatedProduct.name}`,
        });

        revalidatePath("/admin/products");
        revalidatePath("/menu");
        revalidatePath("/pos");
        revalidatePath("/manager/logs");
        return { success: true, message: "Produk berhasil diupdate!" };
    } catch (error) {
        console.error("Update product error:", error);
        return { success: false, error: "Gagal mengupdate produk" };
    }
}

/**
 * Archive a product by marking it inactive without deleting historical references.
 */
export async function archiveProduct(productId: number): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const [archivedProduct] = await db
            .update(products)
            .set({ isActive: 0, updatedAt: new Date() })
            .where(eq(products.id, productId))
            .returning();

        if (!archivedProduct) {
            return { success: false, error: "Produk tidak ditemukan" };
        }

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "products",
            recordId: String(productId),
            details: `Produk diarsipkan: ${archivedProduct.name}`,
        });

        revalidatePath("/admin/products");
        revalidatePath("/menu");
        revalidatePath("/pos");
        revalidatePath("/manager/logs");
        return { success: true, message: "Produk berhasil diarsipkan!" };
    } catch (error) {
        console.error("Archive product error:", error);
        return { success: false, error: "Gagal mengarsipkan produk" };
    }
}

/**
 * Toggle product active status
 */
export async function toggleProductStatus(productId: number, currentStatus: number): Promise<ActionResult> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        const newStatus = currentStatus === 1 ? 0 : 1;

        await db
            .update(products)
            .set({ isActive: newStatus, updatedAt: new Date() })
            .where(eq(products.id, productId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "products",
            recordId: String(productId),
            details: `Status produk ${newStatus === 1 ? "diaktifkan" : "dinonaktifkan"}`,
        });

        revalidatePath("/admin/products");
        revalidatePath("/menu");
        revalidatePath("/pos");
        revalidatePath("/manager/logs");
        return { success: true, message: `Produk ${newStatus === 1 ? "diaktifkan" : "dinonaktifkan"}!` };
    } catch (error) {
        console.error("Toggle product status error:", error);
        return { success: false, error: "Gagal mengubah status produk" };
    }
}
