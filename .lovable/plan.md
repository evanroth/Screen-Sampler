

# Redefine Global vs Preset Settings

## Problem
Currently, loading a preset overwrites ALL settings including ones that should remain constant across preset switches (like MIDI mappings, favorites, mute notifications, texture quality, etc.). This needs to be split into two categories.

## Categorization

### Global Settings (preserved when switching presets)
These stay constant regardless of which preset is loaded:

| Setting | Key(s) in VisualizerSettings |
|---|---|
| MIDI Mappings | Stored separately (midiMappings) |
| Favorites | Stored separately (favorites array) |
| Mute Notifications | `muteNotifications` |
| Bounce Parameters | `bounceStrength`, `movementSpeed` |
| Texture Settings | `textureQuality`, `textureSmoothing` |
| Transition Fade | `presetTransitionFade` (already preserved) |
| Remember Last Session | `autoRestore` (already separate) |
| Mouse Icon | `cursorStyle` |
| MIDI Rotation Sensitivity | `midiRotationSensitivity` |

### Preset Settings (change when loading a preset)
| Setting | Key(s) |
|---|---|
| Visualizer Mode | `visualizerMode` |
| Background | `backgroundStyle`, `backgroundColor`, `gradientSettings` |
| Region Settings | Per-region data (geometry, models, effects, sources) |
| Center Camera | `centerCamera` |
| Auto-Rotate Camera | `autoRotateCamera`, `autoRotateCameraSpeed` |
| Individual Rotation | `individualRotation`, `individualRotationSpeed` |
| Object Scale | `panelScaleX`, `panelScaleY`, `panelScaleLinked` |
| Animation Modes | `animationMode`, `animationMode3D` |
| Effects | `opacityVariation`, `blurIntensity`, `tileEffect`, `enableRotation` |
| Trails | `trailAmount`, `enableTrails` |
| Random Mode | `randomModeInterval` |
| Region Spacing | `regionSpacing3D` |
| Play Mode | `playMode` |

### Both categories saved in "Remember Last Session" and "Export Settings"
No change needed here -- the existing last-session save and export already capture everything (all VisualizerSettings + favorites + MIDI mappings + region settings). This remains the same.

## Technical Changes

### 1. Define global setting keys as a constant

**File: `src/pages/Index.tsx`**

Add a constant listing the VisualizerSettings keys that are global. When loading a preset, these keys will be excluded from the incoming settings and the current values preserved.

```text
const GLOBAL_SETTING_KEYS = [
  'muteNotifications',
  'bounceStrength',
  'movementSpeed',
  'textureQuality',
  'textureSmoothing',
  'presetTransitionFade',
  'cursorStyle',
  'midiRotationSensitivity',
] as const;
```

### 2. Update `applyPresetData` to preserve global settings

**File: `src/pages/Index.tsx`**

Currently `applyPresetData` calls `loadSettings(presetData.settings)` which overwrites everything. Change it to:
- Take the incoming preset settings
- For each global key, replace with the current value instead of the preset value
- Stop overwriting favorites and MIDI mappings from preset data

```text
// Pseudocode
const mergedSettings = { ...presetData.settings };
for (const key of GLOBAL_SETTING_KEYS) {
  mergedSettings[key] = settings[key]; // keep current global value
}
loadSettings(mergedSettings);

// Do NOT call favorites.setFavoritesFromPreset()
// Do NOT call midiMappings.setMappingsFromPreset()
```

### 3. Keep presets saving everything (for export compatibility)

**File: `src/pages/Index.tsx`** (`handleSavePreset`)

No change to what gets saved. Presets still store all settings, favorites, and MIDI mappings so that export/import files are complete snapshots. The filtering only happens at load time.

### 4. Update import to still restore everything

**File: `src/pages/Index.tsx`** (`handleImportSettings`)

Import continues to restore ALL settings (including global ones, favorites, and MIDI mappings) since importing is an explicit full-state restore, different from switching presets.

### 5. Camera position note

The 3D camera position is auto-computed from `regionSpacing3D`, `panelScaleX`, and visible region count. Since these are all preset settings, the camera will restore to the correct position when switching presets. The orbit angle (manual drag position) is transient and managed by OrbitControls -- saving/restoring the exact drag angle is not practical since it resets with auto-rotate anyway.

