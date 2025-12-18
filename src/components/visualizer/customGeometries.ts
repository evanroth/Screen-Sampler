import * as THREE from 'three';

// Helper to create parametric geometry
function createParametricGeometry(
  func: (u: number, v: number, target: THREE.Vector3) => void,
  slices: number,
  stacks: number
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const p = new THREE.Vector3();
  
  for (let i = 0; i <= stacks; i++) {
    const v = i / stacks;
    for (let j = 0; j <= slices; j++) {
      const u = j / slices;
      func(u, v, p);
      vertices.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }

  for (let i = 0; i < stacks; i++) {
    for (let j = 0; j < slices; j++) {
      const a = i * (slices + 1) + j;
      const b = a + slices + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

// Tetrakis Hexahedron (Catalan solid)
export function createTetrakisHexahedron(radius: number = 1.5): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const r = radius;
  const h = r * 0.4; // Height of pyramids
  
  // Start with a cube, then add pyramids on each face
  const cubeSize = r * 0.7;
  const vertices: number[] = [];
  const indices: number[] = [];
  
  // Cube vertices
  const cv = [
    [-cubeSize, -cubeSize, -cubeSize], [cubeSize, -cubeSize, -cubeSize],
    [cubeSize, cubeSize, -cubeSize], [-cubeSize, cubeSize, -cubeSize],
    [-cubeSize, -cubeSize, cubeSize], [cubeSize, -cubeSize, cubeSize],
    [cubeSize, cubeSize, cubeSize], [-cubeSize, cubeSize, cubeSize]
  ];
  
  // Face centers with pyramids
  const faces = [
    { center: [0, 0, -cubeSize - h], verts: [0, 1, 2, 3] },
    { center: [0, 0, cubeSize + h], verts: [4, 5, 6, 7] },
    { center: [-cubeSize - h, 0, 0], verts: [0, 3, 7, 4] },
    { center: [cubeSize + h, 0, 0], verts: [1, 2, 6, 5] },
    { center: [0, -cubeSize - h, 0], verts: [0, 1, 5, 4] },
    { center: [0, cubeSize + h, 0], verts: [2, 3, 7, 6] }
  ];
  
  let idx = 0;
  faces.forEach(face => {
    const apex = face.center;
    const v = face.verts;
    // Create 4 triangles from apex to each edge
    for (let i = 0; i < 4; i++) {
      const v1 = cv[v[i]];
      const v2 = cv[v[(i + 1) % 4]];
      vertices.push(apex[0], apex[1], apex[2]);
      vertices.push(v1[0], v1[1], v1[2]);
      vertices.push(v2[0], v2[1], v2[2]);
      indices.push(idx, idx + 1, idx + 2);
      idx += 3;
    }
  });
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Great Dodecahedron (star polyhedron)
export function createGreatDodecahedron(radius: number = 1.5): THREE.BufferGeometry {
  // Approximation using icosahedron with extended vertices
  const geometry = new THREE.IcosahedronGeometry(radius * 1.2, 0);
  // Scale to create stellated effect
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const factor = 1 + 0.3 * Math.sin(i * 1.5);
    positions.setXYZ(i, x * factor, y * factor, z * factor);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Great Icosahedron
export function createGreatIcosahedron(radius: number = 1.5): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const factor = 1 + 0.4 * Math.cos(i * 0.8);
    positions.setXYZ(i, x * factor, y * factor, z * factor);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Small Stellated Dodecahedron
export function createSmallStellatedDodecahedron(radius: number = 1.5): THREE.BufferGeometry {
  const geometry = new THREE.DodecahedronGeometry(radius, 0);
  const positions = geometry.attributes.position;
  // Stellate by pushing vertices outward
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const factor = 1.4;
    positions.setXYZ(i, x * factor, y * factor, z * factor);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Great Stellated Dodecahedron
export function createGreatStellatedDodecahedron(radius: number = 1.5): THREE.BufferGeometry {
  const geometry = new THREE.DodecahedronGeometry(radius, 1);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const factor = 1 + 0.5 * Math.sin(i * 2.3);
    positions.setXYZ(i, x * factor, y * factor, z * factor);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Triple Twist Mobius Strip
export function createTripleTwistMobius(radius: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const t = u * Math.PI * 2;
    const s = (v - 0.5) * 0.5;
    const twist = 3; // Triple twist
    
    const x = (radius + s * Math.cos(twist * t / 2)) * Math.cos(t);
    const y = (radius + s * Math.cos(twist * t / 2)) * Math.sin(t);
    const z = s * Math.sin(twist * t / 2);
    
    target.set(x, y, z);
  }, 64, 16);
}

// Verrill Surface (algebraic surface)
export function createVerrillSurface(scale: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI * 2;
    
    const r = scale * (1 + 0.5 * Math.sin(3 * theta) * Math.sin(2 * phi));
    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(phi);
    
    target.set(x, y, z);
  }, 48, 48);
}

// Double Trefoil Knot
export function createDoubleTrefoil(radius: number = 1.0): THREE.BufferGeometry {
  // Use torus knot with specific parameters for double trefoil
  return new THREE.TorusKnotGeometry(radius, 0.25, 128, 16, 4, 3);
}

// Schwarz P Surface (minimal surface)
export function createSchwarzPSurface(scale: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const x = (u - 0.5) * 2 * Math.PI;
    const y = (v - 0.5) * 2 * Math.PI;
    
    // Approximate Schwarz P with sinusoidal function
    const z = scale * 0.5 * (Math.cos(x) + Math.cos(y) + Math.cos(x) * Math.cos(y) * 0.5);
    
    target.set(x * scale * 0.4, y * scale * 0.4, z);
  }, 48, 48);
}

// Enneper Surface
export function createEnneperSurface(scale: number = 0.8): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const uVal = (u - 0.5) * 3;
    const vVal = (v - 0.5) * 3;
    
    const x = scale * (uVal - uVal * uVal * uVal / 3 + uVal * vVal * vVal);
    const y = scale * (vVal - vVal * vVal * vVal / 3 + vVal * uVal * uVal);
    const z = scale * (uVal * uVal - vVal * vVal);
    
    target.set(x, y, z);
  }, 48, 48);
}

// Boy's Surface
export function createBoysSurface(scale: number = 1.0): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI;
    const phi = v * Math.PI * 2;
    
    const x = scale * (Math.cos(theta) * Math.sin(phi) + Math.sqrt(2) * Math.cos(2 * phi) * Math.sin(theta) / 2);
    const y = scale * (Math.sin(theta) * Math.sin(phi) - Math.sqrt(2) * Math.cos(2 * phi) * Math.cos(theta) / 2);
    const z = scale * (Math.cos(phi) + Math.sqrt(2) * Math.sin(2 * phi) / 2) * 0.8;
    
    target.set(x, y, z);
  }, 48, 48);
}

// Clifford Torus
export function createCliffordTorus(scale: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI * 2;
    
    const r = scale;
    const x = r * Math.cos(theta) * (1 + 0.5 * Math.cos(phi));
    const y = r * Math.sin(theta) * (1 + 0.5 * Math.cos(phi));
    const z = r * 0.5 * Math.sin(phi);
    
    target.set(x, y, z);
  }, 48, 48);
}

// Hyperbolic Paraboloid (Saddle)
export function createHyperbolicParaboloid(scale: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const x = (u - 0.5) * 2 * scale;
    const y = (v - 0.5) * 2 * scale;
    const z = (x * x - y * y) * 0.3;
    
    target.set(x, y, z);
  }, 32, 32);
}

// Hyperboloid of One Sheet
export function createHyperboloidOneSheet(scale: number = 1.0): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI * 2;
    const t = (v - 0.5) * 3;
    
    const a = scale * 0.8;
    const c = scale * 0.5;
    
    const x = a * Math.sqrt(1 + t * t) * Math.cos(theta);
    const y = a * Math.sqrt(1 + t * t) * Math.sin(theta);
    const z = c * t;
    
    target.set(x, y, z);
  }, 48, 32);
}

// Steiner Surface (Roman Surface)
export function createSteinerSurface(scale: number = 1.2): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI;
    const phi = v * Math.PI * 2;
    
    const x = scale * Math.sin(2 * theta) * Math.cos(phi) * Math.cos(phi);
    const y = scale * Math.sin(2 * theta) * Math.sin(phi) * Math.cos(phi);
    const z = scale * Math.cos(theta) * Math.sin(2 * phi) / 2;
    
    target.set(x, y, z);
  }, 48, 48);
}

// Helicoid (Twisted Minimal Surface)
export function createHelicoid(scale: number = 1.0): THREE.BufferGeometry {
  return createParametricGeometry((u, v, target) => {
    const theta = u * Math.PI * 4; // 2 full twists
    const r = (v - 0.5) * 2 * scale;
    
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = theta * 0.15 * scale;
    
    target.set(x, y, z);
  }, 64, 24);
}
