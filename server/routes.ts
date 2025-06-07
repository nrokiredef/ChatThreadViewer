import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertThreadSchema, insertMessageSchema, type OpenAIThreadMessagesResponse, type OpenAIMessage } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

// Store active WebSocket connections by thread ID
const threadConnections = new Map<string, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get thread messages from OpenAI API
  app.post("/api/threads/:threadId/messages", async (req, res) => {
    try {
      const { threadId } = req.params;
      const { apiKey } = req.body;

      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      if (!threadId) {
        return res.status(400).json({ message: "Thread ID is required" });
      }

      // Initialize OpenAI client
      const openai = new OpenAI({ 
        apiKey: apiKey 
      });

      // Fetch messages from OpenAI API
      const response = await openai.beta.threads.messages.list(threadId);
      
      // Check if thread exists in our storage, create if not
      let thread = await storage.getThread(threadId);
      if (!thread) {
        thread = await storage.createThread({
          threadId,
          title: `Thread ${threadId}`,
        });
      }

      // Convert OpenAI messages to our format and store them
      // OpenAI returns messages in reverse chronological order, so reverse to get chronological order
      const messagesToStore = response.data.reverse().map((msg: any) => ({
        threadId,
        messageId: msg.id,
        role: msg.role,
        content: msg.content[0]?.text?.value || '',
        timestamp: new Date(msg.created_at * 1000),
      }));

      // Store messages in our storage
      await storage.createMessages(messagesToStore);

      // Return formatted messages in chronological order (oldest first)
      const formattedMessages = messagesToStore.map((msg: any) => ({
        id: msg.messageId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        created_at: msg.timestamp.getTime(),
      }));

      // Broadcast new messages to connected clients for this thread
      const connections = threadConnections.get(threadId);
      if (connections) {
        const messageUpdate = { type: 'messages_updated', threadId, messages: formattedMessages };
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(messageUpdate));
          }
        });
      }

      res.json({ messages: formattedMessages });
    } catch (error: any) {
      console.error("Error fetching thread messages:", error);
      
      if (error.status === 404) {
        return res.status(404).json({ message: "Thread not found. Please check the thread ID." });
      }
      
      if (error.status === 401) {
        return res.status(401).json({ message: "Invalid API key. Please check your OpenAI API key." });
      }

      res.status(500).json({ 
        message: error.message || "Failed to fetch thread messages" 
      });
    }
  });

  // Get stored messages for a thread
  app.get("/api/threads/:threadId/messages", async (req, res) => {
    try {
      const { threadId } = req.params;
      const messages = await storage.getMessages(threadId);
      
      // Sort messages by timestamp to ensure chronological order (oldest first)
      const sortedMessages = messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      const formattedMessages = sortedMessages.map(msg => ({
        id: msg.messageId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        created_at: msg.timestamp.getTime(),
      }));

      res.json({ messages: formattedMessages });
    } catch (error: any) {
      console.error("Error fetching stored messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Check for new messages and update if needed
  app.post("/api/threads/:threadId/check-updates", async (req, res) => {
    try {
      const { threadId } = req.params;
      const { apiKey, lastMessageId } = req.body;

      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      // Initialize OpenAI client
      const openai = new OpenAI({ 
        apiKey: apiKey 
      });

      // Fetch latest messages from OpenAI API
      const response = await openai.beta.threads.messages.list(threadId, {
        limit: 20,
        order: 'desc'
      });
      
      // Check if there are new messages since the last known message
      // OpenAI returns messages in reverse chronological order, so reverse to get chronological order
      const latestMessages = response.data.reverse();
      const lastKnownIndex = latestMessages.findIndex(msg => msg.id === lastMessageId);
      const newMessages = lastKnownIndex >= 0 ? latestMessages.slice(lastKnownIndex + 1) : [];

      if (newMessages.length > 0) {
        // Store new messages
        const messagesToStore = newMessages.map((msg: any) => ({
          threadId,
          messageId: msg.id,
          role: msg.role,
          content: msg.content[0]?.text?.value || '',
          timestamp: new Date(msg.created_at * 1000),
        }));

        await storage.createMessages(messagesToStore);

        // Format new messages for response
        const formattedNewMessages = newMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content[0]?.text?.value || '',
          timestamp: new Date(msg.created_at * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          created_at: msg.created_at * 1000,
        }));

        // Broadcast to WebSocket clients
        const connections = threadConnections.get(threadId);
        if (connections) {
          const messageUpdate = { type: 'new_messages', threadId, messages: formattedNewMessages };
          connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(messageUpdate));
            }
          });
        }

        res.json({ hasNewMessages: true, newMessages: formattedNewMessages });
      } else {
        res.json({ hasNewMessages: false, newMessages: [] });
      }
    } catch (error: any) {
      console.error("Error checking for updates:", error);
      
      if (error.status === 404) {
        return res.status(404).json({ message: "Thread not found. Please check the thread ID." });
      }
      
      if (error.status === 401) {
        return res.status(401).json({ message: "Invalid API key. Please check your OpenAI API key." });
      }

      res.status(500).json({ 
        message: error.message || "Failed to check for updates" 
      });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribe_thread' && message.threadId) {
          // Add this connection to the thread's subscriber list
          if (!threadConnections.has(message.threadId)) {
            threadConnections.set(message.threadId, new Set());
          }
          threadConnections.get(message.threadId)!.add(ws);
          console.log(`Client subscribed to thread: ${message.threadId}`);
        }
        
        if (message.type === 'unsubscribe_thread' && message.threadId) {
          // Remove this connection from the thread's subscriber list
          const connections = threadConnections.get(message.threadId);
          if (connections) {
            connections.delete(ws);
            if (connections.size === 0) {
              threadConnections.delete(message.threadId);
            }
          }
          console.log(`Client unsubscribed from thread: ${message.threadId}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove this connection from all thread subscriptions
      threadConnections.forEach((connections, threadId) => {
        connections.delete(ws);
        if (connections.size === 0) {
          threadConnections.delete(threadId);
        }
      });
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return httpServer;
}
