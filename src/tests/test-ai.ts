import { handleUserMessage } from "../services/ai.js";
import { db, pool } from "../db/index.js";
import { chatSessions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ override: true });

async function runTest() {
  const testUserId = `test-user-${Date.now()}`;

  try {
    console.log("=== AI Core Logic & RAG Guardrails Test ===");
    console.log(`Using mock user session ID: ${testUserId}`);

    const query0 = "hi threre";
    console.log(`\nUser: "${query0}"`);
    console.log("Processing...");
    const reply0 = await handleUserMessage(testUserId, query0);
    console.log(`Agent response:\n"${reply0}"`);

    const query1 = "tell me about your services";
    console.log(`\nUser: "${query1}"`);
    console.log("Processing...");
    const reply1 = await handleUserMessage(testUserId, query1);
    console.log(`Agent response:\n"${reply1}"`);

    const query2 = "hi again";
    console.log(`\nUser: "${query2}"`);
    console.log("Processing...");
    const reply2 = await handleUserMessage(testUserId, query2);
    console.log(`Agent response:\n"${reply2}"`);

    const query3 = "What is the Female Brass Union?";
    console.log(`\nUser: "${query3}"`);
    console.log("Processing...");
    const reply3 = await handleUserMessage(testUserId, query3);
    console.log(`Agent response:\n"${reply3}"`);

    const query4 = "Write a python function to sort an array.";
    console.log(`\nUser: "${query4}"`);
    console.log("Processing...");
    const reply4 = await handleUserMessage(testUserId, query4);
    console.log(`Agent response:\n"${reply4}"`);

    console.log("\nCleaning up test session history from database...");
    await db.delete(chatSessions).where(eq(chatSessions.userId, testUserId));
    console.log("Cleanup complete.");

    console.log("\nAI Core RAG & memory test run finished!");
  } catch (error) {
    console.error("AI Core Integration Test failed:", error);
  } finally {
    await pool.end();
  }
}

runTest();
