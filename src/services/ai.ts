import { db } from "../db/index.js";
import { knowledgeChunks, chatSessions } from "../db/schema.js";
import { getEmbedding, generateAnswer, rewriteQuery, classifyIntent } from "./gemini.js";
import { eq, asc, sql } from "drizzle-orm";

const STRICTOR_DENIAL_PHRASE = 
  "I'm sorry, I can only assist with inquiries regarding SNS Pipes & Fittings products and services. That information is currently outside my verified database.";

const SIMILARITY_THRESHOLD = 0.50;

const GRATITUDE = [
  "thanks", "thank you", "ty", "cheers", "appreciate it",
  "sthuthi", "bohoma sthuthi", "thx", "thanks machan", "thanx",
  "ස්තුතියි", "බොහොම ස්තුතියි"
];

function isGratitude(text: string): boolean {
  const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  return GRATITUDE.includes(clean);
}

export async function handleUserMessage(userId: string, incomingMessage: string): Promise<string> {
  try {
    const trimmedMessage = incomingMessage.trim();
    if (!trimmedMessage) {
      return "Please send a valid text message.";
    }

    if (isGratitude(trimmedMessage)) {
      const lower = trimmedMessage.toLowerCase();
      let gratitudeReply = "You're welcome! Let me know if you need anything else.";
      if (trimmedMessage.includes("ස්තුතියි")) {
        gratitudeReply = "ඔබට ස්තුතියි! ඔබට වෙනත් ඕනෑම දෙයක් දැනගැනීමට අවශ්‍ය නම් මට කියන්න.";
      } else if (lower.includes("sthuthi")) {
        gratitudeReply = "Oyata sthuthi! Thawa monawa hari danaganna one nam kiyanna.";
      }
      await db.insert(chatSessions).values([
        { userId, role: "user", content: trimmedMessage },
        { userId, role: "model", content: gratitudeReply },
      ]);
      return gratitudeReply;
    }

    const [history, intent] = await Promise.all([
      db
        .select({
          role: chatSessions.role,
          content: chatSessions.content,
        })
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(asc(chatSessions.createdAt))
        .limit(10),
      classifyIntent(trimmedMessage),
    ]);

    if (intent.startsWith("GREETING")) {
      const hasHistory = history.length > 0;
      let greetingReply = "";

      if (intent === "GREETING_SI") {
        greetingReply = hasHistory
          ? "නැවතත් සාදරයෙන් පිළිගනිමු! අපගේ IFAN නිෂ්පාදන තොග පිළිබඳව ඔබට තවදුරටත් දැනගත යුත්තේ කුමක්ද?"
          : "ආයුබෝවන්! SNS Pipes & Fittings වෙත සාදරයෙන් පිළිගනිමු. අපගේ උසස් තත්ත්වයේ IFAN PPR බට, සවි කිරීම් (fittings) හෝ මෙවලම් පිළිබඳව ඔබට අද උපකාර කරන්නේ කෙසේද?";
      } else if (intent === "GREETING_SINGLISH") {
        greetingReply = hasHistory
          ? "Welcome back! Apage IFAN products gana thawa monawada oyata danaganna one?"
          : "Hello! SNS Pipes & Fittings walata sadarayen piligannawa. Ape premium IFAN PPR pipes, fittings, nathnam tools gana oyata ada kohomada udaw karanna one?";
      } else {
        greetingReply = hasHistory
          ? "Welcome back! What else can I check for you regarding our IFAN stocks?"
          : "Hello! Welcome to SNS Pipes & Fittings. How can I help you with our premium IFAN PP-R pipes, fittings, or tools today?";
      }

      await db.insert(chatSessions).values([
        { userId, role: "user", content: trimmedMessage },
        { userId, role: "model", content: greetingReply },
      ]);
      return greetingReply;
    }

    if (intent === "OUT_OF_SCOPE") {
      await db.insert(chatSessions).values([
        { userId, role: "user", content: trimmedMessage },
        { userId, role: "model", content: STRICTOR_DENIAL_PHRASE },
      ]);
      return STRICTOR_DENIAL_PHRASE;
    }

    const searchTarget = await rewriteQuery(trimmedMessage, history);
    if (searchTarget !== trimmedMessage) {
      console.log(`[RAG Query Rewrite] Original: "${trimmedMessage}" -> Standalone: "${searchTarget}"`);
    }

    const messageEmbedding = await getEmbedding(searchTarget);
    const embeddingStr = `[${messageEmbedding.join(",")}]`;

    let matches = await db
      .select({
        content: knowledgeChunks.content,
        distance: sql<number>`${knowledgeChunks.embedding} <=> ${embeddingStr}`,
      })
      .from(knowledgeChunks)
      .where(sql`${knowledgeChunks.embedding} <=> ${embeddingStr} < ${SIMILARITY_THRESHOLD}`)
      .orderBy(sql`${knowledgeChunks.embedding} <=> ${embeddingStr}`)
      .limit(6);

    const targetLower = searchTarget.toLowerCase();
    const isGeneralProductQuery = 
      (targetLower.includes("product") && (targetLower.includes("what") || targetLower.includes("list") || targetLower.includes("all") || targetLower.includes("your") || targetLower.includes("show"))) ||
      (targetLower.includes("what") && (targetLower.includes("sell") || targetLower.includes("have") || targetLower.includes("carry") || targetLower.includes("offer"))) ||
      targetLower.includes("service") ||
      targetLower.includes("about you") ||
      targetLower.includes("who are you") ||
      targetLower.includes("what do you do");

    if (isGeneralProductQuery) {
      const introMatches = await db
        .select({
          content: knowledgeChunks.content,
        })
        .from(knowledgeChunks)
        .where(sql`${knowledgeChunks.content} ILIKE '%COMPLETE PRODUCT CATALOG%'`)
        .limit(1);

      const summaryMatches = await db
        .select({
          content: knowledgeChunks.content,
        })
        .from(knowledgeChunks)
        .where(sql`${knowledgeChunks.content} ILIKE '%PRODUCT SUMMARY%'`)
        .limit(1);

      if (introMatches.length > 0) {
        const alreadyExists = matches.some((m) => m.content.includes("COMPLETE PRODUCT CATALOG"));
        if (!alreadyExists) {
          matches.unshift({
            content: introMatches[0].content,
            distance: 0,
          });
        }
      }

      if (summaryMatches.length > 0) {
        const alreadyExists = matches.some((m) => m.content.includes("PRODUCT SUMMARY"));
        if (!alreadyExists) {
          matches.push({
            content: summaryMatches[0].content,
            distance: 0,
          });
        }
      }
    }

    if (matches.length === 0 && history.length > 0) {
      const lastUserTurn = [...history].reverse().find((h) => h.role === "user");
      if (lastUserTurn && lastUserTurn.content !== trimmedMessage) {
        console.log(`[RAG Fallback] No matches found. Retrying vector search using last query.`);
        try {
          const fallbackEmbedding = await getEmbedding(lastUserTurn.content);
          const fallbackEmbeddingStr = `[${fallbackEmbedding.join(",")}]`;
          matches = await db
            .select({
              content: knowledgeChunks.content,
              distance: sql<number>`${knowledgeChunks.embedding} <=> ${fallbackEmbeddingStr}`,
            })
            .from(knowledgeChunks)
            .where(sql`${knowledgeChunks.embedding} <=> ${fallbackEmbeddingStr} < ${SIMILARITY_THRESHOLD}`)
            .orderBy(sql`${knowledgeChunks.embedding} <=> ${fallbackEmbeddingStr}`)
            .limit(6);
        } catch (err) {
          console.warn("RAG Fallback search failed:", err);
        }
      }
    }

    if (matches.length === 0) {
      console.log(`[RAG] No context matches found for query: "${trimmedMessage}" (even after fallback). Triggering denial.`);
      await db.insert(chatSessions).values([
        { userId, role: "user", content: trimmedMessage },
        { userId, role: "model", content: STRICTOR_DENIAL_PHRASE },
      ]);
      return STRICTOR_DENIAL_PHRASE;
    }

    const bestDistance = matches[0].distance;
    console.log(`[RAG] Found ${matches.length} matching document chunk(s). Best distance: ${bestDistance}`);

    let contextHeader = "";
    if (bestDistance >= 0.30 && bestDistance < 0.50) {
      contextHeader = "DIRECTIVE: The matching information found in the database is only a marginal match. Please respond politely to the user, starting with a variation of: 'I found something close to that regarding our IFAN [Product Name/Details], is this what you were looking for?' and then describe the details present in the context.";
    }

    const context = (contextHeader ? contextHeader + "\n\n" : "") + matches.map((m) => m.content).join("\n\n");

    const answer = await generateAnswer(trimmedMessage, context, history);

    await db.insert(chatSessions).values([
      { userId, role: "user", content: trimmedMessage },
      { userId, role: "model", content: answer },
    ]);

    return answer;
  } catch (error) {
    console.error("Error in Core AI Service handleUserMessage:", error);
    return "I encountered a system error while processing your request. Please try again in a moment.";
  }
}
