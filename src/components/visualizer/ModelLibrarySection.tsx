import React, { useRef, useState } from 'react';
import { Upload, Trash2, FileBox, Loader2, Globe, ChevronDown, ChevronUp, Star, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CustomModel } from '@/hooks/useCustomModels';
import { RemoteModel, RemoteModelLoadingState } from '@/hooks/useRemoteModels';
import { AnimationMode3D, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

// Display names for default 3D shapes
const SHAPE_DISPLAY_NAMES: Record<string, string> = {
  'floating3D': 'Floating Panels',
  'orbit3D': 'Orbit Panel',
  'carousel3D': 'Carousel',
  'helix3D': 'Helix',
  'explode3D': 'Explode',
  'wave3D': 'Wave Panel',
  'sphere3D': 'Sphere',
  'cube3D': 'Cube',
  'cylinder3D': 'Cylinder',
  'torus3D': 'Torus',
  'pyramid3D': 'Pyramid',
  'cone3D': 'Cone',
  'dodecahedron3D': 'Dodecahedron',
  'icosahedron3D': 'Icosahedron',
  'octahedron3D': 'Octahedron',
  'tetrahedron3D': 'Tetrahedron',
  'torusKnot3D': 'Torus Knot',
  'trefoil3D': 'Trefoil Knot',
  'cinquefoil3D': 'Cinquefoil Knot',
  'septafoil3D': 'Septafoil Knot',
  'figure8_3D': 'Figure-8 Knot',
  'granny3D': 'Granny Knot',
  'lissajous3D': 'Lissajous Knot',
  'capsule3D': 'Capsule',
  'ring3D': 'Ring',
  'mobius3D': 'Möbius',
  'tetrakisHexahedron3D': 'Tetrakis Hexahedron',
  'greatDodecahedron3D': 'Great Dodecahedron',
  'greatIcosahedron3D': 'Great Icosahedron',
  'smallStellatedDodecahedron3D': 'Small Stellated Dodecahedron',
  'greatStellatedDodecahedron3D': 'Great Stellated Dodecahedron',
  'tripleTwistMobius3D': 'Triple Twist Möbius',
  'verrill3D': 'Verrill Surface',
  'doubleTrefoil3D': 'Double Trefoil',
  'schwarzP3D': 'Schwarz P Surface',
  'enneper3D': 'Enneper Surface',
  'boysSurface3D': "Boy's Surface",
  'cliffordTorus3D': 'Clifford Torus',
  'hyperbolicParaboloid3D': 'Hyperbolic Paraboloid',
  'hyperboloidOneSheet3D': 'Hyperboloid',
  'steiner3D': 'Steiner Surface',
  'helicoid3D': 'Helicoid',
};

interface ModelLibrarySectionProps {
  // Custom models
  models: CustomModel[];
  isLoading: boolean;
  error: string | null;
  onAddModel: (file: File) => Promise<CustomModel | null>;
  onDeleteModel: (modelId: string) => void;
  onClearError: () => void;
  // Remote models (external)
  remoteModels?: RemoteModel[];
  remoteModelsLoading?: boolean;
  remoteModelsError?: string | null;
  getRemoteModelLoadingState?: (modelId: string) => RemoteModelLoadingState;
  // Selection handlers - load into Region 1
  onSelectDefaultShape?: (shapeId: AnimationMode3D) => void;
  onSelectRemoteModel?: (modelId: string) => void;
  onSelectCustomModel?: (modelId: string) => void;
  // Favorites
  isFavorite?: (modelId: string) => boolean;
  onToggleFavorite?: (modelId: string) => void;
}

export function ModelLibrarySection({
  models,
  isLoading,
  error,
  onAddModel,
  onDeleteModel,
  onClearError,
  remoteModels = [],
  remoteModelsLoading = false,
  remoteModelsError,
  getRemoteModelLoadingState,
  onSelectDefaultShape,
  onSelectRemoteModel,
  onSelectCustomModel,
  isFavorite,
  onToggleFavorite,
}: ModelLibrarySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDefaultShapes, setShowDefaultShapes] = useState(false);
  const [showExternal, setShowExternal] = useState(true);
  const [showCustom, setShowCustom] = useState(true);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const newModel = await onAddModel(file);
    setIsUploading(false);
    
    // Auto-select the newly uploaded model
    if (newModel && onSelectCustomModel) {
      onSelectCustomModel(newModel.id);
    }
    
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
      {/* Library Header */}
      <Label className="text-foreground font-bold uppercase tracking-wider text-xs">Library</Label>
      <p className="text-xs text-muted-foreground">
        Click to load into Region 1. Star to favorite.
      </p>

      {/* Default 3D Shapes */}
      <Collapsible open={showDefaultShapes} onOpenChange={setShowDefaultShapes}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left py-1">
          <div className="flex items-center gap-2">
            <Box className="w-3 h-3 text-muted-foreground" />
            <Label className="text-muted-foreground font-medium cursor-pointer text-xs">
              Default 3D Shapes ({ANIMATION_MODES_3D.length})
            </Label>
          </div>
          {showDefaultShapes ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
            {ANIMATION_MODES_3D.map((shapeId) => {
              const favorited = isFavorite?.(shapeId) ?? false;
              return (
                <div 
                  key={shapeId}
                  className="flex items-center justify-between p-2 bg-secondary/50 rounded text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite?.(shapeId);
                      }}
                      className="flex-shrink-0 hover:scale-110 transition-transform"
                      title={favorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star 
                        className={`w-3 h-3 ${favorited ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                      />
                    </button>
                    <button
                      onClick={() => onSelectDefaultShape?.(shapeId)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-primary transition-colors"
                    >
                      <Box className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{SHAPE_DISPLAY_NAMES[shapeId] || shapeId}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* External 3D Models (formerly Built-in) */}
      {remoteModels.length > 0 && (
        <Collapsible open={showExternal} onOpenChange={setShowExternal}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left py-1">
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <Label className="text-muted-foreground font-medium cursor-pointer text-xs">
                External 3D Models ({remoteModels.length})
              </Label>
            </div>
            {showExternal ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {remoteModelsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading model list...
              </div>
            ) : remoteModelsError ? (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
                {remoteModelsError}
              </div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Custom 3D Models */}
      <Collapsible open={showCustom} onOpenChange={setShowCustom}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left py-1">
          <div className="flex items-center gap-2">
            <FileBox className="w-3 h-3 text-muted-foreground" />
            <Label className="text-muted-foreground font-medium cursor-pointer text-xs">
              Custom 3D Models ({models.length})
            </Label>
          </div>
          {showCustom ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="h-7 text-xs w-full"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 mr-1" />
              )}
              Upload GLB/OBJ
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={handleFileSelect}
              className="hidden"
            />

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
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {models.map((model) => {
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
                          onClick={() => onSelectCustomModel?.(model.id)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-primary transition-colors"
                        >
                          <FileBox className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{model.name}</span>
                          <span className="text-muted-foreground uppercase flex-shrink-0">
                            .{model.fileType}
                          </span>
                        </button>
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
          </div>
        </CollapsibleContent>
      </Collapsible>

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
