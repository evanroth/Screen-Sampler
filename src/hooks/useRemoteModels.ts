import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface RemoteModel {
  id: string;
  name: string;
  fileName: string;
  fileType: 'glb' | 'gltf' | 'obj';
  url: string;
}

export type RemoteModelLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

const REMOTE_MODELS_BASE_URL = 'https://screen-sampler.evan-roth.com/3d/';
const REMOTE_MODELS_INDEX_URL = 'https://screen-sampler.evan-roth.com/3d/files.json';

// Parse geometry from loaded 3D object - merges ALL meshes
function extractGeometry(object: THREE.Object3D): THREE.BufferGeometry | null {
  const geometries: THREE.BufferGeometry[] = [];
  
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry.clone();
      
      // Apply the mesh's world transform to the geometry
      child.updateWorldMatrix(true, false);
      geo.applyMatrix4(child.matrixWorld);
      
      // Ensure geometry has normals before merging
      if (!geo.attributes.normal) {
        geo.computeVertexNormals();
      }
      
      // Remove UV attributes if they exist (can cause issues when merging)
      if (geo.attributes.uv) {
        geo.deleteAttribute('uv');
      }
      
      geometries.push(geo);
    }
  });
  
  if (geometries.length === 0) {
    return null;
  }
  
  // Merge all geometries into one
  let geometry: THREE.BufferGeometry;
  if (geometries.length === 1) {
    geometry = geometries[0];
  } else {
    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      console.error('Failed to merge geometries');
      return geometries[0];
    }
    geometry = merged;
    geometries.forEach(g => g.dispose());
  }
  
  // Center the merged geometry
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
  
  geometry.computeVertexNormals();
  generateSphericalUVs(geometry);
  
  return geometry;
}

// Generate spherical UV coordinates for a geometry
function generateSphericalUVs(geometry: THREE.BufferGeometry): void {
  const positions = geometry.attributes.position;
  if (!positions) return;
  
  const uvs = new Float32Array(positions.count * 2);
  const vertex = new THREE.Vector3();
  
  geometry.computeBoundingSphere();
  const center = geometry.boundingSphere?.center || new THREE.Vector3();
  
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    vertex.sub(center);
    vertex.normalize();
    
    const u = 0.5 + Math.atan2(vertex.z, vertex.x) / (2 * Math.PI);
    const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, vertex.y))) / Math.PI;
    
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

export function useRemoteModels() {
  const [models, setModels] = useState<RemoteModel[]>([]);
  const [loadedGeometries, setLoadedGeometries] = useState<Map<string, THREE.BufferGeometry>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, RemoteModelLoadingState>>(new Map());
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Fetch the list of available remote models
  useEffect(() => {
    async function fetchModelList() {
      try {
        const response = await fetch(REMOTE_MODELS_INDEX_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch model list: ${response.status}`);
        }
        
        const fileNames: string[] = await response.json();
        
        // Filter to only supported file types and exclude non-model files
        const remoteModels: RemoteModel[] = fileNames
          .filter(fileName => {
            const ext = fileName.split('.').pop()?.toLowerCase();
            return ext && ['glb', 'gltf', 'obj'].includes(ext);
          })
          .map(fileName => {
            const ext = fileName.split('.').pop()?.toLowerCase() as 'glb' | 'gltf' | 'obj';
            const name = fileName.replace(/\.[^.]+$/, ''); // Remove extension
            return {
              id: `remote-${fileName}`,
              name,
              fileName,
              fileType: ext,
              url: `${REMOTE_MODELS_BASE_URL}${fileName}`,
            };
          });
        
        setModels(remoteModels);
        
        // Initialize loading states
        const initialStates = new Map<string, RemoteModelLoadingState>();
        remoteModels.forEach(m => initialStates.set(m.id, 'idle'));
        setLoadingStates(initialStates);
        
        setIsListLoading(false);
      } catch (err) {
        console.error('Failed to fetch remote models list:', err);
        setListError(err instanceof Error ? err.message : 'Failed to load model list');
        setIsListLoading(false);
      }
    }
    
    fetchModelList();
  }, []);

  // Load a specific model on demand
  const loadModel = useCallback(async (modelId: string): Promise<THREE.BufferGeometry | null> => {
    // Check if already loaded
    const existing = loadedGeometries.get(modelId);
    if (existing) {
      return existing;
    }
    
    // Check if already loading
    if (loadingStates.get(modelId) === 'loading') {
      return null;
    }
    
    const model = models.find(m => m.id === modelId);
    if (!model) {
      console.error(`Remote model not found: ${modelId}`);
      return null;
    }
    
    // Set loading state
    setLoadingStates(prev => {
      const next = new Map(prev);
      next.set(modelId, 'loading');
      return next;
    });
    
    try {
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      
      // Parse the geometry
      const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
        if (model.fileType === 'obj') {
          const loader = new OBJLoader();
          const text = new TextDecoder().decode(buffer);
          try {
            const object = loader.parse(text);
            const geo = extractGeometry(object);
            if (geo) {
              resolve(geo);
            } else {
              reject(new Error('No geometry found in OBJ file'));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          // GLB/GLTF - use parse() method which handles ArrayBuffer directly
          const loader = new GLTFLoader();
          loader.parse(
            buffer,
            '', // path for resolving relative URIs (not needed for self-contained files)
            (gltf) => {
              const geo = extractGeometry(gltf.scene);
              if (geo) {
                resolve(geo);
              } else {
                reject(new Error('No geometry found in GLB/GLTF file'));
              }
            },
            (err) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          );
        }
      });
      
      // Store the loaded geometry
      setLoadedGeometries(prev => {
        const next = new Map(prev);
        next.set(modelId, geometry);
        return next;
      });
      
      setLoadingStates(prev => {
        const next = new Map(prev);
        next.set(modelId, 'loaded');
        return next;
      });
      
      return geometry;
    } catch (err) {
      console.error(`Failed to load remote model ${model.name}:`, err);
      
      setLoadingStates(prev => {
        const next = new Map(prev);
        next.set(modelId, 'error');
        return next;
      });
      
      return null;
    }
  }, [models, loadedGeometries, loadingStates]);

  // Get geometry for a model (returns null if not loaded yet)
  const getGeometry = useCallback((modelId: string): THREE.BufferGeometry | null => {
    return loadedGeometries.get(modelId) ?? null;
  }, [loadedGeometries]);

  // Get loading state for a model
  const getLoadingState = useCallback((modelId: string): RemoteModelLoadingState => {
    return loadingStates.get(modelId) ?? 'idle';
  }, [loadingStates]);

  // Check if a model is a remote model
  const isRemoteModel = useCallback((modelId: string): boolean => {
    return modelId.startsWith('remote-');
  }, []);

  return {
    models,
    isListLoading,
    listError,
    loadModel,
    getGeometry,
    getLoadingState,
    isRemoteModel,
  };
}
