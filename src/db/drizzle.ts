import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import config from "../config";

console.log("🌦️ 🚀 Connecting to database with drizzle...");
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl:
    config.nodeEnv === "production"
      ? {
        rejectUnauthorized: true
      }
      : undefined,
});

export const drizzleConnect = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    console.log("🌦️ ✅ Drizzle database connection established");
  } catch (error) {
    console.error(
      "🌦️ ❌ Failed to connect to database with drizzle:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
};

export const db = drizzle(pool, { schema });
export type Database = typeof db;
