import { db, pool } from "../db/index.js";
import { knowledgeChunks, chatSessions } from "../db/schema.js";
import * as dotenv from "dotenv";

dotenv.config({ override: true });

async function reset() {
  try {
    console.log("========================================");
    console.log("  SNS Pipes AI - Database Reset Tool");
    console.log("========================================\n");

    // 1. Clear all vector knowledge chunks
    console.log("Step 1: Deleting all knowledge chunks (vectors)...");
    const deletedChunks = await db.delete(knowledgeChunks);
    console.log("  Knowledge chunks cleared.\n");

    // 2. Clear all chat session history
    console.log("Step 2: Deleting all chat session history...");
    const deletedSessions = await db.delete(chatSessions);
    console.log("  Chat sessions cleared.\n");

    console.log("Reset complete! The database is now clean.");
    console.log("Run 'npm run ingest' to load new documents and rebuild vectors.");
    console.log("========================================\n");

  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
