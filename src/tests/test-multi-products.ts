import { handleUserMessage } from "../services/ai.js";
import { db, pool } from "../db/index.js";
import { chatSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ override: true });

async function runTest() {
  const testUserId = `test-multi-${Date.now()}`;

  try {
    console.log("=== Multi-Product Detailed Inquiry Test ===");

    const query = "me products deka gana mata indetails danaganna oone sinhalen\n- PP-R Welding Tool (IFAN-125)\n- PP-R Hot Machine (IFAN PLUS-119)";
    console.log(`\nUser Inquiry:\n"${query}"`);
    console.log("Processing...");

    const reply = await handleUserMessage(testUserId, query);
    console.log("\nRaw Agent Response:");
    console.log("----------------------------------------");
    console.log(reply);
    console.log("----------------------------------------");

    const metadataRegexGlobal = /\[METADATA:\s*image=(.*?)\s*\|\s*slug=(.*?)\s*\|\s*name=(.*?)\]/gi;
    const matches = Array.from(reply.matchAll(metadataRegexGlobal));
    console.log(`\nFound ${matches.length} metadata tags.`);

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`Tag ${i + 1}:`);
      console.log(`  Image: ${match[1].trim()}`);
      console.log(`  Slug: ${match[2].trim()}`);
      console.log(`  Name: ${match[3].trim()}`);
    }

    console.log("\nCleaning up test session history from database...");
    await db.delete(chatSessions).where(eq(chatSessions.userId, testUserId));
    console.log("Done.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

runTest();
