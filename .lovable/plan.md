

# Fix: Persistent Crash After ~10 Minutes of Continuous Use

## Root Cause Analysis

The previous round of fixes addressed offscreen canvas reallocation and ImageData pooling, but missed three critical sources of per-frame GC pressure that compound over time and eventually overwhelm the browser.

### Issue 1: `render` callback in VisualizerCanvas.tsx is recreated every single frame (Critical)

The `render` function is wrapped in `useCallback` with dependencies `[regions, settings, audioLevel, isActive, getVideoElement]`. Both `audioLevel` and `settings` change on every animation frame (audio analyzer updates audioLevel ~60fps; gradient animations update settings continuously). This means:

- `render` is recreated 60 times/second
- The `useEffect` that starts the animation loop (depends on `render`) re-runs 60 times/second
- Each re-run: cancel old `requestAnimationFrame` + allocate new closure + schedule new `requestAnimationFrame`
- Over 10 minutes: ~36,000 closure allocations + effect teardown/setup cycles

### Issue 2: Keyboard event listener in Index.tsx is re-attached every frame (Critical)

The keydown handler effect (line 522) depends on `settings` (the entire settings object) and `regions`. Since `settings` changes every frame during gradient animations, the event listener is constantly removed and re-added:

```text
window.removeEventListener('keydown', oldHandler)
window.addEventListener('keydown', newHandler)
```

This creates ~36,000 listener attach/detach cycles over 10 minutes, each generating garbage from the old closure.

### Issue 3: `toDataURL` snapshots during rapid lock state cycling (Moderate)

When switching lock states with "Transition Fade" enabled, `canvasEl.toDataURL('image/png')` generates a large base64 data URL (several MB for a 1080p canvas). If the user cycles lock states rapidly (keyboard q/w), multiple snapshots can accumulate before the previous transition completes, because `presetSnapshotUrl` state is overwritten but the old `<img>` element's transition may still be in progress.

## Fix Plan

### Fix 1: Use refs for frequently-changing values in VisualizerCanvas.tsx render loop

Store `regions`, `settings`, `audioLevel`, and `getVideoElement` in refs. The `render` callback reads from refs instead of closures, so its dependency array becomes `[isActive]` only. The animation loop starts once and runs continuously without being torn down.

**File:** `src/components/visualizer/VisualizerCanvas.tsx`

- Add refs: `regionsRef`, `settingsRef`, `audioLevelRef`, `getVideoElementRef`
- Keep refs synced with props at the top of the component
- Change `render` to read from refs instead of closure variables
- Simplify dependency array to `[isActive]`

### Fix 2: Use refs for frequently-changing values in Index.tsx keyboard handler

Store `settings`, `regions`, and callback functions in refs so the keyboard handler effect only runs once (on mount) and reads current values from refs.

**File:** `src/pages/Index.tsx`

- Add `regionsRef` (synced with `regions`)
- The existing `settingsRef` already tracks settings
- Change the keyboard `useEffect` to read from refs inside the handler
- Remove `settings`, `regions`, `handleCyclePreset`, `handleJumpToFavorite`, and other frequently-changing values from the dependency array

### Fix 3: Revoke previous snapshot before creating a new one

In `handleLoadPreset`, if `presetSnapshotUrl` already exists, skip creating a new snapshot or revoke the old one. This prevents accumulation during rapid cycling.

**File:** `src/pages/Index.tsx`

- Add a guard: if a transition snapshot is already visible, skip the `toDataURL` call and apply the preset immediately without a new overlay

## Summary of Changes

| File | Change | Impact |
|---|---|---|
| `VisualizerCanvas.tsx` | Use refs for render loop values, remove settings/audioLevel/regions from `useCallback` deps | Eliminates ~36,000/10min closure recreations + effect re-runs |
| `Index.tsx` | Use refs in keyboard handler, remove settings/regions from effect deps | Eliminates ~36,000/10min listener attach/detach cycles |
| `Index.tsx` | Guard against overlapping transition snapshots | Prevents multi-MB data URL accumulation during rapid lock state cycling |

## Technical Details

### VisualizerCanvas.tsx changes

```text
// Add refs at component top
const regionsRef = useRef(regions);
const settingsRef = useRef(settings);
const audioLevelRef = useRef(audioLevel);
const getVideoElementRef = useRef(getVideoElement);
regionsRef.current = regions;
settingsRef.current = settings;
audioLevelRef.current = audioLevel;
getVideoElementRef.current = getVideoElement;

// In render callback, replace all `settings.X` with `settingsRef.current.X`,
// `regions` with `regionsRef.current`, `audioLevel` with `audioLevelRef.current`,
// `getVideoElement(...)` with `getVideoElementRef.current(...)`

// Change dependency array from [regions, settings, audioLevel, isActive, getVideoElement]
// to just [isActive]
```

### Index.tsx keyboard handler changes

```text
// Add regionsRef
const regionsRef = useRef(regions);
regionsRef.current = regions;

// Also add refs for callbacks used inside the handler
const handleCyclePresetRef = useRef(handleCyclePreset);
handleCyclePresetRef.current = handleCyclePreset;
const handleJumpToFavoriteRef = useRef(handleJumpToFavorite);
handleJumpToFavoriteRef.current = handleJumpToFavorite;
// etc.

// In the useEffect, read from refs:
useEffect(() => {
  const h = (e: KeyboardEvent) => {
    const currentSettings = settingsRef.current;
    const currentRegions = regionsRef.current;
    // ... use currentSettings and currentRegions instead of settings/regions
  };
  window.addEventListener('keydown', h, true);
  return () => window.removeEventListener('keydown', h, true);
}, []);  // Empty deps -- handler reads from refs
```

### Snapshot guard

```text
// In handleLoadPreset, before toDataURL:
if (settings.presetTransitionFade && !presetSnapshotVisible) {
  // Only create snapshot if no transition is already in progress
  const canvasEl = document.querySelector('canvas');
  if (canvasEl) { ... }
}
```

