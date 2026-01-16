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
    X,
    UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
};

interface SidebarProps {
    role: Role;
}

function SidebarContent({ role }: SidebarProps) {
    const pathname = usePathname();
    const navItems = NAV_ITEMS[role];

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                        Burger Bangor
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        const Icon = iconMap[item.icon];
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {Icon && <Icon className="h-5 w-5" />}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4">
                <p className="text-xs text-muted-foreground text-center">
                    POS System v1.0
                </p>
            </div>
        </div>
    );
}

export function Sidebar({ role }: SidebarProps) {
    return (
        <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card fixed left-0 top-0">
            <SidebarContent role={role} />
        </aside>
    );
}

export function MobileSidebar({ role }: SidebarProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
                <SidebarContent role={role} />
            </SheetContent>
        </Sheet>
    );
}
