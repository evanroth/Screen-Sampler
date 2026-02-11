

# Fix: Reset Mesh Orientation When Switching to Static 3D Shapes

## Problem

When switching from an animated shape (e.g., Floating Panels, Orbit Panel) to a static one (e.g., Sphere, Cube, or a custom/external model), the mesh retains the rotation and position values that were last set by the animated mode. This causes the static shape to appear at a skewed orientation.

## Root Cause

In `VisualizerCanvas3D.tsx`, the animated modes (`floating3D`, `orbit3D`, `carousel3D`, `helix3D`, `explode3D`, `wave3D`) set `mesh.rotation.x`, `mesh.rotation.y`, and `mesh.rotation.z` every frame. When the mode switches to a static shape, the static branch only updates `mesh.position` and conditionally updates rotation (only when `individualRotation` is enabled). The stale rotation values from the previous animated mode remain on the mesh.

## Solution

Add explicit rotation and position resets in the static shape branch of the animation switch statement. When a static shape is active and `individualRotation` is not controlling the rotation, reset `mesh.rotation` to zero. This ensures a clean orientation regardless of what was previously selected.

## Technical Details

**File: `src/components/visualizer/VisualizerCanvas3D.tsx`**

In the `useFrame` callback, inside the large `switch(mode)` block at the static shapes case (around line 312), after setting position, add:

```typescript
// Reset rotation for static shapes when not using individual rotation
if (!settings.individualRotation) {
  mesh.rotation.x = 0;
  mesh.rotation.y = 0;
  mesh.rotation.z = 0;
}
```

This goes right before the existing `if (settings.individualRotation)` block (around line 361), ensuring that when individual rotation is off, the mesh is cleanly oriented. When individual rotation IS on, the existing turntable logic takes over as before.

Also reset `mesh.rotation.z` inside the `individualRotation` block since the turntable effect only sets `.x` and `.y`, leaving `.z` potentially stale from modes like `wave3D` which sets `mesh.rotation.z`.

This is a single-file, ~5-line change with no risk to other behavior.

