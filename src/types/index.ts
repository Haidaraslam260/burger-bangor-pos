import type { Role, TransactionType } from "@/db/schema";

// ===========================================
// CART TYPES
// ===========================================
export interface CartItem {
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}

export interface Cart {
    items: CartItem[];
    totalAmount: number;
    itemCount: number;
}

// ===========================================
// CHECKOUT TYPES
// ===========================================
export interface CheckoutInput {
    items: CartItem[];
    type: TransactionType;
    customerName?: string;
    notes?: string;
}

export interface CheckoutResult {
    success: boolean;
    transactionId?: number;
    message: string;
    error?: string;
}

// ===========================================
// INGREDIENT WITH STOCK
// ===========================================
export interface IngredientWithStock {
    id: number;
    name: string;
    unit: string;
    totalStock: number;
    inventoryItems: {
        id: number;
        stockQuantity: number;
        expiryDate: string;
    }[];
}

// ===========================================
// PRODUCT WITH RECIPE
// ===========================================
export interface ProductWithRecipe {
    id: number;
    name: string;
    category: string;
    price: string;
    description: string | null;
    imageUrl: string | null;
    isActive: number;
    recipes: {
        ingredientId: number;
        ingredientName: string;
        ingredientUnit: string;
        quantityNeeded: number;
    }[];
}

// ===========================================
// REQUIRED INGREDIENT FOR CHECKOUT
// ===========================================
export interface RequiredIngredient {
    ingredientId: number;
    ingredientName: string;
    totalNeeded: number;
    availableStock: number;
    isAvailable: boolean;
}

// ===========================================
// REPORT TYPES
// ===========================================
export interface SalesReport {
    date: string;
    totalTransactions: number;
    totalAmount: number;
    dineInCount: number;
    takeAwayCount: number;
}

export interface StockReport {
    ingredientId: number;
    ingredientName: string;
    unit: string;
    currentStock: number;
    lowStockThreshold: number;
    isLowStock: boolean;
    expiringItems: {
        quantity: number;
        expiryDate: string;
        daysUntilExpiry: number;
    }[];
}

// ===========================================
// USER SESSION
// ===========================================
export interface UserSession {
    id: string;
    email: string;
    fullName: string | null;
    role: Role;
}

// ===========================================
// ACTION RESULT
// ===========================================
export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ===========================================
// PAGINATION
// ===========================================
export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginatedResult<T> {
    data: T[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
