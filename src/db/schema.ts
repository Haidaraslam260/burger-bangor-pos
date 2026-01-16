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
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ===========================================
// INVENTORY TABLE (Stok Bahan)
// ===========================================
export const inventory = pgTable("inventory", {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
        .references(() => ingredients.id, { onDelete: "cascade" })
        .notNull(),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    expiryDate: date("expiry_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
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
    transactionDate: timestamp("transaction_date").defaultNow().notNull(),
    type: transactionTypeEnum("type").notNull(),
    totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
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
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
    ingredient: one(ingredients, {
        fields: [inventory.ingredientId],
        references: [ingredients.id],
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
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
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
