import { getEmbedding } from "../services/gemini.js";
import { db, pool } from "../db/index.js";
import { knowledgeChunks } from "../db/schema.js";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ override: true });


async function test() {
  try {
    console.log("=== Embedded Vector & DB Integration Test ===");

    // 1. Ensure pgvector extension is enabled
    console.log("Checking for pgvector extension in database...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("pgvector extension check passed.");

    // 2. Generate a test embedding from Gemini API
    const testText = "Hello World! This is a verification query for Wolt AI Chat Agent.";
    console.log(`Generating embedding for text: "${testText}"...`);
    const embedding = await getEmbedding(testText);

    console.log(`Embedding generated successfully! Dimension: ${embedding.length}`);
    if (embedding.length !== 3072) {
      throw new Error(`Invalid embedding size. Expected 3072, got ${embedding.length}`);
    }


    // 3. Test insert mock chunk into DB
    console.log("Inserting temporary test chunk into knowledge_chunks table...");
    const [inserted] = await db
      .insert(knowledgeChunks)
      .values({
        content: "Temporary test chunk: Wolt AI is successfully configured.",
        embedding: embedding,
        metadata: { source: "test-embeddings.ts", test: true },
      })
      .returning({ id: knowledgeChunks.id });

    console.log(`Successfully inserted test chunk with ID: ${inserted.id}`);

    // 4. Query it back using vector distance operator
    console.log("Running similarity lookup using pgvector <=> distance operator...");
    const results = await db
      .select({
        id: knowledgeChunks.id,
        content: knowledgeChunks.content,
        distance: sql<number>`${knowledgeChunks.embedding} <=> ${JSON.stringify(embedding)}`,
      })
      .from(knowledgeChunks)
      .orderBy(sql`${knowledgeChunks.embedding} <=> ${JSON.stringify(embedding)}`)
      .limit(1);

    console.log("Similarity search completed. Top match:");
    console.log(JSON.stringify(results[0], null, 2));

    // 5. Clean up temporary test chunk
    console.log("Cleaning up temporary test chunk...");
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.id, inserted.id));
    console.log("Cleanup finished.");

    console.log("\nEmbeddings & pgvector integration test PASSED!");
  } catch (error) {
    console.error("Embeddings or Database integration test FAILED:", error);
  } finally {
    await pool.end();
  }
}

// Simple helper to avoid import issues
import { eq } from "drizzle-orm";

test();
