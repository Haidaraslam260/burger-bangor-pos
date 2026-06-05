"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    products,
    transactions,
    transactionItems,
    activityLogs,
    restaurantTables,
    recipes,
    inventory,
} from "@/db/schema";
import { checkStockAvailability } from "@/actions/checkout";
import { and, asc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/db/schema";

interface CustomerOrderItem {
    productId: number;
    quantity: number;
}

interface CreateCustomerOrderInput {
    tableNumber: string;
    customerName?: string;
    notes?: string;
    items: CustomerOrderItem[];
}

interface CreateCustomerOrderResult {
    success: boolean;
    message: string;
    orderId?: number;
    error?: string;
}

interface CompleteCustomerOrderResult {
    success: boolean;
    message: string;
    error?: string;
}

function parseOrderData(formData: FormData): CreateCustomerOrderInput | null {
    try {
        const raw = formData.get("data");
        if (typeof raw !== "string") return null;
        return JSON.parse(raw) as CreateCustomerOrderInput;
    } catch {
        return null;
    }
}

function normalizeTableNumber(value: string) {
    return value.trim().replace(/\s+/g, " ").slice(0, 20);
}

export async function createCustomerOrder(formData: FormData): Promise<CreateCustomerOrderResult> {
    try {
        const data = parseOrderData(formData);
        if (!data) {
            return { success: false, message: "Pesanan tidak valid", error: "Data pesanan tidak bisa dibaca" };
        }

        const tableNumber = normalizeTableNumber(data.tableNumber || "");
        const customerName = data.customerName?.trim().slice(0, 80) || null;
        const notes = data.notes?.trim().slice(0, 200) || null;
        const items = data.items
            .map((item) => ({
                productId: Number(item.productId),
                quantity: Number(item.quantity),
            }))
            .filter((item) => Number.isInteger(item.productId) && item.productId > 0 && Number.isInteger(item.quantity) && item.quantity > 0);

        if (!tableNumber) {
            return { success: false, message: "Nomor meja wajib diisi", error: "Nomor meja wajib diisi" };
        }

        const [activeTable] = await db
            .select()
            .from(restaurantTables)
            .where(and(eq(restaurantTables.tableNumber, tableNumber), eq(restaurantTables.isActive, 1)));

        if (!activeTable) {
            return { success: false, message: "Meja tidak aktif", error: "Hubungi kasir untuk memesan dari meja ini" };
        }

        if (items.length === 0) {
            return { success: false, message: "Keranjang masih kosong", error: "Pilih menu terlebih dahulu" };
        }

        const productIds = [...new Set(items.map((item) => item.productId))];
        const productRows = await db
            .select()
            .from(products)
            .where(and(inArray(products.id, productIds), eq(products.isActive, 1)));

        const productById = new Map(productRows.map((product) => [product.id, product]));
        if (productRows.length !== productIds.length) {
            return { success: false, message: "Ada menu yang sudah tidak tersedia", error: "Silakan refresh halaman menu" };
        }

        const stockCheck = await checkStockAvailability(items);
        if (!stockCheck.available) {
            const unavailable = stockCheck.details.find((detail) => !detail.isAvailable);
            return {
                success: false,
                message: unavailable
                    ? `${unavailable.ingredientName} tidak cukup untuk pesanan ini`
                    : "Stok menu tidak cukup",
                error: "Stok tidak cukup",
            };
        }

        const orderItems = items.map((item) => {
            const product = productById.get(item.productId);
            if (!product) throw new Error("Produk tidak ditemukan");
            const unitPrice = Number(product.price);
            return {
                product,
                quantity: item.quantity,
                unitPrice,
                subtotal: unitPrice * item.quantity,
            };
        });

        const subtotalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        const taxAmount = Math.round(subtotalAmount * 0.1);
        const totalBeforeRounding = subtotalAmount + taxAmount;
        const roundingAmount = Math.round(totalBeforeRounding / 100) * 100 - totalBeforeRounding;
        const totalAmount = totalBeforeRounding + roundingAmount;

        const [newOrder] = await db.transaction(async (tx) => {
            const [transaction] = await tx
                .insert(transactions)
                .values({
                    type: "dine_in",
                    status: "pending",
                    subtotalAmount: subtotalAmount.toString(),
                    discountAmount: "0",
                    taxAmount: taxAmount.toString(),
                    serviceChargeAmount: "0",
                    roundingAmount: roundingAmount.toString(),
                    totalAmount: totalAmount.toString(),
                    paymentMethod: "cash",
                    amountPaid: "0",
                    changeAmount: "0",
                    paymentStatus: "pending",
                    customerName,
                    notes: `Meja ${tableNumber}${notes ? ` - ${notes}` : ""}`,
                })
                .returning();

            await tx.insert(transactionItems).values(
                orderItems.map((item) => ({
                    transactionId: transaction.id,
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice.toString(),
                    subtotal: item.subtotal.toString(),
                }))
            );

            await tx.insert(activityLogs).values({
                action: "CUSTOMER_ORDER",
                tableName: "transactions",
                recordId: String(transaction.id),
                details: JSON.stringify({
                    tableNumber,
                    customerName,
                    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
                    subtotalAmount,
                    taxAmount,
                    roundingAmount,
                    totalAmount,
                    paymentStatus: "pending",
                }),
            });

            return [transaction];
        });

        revalidatePath("/manager/reports");
        revalidatePath("/manager/logs");
        revalidatePath("/dashboard");

        return {
            success: true,
            orderId: newOrder.id,
            message: `Pesanan #${newOrder.id} berhasil dikirim ke kasir`,
        };
    } catch (error) {
        console.error("Create customer order error:", error);
        return {
            success: false,
            message: "Gagal mengirim pesanan",
            error: error instanceof Error ? error.message : "Terjadi kesalahan",
        };
    }
}

async function deductIngredientsForItems(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    items: { productId: number; quantity: number }[]
) {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const allRecipes = productIds.length > 0
        ? await tx.select().from(recipes).where(inArray(recipes.productId, productIds))
        : [];

    const requiredIngredients = new Map<number, number>();
    for (const item of items) {
        const productRecipes = allRecipes.filter((recipe) => recipe.productId === item.productId);
        for (const recipe of productRecipes) {
            requiredIngredients.set(
                recipe.ingredientId,
                (requiredIngredients.get(recipe.ingredientId) ?? 0) + recipe.quantityNeeded * item.quantity
            );
        }
    }

    const today = new Date().toISOString().split("T")[0];
    for (const [ingredientId, needed] of requiredIngredients) {
        const stocks = await tx
            .select()
            .from(inventory)
            .where(and(
                eq(inventory.ingredientId, ingredientId),
                or(isNull(inventory.expiryDate), gte(inventory.expiryDate, today))
            ))
            .orderBy(asc(inventory.expiryDate), asc(inventory.id));

        const totalAvailable = stocks.reduce((sum, stock) => sum + stock.stockQuantity, 0);
        if (totalAvailable < needed) {
            throw new Error(`Stok bahan tidak cukup. Dibutuhkan ${needed}, tersedia ${totalAvailable}.`);
        }

        let remaining = needed;
        for (const stock of stocks) {
            if (remaining <= 0) break;
            const deducted = Math.min(stock.stockQuantity, remaining);
            await tx
                .update(inventory)
                .set({ stockQuantity: stock.stockQuantity - deducted })
                .where(eq(inventory.id, stock.id));
            remaining -= deducted;
        }
    }
}

export async function completeCustomerOrder(formData: FormData): Promise<CompleteCustomerOrderResult> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "manager", "kasir"].includes(session.user.role)) {
            return { success: false, message: "Unauthorized", error: "Silakan login sebagai kasir" };
        }

        const orderId = Number(formData.get("orderId"));
        const paymentMethod = String(formData.get("paymentMethod") ?? "cash") as PaymentMethod;
        const amountPaid = Number(formData.get("amountPaid") || 0);

        if (!Number.isInteger(orderId) || orderId <= 0) {
            return { success: false, message: "Order tidak valid", error: "Order tidak valid" };
        }

        if (!["cash", "qris", "debit", "e_wallet"].includes(paymentMethod)) {
            return { success: false, message: "Metode pembayaran tidak valid", error: "Metode pembayaran tidak valid" };
        }

        await db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(transactions)
                .where(eq(transactions.id, orderId));

            if (!order) throw new Error("Pesanan tidak ditemukan");
            if (order.status !== "pending" || order.paymentStatus !== "pending") {
                throw new Error("Pesanan sudah diproses");
            }

            const totalAmount = Number(order.totalAmount);
            const paidAmount = paymentMethod === "cash" ? amountPaid : totalAmount;
            if (paidAmount < totalAmount) {
                throw new Error("Jumlah bayar kurang dari total pesanan");
            }

            const items = await tx
                .select()
                .from(transactionItems)
                .where(eq(transactionItems.transactionId, orderId));

            await deductIngredientsForItems(tx, items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })));

            await tx
                .update(transactions)
                .set({
                    status: "completed",
                    paymentStatus: "paid",
                    paymentMethod,
                    amountPaid: paidAmount.toString(),
                    changeAmount: paymentMethod === "cash" ? Math.max(paidAmount - totalAmount, 0).toString() : "0",
                    cashierId: session.user.id,
                })
                .where(eq(transactions.id, orderId));

            await tx.insert(activityLogs).values({
                userId: session.user.id,
                action: "CHECKOUT",
                tableName: "transactions",
                recordId: String(orderId),
                details: JSON.stringify({
                    source: "customer_order",
                    totalAmount,
                    paymentMethod,
                    amountPaid: paidAmount,
                    changeAmount: paymentMethod === "cash" ? Math.max(paidAmount - totalAmount, 0) : 0,
                    paymentStatus: "paid",
                }),
            });
        });

        revalidatePath("/pos/orders");
        revalidatePath("/pos");
        revalidatePath("/manager/reports");
        revalidatePath("/manager/logs");
        revalidatePath("/manager/inventory");
        revalidatePath("/admin/ingredients");
        revalidatePath("/dashboard");

        return { success: true, message: `Pesanan #${orderId} selesai dibayar` };
    } catch (error) {
        console.error("Complete customer order error:", error);
        return {
            success: false,
            message: "Gagal menyelesaikan pesanan",
            error: error instanceof Error ? error.message : "Terjadi kesalahan",
        };
    }
}
