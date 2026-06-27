import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function main() {
    console.log("Checking database tables...");
    try {
        const usersCount = await db.select({ id: schema.users.id }).from(schema.users);
        const productsCount = await db.select({ id: schema.products.id }).from(schema.products);
        const ingredientsCount = await db.select({ id: schema.ingredients.id }).from(schema.ingredients);
        const inventoryCount = await db.select({ id: schema.inventory.id }).from(schema.inventory);
        const transactionsCount = await db.select({ id: schema.transactions.id }).from(schema.transactions);
        
        console.log(`Users count: ${usersCount.length}`);
        console.log(`Products count: ${productsCount.length}`);
        console.log(`Ingredients count: ${ingredientsCount.length}`);
        console.log(`Inventory count: ${inventoryCount.length}`);
        console.log(`Transactions count: ${transactionsCount.length}`);
    } catch (error) {
        console.error("Error querying database:", error);
    } finally {
        await client.end();
        process.exit(0);
    }
}

main();
