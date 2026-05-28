import { handleUserMessage } from "../services/ai.js";
import { db, pool } from "../db/index.js";
import { chatSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ override: true });

async function runTest() {
  const testUserId = `test-sinhala-${Date.now()}`;

  try {
    console.log("=== Sinhala & Singlish Translation Test ===");

    const q0 = "කොහොමද";
    console.log(`\nUser: "${q0}"`);
    const r0 = await handleUserMessage(testUserId, q0);
    console.log(`Response:\n"${r0}"`);

    const q1 = "Female Brass Union eka gana kiyන්න";
    console.log(`\nUser: "${q1}"`);
    const r1 = await handleUserMessage(testUserId, q1);
    console.log(`Response:\n"${r1}"`);

    const q2 = "PPR bata thiyenawada?";
    console.log(`\nUser: "${q2}"`);
    const r2 = await handleUserMessage(testUserId, q2);
    console.log(`Response:\n"${r2}"`);

    const q3 = "sthuthi!";
    console.log(`\nUser: "${q3}"`);
    const r3 = await handleUserMessage(testUserId, q3);
    console.log(`Response:\n"${r3}"`);

    console.log("\nCleaning up...");
    await db.delete(chatSessions).where(eq(chatSessions.userId, testUserId));
    console.log("Done.");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await pool.end();
  }
}

runTest();
