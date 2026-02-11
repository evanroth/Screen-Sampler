

## Export/Import Settings to File

### Overview
Add "Export Settings" and "Import Settings" buttons to the Presets section. Export saves a JSON file (with a `.ssconfig` extension for branding) containing all presets, favorites, MIDI mappings, current visualizer settings, and auto-restore preference. Import reads the file and restores everything.

### What Gets Exported
- All saved presets (including their embedded region settings, favorites, and MIDI mappings)
- Current global favorites list
- Current MIDI mappings
- Current visualizer settings
- Auto-restore preference

### File Format
A JSON file with a wrapper object including a version number for future compatibility:
```text
{
  "appName": "Screen Sampler",
  "version": 1,
  "exportedAt": "2026-02-11T...",
  "settings": { ... },
  "presets": [ ... ],
  "favorites": [ ... ],
  "midiMappings": [ ... ],
  "autoRestore": true
}
```
The file extension will be `.ssconfig` and the default filename will include a date stamp (e.g., `screen-sampler-2026-02-11.ssconfig`).

### User Experience
- Two new buttons appear in the Presets section, below the auto-restore toggle
- **Export Settings**: Immediately downloads the file -- no dialog needed
- **Import Settings**: Opens a file picker. After selecting a file, shows a confirmation dialog warning that this will replace all current settings, presets, favorites, and MIDI mappings. On confirm, everything is loaded in.

### Changes

**1. `src/hooks/useSettingsStorage.ts`**
- Add `exportAllSettings()` method that collects all data and triggers a JSON file download
- Add `importAllSettings()` method that accepts parsed JSON, validates the format, and replaces all stored data (presets, auto-restore) plus returns the settings/favorites/midiMappings for the caller to apply
- Add `importPresets()` helper to bulk-replace the presets state

**2. `src/components/visualizer/PresetsSection.tsx`**
- Add props for current settings, favorites, and MIDI mappings (needed for export)
- Add an `onImportSettings` callback prop
- Add "Export Settings" button (Upload icon) and "Import Settings" button (Download icon) below the auto-restore section
- Import flow: hidden file input, read file, parse JSON, validate, show confirmation AlertDialog, call `onImportSettings`

**3. `src/pages/Index.tsx`**
- Pass the additional props (current settings, favorites, midiMappings) to `PresetsSection`
- Implement `handleImportSettings` callback that applies the imported data: load settings, set favorites, set MIDI mappings, replace presets

### Technical Details
- Export uses the browser's `Blob` + `URL.createObjectURL` + temporary `<a>` click pattern for downloading
- Import uses a hidden `<input type="file" accept=".ssconfig,.json">` element
- Validation checks for the `appName` field and `version` number to reject invalid files
- On import, a toast notification confirms success or reports errors
