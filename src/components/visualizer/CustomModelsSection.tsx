import React, { useRef, useState } from 'react';
import { Upload, Trash2, FileBox, Loader2, Globe, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomModel } from '@/hooks/useCustomModels';
import { RemoteModel, RemoteModelLoadingState } from '@/hooks/useRemoteModels';
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
  // Remote models (built-in)
  remoteModels?: RemoteModel[];
  remoteModelsLoading?: boolean;
  remoteModelsError?: string | null;
  onSelectRemoteModel?: (modelId: string) => void;
  getRemoteModelLoadingState?: (modelId: string) => RemoteModelLoadingState;
  // Favorites
  isFavorite?: (modelId: string) => boolean;
  onToggleFavorite?: (modelId: string) => void;
}

export function CustomModelsSection({
  models,
  isLoading,
  error,
  onAddModel,
  onDeleteModel,
  onClearError,
  remoteModels = [],
  remoteModelsLoading = false,
  remoteModelsError,
  onSelectRemoteModel,
  getRemoteModelLoadingState,
  isFavorite,
  onToggleFavorite,
}: CustomModelsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBuiltIn, setShowBuiltIn] = useState(true);

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
      {/* Built-in Remote Models */}
      {remoteModels.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowBuiltIn(!showBuiltIn)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <Label className="text-muted-foreground font-medium cursor-pointer">
                Built-in Models ({remoteModels.length})
              </Label>
            </div>
            {showBuiltIn ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {showBuiltIn && (
            <>
              {remoteModelsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading model list...
                </div>
              ) : remoteModelsError ? (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  {remoteModelsError}
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {remoteModels.map((model) => {
                    const loadingState = getRemoteModelLoadingState?.(model.id) ?? 'idle';
                    const isModelLoading = loadingState === 'loading';
                    const isLoaded = loadingState === 'loaded';
                    const hasError = loadingState === 'error';
                    const favorited = isFavorite?.(model.id) ?? false;
                    
                    return (
                      <div 
                        key={model.id}
                        className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(model.id);
                            }}
                            className="flex-shrink-0 hover:scale-110 transition-transform"
                            title={favorited ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Star 
                              className={`w-3 h-3 ${favorited ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                            />
                          </button>
                          <button
                            onClick={() => onSelectRemoteModel?.(model.id)}
                            disabled={isModelLoading}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-primary transition-colors disabled:opacity-50"
                          >
                            {isModelLoading ? (
                              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
                            ) : (
                              <FileBox className={`w-3 h-3 flex-shrink-0 ${isLoaded ? 'text-primary' : hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
                            )}
                            <span className="truncate">{model.name}</span>
                            <span className="text-muted-foreground uppercase flex-shrink-0">
                              .{model.fileType}
                            </span>
                          </button>
                        </div>
                        {isModelLoading && (
                          <span className="text-xs text-muted-foreground">Loading...</span>
                        )}
                        {hasError && (
                          <span className="text-xs text-destructive">Failed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Click to load and apply. Models are downloaded on demand.
              </p>
            </>
          )}
        </div>
      )}

      {remoteModels.length > 0 && <div className="border-t border-border" />}

      {/* Custom Uploaded Models */}
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
          {models.map((model) => {
            const favorited = isFavorite?.(model.id) ?? false;
            return (
              <div 
                key={model.id}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(model.id);
                    }}
                    className="flex-shrink-0 hover:scale-110 transition-transform"
                    title={favorited ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star 
                      className={`w-3 h-3 ${favorited ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                    />
                  </button>
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
            );
          })}
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
