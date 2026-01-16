"use server";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { loginSchema, registerSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

/**
 * Login action
 */
export async function login(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const rawData = {
            email: formData.get("email"),
            password: formData.get("password"),
        };

        const validationResult = loginSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const result = await signIn("credentials", {
            email: validationResult.data.email,
            password: validationResult.data.password,
            redirect: false,
        });

        if (result?.error) {
            return {
                success: false,
                error: result.error,
            };
        }

        return {
            success: true,
            message: "Login berhasil!",
        };
    } catch (error) {
        console.error("Login error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Terjadi kesalahan saat login",
        };
    }
}

/**
 * Logout action
 */
export async function logout() {
    await signOut({ redirectTo: "/login" });
}

/**
 * Register new user (Admin only)
 */
export async function registerUser(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        const rawData = {
            email: formData.get("email"),
            password: formData.get("password"),
            fullName: formData.get("fullName"),
        };

        const validationResult = registerSchema.safeParse(rawData);
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0].message,
            };
        }

        const { email, password, fullName } = validationResult.data;

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser.length > 0) {
            return {
                success: false,
                error: "Email sudah terdaftar",
            };
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                password: hashedPassword,
                fullName,
                role: "kasir", // Default role
            })
            .returning();

        return {
            success: true,
            message: "User berhasil dibuat!",
            data: { userId: newUser.id },
        };
    } catch (error) {
        console.error("Register error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Terjadi kesalahan saat registrasi",
        };
    }
}
