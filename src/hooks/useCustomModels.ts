import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export interface CustomModel {
  id: string;
  name: string;
  fileName: string;
  fileType: 'glb' | 'gltf' | 'obj';
  createdAt: number;
}

interface StoredModelData extends CustomModel {
  fileData: ArrayBuffer;
}

const DB_NAME = 'screen-sampler-models';
const DB_VERSION = 1;
const STORE_NAME = 'models';

// Open IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Parse geometry from loaded 3D object
function extractGeometry(object: THREE.Object3D): THREE.BufferGeometry | null {
  let geometry: THREE.BufferGeometry | null = null;
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry && !geometry) {
      geometry = child.geometry.clone();
      
      // Center the geometry
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        
        // Scale to fit roughly in a 3-unit bounding sphere
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 3 / maxDim;
          geometry.scale(scale, scale, scale);
        }
      }
      
      // Ensure geometry has normals
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
    }
  });
  
  return geometry;
}

// Load geometry from ArrayBuffer based on file type
async function loadGeometryFromBuffer(
  buffer: ArrayBuffer,
  fileType: 'glb' | 'gltf' | 'obj',
  fileName: string
): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    if (fileType === 'obj') {
      const loader = new OBJLoader();
      const text = new TextDecoder().decode(buffer);
      try {
        const object = loader.parse(text);
        const geometry = extractGeometry(object);
        if (geometry) {
          resolve(geometry);
        } else {
          reject(new Error('No geometry found in OBJ file'));
        }
      } catch (err) {
        reject(err);
      }
    } else {
      // GLB/GLTF
      const loader = new GLTFLoader();
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      
      loader.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url);
          const geometry = extractGeometry(gltf.scene);
          if (geometry) {
            resolve(geometry);
          } else {
            reject(new Error('No geometry found in GLB/GLTF file'));
          }
        },
        undefined,
        (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        }
      );
    }
  });
}

export function useCustomModels() {
  const [models, setModels] = useState<CustomModel[]>([]);
  const [loadedGeometries, setLoadedGeometries] = useState<Map<string, THREE.BufferGeometry>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load models list from IndexedDB on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();
        request.onsuccess = async () => {
          const storedModels: StoredModelData[] = request.result;
          const modelList: CustomModel[] = storedModels.map(({ fileData, ...model }) => model);
          setModels(modelList);
          
          // Load geometries for all stored models
          const geometries = new Map<string, THREE.BufferGeometry>();
          for (const stored of storedModels) {
            try {
              const geometry = await loadGeometryFromBuffer(
                stored.fileData,
                stored.fileType,
                stored.fileName
              );
              geometries.set(stored.id, geometry);
            } catch (err) {
              console.error(`Failed to load geometry for ${stored.name}:`, err);
            }
          }
          setLoadedGeometries(geometries);
          setIsLoading(false);
        };
        
        request.onerror = () => {
          setError('Failed to load models from storage');
          setIsLoading(false);
        };
      } catch (err) {
        setError('Failed to open model database');
        setIsLoading(false);
      }
    }
    
    loadModels();
  }, []);

  // Add a new model from file
  const addModel = useCallback(async (file: File): Promise<CustomModel | null> => {
    setError(null);
    
    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['glb', 'gltf', 'obj'].includes(extension)) {
      setError('Unsupported file type. Please use GLB, GLTF, or OBJ files.');
      return null;
    }
    
    const fileType = extension as 'glb' | 'gltf' | 'obj';
    
    try {
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Try to load geometry to validate the file
      const geometry = await loadGeometryFromBuffer(buffer, fileType, file.name);
      
      // Create model entry
      const model: CustomModel = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''), // Remove extension
        fileName: file.name,
        fileType,
        createdAt: Date.now(),
      };
      
      // Store in IndexedDB
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const storedData: StoredModelData = {
        ...model,
        fileData: buffer,
      };
      
      await new Promise<void>((resolve, reject) => {
        const request = store.add(storedData);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Update state
      setModels(prev => [...prev, model]);
      setLoadedGeometries(prev => {
        const next = new Map(prev);
        next.set(model.id, geometry);
        return next;
      });
      
      return model;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load model';
      setError(message);
      return null;
    }
  }, []);

  // Delete a model
  const deleteModel = useCallback(async (modelId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(modelId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      // Update state
      setModels(prev => prev.filter(m => m.id !== modelId));
      setLoadedGeometries(prev => {
        const next = new Map(prev);
        const geometry = next.get(modelId);
        if (geometry) {
          geometry.dispose();
        }
        next.delete(modelId);
        return next;
      });
    } catch (err) {
      setError('Failed to delete model');
    }
  }, []);

  // Get geometry for a model
  const getGeometry = useCallback((modelId: string): THREE.BufferGeometry | null => {
    return loadedGeometries.get(modelId) ?? null;
  }, [loadedGeometries]);

  // Rename a model
  const renameModel = useCallback(async (modelId: string, newName: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Get existing data
      const getRequest = store.get(modelId);
      getRequest.onsuccess = () => {
        const storedData: StoredModelData = getRequest.result;
        if (storedData) {
          storedData.name = newName;
          store.put(storedData);
        }
      };
      
      // Update state
      setModels(prev => prev.map(m => 
        m.id === modelId ? { ...m, name: newName } : m
      ));
    } catch (err) {
      setError('Failed to rename model');
    }
  }, []);

  return {
    models,
    isLoading,
    error,
    addModel,
    deleteModel,
    getGeometry,
    renameModel,
    clearError: () => setError(null),
  };
}
