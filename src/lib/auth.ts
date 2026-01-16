import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Role } from "@/db/schema";

// Extend the built-in types
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            fullName: string | null;
            role: Role;
        };
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email dan password harus diisi");
                }

                const email = (credentials.email as string).trim().toLowerCase();
                const password = credentials.password as string;

                console.log("Auth attempt for email:", email);

                const allUsers = await db.select().from(users);
                console.log("Total users in DB:", allUsers.length);
                console.log("All user emails:", allUsers.map(u => u.email));

                const [user] = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, email))
                    .limit(1);

                if (!user) {
                    console.error("User not found for email:", email);
                    throw new Error("Email tidak ditemukan");
                }

                const isValidPassword = await compare(password, user.password);

                if (!isValidPassword) {
                    throw new Error("Password salah");
                }

                // Return the user object - NextAuth will handle the type
                return {
                    id: user.id,
                    email: user.email,
                    name: user.fullName, // NextAuth expects 'name' not 'fullName'
                    fullName: user.fullName,
                    role: user.role,
                } as any; // Type assertion to bypass strict AdapterUser check
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.fullName = (user as any).fullName;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            // Type-safe session.user assignment
            if (token) {
                (session.user as any) = {
                    id: token.id as string,
                    email: token.email as string,
                    fullName: token.fullName as string | null,
                    role: token.role as Role,
                };
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
});
