"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
    products,
    transactions,
    transactionItems,
    activityLogs,
    restaurantTables,
} from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { PaymentMethod, PaymentStatus, TransactionStatus } from "@/db/schema";
import {
    assertStockCanBeReserved,
    CUSTOMER_RESERVATION_MINUTES,
    deductStockLocked,
    getStockRequirements,
} from "@/lib/stock-reservations";

interface CustomerOrderItem {
    productId: number;
    quantity: number;
}

interface CreateCustomerOrderInput {
    tableNumber: string;
    sessionToken: string;
    idempotencyKey: string;
    customerName?: string;
    notes?: string;
    items: CustomerOrderItem[];
}

interface CreateCustomerOrderResult {
    success: boolean;
    message: string;
    orderId?: number;
    orderToken?: string;
    sessionToken?: string;
    reservationExpiresAt?: string;
    error?: string;
}

interface CompleteCustomerOrderResult {
    success: boolean;
    message: string;
    error?: string;
}

export interface CustomerOrderDetail {
    id: number;
    orderToken: string;
    transactionDate: string;
    status: TransactionStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    customerName: string | null;
    notes: string | null;
    subtotalAmount: number;
    taxAmount: number;
    roundingAmount: number;
    totalAmount: number;
    amountPaid: number;
    changeAmount: number;
    items: {
        id: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        const sessionToken = String(data.sessionToken || "").trim();
        const idempotencyKey = String(data.idempotencyKey || "").trim();
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
        if (!UUID_PATTERN.test(sessionToken) || !UUID_PATTERN.test(idempotencyKey)) {
            return { success: false, message: "Sesi pesanan tidak valid", error: "Muat ulang halaman lalu coba kembali" };
        }

        const [existingOrder] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.idempotencyKey, idempotencyKey));
        if (existingOrder) {
            return {
                success: true,
                orderId: existingOrder.id,
                orderToken: existingOrder.orderToken,
                sessionToken,
                reservationExpiresAt: existingOrder.reservationExpiresAt?.toISOString(),
                message: `Pesanan #${existingOrder.id} sudah diterima`,
            };
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

        const reservationExpiresAt = new Date(Date.now() + CUSTOMER_RESERVATION_MINUTES * 60_000);
        const [newOrder] = await db.transaction(async (tx) => {
            const requirements = await getStockRequirements(tx, items);
            await assertStockCanBeReserved(tx, requirements);

            const [transaction] = await tx
                .insert(transactions)
                .values({
                    restaurantTableId: activeTable.id,
                    customerSessionToken: sessionToken,
                    idempotencyKey,
                    reservationExpiresAt,
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
                    sessionToken,
                    customerName,
                    itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
                    subtotalAmount,
                    taxAmount,
                    roundingAmount,
                    totalAmount,
                    paymentStatus: "pending",
                    reservationExpiresAt: reservationExpiresAt.toISOString(),
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
            orderToken: newOrder.orderToken,
            sessionToken,
            reservationExpiresAt: reservationExpiresAt.toISOString(),
            message: `Pesanan #${newOrder.id} berhasil dikirim ke kasir`,
        };
    } catch (error) {
        console.error("Create customer order error:", error);
        const data = parseOrderData(formData);
        const idempotencyKey = data?.idempotencyKey?.trim();
        if (idempotencyKey && UUID_PATTERN.test(idempotencyKey)) {
            const [existingOrder] = await db
                .select()
                .from(transactions)
                .where(eq(transactions.idempotencyKey, idempotencyKey));
            if (existingOrder) {
                return {
                    success: true,
                    orderId: existingOrder.id,
                    orderToken: existingOrder.orderToken,
                    sessionToken: existingOrder.customerSessionToken ?? undefined,
                    reservationExpiresAt: existingOrder.reservationExpiresAt?.toISOString(),
                    message: `Pesanan #${existingOrder.id} sudah diterima`,
                };
            }
        }
        return {
            success: false,
            message: "Gagal mengirim pesanan",
            error: error instanceof Error ? error.message : "Terjadi kesalahan",
        };
    }
}

export async function getCustomerSessionOrders(sessionToken: string, tableNumber: string): Promise<{
    success: boolean;
    orders?: CustomerOrderDetail[];
    error?: string;
}> {
    try {
        const normalizedTableNumber = normalizeTableNumber(tableNumber || "");
        if (!UUID_PATTERN.test(sessionToken) || !normalizedTableNumber) {
            return { success: false, error: "Data pesanan tidak valid" };
        }

        const [table] = await db
            .select()
            .from(restaurantTables)
            .where(eq(restaurantTables.tableNumber, normalizedTableNumber));
        if (!table) return { success: false, error: "Meja tidak ditemukan" };

        const rows = await db
            .select({
                transactionId: transactions.id,
                orderToken: transactions.orderToken,
                transactionDate: transactions.transactionDate,
                status: transactions.status,
                paymentStatus: transactions.paymentStatus,
                paymentMethod: transactions.paymentMethod,
                customerName: transactions.customerName,
                notes: transactions.notes,
                subtotalAmount: transactions.subtotalAmount,
                taxAmount: transactions.taxAmount,
                roundingAmount: transactions.roundingAmount,
                totalAmount: transactions.totalAmount,
                amountPaid: transactions.amountPaid,
                changeAmount: transactions.changeAmount,
                itemId: transactionItems.id,
                productName: products.name,
                quantity: transactionItems.quantity,
                unitPrice: transactionItems.unitPrice,
                itemSubtotal: transactionItems.subtotal,
            })
            .from(transactions)
            .innerJoin(transactionItems, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(products.id, transactionItems.productId))
            .where(and(
                eq(transactions.customerSessionToken, sessionToken),
                eq(transactions.restaurantTableId, table.id)
            ))
            .orderBy(asc(transactions.transactionDate), asc(transactionItems.id));

        if (rows.length === 0) {
            return { success: true, orders: [] };
        }

        const orders = new Map<number, CustomerOrderDetail>();
        for (const row of rows) {
            const existing = orders.get(row.transactionId) ?? {
                id: row.transactionId,
                orderToken: row.orderToken,
                transactionDate: row.transactionDate.toISOString(),
                status: row.status,
                paymentStatus: row.paymentStatus,
                paymentMethod: row.paymentMethod,
                customerName: row.customerName,
                notes: row.notes,
                subtotalAmount: Number(row.subtotalAmount),
                taxAmount: Number(row.taxAmount),
                roundingAmount: Number(row.roundingAmount),
                totalAmount: Number(row.totalAmount),
                amountPaid: Number(row.amountPaid),
                changeAmount: Number(row.changeAmount),
                items: [],
            };
            existing.items.push({
                id: row.itemId,
                productName: row.productName,
                quantity: row.quantity,
                unitPrice: Number(row.unitPrice),
                subtotal: Number(row.itemSubtotal),
            });
            orders.set(row.transactionId, existing);
        }

        return {
            success: true,
            orders: Array.from(orders.values()),
        };
    } catch (error) {
        console.error("Get customer session orders error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Gagal mengambil detail pesanan",
        };
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

            const requirements = await getStockRequirements(tx, items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })));
            await deductStockLocked(tx, requirements, orderId);

            await tx
                .update(transactions)
                .set({
                    status: "completed",
                    paymentStatus: "paid",
                    paymentMethod,
                    amountPaid: paidAmount.toString(),
                    changeAmount: paymentMethod === "cash" ? Math.max(paidAmount - totalAmount, 0).toString() : "0",
                    cashierId: session.user.id,
                    reservationExpiresAt: null,
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

export async function cancelCustomerOrder(formData: FormData): Promise<CompleteCustomerOrderResult> {
    try {
        const orderToken = String(formData.get("orderToken") ?? "");
        const sessionToken = String(formData.get("sessionToken") ?? "");
        const reason = String(formData.get("reason") ?? "Dibatalkan pelanggan").trim().slice(0, 200);
        if (!UUID_PATTERN.test(orderToken) || !UUID_PATTERN.test(sessionToken)) {
            return { success: false, message: "Pesanan tidak valid", error: "Token pesanan tidak valid" };
        }

        const [order] = await db
            .select()
            .from(transactions)
            .where(and(
                eq(transactions.orderToken, orderToken),
                eq(transactions.customerSessionToken, sessionToken)
            ));
        if (!order) return { success: false, message: "Pesanan tidak ditemukan", error: "Pesanan tidak ditemukan" };
        if (order.status !== "pending" || order.paymentStatus !== "pending") {
            return { success: false, message: "Pesanan tidak dapat dibatalkan", error: "Pesanan sudah diproses kasir" };
        }

        await db.transaction(async (tx) => {
            await tx
                .update(transactions)
                .set({
                    status: "voided",
                    paymentStatus: "voided",
                    voidReason: reason,
                    voidedAt: new Date(),
                    reservationExpiresAt: null,
                })
                .where(and(
                    eq(transactions.id, order.id),
                    eq(transactions.status, "pending"),
                    eq(transactions.paymentStatus, "pending")
                ));
            await tx.insert(activityLogs).values({
                action: "CUSTOMER_CANCEL",
                tableName: "transactions",
                recordId: String(order.id),
                details: JSON.stringify({ reason, source: "customer" }),
            });
        });

        revalidatePath("/pos/orders");
        return { success: true, message: `Pesanan #${order.id} dibatalkan` };
    } catch (error) {
        console.error("Cancel customer order error:", error);
        return { success: false, message: "Gagal membatalkan pesanan", error: error instanceof Error ? error.message : "Terjadi kesalahan" };
    }
}

export async function cancelCustomerOrderByStaff(formData: FormData): Promise<CompleteCustomerOrderResult> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "manager", "kasir"].includes(session.user.role)) {
            return { success: false, message: "Unauthorized", error: "Silakan login sebagai staf" };
        }
        const orderId = Number(formData.get("orderId"));
        const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
        if (!Number.isInteger(orderId) || orderId <= 0 || !reason) {
            return { success: false, message: "Data pembatalan tidak valid", error: "Alasan pembatalan wajib diisi" };
        }

        const updated = await db.transaction(async (tx) => {
            const [order] = await tx.select().from(transactions).where(eq(transactions.id, orderId));
            if (!order || order.status !== "pending" || order.paymentStatus !== "pending") {
                throw new Error("Pesanan sudah diproses atau tidak ditemukan");
            }
            await tx.update(transactions).set({
                status: "voided",
                paymentStatus: "voided",
                voidReason: reason,
                voidedAt: new Date(),
                cancelledBy: session.user.id,
                reservationExpiresAt: null,
            }).where(eq(transactions.id, orderId));
            await tx.insert(activityLogs).values({
                userId: session.user.id,
                action: "CANCEL_ORDER",
                tableName: "transactions",
                recordId: String(orderId),
                details: JSON.stringify({ reason, source: "staff" }),
            });
            return order;
        });

        revalidatePath("/pos/orders");
        return { success: true, message: `Pesanan #${updated.id} dibatalkan` };
    } catch (error) {
        return { success: false, message: "Gagal membatalkan pesanan", error: error instanceof Error ? error.message : "Terjadi kesalahan" };
    }
}
