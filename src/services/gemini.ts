import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ override: true });


const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is missing!");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generates vector embedding (768 dimensions) for the input text using text-embedding-004.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent(text);
    if (!result.embedding || !result.embedding.values) {
      throw new Error("Failed to retrieve embedding values from Gemini response.");
    }
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}


/**
 * Generates an answer using gemini-2.0-flash with temperature set to 0.0 for deterministic answers.
 */
export async function generateAnswer(
  prompt: string,
  context: string,
  chatHistory: { role: string; content: string }[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.0,
      },
    });

    const formattedHistory = chatHistory.slice(-3).map((item) => {
      return `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`;
    });

    const fullPrompt = `You are an expert, highly precise AI Customer Support Assistant for "SNS Pipes & Fittings", a premium supplier of IFAN brand PP-R pipes, fittings, valves, and specialized plumbing tools. Your primary communication gateway is an automated chat interface (Telegram/WhatsApp).

Your absolute goal is to assist customers using ONLY the verified business facts and the product database provided in the "CONTEXT" section below.

================================================================================
CRITICAL GUARDRAILS & OPERATIONAL RULES:
================================================================================
1. SCOPE BOUNDARY (STRICT LOCKDOWN):
   - You must answer questions using ONLY the explicit information provided inside the CONTEXT block.
   - If a user asks an out-of-scope question (e.g., general knowledge, weather, news, coding, or plumbing systems completely unrelated to the provided dataset), you must politely but firmly refuse to answer.
   - DO NOT extrapolate, assume, or use any pre-trained external knowledge. If the exact answer or specific size/code is not in the CONTEXT, treat it as unknown.
   - Format your response using Telegram Markdown compatibility: use single asterisks for bolding (e.g. *bold text*) instead of double asterisks. Use hyphens (e.g. - Item) or bullet characters (e.g. • Item) for lists. NEVER use asterisks (*) for bullet points, only use them for bolding.
   - When listing products, do not truncate the list; list all of them.
   - If you are describing or explaining a specific product from the context, and that product has an 'Image:' URL and 'Slug:' field in the context, you MUST append a metadata tag at the very end of your response on a new line in this exact format: [METADATA: image=IMAGE_URL | slug=SLUG | name=PRODUCT_NAME] replacing IMAGE_URL, SLUG, and PRODUCT_NAME with their exact details from the context. Do not output this tag for greetings, general inquiries, or refusals.

2. STANDARD REFUSAL PHRASE:
   - When a query falls outside the provided documentation, reply exactly with: 
     "I'm sorry, I can only assist with inquiries regarding SNS Pipes & Fittings products and services. That information is currently outside my verified database."

3. HANDLING GREETINGS & SMALL TALK:
   - You are permitted to respond to basic, polite introductory text (e.g., "Hi", "Hello", "Good morning", "Are you a bot?").
   - Respond warmly, state your identity as the SNS Pipes assistant, and immediately guide the user back to the product scope. (Example: "Hello! Welcome to SNS Pipes & Fittings. How can I help you with our premium IFAN PP-R pipes, fittings, or tools today?").

4. TEMPERATURE & TONE CONSTRAINT:
   - Maintain a highly professional, clear, helpful, and concise technical retail tone.
   - Never speculate or guarantee availability or pricing parameters not explicitly stated in the context.

================================================================================
CONVERSATION MEMORY (LAST 3 TURNS):
================================================================================
${formattedHistory.join("\n")}

================================================================================
VERIFIED BUSINESS & PRODUCT CONTEXT:
================================================================================
Company Details:
- Website: https://snspipes.com
- Phone: 0762040059
- Email: contact@snspipes.com
- Main Brand: IFAN (Polypropylene Random Copolymer / PP-R systems for hot/cold commercial and residential water plumbing).

[DYNAMICAL RETRIEVED PRODUCT CHUNKS]:
${context}

================================================================================
USER INQUIRY:
================================================================================
User: ${prompt}
Assistant:`;

    const response = await model.generateContent(fullPrompt);
    const text = response.response.text();
    return text.trim();
  } catch (error) {
    console.error("Error generating text answer:", error);
    throw error;
  }
}

export async function rewriteQuery(
  query: string,
  chatHistory: { role: string; content: string }[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.1,
      },
    });

    const formattedHistory = chatHistory.slice(-4).map((item) => {
      return `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`;
    });

    const prompt = `Given the conversation history and the latest user query, rewrite the query to be a standalone, self-contained question that can be understood without the conversation history. Do not change the meaning, just replace pronouns like "it", "they", "that" with the actual subjects discussed. Also clean up any spelling errors, typos, and normalize the query into standard English plumbing terms.

Conversation History:
${formattedHistory.join("\n")}

Latest User Query: ${query}

Do not provide any explanation, just return the standalone normalized query.
Standalone Query:`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    return text.trim();
  } catch (error) {
    console.warn("Failed to rewrite query, falling back to original query:", error);
    return query;
  }
}

export async function classifyIntent(message: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      generationConfig: {
        temperature: 0.0,
      },
    });

    const prompt = `Classify the user message into exactly one of these categories: GREETING, PRODUCT_INQUIRY, or OUT_OF_SCOPE.

Categories:
- GREETING: Conversational hello, welcome, thanks, goodbye, or introductory small talk (e.g. "hi", "hello", "hey", "good morning", "yo", "machan hello", "hi there", "how are you", "are you a bot", "thanks", "thank you").
- PRODUCT_INQUIRY: Asking about products, plumbing components, pipes, fittings, tools, sizes, codes, brands, or availability (e.g. "do you have union valve", "what sizes do you have", "tell me about your services", "what is the price").
- OUT_OF_SCOPE: General knowledge, coding questions, math, weather, or topics completely unrelated to SNS Pipes & Fittings or plumbing (e.g. "write a python function", "what is the weather in NY").

Respond with ONLY the category name. Do not include any other text, quotes, or markdown.
User Message: ${message}
Category:`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    return text.trim().toUpperCase();
  } catch (error) {
    console.warn("Failed to classify intent, defaulting to PRODUCT_INQUIRY:", error);
    return "PRODUCT_INQUIRY";
  }
}

