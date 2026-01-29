import React, { useState } from 'react';
import { Save, Trash2, Download, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SavedPreset } from '@/hooks/useSettingsStorage';

interface PresetsSectionProps {
  presets: SavedPreset[];
  autoRestore: boolean;
  onSavePreset: (name: string) => SavedPreset;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onToggleAutoRestore: (enabled: boolean) => void;
}

export function PresetsSection({
  presets,
  autoRestore,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onToggleAutoRestore,
}: PresetsSectionProps) {
  const [presetName, setPresetName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setSaveDialogOpen(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <BookmarkCheck className="w-4 h-4" />
        Presets
      </h3>

      {/* Save Current Settings */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="w-full" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Current as Preset
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Give your preset a name to save your current visualizer settings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="My Awesome Preset"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSavePreset();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Presets List */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Saved Presets</Label>
          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <button
                    onClick={() => onLoadPreset(preset.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="text-sm font-medium text-foreground truncate">
                      {preset.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(preset.createdAt)}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLoadPreset(preset.id)}
                      title="Load preset"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Preset</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{preset.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeletePreset(preset.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {presets.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No saved presets yet. Save your current settings to create one.
        </p>
      )}

      <Separator className="bg-border" />

      {/* Auto-restore toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-sm">Remember last session</Label>
        <Switch
          checked={autoRestore}
          onCheckedChange={onToggleAutoRestore}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {autoRestore 
          ? "Settings will be restored when you reopen the app." 
          : "Start fresh each session."}
      </p>
    </div>
  );
}
