

# Fix: Region 2 Model Getting Stuck

## Root Causes Found

### 1. `handleJumpToFavorite` doesn't set `modelSource` (Primary suspect)

In `src/pages/Index.tsx` (lines 121-133), the `applyModelToRegion` helper inside `handleJumpToFavorite` updates `customModelId` and `animationMode3D` but never sets `modelSource`. This causes the ControlPanel to show the wrong source dropdown (e.g., "Default Shapes" even though a remote model is active), because the source dropdown reads `region.modelSource || "default"`.

Since `customModelId` takes priority over `animationMode3D` in the geometry resolver (VisualizerCanvas3D.tsx line 422), the region shows the remote model but the dropdown shows Mobius. When the user tries to change the model through what appears to be the correct dropdown, the underlying `customModelId` still overrides.

### 2. Arrow key handler overwrites ALL regions

In `src/pages/Index.tsx` (lines 564-569), pressing arrow keys applies model changes to **every** region:

```text
// Line 565 - sets customModelId on ALL regions
setRegions(prev => prev.map(r => ({ ...r, customModelId: nextModelId })));

// Line 569 - clears customModelId on ALL regions  
setRegions(prev => prev.map(r => ({ ...r, customModelId: undefined })));
```

This overwrites Region 2's independently-selected model whenever arrow keys are used.

### 3. Shared geometry object between regions

When two regions use the same remote model, they both receive the same `THREE.BufferGeometry` instance via `<primitive object={customGeo}>`. React Three Fiber may have reconciliation issues when the same object is attached to multiple meshes. Cloning the geometry for each region would prevent this.

## Technical Changes

### File: `src/pages/Index.tsx`

**Fix 1: Set `modelSource` in `applyModelToRegion`** (lines 121-133)

Update the helper to include `modelSource` when applying models:
- For remote models: set `modelSource: 'external'`
- For custom models: set `modelSource: 'custom'`
- For default shapes: set `modelSource: 'default'`

**Fix 2: Scope arrow key model changes to Region 1 only** (lines 551-573)

Change the arrow key handler so it only updates Region 1 (`i === 0`) instead of all regions. This preserves Region 2's independent model assignment.

### File: `src/components/visualizer/VisualizerCanvas3D.tsx`

**Fix 3: Clone geometry for each region** (line 424-426)

When `getCustomGeometry` returns a geometry, clone it before using it in `<primitive>`. This prevents two regions from sharing the exact same object reference:

```typescript
const customGeo = getCustomGeometry(region.customModelId);
if (customGeo) {
  const cloned = customGeo.clone();
  return <primitive object={cloned} attach="geometry" />;
}
```

The clone needs to be memoized (keyed on `region.customModelId`) to avoid creating a new clone every render.

## Summary

These three changes together ensure:
- The ControlPanel always shows the correct source/model dropdown for each region
- Arrow key navigation doesn't accidentally overwrite Region 2's model
- Each region gets its own geometry instance to avoid R3F conflicts

