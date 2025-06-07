import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Download, Bot, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface ChatHeaderProps {
  threadId: string;
  onThreadIdChange: (value: string) => void;
  onLoadThread: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  isConnected?: boolean;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
}

export default function ChatHeader({
  threadId,
  onThreadIdChange,
  onLoadThread,
  onOpenSettings,
  isLoading,
  isConnected = false,
  autoRefreshEnabled = false,
  onToggleAutoRefresh,
}: ChatHeaderProps) {
  return (
    <header className="bg-white border-b border-border px-4 py-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-text-primary flex items-center">
            <Bot className="text-primary mr-2" size={24} />
            OpenAI Assistant Chat Viewer
          </h1>
          <Badge 
            variant={isConnected ? "default" : "secondary"} 
            className={`ml-3 text-xs ${isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
          >
            {isConnected ? <Wifi size={12} className="mr-1" /> : <WifiOff size={12} className="mr-1" />}
            {isConnected ? 'Live Updates' : 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onToggleAutoRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAutoRefresh}
              className={`p-2 ${autoRefreshEnabled ? 'text-primary bg-blue-50' : 'text-text-secondary'} hover:text-text-primary hover:bg-gray-100`}
              title={autoRefreshEnabled ? "Disable auto-refresh" : "Enable auto-refresh"}
            >
              <RefreshCw size={16} className={autoRefreshEnabled ? 'animate-spin' : ''} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100"
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="threadId" className="block text-sm font-medium text-text-secondary mb-1">
            Thread ID
          </Label>
          <Input
            id="threadId"
            type="text"
            placeholder="Enter OpenAI thread ID..."
            value={threadId}
            onChange={(e) => onThreadIdChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onLoadThread}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
          >
            <Download className="mr-2" size={16} />
            {isLoading ? "Loading..." : "Load Thread"}
          </Button>
        </div>
      </div>
    </header>
  );
}
