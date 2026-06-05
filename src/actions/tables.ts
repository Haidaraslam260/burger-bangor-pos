"use server";

import { db } from "@/lib/db";
import { activityLogs, restaurantTables } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

function normalizeTableNumber(value: FormDataEntryValue | null) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 20);
}

async function requireAdmin() {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
        return { session: null, error: "Unauthorized" };
    }
    return { session, error: null };
}

export async function createTable(formData: FormData): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        const tableNumber = normalizeTableNumber(formData.get("tableNumber"));
        const label = String(formData.get("label") ?? "").trim().slice(0, 80);

        if (!tableNumber) {
            return { success: false, error: "Nomor meja wajib diisi" };
        }

        const [newTable] = await db
            .insert(restaurantTables)
            .values({
                tableNumber,
                label: label || null,
                isActive: 1,
            })
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "CREATE",
            tableName: "restaurant_tables",
            recordId: String(newTable.id),
            details: `Meja baru: ${newTable.tableNumber}`,
        });

        revalidatePath("/admin/tables");
        revalidatePath("/manager/logs");
        return { success: true, message: "Meja berhasil ditambahkan!", data: newTable };
    } catch (error) {
        console.error("Create table error:", error);
        return { success: false, error: "Gagal menambahkan meja. Nomor meja mungkin sudah dipakai." };
    }
}

export async function toggleTableStatus(tableId: number): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        const [table] = await db
            .select()
            .from(restaurantTables)
            .where(eq(restaurantTables.id, tableId));

        if (!table) {
            return { success: false, error: "Meja tidak ditemukan" };
        }

        const [updatedTable] = await db
            .update(restaurantTables)
            .set({
                isActive: table.isActive === 1 ? 0 : 1,
                updatedAt: new Date(),
            })
            .where(eq(restaurantTables.id, tableId))
            .returning();

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "restaurant_tables",
            recordId: String(tableId),
            details: `${updatedTable.isActive === 1 ? "Aktifkan" : "Nonaktifkan"} meja ${updatedTable.tableNumber}`,
        });

        revalidatePath("/admin/tables");
        revalidatePath("/manager/logs");
        return { success: true, message: "Status meja berhasil diubah!" };
    } catch (error) {
        console.error("Toggle table error:", error);
        return { success: false, error: "Gagal mengubah status meja" };
    }
}

export async function archiveTable(tableId: number): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        const [archivedTable] = await db
            .update(restaurantTables)
            .set({ isActive: 0, updatedAt: new Date() })
            .where(eq(restaurantTables.id, tableId))
            .returning();

        if (!archivedTable) {
            return { success: false, error: "Meja tidak ditemukan" };
        }

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "restaurant_tables",
            recordId: String(tableId),
            details: `Meja diarsipkan: ${archivedTable.tableNumber}`,
        });

        revalidatePath("/admin/tables");
        revalidatePath("/manager/logs");
        return { success: true, message: "Meja berhasil diarsipkan!" };
    } catch (error) {
        console.error("Archive table error:", error);
        return { success: false, error: "Gagal mengarsipkan meja" };
    }
}
