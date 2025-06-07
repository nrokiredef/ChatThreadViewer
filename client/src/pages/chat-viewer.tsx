import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import ChatHeader from "@/components/chat-header";
import ChatMessages from "@/components/chat-messages";
import SettingsModal from "@/components/settings-modal";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: number;
}

export default function ChatViewer() {
  const [apiKey, setApiKey] = useState<string>('');
  const [threadId, setThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const { toast } = useToast();

  // WebSocket connection for real-time updates
  const { subscribeToThread, unsubscribeFromThread, isConnected } = useWebSocket({
    onMessage: (message) => {
      if ((message.type === 'messages_updated' || message.type === 'new_messages') && message.threadId === currentThreadId) {
        if (message.type === 'new_messages') {
          // Append new messages to existing ones
          setMessages(prev => [...prev, ...(message.messages || [])]);
        } else {
          // Replace all messages
          setMessages(message.messages || []);
        }
        
        toast({
          title: "New Messages",
          description: `${message.messages?.length || 0} new message(s) received`,
        });
      }
    },
  });

  const loadMessagesMutation = useMutation({
    mutationFn: async ({ threadId, apiKey }: { threadId: string; apiKey: string }) => {
      const response = await apiRequest('POST', `/api/threads/${threadId}/messages`, { apiKey });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages(data.messages);
      setCurrentThreadId(threadId.trim());
      
      // Subscribe to real-time updates for this thread
      if (currentThreadId) {
        unsubscribeFromThread(currentThreadId);
      }
      subscribeToThread(threadId.trim());
      
      toast({
        title: "Success",
        description: "Thread messages loaded successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load thread messages",
        variant: "destructive",
      });
    },
  });

  const checkUpdatesMutation = useMutation({
    mutationFn: async ({ threadId, apiKey, lastMessageId }: { threadId: string; apiKey: string; lastMessageId?: string }) => {
      const response = await apiRequest('POST', `/api/threads/${threadId}/check-updates`, { 
        apiKey, 
        lastMessageId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.hasNewMessages && data.newMessages.length > 0) {
        setMessages(prev => [...prev, ...data.newMessages]);
        toast({
          title: "New Messages",
          description: `${data.newMessages.length} new message(s) received`,
        });
      }
    },
    onError: (error: any) => {
      console.error('Error checking for updates:', error);
      // Silently fail for auto-refresh checks to avoid spamming user with errors
    },
  });

  const handleLoadThread = () => {
    if (!threadId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a thread ID",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please configure your API key in settings first",
        variant: "destructive",
      });
      setIsSettingsOpen(true);
      return;
    }

    loadMessagesMutation.mutate({ threadId: threadId.trim(), apiKey: apiKey.trim() });
  };

  const handleSaveSettings = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsSettingsOpen(false);
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled || !currentThreadId || !apiKey) {
      return;
    }

    const interval = setInterval(() => {
      if (!checkUpdatesMutation.isPending && !loadMessagesMutation.isPending) {
        const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;
        checkUpdatesMutation.mutate({ 
          threadId: currentThreadId, 
          apiKey, 
          lastMessageId 
        });
      }
    }, 10000); // Check for updates every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, currentThreadId, apiKey, messages, checkUpdatesMutation, loadMessagesMutation]);

  // Clean up WebSocket subscription when component unmounts or thread changes
  useEffect(() => {
    return () => {
      if (currentThreadId) {
        unsubscribeFromThread(currentThreadId);
      }
    };
  }, [currentThreadId, unsubscribeFromThread]);

  const handleToggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    toast({
      title: autoRefreshEnabled ? "Auto-refresh disabled" : "Auto-refresh enabled",
      description: autoRefreshEnabled 
        ? "Messages will no longer refresh automatically" 
        : "Messages will refresh every 10 seconds",
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-lg">
      <ChatHeader
        threadId={threadId}
        onThreadIdChange={setThreadId}
        onLoadThread={handleLoadThread}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isLoading={loadMessagesMutation.isPending}
        isConnected={isConnected}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={handleToggleAutoRefresh}
      />
      
      <ChatMessages
        messages={messages}
        isLoading={loadMessagesMutation.isPending}
        error={loadMessagesMutation.error?.message}
        onRetry={handleLoadThread}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialApiKey={apiKey}
      />
    </div>
  );
}
