import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { PROTECTED_ROUTES, DEFAULT_REDIRECT } from "@/constants";
import type { Role } from "@/db/schema";

// Routes yang tidak perlu auth
const publicRoutes = ["/login", "/register", "/api/auth", "/menu"];

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role as Role | undefined;

    // Check apakah route public
    const isPublicRoute = publicRoutes.some(
        (route) => nextUrl.pathname.startsWith(route) || nextUrl.pathname === "/"
    );

    // Redirect logged in users dari login page ke default route mereka
    if (isLoggedIn && nextUrl.pathname === "/login") {
        const redirectTo = userRole ? DEFAULT_REDIRECT[userRole] : "/pos";
        return NextResponse.redirect(new URL(redirectTo, nextUrl));
    }

    // Allow public routes
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Redirect unauthenticated users ke login
    if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check role-based access untuk protected routes
    for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
        if (nextUrl.pathname.startsWith(routePrefix)) {
            if (!userRole || !(allowedRoles as readonly string[]).includes(userRole)) {
                // Redirect ke default route user jika tidak punya akses
                const redirectTo = userRole ? DEFAULT_REDIRECT[userRole] : "/pos";
                return NextResponse.redirect(new URL(redirectTo, nextUrl));
            }
            break;
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
