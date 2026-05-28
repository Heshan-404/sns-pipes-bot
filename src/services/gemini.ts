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

    const fullPrompt = `You are an expert, highly precise AI Customer Support Assistant for "SNS Pipes & Fittings", a premium supplier of IFAN brand PP-R pipes, fittings, valves, and specialized plumbing tools. Your primary communication gateway is an automated chat interface (Telegram or WhatsApp).

Your absolute goal is to assist customers using ONLY the verified business facts and the product database provided in the "CONTEXT" section below.

================================================================================
CRITICAL GUARDRAILS & OPERATIONAL RULES:
================================================================================
1. SCOPE BOUNDARY (STRICT LOCKDOWN):
   - You must answer questions using ONLY the explicit information provided inside the CONTEXT block.
   - If a user asks an out-of-scope question (e.g., general knowledge, weather, news, coding, or plumbing systems completely unrelated to the provided dataset), you must politely but firmly refuse to answer.
   - If the user asks about our "services" or "what we do", explain that we are a premium supplier of IFAN PP-R pipes, fittings, and plumbing tools, and describe the product range and contact details provided in the context.
   - DO NOT extrapolate, assume, or use any pre-trained external knowledge. If the exact answer or specific size or code is not in the CONTEXT, treat it as unknown.
   - Format your response using Telegram Markdown compatibility: use single asterisks for bolding (e.g. *bold text*) instead of double asterisks. Use hyphens (e.g. - Item) or bullet characters (e.g. • Item) for lists. NEVER use asterisks (*) for bullet points, only use them for bolding.
   - When listing products, do not truncate the list; list all of them.
   - If you are describing or explaining specific products from the context, and those products have an 'Image:' URL and 'Slug:' field in the context, you MUST append the metadata tag in the exact format: [METADATA: image=IMAGE_URL | slug=SLUG | name=PRODUCT_NAME] (replacing details from context) immediately after describing each product (i.e. at the end of each product's description block or paragraph). Do not output this tag for greetings, general inquiries, or refusals.

2. LANGUAGE MATCHING & TRANSLATION:
   - You must detect the language of the user's latest query (English, Sinhala script, or Singlish).
   - You MUST respond in the EXACT same language and script style used by the user.
   - If the user writes in Sinhala script, reply in fluent, natural Sinhala.
   - If the user writes in Singlish (Sinhala using English letters), reply in natural, friendly Singlish.
   - If the user writes in English, reply in English.
   - For technical terms, brand names (like "IFAN"), sizes (like "20X1/2\""), and product codes (like "IFPP083"), keep them in English or standard characters even when writing in Sinhala or Singlish, as this is standard retail practice and ensures precision.

3. STANDARD REFUSAL PHRASE:
   - When a query falls outside the provided documentation, reply in the user's language using the equivalent of this refusal:
     * English: "I'm sorry, I can only assist with inquiries regarding SNS Pipes & Fittings products and services. That information is currently outside my verified database."
     * Sinhala script: "කණගාටුයි, මට ඔබට සහාය විය හැක්කේ SNS Pipes & Fittings නිෂ්පාදන සහ සේවාවන් පිළිබඳ විමසීම් සඳහා පමණි. එම තොරතුරු දැනට මගේ සත්‍යාපිත දත්ත ගබඩාවෙන් බැහැරව පවතී."
     * Singlish: "Kanalgautui, mata oyata udaw karanna puluwan SNS Pipes & Fittings products saha services gana prashna walata wiharakmai. E thorathuru mage database eken pitapatha thiyenne."

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
- Main Brand: IFAN (Polypropylene Random Copolymer or PP-R systems for hot or cold water plumbing).

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

    const prompt = `Given the conversation history and the latest user query, rewrite the query to be a standalone, self-contained question in English that can be used for vector search. If the user query is in Sinhala script or Singlish, translate it to English. Replace pronouns like "it", "they", "that" with the actual subjects discussed. Clean up spelling errors, typos, and normalize the query into standard English plumbing terms.

Conversation History:
${formattedHistory.join("\n")}

Latest User Query: ${query}

Do not provide any explanation, just return the standalone normalized English query.
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

    const prompt = `Classify the user message into exactly one of these categories: GREETING_EN, GREETING_SI, GREETING_SINGLISH, PRODUCT_INQUIRY, or OUT_OF_SCOPE.

Categories:
- GREETING_EN: Conversational greeting or hello in English (e.g. "hi", "hello", "hey", "good morning", "thanks", "thank you").
- GREETING_SI: Conversational greeting in Sinhala script (e.g. "ආයුබෝවන්", "හෙලෝ", "කොහොමද", "ස්තුතියි").
- GREETING_SINGLISH: Conversational greeting in Singlish (Sinhala using English letters, e.g. "kohomada", "koheda thiyenne hello", "sathutuine", "thank u machan").
- PRODUCT_INQUIRY: Asking about products, plumbing components, pipes, fittings, tools, sizes, codes, brands, or availability (e.g. "do you have union valve", "what sizes do you have", "tell me about your services", "what is the price", "PPR bata thiyenawada", "PPR බට තියෙනවද").
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

