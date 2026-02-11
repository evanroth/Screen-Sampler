

## Remove Global "Default 3D Shape" and Rename Per-Region Section

### Overview
This change removes the global "Default 3D Shape" dropdown (which currently sets a single shape for all regions) and makes all 3D shape control happen exclusively through the per-region settings. Every new region will default to Mobius. The per-region section will be renamed from "Per-Region 3D Modes" to "3D Region Settings".

### Changes

**1. `src/components/visualizer/ControlPanel.tsx`**
- Remove the "Default 3D Shape" dropdown, its favorite toggle button, and the random mode interval slider (lines ~983-1061)
- Rename "Per-Region 3D Modes" label to "3D Region Settings"
- Remove the description text referencing "Default" and the global setting
- Update the per-region "default" source model dropdown: instead of falling back to `settings.animationMode3D`, fall back to `'mobius3D'`
- When switching source to "default", set `animationMode3D` to `'mobius3D'` instead of `settings.animationMode3D`

**2. `src/components/visualizer/VisualizerCanvas3D.tsx`**
- Change the fallback in `RegionMesh`: instead of falling back to `defaultMode` (which came from the global setting), fall back to `'mobius3D'`
- The `defaultMode` prop and random-mode-switching logic can remain for backward compatibility but will effectively be unused since every region will have its own `animationMode3D` set

**3. `src/hooks/useVisualizerSettings.ts`**
- Change the default value of `animationMode3D` from `'mobius3D'` (already Mobius, so no change needed -- it's already `'mobius3D'`)

**4. `src/hooks/useScreenCapture.ts` (or wherever `CaptureRegion` defaults are set)**
- Ensure new regions initialize with `animationMode3D: 'mobius3D'` and `modelSource: 'default'` so they always have an explicit shape

**5. `src/components/visualizer/ModelLibrarySection.tsx`**
- Keep the "Default 3D Shapes" section in the Library as-is (it's useful for browsing/favoriting shapes and loading them into Region 1) -- this is the Library browser, not the global setting

**6. `src/pages/Index.tsx`**
- The `onSelectDefaultShape` handler in the Library already applies shapes to Region 1 specifically, so it remains functional and correct

### What the User Will See
- The settings panel's 3D section will no longer have a global shape picker at the top
- Instead, it will show "3D Region Settings" with per-region controls immediately
- All new regions will start as Mobius
- The Library section still allows browsing and clicking shapes to load into Region 1
