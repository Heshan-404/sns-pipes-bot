import { initTelegramBot } from "./gateways/telegram.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ override: true });


async function main() {
  console.log("Initializing Wolt AI Chat Agent backend service...");

  // 1. Verify Database Connection
  try {
    console.log("Verifying Database connection status...");
    // A simple query to verify database is reachable
    await db.execute(sql`SELECT 1`);
    console.log("Database connection verified successfully!");
  } catch (error) {
    console.error("CRITICAL: Database connection check failed! Please verify DATABASE_URL in your .env file.");
    console.error("Error details:", error);
    // Do not crash the entire process, allow retry or bot to launch (or exit if DB is essential)
    console.warn("Application will attempt to continue, but database-dependent features will fail.");
  }

  // 2. Initialize Messaging Gateway(s)
  const bot = initTelegramBot();
  if (!bot) {
    console.log("Telegram Bot Gateway could not be initialized due to missing configurations.");
    console.log("Ensure GEMINI_API_KEY, DATABASE_URL, and TELEGRAM_BOT_TOKEN are set in your .env file.");
  }
}

main().catch((err) => {
  console.error("Application boot sequence failed with a critical error:", err);
  process.exit(1);
});
