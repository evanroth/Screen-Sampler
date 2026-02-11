

# Fix: Preserve Region Source Assignments Across Presets

## Problem

When switching between presets that have regions assigned to different screen capture sources, regions jump to the wrong source. This happens because `sourceId` (the link between a region and its capture source) is neither saved in presets nor restored when loading them.

Currently:
- Existing regions keep whatever source they happen to have at load time
- New regions created during preset loading all inherit Region 1's source

## Solution

Save and restore `sourceId` as part of the region settings in each preset. This makes presets fully self-contained snapshots that remember which source each region was assigned to.

Since source IDs are session-specific (screen capture permissions reset between sessions), the restore logic needs a fallback: if a saved `sourceId` doesn't match any currently active source, the region falls back to the first available source.

## Technical Changes

### 1. Add `sourceId` to `SavedRegionSettings` interface

**File: `src/hooks/useSettingsStorage.ts`**

Add `sourceId?: string` to the `SavedRegionSettings` interface alongside the existing geometry fields.

### 2. Save `sourceId` when extracting region settings

**File: `src/pages/Index.tsx`** (`extractRegionSettings`)

Include `sourceId: r.sourceId` in the mapped output so it gets persisted with each preset.

### 3. Restore `sourceId` when applying region settings

**File: `src/pages/Index.tsx`** (`applyRegionSettings`)

- When updating existing regions: restore the saved `sourceId` if it exists and matches a currently active source; otherwise keep the region's current source.
- When creating new regions: use the saved `sourceId` with the same active-source fallback instead of blindly using Region 1's source.

The fallback logic will look like:

```text
savedSourceId exists AND is in active sources? -> use it
otherwise -> use the region's current sourceId (existing) or first available source (new)
```

This ensures presets work correctly within a session (sources stay mapped) while gracefully degrading across sessions (sources fall back to whatever is available).

