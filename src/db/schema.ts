import {
    pgTable,
    serial,
    text,
    integer,
    decimal,
    date,
    timestamp,
    pgEnum,
    uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ===========================================
// ENUMS
// ===========================================
export const roleEnum = pgEnum("role", ["admin", "manager", "kasir"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
    "dine_in",
    "take_away",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
    "cash",
    "qris",
    "debit",
    "e_wallet",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
    "paid",
    "pending",
    "failed",
    "voided",
    "refunded",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
    "pending",
    "completed",
    "voided",
    "refunded",
]);
export const inventoryAdjustmentTypeEnum = pgEnum("inventory_adjustment_type", [
    "restock",
    "waste",
    "spoilage",
    "transfer",
    "opname",
]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
    "draft",
    "ordered",
    "received",
    "cancelled",
]);

// ===========================================
// USERS TABLE (untuk RBAC)
// ===========================================
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(), // Hashed password untuk NextAuth Credentials
    fullName: text("full_name"),
    role: roleEnum("role").default("kasir").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// INGREDIENTS TABLE (Bahan Baku)
// ===========================================
export const ingredients = pgTable("ingredients", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    unit: text("unit").notNull(), // Pcs, Slice, ml, gram
    minStockThreshold: integer("min_stock_threshold").notNull().default(10),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// SUPPLIERS TABLE
// ===========================================
export const suppliers = pgTable("suppliers", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    phone: text("phone"),
    address: text("address"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// PURCHASE ORDERS TABLE
// ===========================================
export const purchaseOrders = pgTable("purchase_orders", {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    poNumber: text("po_number").notNull().unique(),
    status: purchaseOrderStatusEnum("status").default("draft").notNull(),
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    orderedAt: timestamp("ordered_at"),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
    id: serial("id").primaryKey(),
    purchaseOrderId: integer("purchase_order_id")
        .references(() => purchaseOrders.id, { onDelete: "cascade" })
        .notNull(),
    ingredientId: integer("ingredient_id")
        .references(() => ingredients.id)
        .notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
});

// ===========================================
// INVENTORY TABLE (Batch Stok Bahan)
// ===========================================
export const inventory = pgTable("inventory", {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
        .references(() => ingredients.id, { onDelete: "cascade" })
        .notNull(),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    batchNumber: text("batch_number"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    receivedDate: date("received_date").defaultNow().notNull(),
    expiryDate: date("expiry_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryAdjustments = pgTable("inventory_adjustments", {
    id: serial("id").primaryKey(),
    inventoryId: integer("inventory_id").references(() => inventory.id),
    ingredientId: integer("ingredient_id")
        .references(() => ingredients.id)
        .notNull(),
    type: inventoryAdjustmentTypeEnum("type").notNull(),
    quantityChange: integer("quantity_change").notNull(),
    quantityBefore: integer("quantity_before").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reason: text("reason"),
    reference: text("reference"),
    userId: uuid("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===========================================
// PRODUCTS TABLE (Menu Burger)
// ===========================================
export const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(), // Reguler, Cheese, Premium
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = inactive
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// RESTAURANT TABLES (QR Menu)
// ===========================================
export const restaurantTables = pgTable("restaurant_tables", {
    id: serial("id").primaryKey(),
    tableNumber: text("table_number").notNull().unique(),
    label: text("label"),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// RECIPES TABLE (Resep - JANTUNG SISTEM)
// ===========================================
export const recipes = pgTable("recipes", {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
        .references(() => products.id, { onDelete: "cascade" })
        .notNull(),
    ingredientId: integer("ingredient_id")
        .references(() => ingredients.id, { onDelete: "cascade" })
        .notNull(),
    quantityNeeded: integer("quantity_needed").notNull(),
});

// ===========================================
// TRANSACTIONS TABLE (Head)
// ===========================================
export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    restaurantTableId: integer("restaurant_table_id").references(() => restaurantTables.id),
    orderToken: uuid("order_token").defaultRandom().notNull(),
    customerSessionToken: uuid("customer_session_token"),
    idempotencyKey: uuid("idempotency_key").defaultRandom().notNull(),
    reservationExpiresAt: timestamp("reservation_expires_at"),
    transactionDate: timestamp("transaction_date").defaultNow().notNull(),
    type: transactionTypeEnum("type").notNull(),
    status: transactionStatusEnum("status").default("completed").notNull(),
    subtotalAmount: decimal("subtotal_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    serviceChargeAmount: decimal("service_charge_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    roundingAmount: decimal("rounding_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    promoCode: text("promo_code"),
    paymentMethod: paymentMethodEnum("payment_method").default("cash").notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0").notNull(),
    changeAmount: decimal("change_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("paid").notNull(),
    refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    voidReason: text("void_reason"),
    refundedAt: timestamp("refunded_at"),
    voidedAt: timestamp("voided_at"),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cashierId: uuid("cashier_id").references(() => users.id),
    customerName: text("customer_name"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
});

// ===========================================
// TRANSACTION ITEMS TABLE (Detail)
// ===========================================
export const transactionItems = pgTable("transaction_items", {
    id: serial("id").primaryKey(),
    transactionId: integer("transaction_id")
        .references(() => transactions.id, { onDelete: "cascade" })
        .notNull(),
    productId: integer("product_id")
        .references(() => products.id)
        .notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// ===========================================
// ACTIVITY LOGS TABLE (untuk audit trail)
// ===========================================
export const activityLogs = pgTable("activity_logs", {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(), // CREATE, UPDATE, DELETE, CHECKOUT, RESTOCK
    tableName: text("table_name").notNull(),
    recordId: text("record_id"),
    details: text("details"), // JSON string untuk detail perubahan
    createdAt: timestamp("created_at").defaultNow(),
});

// ===========================================
// RELATIONS
// ===========================================
export const usersRelations = relations(users, ({ many }) => ({
    transactions: many(transactions),
    activityLogs: many(activityLogs),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
    inventory: many(inventory),
    recipes: many(recipes),
    purchaseOrderItems: many(purchaseOrderItems),
    inventoryAdjustments: many(inventoryAdjustments),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
    ingredient: one(ingredients, {
        fields: [inventory.ingredientId],
        references: [ingredients.id],
    }),
    supplier: one(suppliers, {
        fields: [inventory.supplierId],
        references: [suppliers.id],
    }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
    inventory: many(inventory),
    purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [purchaseOrders.supplierId],
        references: [suppliers.id],
    }),
    items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
        fields: [purchaseOrderItems.purchaseOrderId],
        references: [purchaseOrders.id],
    }),
    ingredient: one(ingredients, {
        fields: [purchaseOrderItems.ingredientId],
        references: [ingredients.id],
    }),
}));

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one }) => ({
    inventory: one(inventory, {
        fields: [inventoryAdjustments.inventoryId],
        references: [inventory.id],
    }),
    ingredient: one(ingredients, {
        fields: [inventoryAdjustments.ingredientId],
        references: [ingredients.id],
    }),
    user: one(users, {
        fields: [inventoryAdjustments.userId],
        references: [users.id],
    }),
}));

export const productsRelations = relations(products, ({ many }) => ({
    recipes: many(recipes),
    transactionItems: many(transactionItems),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
    product: one(products, {
        fields: [recipes.productId],
        references: [products.id],
    }),
    ingredient: one(ingredients, {
        fields: [recipes.ingredientId],
        references: [ingredients.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
    cashier: one(users, {
        fields: [transactions.cashierId],
        references: [users.id],
    }),
    restaurantTable: one(restaurantTables, {
        fields: [transactions.restaurantTableId],
        references: [restaurantTables.id],
    }),
    items: many(transactionItems),
}));

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
    transaction: one(transactions, {
        fields: [transactionItems.transactionId],
        references: [transactions.id],
    }),
    product: one(products, {
        fields: [transactionItems.productId],
        references: [products.id],
    }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
    user: one(users, {
        fields: [activityLogs.userId],
        references: [users.id],
    }),
}));

// ===========================================
// TYPE EXPORTS
// ===========================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type Role = "admin" | "manager" | "kasir";
export type TransactionType = "dine_in" | "take_away";
export type PaymentMethod = "cash" | "qris" | "debit" | "e_wallet";
export type PaymentStatus = "paid" | "pending" | "failed" | "voided" | "refunded";
export type TransactionStatus = "pending" | "completed" | "voided" | "refunded";
export type InventoryAdjustmentType = "restock" | "waste" | "spoilage" | "transfer" | "opname";
export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";
