import { Bot } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: number;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md">
          <div className="bg-user-bg text-text-primary px-4 py-2 rounded-lg rounded-tr-sm">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="flex justify-end mt-1">
            <span className="text-xs text-text-secondary">{message.timestamp}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-xs lg:max-w-md">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3 flex-shrink-0">
            <Bot className="text-white" size={16} />
          </div>
          <div className="flex-1">
            <div className="bg-assistant-bg text-text-primary px-4 py-2 rounded-lg rounded-tl-sm">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            <div className="flex justify-start mt-1">
              <span className="text-xs text-text-secondary">{message.timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
