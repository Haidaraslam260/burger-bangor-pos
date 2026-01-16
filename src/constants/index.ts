// ===========================================
// ROLE PERMISSIONS
// ===========================================
export const ROLE_PERMISSIONS = {
    admin: {
        canAccessAdmin: true,
        canAccessManager: true,
        canAccessPos: true,
        canManageUsers: true,
        canManageProducts: true,
        canManageIngredients: true,
        canManageRecipes: true,
        canManageInventory: true,
        canViewReports: true,
        canViewLogs: true,
        canDeleteTransactions: true,
    },
    manager: {
        canAccessAdmin: false,
        canAccessManager: true,
        canAccessPos: true,
        canManageUsers: false,
        canManageProducts: false,
        canManageIngredients: false,
        canManageRecipes: false,
        canManageInventory: true,
        canViewReports: true,
        canViewLogs: true,
        canDeleteTransactions: false,
    },
    kasir: {
        canAccessAdmin: false,
        canAccessManager: false,
        canAccessPos: true,
        canManageUsers: false,
        canManageProducts: false,
        canManageIngredients: false,
        canManageRecipes: false,
        canManageInventory: false,
        canViewReports: false,
        canViewLogs: false,
        canDeleteTransactions: false,
    },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS;
export type Permission = keyof RolePermissions["admin"];

// ===========================================
// NAVIGATION ITEMS BY ROLE
// ===========================================
export const NAV_ITEMS = {
    admin: [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
        { label: "Point of Sales", href: "/pos", icon: "ShoppingCart" },
        { label: "Products", href: "/admin/products", icon: "Package" },
        { label: "Ingredients", href: "/admin/ingredients", icon: "Salad" },
        { label: "Recipes", href: "/admin/recipes", icon: "ChefHat" },
        { label: "Users", href: "/admin/users", icon: "Users" },
        { label: "Inventory", href: "/manager/inventory", icon: "Warehouse" },
        { label: "Reports", href: "/manager/reports", icon: "BarChart3" },
        { label: "Activity Logs", href: "/manager/logs", icon: "FileText" },
    ],
    manager: [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
        { label: "Point of Sales", href: "/pos", icon: "ShoppingCart" },
        { label: "Inventory", href: "/manager/inventory", icon: "Warehouse" },
        { label: "Reports", href: "/manager/reports", icon: "BarChart3" },
        { label: "Activity Logs", href: "/manager/logs", icon: "FileText" },
    ],
    kasir: [
        { label: "Point of Sales", href: "/pos", icon: "ShoppingCart" },
    ],
} as const;

// ===========================================
// ROUTE PROTECTION CONFIG
// ===========================================
export const PROTECTED_ROUTES = {
    "/admin": ["admin"],
    "/manager": ["admin", "manager"],
    "/pos": ["admin", "manager", "kasir"],
    "/dashboard": ["admin", "manager", "kasir"],
} as const;

// ===========================================
// DEFAULT REDIRECT BY ROLE
// ===========================================
export const DEFAULT_REDIRECT = {
    admin: "/dashboard",
    manager: "/dashboard",
    kasir: "/pos",
} as const;

// ===========================================
// PRODUCT CATEGORIES
// ===========================================
export const PRODUCT_CATEGORIES = [
    "Reguler",
    "Cheese",
    "Premium",
    "Paket",
    "Minuman",
    "Snack",
] as const;

// ===========================================
// INGREDIENT UNITS
// ===========================================
export const INGREDIENT_UNITS = [
    "Pcs",
    "Slice",
    "Gram",
    "Kg",
    "Ml",
    "Liter",
    "Sachet",
    "Pack",
] as const;

// ===========================================
// FORMAT HELPERS
// ===========================================
export const CURRENCY_FORMAT = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
});
