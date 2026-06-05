"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/constants";
import type { Role } from "@/db/schema";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Salad,
    ChefHat,
    Users,
    Warehouse,
    BarChart3,
    FileText,
    Menu,
    Moon,
    Sun,
    Armchair,
    ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { useState } from "react";

const iconMap: Record<string, React.ElementType> = {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Salad,
    ChefHat,
    Users,
    Warehouse,
    BarChart3,
    FileText,
    Armchair,
    ClipboardList,
};

interface SidebarProps {
    userRole: Role;
}

function SidebarContent({ userRole }: SidebarProps) {
    const pathname = usePathname();
    const { resolvedTheme, setTheme } = useTheme();

    // Get nav items for this role
    const navItems = NAV_ITEMS[userRole] || [];

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-20 shrink-0 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/typograph_black.svg"
                        alt="Burger Bangor"
                        className="h-10 w-auto object-contain dark:hidden"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/typograph_white.svg"
                        alt="Burger Bangor"
                        className="hidden h-10 w-auto object-contain dark:block"
                    />
                </Link>
            </div>

            {/* Nav Items */}
            <ScrollArea className="min-h-0 flex-1 px-3 py-3">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = iconMap[item.icon] || LayoutDashboard;
                        const isActive = pathname === item.href;

                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        "h-10 w-full justify-start gap-3 rounded-lg px-4 text-sm",
                                        isActive && "bg-[#F1FFD0] dark:bg-[#A3DF02]/20 text-[#5f8500] dark:text-[#D4FF74] font-medium"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive && "text-[#6f9900]")} />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>

            <div className="shrink-0 border-t p-3">
                <button
                    type="button"
                    aria-label="Toggle theme"
                    onClick={() => {
                        setTheme(resolvedTheme === "dark" ? "light" : "dark");
                    }}
                    className="flex h-11 w-full items-center justify-between rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <span className="flex items-center gap-3">
                        <Sun className="h-4 w-4 text-[#A3DF02] dark:hidden" />
                        <Moon className="hidden h-4 w-4 text-[#D4FF74] dark:block" />
                        <span className="dark:hidden">Light mode</span>
                        <span className="hidden dark:inline">Dark mode</span>
                    </span>
                    <span
                        className="relative h-5 w-9 rounded-full bg-[#A3DF02] transition-colors dark:bg-muted-foreground/40"
                    >
                        <span
                            className="absolute left-0.5 top-0.5 h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm transition-transform dark:translate-x-0.5"
                        />
                    </span>
                </button>
            </div>
        </div>
    );
}

export function Sidebar({ userRole }: SidebarProps) {
    return (
        <aside className="hidden lg:flex w-64 flex-col border-r bg-background fixed inset-y-0 left-0 z-50">
            <SidebarContent userRole={userRole} />
        </aside>
    );
}

export function MobileSidebar({ userRole }: SidebarProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
                <SidebarContent userRole={userRole} />
            </SheetContent>
        </Sheet>
    );
}
