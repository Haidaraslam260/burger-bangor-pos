import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("DATABASE_URL is not set");
        return;
    }

    const client = postgres(databaseUrl);
    const db = drizzle(client);

    try {
        const result = await db.execute("SELECT id, email, role FROM users");
        console.log("Users in database:");
        console.table(result);
    } catch (err) {
        console.error("Error querying users:", err);
    } finally {
        await client.end();
    }
}

main();
