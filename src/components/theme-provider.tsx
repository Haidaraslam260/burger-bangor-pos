"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";

const POS_THEME_KEY = "pos-theme";
const CUSTOMER_THEME_KEY = "customer-menu-theme";

function applyDocumentTheme(theme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        const isCustomerMenu = pathname?.startsWith("/menu");
        const storageKey = isCustomerMenu ? CUSTOMER_THEME_KEY : POS_THEME_KEY;
        const savedTheme = localStorage.getItem(storageKey);
        applyDocumentTheme(savedTheme === "dark" ? "dark" : "light");
    }, [pathname]);

    return (
        <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey={POS_THEME_KEY}>
            {children}
        </NextThemesProvider>
    );
}
