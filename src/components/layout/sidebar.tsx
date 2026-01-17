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
    userRole: Role;
}

function SidebarContent({ userRole }: SidebarProps) {
    const pathname = usePathname();

    // Get nav items for this role
    const navItems = NAV_ITEMS[userRole] || [];

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="border-b px-6 py-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                    <span className="font-bold text-xl tracking-tight">Burger Bangor</span>
                </Link>
            </div>

            {/* Nav Items */}
            <ScrollArea className="flex-1 px-3 py-4">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = iconMap[item.icon] || LayoutDashboard;
                        const isActive = pathname === item.href;

                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start gap-3 h-10",
                                        isActive && "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive && "text-orange-600")} />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>
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
