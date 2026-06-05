"use server";

import { hash } from "bcryptjs";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { activityLogs, users } from "@/db/schema";
import type { Role } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUserSchema, updateUserSchema } from "@/lib/validations";
import type { ActionResult } from "@/types";

function normalizeEmail(value: FormDataEntryValue | null) {
    return String(value ?? "").trim().toLowerCase();
}

async function requireAdmin() {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
        return { session: null, error: "Unauthorized" };
    }

    return { session, error: null };
}

async function getAdminCount() {
    const [result] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, "admin"));

    return result?.value ?? 0;
}

export async function createUser(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        const rawData = {
            email: normalizeEmail(formData.get("email")),
            fullName: formData.get("fullName"),
            role: formData.get("role"),
            password: formData.get("password"),
        };

        const validationResult = createUserSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, validationResult.data.email))
            .limit(1);

        if (existing.length > 0) {
            return { success: false, error: "Email sudah digunakan" };
        }

        const hashedPassword = await hash(validationResult.data.password, 10);

        const [newUser] = await db
            .insert(users)
            .values({
                email: validationResult.data.email,
                fullName: validationResult.data.fullName,
                role: validationResult.data.role,
                password: hashedPassword,
            })
            .returning({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "CREATE",
            tableName: "users",
            recordId: newUser.id,
            details: `User baru: ${newUser.email} (${newUser.role})`,
        });

        revalidatePath("/admin/users");
        revalidatePath("/manager/logs");

        return {
            success: true,
            message: "User berhasil ditambahkan!",
            data: newUser,
        };
    } catch (error) {
        console.error("Create user error:", error);
        return { success: false, error: "Gagal menambahkan user" };
    }
}

export async function updateUser(
    userId: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        const password = String(formData.get("password") ?? "");
        const rawData = {
            email: normalizeEmail(formData.get("email")),
            fullName: formData.get("fullName"),
            role: formData.get("role"),
            password: password.length > 0 ? password : undefined,
        };

        const validationResult = updateUserSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!currentUser) {
            return { success: false, error: "User tidak ditemukan" };
        }

        if (session.user.id === userId && currentUser.role !== validationResult.data.role) {
            return { success: false, error: "Tidak bisa mengubah role akun sendiri" };
        }

        const duplicateEmail = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.email, validationResult.data.email), ne(users.id, userId)))
            .limit(1);

        if (duplicateEmail.length > 0) {
            return { success: false, error: "Email sudah digunakan user lain" };
        }

        if (currentUser.role === "admin" && validationResult.data.role !== "admin") {
            const adminCount = await getAdminCount();
            if (adminCount <= 1) {
                return { success: false, error: "Minimal harus ada satu admin aktif" };
            }
        }

        const updateData: {
            email: string;
            fullName: string;
            role: Role;
            updatedAt: Date;
            password?: string;
        } = {
            email: validationResult.data.email,
            fullName: validationResult.data.fullName,
            role: validationResult.data.role,
            updatedAt: new Date(),
        };

        if (validationResult.data.password) {
            updateData.password = await hash(validationResult.data.password, 10);
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "UPDATE",
            tableName: "users",
            recordId: userId,
            details: `User diupdate: ${updatedUser.email} (${updatedUser.role})`,
        });

        revalidatePath("/admin/users");
        revalidatePath("/manager/logs");

        return { success: true, message: "User berhasil diupdate!" };
    } catch (error) {
        console.error("Update user error:", error);
        return { success: false, error: "Gagal mengupdate user" };
    }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
    try {
        const { session, error } = await requireAdmin();
        if (!session) return { success: false, error };

        if (session.user.id === userId) {
            return { success: false, error: "Tidak bisa menghapus akun sendiri" };
        }

        const [targetUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!targetUser) {
            return { success: false, error: "User tidak ditemukan" };
        }

        if (targetUser.role === "admin") {
            const adminCount = await getAdminCount();
            if (adminCount <= 1) {
                return { success: false, error: "Minimal harus ada satu admin aktif" };
            }
        }

        await db.delete(users).where(eq(users.id, userId));

        await db.insert(activityLogs).values({
            userId: session.user.id,
            action: "DELETE",
            tableName: "users",
            recordId: userId,
            details: `User dihapus: ${targetUser.email} (${targetUser.role})`,
        });

        revalidatePath("/admin/users");
        revalidatePath("/manager/logs");

        return { success: true, message: "User berhasil dihapus!" };
    } catch (error) {
        console.error("Delete user error:", error);
        return { success: false, error: "Gagal menghapus user" };
    }
}
