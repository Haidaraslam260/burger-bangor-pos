"use server";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { loginSchema, registerSchema } from "@/lib/validations";
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
            return { success: false, error: result.error };
        }

        return { success: true, message: "Login berhasil!" };
    } catch (error) {
        console.error("Login error:", error);
        // Handle credential errors from NextAuth
        if (error instanceof Error && error.message.includes("CredentialsSignin")) {
            return { success: false, error: "Email atau password salah" };
        }
        return { success: false, error: "Terjadi kesalahan saat login" };
    }
}

/**
 * Logout action
 */
export async function logout(): Promise<void> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = siteUrl ? `${siteUrl}/login` : "/login";
    await signOut({ redirect: true, redirectTo });
}

/**
 * Register action (Admin only)
 */
export async function register(
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

        // Check if email already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, validationResult.data.email));

        if (existingUser.length > 0) {
            return { success: false, error: "Email sudah terdaftar" };
        }

        // Hash password
        const hashedPassword = await hash(validationResult.data.password, 12);

        // Create user
        await db.insert(users).values({
            email: validationResult.data.email,
            password: hashedPassword,
            fullName: validationResult.data.fullName,
            role: "kasir", // Default role
        });

        return { success: true, message: "Registrasi berhasil!" };
    } catch (error) {
        console.error("Register error:", error);
        return { success: false, error: "Terjadi kesalahan saat registrasi" };
    }
}
