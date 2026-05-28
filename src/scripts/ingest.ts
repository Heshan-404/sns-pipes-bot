import * as fs from "fs";
import * as path from "path";
import { db, pool } from "../db/index.js";
import { knowledgeChunks } from "../db/schema.js";
import { getEmbedding } from "../services/gemini.js";
import * as dotenv from "dotenv";

dotenv.config({ override: true });


// Ensure documents directory exists
const DOCS_DIR = path.join(process.cwd(), "documents");

/**
 * Splits text into chunks of specified maximum character length with overlap.
 */
function chunkText(text: string, chunkSize = 2000, overlap = 400): string[] {
  const chunks: string[] = [];
  let currentIndex = 0;

  // Clean double carriage returns and normalize newlines
  const normalizedText = text.replace(/\r\n/g, "\n");

  while (currentIndex < normalizedText.length) {
    let endIndex = currentIndex + chunkSize;
    if (endIndex >= normalizedText.length) {
      chunks.push(normalizedText.slice(currentIndex).trim());
      break;
    }

    // Look back slightly to split on word boundary (space or newline)
    const lookback = 100;
    let splitIndex = endIndex;
    for (let i = 0; i < lookback; i++) {
      const char = normalizedText[endIndex - i];
      if (char === " " || char === "\n") {
        splitIndex = endIndex - i;
        break;
      }
    }

    chunks.push(normalizedText.slice(currentIndex, splitIndex).trim());
    
    // Advance index by chunk size minus overlap
    const nextIndex = splitIndex - overlap;
    if (nextIndex <= currentIndex) {
      // Avoid infinite loop if boundary finding doesn't progress
      currentIndex = splitIndex;
    } else {
      currentIndex = nextIndex;
    }
  }

  return chunks.filter((c) => c.length > 10); // filter out tiny artifacts
}

async function run() {
  try {
    console.log("Starting document ingestion process...");

    if (!fs.existsSync(DOCS_DIR)) {
      console.log(`Creating documents directory at: ${DOCS_DIR}`);
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".txt"));

    if (files.length === 0) {
      console.log("No text files found in documents directory. Please place text files in ./documents/");
      // Create a default demo document
      const demoPath = path.join(DOCS_DIR, "business_info.txt");
      const demoContent = `Wolt Pizza & Cafe - Products, Services and Pricing Info

Welcome to Wolt Pizza & Cafe! We serve gourmet woodfired pizzas and premium coffee.

1. Our Pizza Menu:
- Margherita Pizza: Classic tomato base, fresh mozzarella, fresh basil, extra virgin olive oil. Price: $12.00
- Pepperoni Supreme: Spicy pepperoni, mozzarella cheese, marinara sauce, oregano. Price: $14.50
- Veggie Garden Pizza: Bell peppers, red onions, mushrooms, olives, sweet corn, mozzarella. Price: $13.00
- BBQ Chicken Pizza: Grilled chicken, red onion, smoky BBQ sauce base, mozzarella, fresh cilantro. Price: $15.00

2. Coffee & Drinks Menu:
- Espresso: Rich, intense single shot. Price: $3.00
- Cappuccino: Double espresso, steamed milk, thick foam layer, cocoa dusting. Price: $4.50
- Latte: Espresso, steamed milk, light microfoam. Price: $4.00
- Cold Brew: Steeped 18 hours, served over ice. Price: $4.80

3. Delivery & Operations:
- We deliver within a 5km radius of our store location. Delivery fee is $3.00 flat rate.
- Orders over $35.00 qualify for free delivery.
- Operating Hours: Monday to Sunday, 10:00 AM to 10:00 PM.
- Store Address: 123 Gourmet Blvd, Food City.
- Contact Number: +1 (555) 987-6543
- Website: www.woltpizzaandcafe.com

Thank you for choosing Wolt Pizza & Cafe! Enjoy your food!`;
      fs.writeFileSync(demoPath, demoContent, "utf-8");
      console.log(`Created default demo file at ${demoPath}`);
      files.push("business_info.txt");
    }

    // Clear existing chunks to avoid duplication
    console.log("Clearing existing database knowledge chunks...");
    await db.delete(knowledgeChunks);

    for (const file of files) {
      const filePath = path.join(DOCS_DIR, file);
      console.log(`Processing file: ${file}...`);
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const chunks = chunkText(fileContent);
      console.log(`Split file into ${chunks.length} chunks. Generating embeddings...`);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        console.log(`Embedding chunk ${i + 1}/${chunks.length}...`);

        const embedding = await getEmbedding(chunkContent);

        // Save chunk in the database
        await db.insert(knowledgeChunks).values({
          content: chunkContent,
          embedding: embedding,
          metadata: {
            source: file,
            chunkIndex: i,
            ingestedAt: new Date().toISOString(),
          },
        });
      }
      console.log(`Successfully ingested and vectorized: ${file}`);
    }

    console.log("Ingestion process completed successfully!");
  } catch (error) {
    console.error("Ingestion failed:", error);
  } finally {
    // Close pg pool connections
    await pool.end();
  }
}

run();
