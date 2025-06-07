import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  initialApiKey: string;
}

export default function SettingsModal({ isOpen, onClose, onSave, initialApiKey }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);

  const handleSave = () => {
    if (!apiKey.trim()) {
      return;
    }
    onSave(apiKey.trim());
  };

  const handleCancel = () => {
    setApiKey(initialApiKey);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-text-primary">Settings</DialogTitle>
          <DialogDescription className="text-sm text-text-secondary">
            Configure your OpenAI API key to access thread messages.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="block text-sm font-medium text-text-secondary mb-2">
              OpenAI API Key
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-text-secondary mt-1">
              Your API key is stored securely and never saved to disk.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-text-secondary hover:text-text-primary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="bg-primary text-white hover:bg-blue-700"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
