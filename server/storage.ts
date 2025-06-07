import { threads, messages, type Thread, type Message, type InsertThread, type InsertMessage } from "@shared/schema";

export interface IStorage {
  getThread(threadId: string): Promise<Thread | undefined>;
  createThread(thread: InsertThread): Promise<Thread>;
  getMessages(threadId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createMessages(messages: InsertMessage[]): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private threads: Map<string, Thread>;
  private messages: Map<string, Message[]>;
  private currentThreadId: number;
  private currentMessageId: number;

  constructor() {
    this.threads = new Map();
    this.messages = new Map();
    this.currentThreadId = 1;
    this.currentMessageId = 1;
  }

  async getThread(threadId: string): Promise<Thread | undefined> {
    return this.threads.get(threadId);
  }

  async createThread(insertThread: InsertThread): Promise<Thread> {
    const id = this.currentThreadId++;
    const thread: Thread = {
      ...insertThread,
      id,
      createdAt: new Date(),
    };
    this.threads.set(insertThread.threadId, thread);
    return thread;
  }

  async getMessages(threadId: string): Promise<Message[]> {
    return this.messages.get(threadId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    
    const existingMessages = this.messages.get(insertMessage.threadId) || [];
    existingMessages.push(message);
    this.messages.set(insertMessage.threadId, existingMessages);
    
    return message;
  }

  async createMessages(insertMessages: InsertMessage[]): Promise<Message[]> {
    const createdMessages: Message[] = [];
    
    for (const insertMessage of insertMessages) {
      const message = await this.createMessage(insertMessage);
      createdMessages.push(message);
    }
    
    return createdMessages;
  }
}

export const storage = new MemStorage();
