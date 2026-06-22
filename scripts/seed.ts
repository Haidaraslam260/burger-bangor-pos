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
    await db.delete(schema.inventoryAdjustments);
    await db.delete(schema.purchaseOrderItems);
    await db.delete(schema.purchaseOrders);
    await db.delete(schema.activityLogs);
    await db.delete(schema.transactionItems);
    await db.delete(schema.transactions);
    await db.delete(schema.recipes);
    await db.delete(schema.inventory);
    await db.delete(schema.suppliers);
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
    // 3. SEED INGREDIENTS (Bahan Baku Lengkap)
    // ============================================================
    console.log("🥬 Seeding ingredients...");
    const ingredientsData = await db.insert(schema.ingredients).values([
        // Roti & Daging
        { name: "Burger Bun", unit: "Pcs" },
        { name: "Beef Patty 100g", unit: "Pcs" },
        { name: "Chicken Patty", unit: "Pcs" },
        { name: "Crispy Chicken Patty", unit: "Pcs" },
        { name: "Bacon Strip", unit: "Pcs" },
        { name: "Egg", unit: "Pcs" },
        
        // Keju & Sayuran
        { name: "Cheese Slice", unit: "Slice" },
        { name: "Lettuce", unit: "Gram" },
        { name: "Tomato Slice", unit: "Pcs" },
        { name: "Onion Slice", unit: "Gram" },
        { name: "Pickle", unit: "Pcs" },
        
        // Saus & Minyak
        { name: "Sauce Special", unit: "Ml" },
        { name: "Mayonnaise", unit: "Ml" },
        { name: "Ketchup", unit: "Ml" },
        { name: "Mustard", unit: "Ml" },
        { name: "Cheese Sauce Powder", unit: "Gram" },
        { name: "Sweet Chili Sauce", unit: "Ml" },
        { name: "Cooking Oil", unit: "Ml" },
        
        // Kentang & Snack Mentah
        { name: "French Fries (Raw)", unit: "Gram" },
        { name: "Onion Ring (Raw)", unit: "Pcs" },
        { name: "Mozzarella Stick (Raw)", unit: "Pcs" },
        
        // Bahan Minuman
        { name: "Tea Bag", unit: "Pcs" },
        { name: "Lemon Tea Concentrate", unit: "Pcs" },
        { name: "Milo Powder", unit: "Gram" },
        { name: "Coffee Beans", unit: "Gram" },
        { name: "Milk", unit: "Ml" },
        { name: "Sugar", unit: "Gram" },
        { name: "Ice Cube", unit: "Gram" },
        { name: "Mineral Water Bottle", unit: "Pcs" },
    ]).returning();

    console.log(`   ✓ Created ${ingredientsData.length} ingredients`);

    // Map untuk mempermudah pencarian ID
    const ingredientMap: Record<string, number> = {};
    ingredientsData.forEach(ing => {
        ingredientMap[ing.name] = ing.id;
    });

    // ============================================================
    // 4. SEED INVENTORY (Stok Awal Melimpah)
    // ============================================================
    console.log("📦 Seeding inventory...");
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const twoWeeks = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

    const inventoryValues = [
        // Roti & Daging
        { ingredientId: ingredientMap["Burger Bun"], stockQuantity: 300, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Beef Patty 100g"], stockQuantity: 250, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Chicken Patty"], stockQuantity: 150, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Crispy Chicken Patty"], stockQuantity: 150, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Bacon Strip"], stockQuantity: 200, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Egg"], stockQuantity: 200, expiryDate: twoWeeks.toISOString().split("T")[0] },

        // Keju & Sayuran
        { ingredientId: ingredientMap["Cheese Slice"], stockQuantity: 400, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Lettuce"], stockQuantity: 10000, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Tomato Slice"], stockQuantity: 300, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Onion Slice"], stockQuantity: 4000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Pickle"], stockQuantity: 1000, expiryDate: nextMonth.toISOString().split("T")[0] },

        // Saus & Minyak
        { ingredientId: ingredientMap["Sauce Special"], stockQuantity: 10000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mayonnaise"], stockQuantity: 8000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Ketchup"], stockQuantity: 8000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mustard"], stockQuantity: 5000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Cheese Sauce Powder"], stockQuantity: 3000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Sweet Chili Sauce"], stockQuantity: 5000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Cooking Oil"], stockQuantity: 20000, expiryDate: nextMonth.toISOString().split("T")[0] },

        // Kentang & Snack Mentah
        { ingredientId: ingredientMap["French Fries (Raw)"], stockQuantity: 20000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Onion Ring (Raw)"], stockQuantity: 500, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mozzarella Stick (Raw)"], stockQuantity: 400, expiryDate: nextMonth.toISOString().split("T")[0] },

        // Bahan Minuman
        { ingredientId: ingredientMap["Tea Bag"], stockQuantity: 500, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Lemon Tea Concentrate"], stockQuantity: 300, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Milo Powder"], stockQuantity: 10000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Coffee Beans"], stockQuantity: 5000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Milk"], stockQuantity: 15000, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Sugar"], stockQuantity: 10000, expiryDate: nextMonth.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Ice Cube"], stockQuantity: 50000, expiryDate: twoWeeks.toISOString().split("T")[0] },
        { ingredientId: ingredientMap["Mineral Water Bottle"], stockQuantity: 200, expiryDate: nextMonth.toISOString().split("T")[0] },
    ];

    await db.insert(schema.inventory).values(inventoryValues);
    console.log(`   ✓ Created ${inventoryValues.length} inventory records`);

    // ============================================================
    // 5. SEED PRODUCTS (Menu Lengkap 6 Kategori)
    // ============================================================
    console.log("🍔 Seeding products...");
    const productsData = await db.insert(schema.products).values([
        // REGULER
        {
            name: "Burger Jelata",
            category: "Reguler",
            price: "15000",
            description: "Burger hemat dengan single beef patty dan saus spesial Bangor.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Burger Juragan",
            category: "Reguler",
            price: "22000",
            description: "Burger dengan beef patty tebal, sayuran segar, dan mayo spesial Bangor.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Chicken Burger",
            category: "Reguler",
            price: "17000",
            description: "Burger ayam empuk gurih dengan selada segar dan saus mayones.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60",
        },

        // CHEESE
        {
            name: "Cheese Burger",
            category: "Cheese",
            price: "18000",
            description: "Burger klasik dengan keju cheddar slice lumer yang menggugah selera.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Double Cheese Burger",
            category: "Cheese",
            price: "25000",
            description: "Dua beef patty juicy dengan dua lapisan keju cheddar slice lumer.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Cheese Fries",
            category: "Cheese",
            price: "18000",
            description: "Kentang goreng renyah disiram saus keju cheddar dan mayones melimpah.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60",
        },

        // PREMIUM
        {
            name: "Burger Sultan",
            category: "Premium",
            price: "35000",
            description: "Burger termewah dengan DOUBLE beef patty, DOUBLE cheese, bacon renyah, dan telur dadar.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "BBQ Bacon Burger",
            category: "Premium",
            price: "32000",
            description: "Beef patty dengan bacon sapi, keju cheddar slice, bawang bombay, dan saus BBQ Bangor.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Smoked Beef Cheese Burger",
            category: "Premium",
            price: "30000",
            description: "Burger sapi premium dengan tambahan smoked beef, keju cheddar slice, dan saus spesial.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop&q=60",
        },

        // PAKET
        {
            name: "Paket Jelata",
            category: "Paket",
            price: "25000",
            description: "Paket kenyang hemat: Burger Jelata + French Fries Regular + Es Lemon Tea.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1610614819513-58e34989848b?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Paket Juragan",
            category: "Paket",
            price: "33000",
            description: "Paket terfavorit: Burger Juragan + French Fries Regular + Milo Dino dingin.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Paket Sultan",
            category: "Paket",
            price: "50000",
            description: "Paket lengkap mewah: Burger Sultan + Cheese Fries + Kopi Susu Bangor.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=500&auto=format&fit=crop&q=60",
        },

        // MINUMAN
        {
            name: "Es Teh Manis",
            category: "Minuman",
            price: "5000",
            description: "Es teh manis seduh segar pelepas dahaga.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Lemon Tea",
            category: "Minuman",
            price: "8000",
            description: "Es teh rasa lemon segar dengan asam manis yang pas.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Milo Dino",
            category: "Minuman",
            price: "10000",
            description: "Es cokelat Milo manis legit dengan taburan bubuk Milo ekstra di atasnya.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Kopi Susu Bangor",
            category: "Minuman",
            price: "12000",
            description: "Kopi susu espresso dingin dengan gula aren legit khas Bangor.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Air Mineral",
            category: "Minuman",
            price: "4000",
            description: "Air mineral botol 600ml segar dingin.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500&auto=format&fit=crop&q=60",
        },

        // SNACK
        {
            name: "French Fries Regular",
            category: "Snack",
            price: "10000",
            description: "Kentang goreng renyah gurih dengan saus sambal.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "French Fries Large",
            category: "Snack",
            price: "15000",
            description: "Kentang goreng renyah gurih porsi besar.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Onion Rings",
            category: "Snack",
            price: "12000",
            description: "Bawang bombay cincin goreng tepung renyah isi 6 pcs.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500&auto=format&fit=crop&q=60",
        },
        {
            name: "Mozzarella Sticks",
            category: "Snack",
            price: "15000",
            description: "Stik keju mozzarella goreng krispi dengan keju molor isi 4 pcs.",
            isActive: 1,
            imageUrl: "https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=500&auto=format&fit=crop&q=60",
        },
    ]).returning();

    console.log(`   ✓ Created ${productsData.length} products`);

    // Map untuk mempermudah pencarian ID
    const productMap: Record<string, number> = {};
    productsData.forEach(prod => {
        productMap[prod.name] = prod.id;
    });

    // ============================================================
    // 6. SEED RECIPES (Hubungan Bahan Baku & Produk)
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

        // === Chicken Burger ===
        { productId: productMap["Chicken Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Chicken Burger"], ingredientId: ingredientMap["Chicken Patty"], quantityNeeded: 1 },
        { productId: productMap["Chicken Burger"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Chicken Burger"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },

        // === Cheese Burger ===
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 1 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Cheese Burger"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 10 },

        // === Double Cheese Burger ===
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 2 },
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 2 },
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 15 },
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 15 },
        { productId: productMap["Double Cheese Burger"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 10 },

        // === Cheese Fries ===
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 150 },
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["Cheese Sauce Powder"], quantityNeeded: 20 },
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },
        { productId: productMap["Cheese Fries"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 70 },

        // === Burger Sultan ===
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

        // === BBQ Bacon Burger ===
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Bacon Strip"], quantityNeeded: 2 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 1 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 20 },
        { productId: productMap["BBQ Bacon Burger"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 15 },

        // === Smoked Beef Cheese Burger ===
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Bacon Strip"], quantityNeeded: 1 },
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 1 },
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Smoked Beef Cheese Burger"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 10 },

        // === Paket Jelata (Burger Jelata + Fries + Lemon Tea) ===
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 10 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 10 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 100 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 20 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Lemon Tea Concentrate"], quantityNeeded: 1 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 15 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },
        { productId: productMap["Paket Jelata"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 50 },

        // === Paket Juragan (Burger Juragan + Fries + Milo Dino) ===
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 1 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 15 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Tomato Slice"], quantityNeeded: 2 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 10 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 15 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 10 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 100 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 20 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Milo Powder"], quantityNeeded: 30 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Milk"], quantityNeeded: 150 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 10 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },
        { productId: productMap["Paket Juragan"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 50 },

        // === Paket Sultan (Burger Sultan + Cheese Fries + Kopi Susu Bangor) ===
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Burger Bun"], quantityNeeded: 1 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Beef Patty 100g"], quantityNeeded: 2 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Cheese Slice"], quantityNeeded: 2 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Bacon Strip"], quantityNeeded: 2 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Egg"], quantityNeeded: 1 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Lettuce"], quantityNeeded: 20 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Tomato Slice"], quantityNeeded: 2 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Onion Slice"], quantityNeeded: 15 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Sauce Special"], quantityNeeded: 20 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 150 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Cheese Sauce Powder"], quantityNeeded: 20 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Coffee Beans"], quantityNeeded: 10 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Milk"], quantityNeeded: 200 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 15 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 400 },
        { productId: productMap["Paket Sultan"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 120 },

        // === Es Teh Manis ===
        { productId: productMap["Es Teh Manis"], ingredientId: ingredientMap["Tea Bag"], quantityNeeded: 1 },
        { productId: productMap["Es Teh Manis"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 20 },
        { productId: productMap["Es Teh Manis"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },

        // === Lemon Tea ===
        { productId: productMap["Lemon Tea"], ingredientId: ingredientMap["Lemon Tea Concentrate"], quantityNeeded: 1 },
        { productId: productMap["Lemon Tea"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 15 },
        { productId: productMap["Lemon Tea"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },

        // === Milo Dino ===
        { productId: productMap["Milo Dino"], ingredientId: ingredientMap["Milo Powder"], quantityNeeded: 35 }, // taburan + larutan
        { productId: productMap["Milo Dino"], ingredientId: ingredientMap["Milk"], quantityNeeded: 150 },
        { productId: productMap["Milo Dino"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 10 },
        { productId: productMap["Milo Dino"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },

        // === Kopi Susu Bangor ===
        { productId: productMap["Kopi Susu Bangor"], ingredientId: ingredientMap["Coffee Beans"], quantityNeeded: 10 },
        { productId: productMap["Kopi Susu Bangor"], ingredientId: ingredientMap["Milk"], quantityNeeded: 120 },
        { productId: productMap["Kopi Susu Bangor"], ingredientId: ingredientMap["Sugar"], quantityNeeded: 15 }, // gula aren
        { productId: productMap["Kopi Susu Bangor"], ingredientId: ingredientMap["Ice Cube"], quantityNeeded: 200 },

        // === Air Mineral ===
        { productId: productMap["Air Mineral"], ingredientId: ingredientMap["Mineral Water Bottle"], quantityNeeded: 1 },

        // === French Fries Regular ===
        { productId: productMap["French Fries Regular"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 100 },
        { productId: productMap["French Fries Regular"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 20 },
        { productId: productMap["French Fries Regular"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 50 },

        // === French Fries Large ===
        { productId: productMap["French Fries Large"], ingredientId: ingredientMap["French Fries (Raw)"], quantityNeeded: 180 },
        { productId: productMap["French Fries Large"], ingredientId: ingredientMap["Ketchup"], quantityNeeded: 30 },
        { productId: productMap["French Fries Large"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 80 },

        // === Onion Rings ===
        { productId: productMap["Onion Rings"], ingredientId: ingredientMap["Onion Ring (Raw)"], quantityNeeded: 6 },
        { productId: productMap["Onion Rings"], ingredientId: ingredientMap["Mayonnaise"], quantityNeeded: 15 },
        { productId: productMap["Onion Rings"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 50 },

        // === Mozzarella Sticks ===
        { productId: productMap["Mozzarella Sticks"], ingredientId: ingredientMap["Mozzarella Stick (Raw)"], quantityNeeded: 4 },
        { productId: productMap["Mozzarella Sticks"], ingredientId: ingredientMap["Sweet Chili Sauce"], quantityNeeded: 20 },
        { productId: productMap["Mozzarella Sticks"], ingredientId: ingredientMap["Cooking Oil"], quantityNeeded: 50 },
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
   • Products: ${productsData.length} menu (Reguler, Cheese, Premium, Paket, Minuman, Snack)
   • Recipes: ${recipeValues.length} entri resep

🔑 Demo Accounts:
   • admin@burgerbangor.id / admin123
   • manager@burgerbangor.id / manager123
   • kasir@burgerbangor.id / kasir123

🚀 Sistem siap digunakan untuk transaksi POS dengan kategori lengkap!
`);

    await client.end();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Seeding failed!");
    console.error(err);
    process.exit(1);
});
