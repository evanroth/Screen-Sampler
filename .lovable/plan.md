

## Save More Settings in Presets and Session Restore

### What's Currently Saved
- All `VisualizerSettings` (animation modes, background, effects, cursor, etc.)
- Favorited model IDs

### What's NOT Currently Saved (But Could Be)
Per-region visual settings that persist as long as the capture sources remain active:
- `animationMode3D` (per-region 3D shape override)
- `animationMode2D` (per-region 2D animation override)
- `customModelId` / `modelSource` (assigned custom or external model)
- `scale3D`, `position3D` (3D transform overrides)
- `scale2D`, `position2D` (2D transform overrides)
- `transparentColor`, `transparentThreshold` (color keying)
- `glowEnabled`, `glowColor`, `glowAmount` (glow effects)
- `fullscreenBackground` (region used as background)
- `randomizeEnabled`, `randomizeInterval` (auto-randomize per region)
- `transitionType` (transition style)
- `visible` (region visibility)
- `autoRotate3D` (per-region auto-rotation)
- MIDI mappings

### What Can't Be Saved
- Region geometry (`x`, `y`, `width`, `height`) and `sourceId` -- these are tied to the specific screen capture session and must be re-selected each time for security reasons (browsers require fresh user permission)

### How It Will Work

When saving a preset or auto-saving the session, the region **visual settings** (everything listed above except geometry/sourceId) will be saved alongside the regions, indexed by region order (Region 1, Region 2, etc.). When restoring:
- If the same number of regions exist, the saved visual settings are applied to each region by index
- If fewer regions exist, extra saved settings are ignored
- Region geometry stays as the user configured it -- only the visual/effect settings are restored

MIDI mappings will also be saved in presets.

### Technical Changes

**1. `src/hooks/useSettingsStorage.ts`**
- Define a `SavedRegionSettings` interface containing all the visual/effect properties of `CaptureRegion` (excluding `id`, `sourceId`, `x`, `y`, `width`, `height`, `bounceTime`, `fadeOpacity`, `morphProgress`, `transitionFrozen`, `midiScale3D`, `midiRotationY`)
- Update `SavedPreset` to include `regionSettings?: SavedRegionSettings[]` and `midiMappings?: any[]`
- Update `savePreset` to accept region settings and MIDI mappings
- Update `saveLastSession` / `loadLastSession` to include region settings and MIDI mappings

**2. `src/pages/Index.tsx`**
- When saving a preset: extract visual settings from current `regions` array and pass them to `savePreset`
- When loading a preset: apply saved region settings back onto existing regions by index
- When auto-saving session: include region visual settings and MIDI mappings
- When auto-restoring session: apply saved region settings after regions are created

**3. `src/hooks/useMidiMappings.ts`**
- Expose a `getMappings()` function to retrieve current MIDI mappings for saving
- Expose a `setMappingsFromPreset()` function to restore saved MIDI mappings

