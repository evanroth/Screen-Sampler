

# Fix: App Crash After ~10 Minutes of Continuous Use

## Root Cause Analysis

After thorough investigation, the crash is caused by **cumulative memory pressure from per-frame allocations** that overwhelm the browser's garbage collector over time. There are three distinct issues working together:

### Issue 1: Offscreen Canvas Backing Store Reallocated Every Frame (Critical)
**File:** `src/components/visualizer/VisualizerCanvas.tsx`, lines 200-201

```text
offscreen.width = regionW;
offscreen.height = regionH;
```

Setting a canvas's `width` or `height` **destroys and reallocates its entire backing buffer** -- even if the dimensions haven't changed. At 60fps with 1920x1080 video, this allocates and discards ~8MB of pixel data per region per frame. Over 10 minutes that's ~2.8 TB of transient allocations for the GC to handle.

### Issue 2: `getImageData()` Creates New ArrayBuffer Every Frame (Critical)
**Files:** `VisualizerCanvas.tsx` line 221, `VisualizerCanvas3D.tsx` lines 173 and 619

When transparent color keying is active, `ctx.getImageData()` is called every frame. Despite the code pooling the destination ImageData, `getImageData()` always returns a **new** ImageData with a fresh ArrayBuffer. At texture quality 2048, each call allocates 16MB that is immediately discarded after copying.

### Issue 3: Cascading Callback Recreation From `settings` Dependency (Moderate)
**File:** `src/pages/Index.tsx`, line 332

The recent change made `applyPresetData` depend on the entire `settings` object. Since `settings` changes frequently (gradient animation updates it every frame during transitions, audio level triggers bounces), this causes a cascade:

`settings` changes -> `applyPresetData` recreates -> `handleLoadPreset` recreates -> `handleCyclePreset` recreates -> keyboard event listener effect re-runs (removes + re-adds listener)

This isn't a memory leak per se, but adds significant GC pressure from constant closure and event listener churn.

## Fix Plan

### Fix 1: Only resize offscreen canvas when dimensions actually change
**File:** `src/components/visualizer/VisualizerCanvas.tsx`

Add a guard before setting dimensions:

```text
// Before (every frame):
offscreen.width = regionW;
offscreen.height = regionH;

// After (only when changed):
if (offscreen.width !== regionW || offscreen.height !== regionH) {
  offscreen.width = regionW;
  offscreen.height = regionH;
}
```

### Fix 2: Eliminate redundant `getImageData` allocation
**Files:** `VisualizerCanvas.tsx`, `VisualizerCanvas3D.tsx` (RegionMesh + FullscreenBackgroundMesh)

Instead of calling `getImageData()` (which allocates a new ArrayBuffer) and then copying into a pooled ImageData, read directly into the pooled ImageData using a single `getImageData` call and reuse the result:

```text
// Before (allocates new ArrayBuffer every frame):
const freshData = ctx.getImageData(0, 0, quality, quality);
imageDataRef.current.data.set(freshData.data);  // copy then discard

// After (reuse the same ImageData object):
// Just call getImageData and store the result directly as the pool entry.
// The key insight: we can skip the copy entirely by just reassigning the ref.
imageDataRef.current = ctx.getImageData(0, 0, quality, quality);
```

This still allocates per frame but eliminates the redundant copy step and the double-allocation pattern. For a true zero-alloc path, we can use `Uint8ClampedArray` with a pre-allocated buffer and read pixel data via `drawImage` to a fixed-size canvas -- but the simpler fix (removing the unnecessary copy) cuts allocation in half and is the pragmatic first step.

### Fix 3: Snapshot global settings via ref instead of depending on `settings`
**File:** `src/pages/Index.tsx`

Remove `settings` from `applyPresetData`'s dependency array. Instead, use a ref to read the current global settings at call time:

```text
// Add a ref that always holds the latest settings
const settingsRef = useRef(settings);
settingsRef.current = settings;

// In applyPresetData, read from the ref instead of the closure
const applyPresetData = useCallback((presetData) => {
  if (!presetData) return;
  const mergedSettings: any = { ...presetData.settings };
  const currentSettings = settingsRef.current;
  for (const key of GLOBAL_SETTING_KEYS) {
    mergedSettings[key] = currentSettings[key];
  }
  loadSettings(mergedSettings as VisualizerSettings);
  if (presetData.regionSettings?.length > 0) {
    applyRegionSettings(presetData.regionSettings);
  }
}, [loadSettings, applyRegionSettings]);
// No more `settings` dependency -- breaks the cascade
```

### Fix 4: Move `GLOBAL_SETTING_KEYS` to module scope
**File:** `src/pages/Index.tsx`

The array is currently defined inside the component body (line 308), meaning it's recreated on every render. Move it to module scope (above the component) since it's a static constant.

## Summary of Changes

| File | Change | Impact |
|---|---|---|
| `VisualizerCanvas.tsx` | Guard offscreen canvas resize | Eliminates ~8MB/frame/region allocation |
| `VisualizerCanvas.tsx` | Simplify transparent color ImageData usage | Halves allocation when color keying active |
| `VisualizerCanvas3D.tsx` | Same ImageData fix in RegionMesh + FullscreenBackgroundMesh | Same benefit for 3D mode |
| `Index.tsx` | Use ref for settings in `applyPresetData`, move constant to module scope | Stops cascading callback/listener churn |

