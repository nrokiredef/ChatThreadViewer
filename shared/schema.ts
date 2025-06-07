import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull().unique(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  messageId: text("message_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// OpenAI API response types
export interface OpenAIMessage {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: {
      value: string;
      annotations: any[];
    };
  }>;
  assistant_id?: string;
  run_id?: string;
  metadata: Record<string, any>;
}

export interface OpenAIThreadMessagesResponse {
  object: string;
  data: OpenAIMessage[];
  first_id: string;
  last_id: string;
  has_more: boolean;
}
