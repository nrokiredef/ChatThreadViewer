import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import MessageBubble from "./message-bubble";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: number;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}

export default function ChatMessages({ messages, isLoading, error, onRetry }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Loading state
  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block animate-spin h-8 w-8 text-primary mb-3" />
          <p className="text-text-secondary">Loading messages...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-400 mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Error Loading Thread</h3>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <Button onClick={onRetry} className="px-4 py-2 bg-primary text-white hover:bg-blue-700">
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <MessageCircle className="h-16 w-16 text-gray-300 mb-4 mx-auto" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Thread Loaded</h3>
          <p className="text-text-secondary text-sm">
            Enter a thread ID above and click "Load Thread" to view the conversation.
          </p>
        </div>
      </main>
    );
  }

  // Messages state
  return (
    <main className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </main>
  );
}
