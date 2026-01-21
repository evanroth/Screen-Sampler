import React, { useRef, useState } from 'react';
import { Upload, Trash2, FileBox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomModel } from '@/hooks/useCustomModels';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CustomModelsSectionProps {
  models: CustomModel[];
  isLoading: boolean;
  error: string | null;
  onAddModel: (file: File) => Promise<CustomModel | null>;
  onDeleteModel: (modelId: string) => void;
  onClearError: () => void;
}

export function CustomModelsSection({
  models,
  isLoading,
  error,
  onAddModel,
  onDeleteModel,
  onClearError,
}: CustomModelsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await onAddModel(file);
    setIsUploading(false);
    
    // Clear input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteModel(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const modelToDelete = models.find(m => m.id === deleteConfirmId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground font-medium">Custom 3D Models</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
          className="h-7 text-xs"
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Upload className="w-3 h-3 mr-1" />
          )}
          Upload
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Upload GLB or OBJ files to use as custom shapes.
      </p>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
          {error}
          <button 
            onClick={onClearError}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading models...
        </div>
      ) : models.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">
          No custom models uploaded yet.
        </div>
      ) : (
        <div className="space-y-1">
          {models.map((model) => (
            <div 
              key={model.id}
              className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileBox className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{model.name}</span>
                <span className="text-muted-foreground uppercase flex-shrink-0">
                  .{model.fileType}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmId(model.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{modelToDelete?.name}"? 
              This will remove it from browser storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
