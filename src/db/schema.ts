import { pgTable, serial, text, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";

// Custom vector type for pgvector support in Drizzle ORM
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return value
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((v) => parseFloat(v));
    }
    return value as number[];
  },
});


// Table to store vectorized chunks of the business documentation
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  embedding: vector("embedding").notNull(),
  metadata: jsonb("metadata").$type<{
    source: string;
    [key: string]: any;
  }>(),
});


// Table to store conversational history for multi-turn session memory
export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(), // 'user' or 'model'
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
  })
);
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
