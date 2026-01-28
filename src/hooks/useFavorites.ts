import { useState, useCallback, useEffect } from 'react';
import { ANIMATION_MODES_3D, AnimationMode3D } from './useVisualizerSettings';

const STORAGE_KEY = 'screen-sampler-favorites';

// All model types that can be favorited
export type FavoriteModelType = 'default' | 'remote' | 'custom';

export interface UseFavoritesOptions {
  customModelIds?: string[];
  remoteModelIds?: string[];
}

function getStoredFavorites(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as string[];
  } catch {
    console.warn('Failed to parse stored favorites');
    return [];
  }
}

function saveFavoritesToStorage(favorites: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const [favorites, setFavorites] = useState<string[]>(() => getStoredFavorites());

  // Sync to localStorage
  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  // Clean up favorites when custom models are deleted
  useEffect(() => {
    if (options.customModelIds) {
      setFavorites(prev => {
        const validCustomIds = new Set(options.customModelIds);
        const defaultIds = new Set(ANIMATION_MODES_3D as string[]);
        const remoteIds = new Set(options.remoteModelIds || []);
        
        // Keep favorites that are: default shapes, valid remote models, or still-existing custom models
        return prev.filter(id => 
          defaultIds.has(id) || 
          remoteIds.has(id) || 
          validCustomIds.has(id)
        );
      });
    }
  }, [options.customModelIds, options.remoteModelIds]);

  const toggleFavorite = useCallback((modelId: string) => {
    setFavorites(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      return [...prev, modelId];
    });
  }, []);

  const isFavorite = useCallback((modelId: string): boolean => {
    return favorites.includes(modelId);
  }, [favorites]);

  const getFavorites = useCallback((): string[] => {
    return [...favorites];
  }, [favorites]);

  const setFavoritesFromPreset = useCallback((presetFavorites: string[]) => {
    setFavorites(presetFavorites);
  }, []);

  // Build complete ordered list of all models for navigation
  const getAllModelsOrdered = useCallback((): string[] => {
    const allModels: string[] = [
      ...(ANIMATION_MODES_3D as unknown as string[]),
      ...(options.remoteModelIds || []),
      ...(options.customModelIds || []),
    ];
    return allModels;
  }, [options.customModelIds, options.remoteModelIds]);

  // Get next favorite model (cycling)
  const getNextFavorite = useCallback((currentModelId: string | null): string | null => {
    const allModels = getAllModelsOrdered();
    const favoritedModels = allModels.filter(id => favorites.includes(id));
    
    if (favoritedModels.length === 0) return null;
    if (favoritedModels.length === 1) return favoritedModels[0];
    
    if (!currentModelId || !favoritedModels.includes(currentModelId)) {
      return favoritedModels[0];
    }
    
    const currentIndex = favoritedModels.indexOf(currentModelId);
    const nextIndex = (currentIndex + 1) % favoritedModels.length;
    return favoritedModels[nextIndex];
  }, [favorites, getAllModelsOrdered]);

  // Get previous favorite model (cycling)
  const getPreviousFavorite = useCallback((currentModelId: string | null): string | null => {
    const allModels = getAllModelsOrdered();
    const favoritedModels = allModels.filter(id => favorites.includes(id));
    
    if (favoritedModels.length === 0) return null;
    if (favoritedModels.length === 1) return favoritedModels[0];
    
    if (!currentModelId || !favoritedModels.includes(currentModelId)) {
      return favoritedModels[favoritedModels.length - 1];
    }
    
    const currentIndex = favoritedModels.indexOf(currentModelId);
    const prevIndex = (currentIndex - 1 + favoritedModels.length) % favoritedModels.length;
    return favoritedModels[prevIndex];
  }, [favorites, getAllModelsOrdered]);

  // Helper to determine model type
  const getModelType = useCallback((modelId: string): FavoriteModelType => {
    if ((ANIMATION_MODES_3D as unknown as string[]).includes(modelId)) {
      return 'default';
    }
    if (options.remoteModelIds?.includes(modelId)) {
      return 'remote';
    }
    return 'custom';
  }, [options.remoteModelIds]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    getFavorites,
    setFavoritesFromPreset,
    getNextFavorite,
    getPreviousFavorite,
    getModelType,
    getAllModelsOrdered,
  };
}
