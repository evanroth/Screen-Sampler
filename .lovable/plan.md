

# Fix: Preset Region Settings Mismatch

## Problem

Region settings in presets are stored as an ordered array and applied by index. When the number of regions changes between saving and loading a preset, it causes:

- **Fewer saved than current**: Extra regions keep stale/wrong settings from the previously active preset.
- **More saved than current**: Extra saved settings are silently dropped.

## Proposed Solution

Store the **region count** in each preset and, on load, **resize the regions array** to match what was saved. This means:

1. When loading a preset that had 1 region but you currently have 3, regions 2 and 3 are removed.
2. When loading a preset that had 3 regions but you currently have 1, two new regions are created with default geometry.

This ensures presets are fully self-contained snapshots of the region configuration.

## Technical Changes

### 1. Save region count and geometry in presets

**`src/hooks/useSettingsStorage.ts`**
- Add optional geometry fields to `SavedRegionSettings`: `x`, `y`, `width`, `height` (so regions can be fully recreated).

**`src/pages/Index.tsx`** (`extractRegionSettings`)
- Include `x`, `y`, `width`, `height` from each region in the saved data.

### 2. Update `applyRegionSettings` to handle count mismatches

**`src/pages/Index.tsx`** (`applyRegionSettings`)
- If saved array is shorter than current regions: remove excess regions.
- If saved array is longer than current regions: create new regions with saved geometry (or sensible defaults if geometry is missing for backward compatibility with old presets).
- Apply visual settings to all matched regions as before.

### 3. Backward compatibility

Old presets without geometry data will continue to work with the current index-matching behavior (no regions added/removed, just settings applied where indices match). Only presets saved after this change will include geometry and trigger region count adjustment.

## Summary of File Changes

- **`src/hooks/useSettingsStorage.ts`**: Add `x`, `y`, `width`, `height` to `SavedRegionSettings` interface.
- **`src/pages/Index.tsx`**: Update `extractRegionSettings` to include geometry; rewrite `applyRegionSettings` to reconcile region count differences by adding/removing regions as needed.

