import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { hash } from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function main() {
    console.log("🌱 Seeding database...");

    // ============================================================
    // 1. CLEAR ALL EXISTING DATA
    // ============================================================
    console.log("🧹 Clearing existing data...");
    await db.delete(schema.activityLogs);
    await db.delete(schema.transactionItems);
    await db.delete(schema.transactions);
    await db.delete(schema.recipes);
    await db.delete(schema.inventory);
    await db.delete(schema.products);
    await db.delete(schema.ingredients);
    await db.delete(schema.users);

    // ============================================================
    // 2. SEED USERS (Admin, Manager, Kasir)
    // ============================================================
    console.log("👤 Seeding users...");
    const hashedAdminPassword = await hash("admin123", 12);
    const hashedManagerPassword = await hash("manager123", 12);
    const hashedKasirPassword = await hash("kasir123", 12);

    const usersData = await db.insert(schema.users).values([
        {
            email: "admin@burgerbangor.id",
            password: hashedAdminPassword,
            fullName: "Admin Bangor",
            role: "admin",
        },
        {
            email: "manager@burgerbangor.id",
            password: hashedManagerPassword,
            fullName: "Siti Manager",
            role: "manager",
        },
        {
            email: "kasir@burgerbangor.id",
            password: hashedKasirPassword,
            fullName: "Budi Kasir",
            role: "kasir",
        },
    ]).returning();

    console.log(`   ✓ Created ${usersData.length} users`);

    // ============================================================
    // 3. SEED INGREDIENTS (Bahan Baku)
    // ============================================================
    console.log("🥬 Seeding ingredients...");
    const ingredientsData = await db.insert(schema.ingredients).values([
        { name: "Burger Bun", unit: "Pcs" },
        { name: "Beef Patty 100g", unit: "Pcs" },
        { name: "Cheese Slice", unit: "Slice" },
        { name: "Lettuce", unit: "Gram" },
        { name: "Tomato Slice", unit: "Pcs" },
        { name: "Onion Slice", unit: "Gram" },
        { name: "Pickle", unit: "Pcs" },
        { name: "Sauce Special", unit: "Ml" },
        { name: "Mayonnaise", unit: "Ml" },
        { name: "Ketchup", unit: "Ml" },
        { name: "Mustard", unit: "Ml" },
        { name: "French Fries (Raw)", unit: "Gram" },
        { name: "Chicken Patty", unit: "Pcs" },
        { name: "Egg", unit: "Pcs" },
        { name: "Bacon Strip", unit: "Pcs" },
    ]).returning();

    console.log(`   ✓ Created ${ingredientsData.length} ingredients`);

    // Create a map for easy lookup
    const ingredientMap: Record<string, number> = {};
    ingredientsData.forEach(ing => {
        ingredientMap[ing.name] = ing.id;
    });

    // ============================================================
    // 4. SEED INVENTORY (Initial Stock)
    // ============================================================
    console.log("📦 Seeding inventory...");
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const twoWeeks = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

    const inventoryValues = [
        { ingredientId: ingredientMap["Burger Bun"], stockQuantity: 200, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Beef Patty 100g"], stockQuantity: 150, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Cheese Slice"], stockQuantity: 300, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Lettuce"], stockQuantity: 5000, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Tomato Slice"], stockQuantity: 200, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Onion Slice"], stockQuantity: 2000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Pickle"], stockQuantity: 500, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Sauce Special"], stockQuantity: 5000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mayonnaise"], stockQuantity: 3000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Ketchup"], stockQuantity: 3000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mustard"], stockQuantity: 2000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["French Fries (Raw)"], stockQuantity: 10000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Chicken Patty"], stockQuantity: 100, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Egg"], stockQuantity: 200, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Bacon Strip"], stockQuantity: 150, expiryDate: twoWeeks.toISOString().split("T")[0] },
    ];

    await db.insert(schema.inventory).values(inventoryValues);
    console.log(`   ✓ Created ${inventoryValues.length} inventory records`);

    // ============================================================
    // 5. SEED PRODUCTS (Menu Burger)
    // ============================================================
    console.log("🍔 Seeding products...");
    const productsData = await db.insert(schema.products).values([
        // REGULER BURGERS
        {
            name: "Burger Jelata",
            category: "Reguler",
            price: "15000",
            description: "Burger hemat dengan beef patty dan saus spesial. Pilihan tepat untuk kantong mahasiswa.",
            isActive: 1,
        },
        {
            name: "Burger Juragan",
            category: "Reguler",
            price: "22000",
            description: "Burger dengan beef patty tebal, sayuran segar, dan saus spesial Bangor.",
            isActive: 1,
        },
        {
            name: "Cheese Burger",
            category: "Reguler",
            price: "18000",
            description: "Burger klasik dengan keju cheddar lumer yang menggugah selera.",
            isActive: 1,
        },
        // PREMIUM BURGERS
        {
            name: "Burger Sultan",
            category: "Premium",
            price: "35000",
            description: "Burger mewah dengan DOUBLE beef patty, DOUBLE cheese, bacon, dan telur mata sapi.",
            isActive: 1,
        },
        {
            name: "Chicken Burger Deluxe",
            category: "Premium",
            price: "28000",
            description: "Burger ayam crispy dengan mayo spesial dan sayuran premium.",
            isActive: 1,
        },
        {
            name: "BBQ Bacon Burger",
            category: "Premium",
            price: "32000",
            description: "Beef patty dengan bacon crispy, bawang goreng, dan saus BBQ.",
            isActive: 1,
        },
        // SIDES
        {
            name: "French Fries Regular",
            category: "Sides",
            price: "10000",
            description: "Kentang goreng renyah porsi regular.",
            isActive: 1,
        },
        {
            name: "French Fries Large",
            category: "Sides",
            price: "15000",
            description: "Kentang goreng renyah porsi besar untuk berbagi.",
            isActive: 1,
        },
        {
            name: "Cheese Fries",
            category: "Sides",
            price: "18000",
            description: "Kentang goreng dengan saus keju cheddar lumer.",
            isActive: 1,
        },
    ]).returning();

    console.log(`   ✓ Created ${productsData.length} products`);

    // Create a map for easy lookup
    const productMap: Record<string, number> = {};
    productsData.forEach(prod => {
        productMap[prod.name] = prod.id;
    });

    // ============================================================
    // 6. SEED RECIPES (Resep - INTI SISTEM!)
    // ============================================================
    console.log("📜 Seeding recipes...");

    const recipeValues = [
        // === Burger Jelata ===
        { productId: productMap["Burger Jelata"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Burger Jelata"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Burger Jelata"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Burger Jelata"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 10 },

        // === Burger Juragan ===
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 15 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Tomato Slice"], quantityNeeded: 2 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 10 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 15 },
        { productId: productMap["Burger Juragan"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 10 },

        // === Cheese Burger ===
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 10 },

        // === Burger Sultan (DOUBLE EVERYTHING!) ===
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 2 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 2 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Bacon Strip"], quantityNeeded: 2 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Egg"], quantityNeeded: 1 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 20 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Tomato Slice"], quantityNeeded: 2 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 15 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 20 },
        { productId: productMap["Burger Sultan"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },

        // === Chicken Burger Deluxe ===
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Chicken Patty"], quantityNeeded: 1 },
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 15 },
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Tomato Slice"], quantityNeeded: 2 },
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 20 },
        { productId: productMap["Chicken Burger Deluxe"], ingredientId: ingredientMap["Pickle"], quantityNeeded: 3 },

        // === BBQ Bacon Burger ===
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Bacon Strip"], quantityNeeded: 2 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 20 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 15 },

        // === French Fries Regular ===
        { productId: productMap["French Fries Regular"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 100 },
        { productId: productMap["French Fries Regular"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 20 },

        // === French Fries Large ===
        { productId: productMap["French Fries Large"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 180 },
        { productId: productMap["French Fries Large"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 30 },

        // === Cheese Fries ===
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 150 },
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 2 },
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },
    ];

    await db.insert(schema.recipes).values(recipeValues);
    console.log(`   ✓ Created ${recipeValues.length} recipe entries`);

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log("\n" + "=".repeat(50));
    console.log("✅ SEEDING COMPLETE!");
    console.log("=".repeat(50));
    console.log(`
📊 Data Summary:
   • Users: ${usersData.length} (admin, manager, kasir)
   • Ingredients: ${ingredientsData.length} bahan baku
   • Inventory: ${inventoryValues.length} stok awal
   • Products: ${productsData.length} menu
   • Recipes: ${recipeValues.length} entri resep

🔑 Demo Accounts:
   • admin@burgerbangor.id / admin123
   • manager@burgerbangor.id / manager123
   • kasir@burgerbangor.id / kasir123

🚀 Sistem siap digunakan untuk transaksi!
`);

    await client.end();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed!");
    console.error(err);
    process.exit(1);
});
