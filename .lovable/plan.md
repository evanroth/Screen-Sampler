

# 3D Model Library Reorganization Plan

## Overview

Reorganize how 3D models are presented and selected in the settings panel. Create a unified "Library" section for browsing and favoriting models from all sources, and update per-region controls to use a Source + Model selection pattern.

## Current State

- **Default 3D Shapes**: Hardcoded geometries (Cube, Sphere, Torus, etc.) stored as `animationMode3D` values
- **Built-in Models** (to be renamed "External 3D Models"): Remote GLB/OBJ files fetched from server
- **Custom 3D Models**: User-uploaded files stored in IndexedDB

These currently appear in different places with inconsistent UI patterns:
- Default shapes: Global dropdown in 3D settings + per-region override dropdown
- Built-in/External: Collapsible list in `CustomModelsSection` with click-to-load
- Custom uploads: Separate list in `CustomModelsSection` with click-to-select

## New Structure

```text
Settings Panel
├── ... (existing controls)
├── Library (new header)
│   ├── Default 3D Shapes (collapsible dropdown)
│   │   └── Click to load into Region 1, star to favorite
│   ├── External 3D Models (collapsible dropdown, renamed from "Built-in")
│   │   └── Click to load into Region 1, star to favorite
│   └── Custom 3D Models (collapsible dropdown)
│       └── Click to load into Region 1, star to favorite, upload button
│
├── Per-Region 3D Modes
│   └── Region 1
│       ├── Visible toggle
│       ├── 3D Model (section header, renamed from "Custom Model")
│       ├── Source: [Default | External | Custom] (dropdown)
│       └── Model: [list based on source selection] (dropdown)
```

## Key Changes

### 1. Rename "Built-in Models" to "External 3D Models"
- Update label in `CustomModelsSection.tsx`
- This terminology better reflects that these are loaded from an external server

### 2. Create unified "Library" section header
- Add a "Library" label above the model lists
- All three model sources appear as collapsible dropdowns under this header
- Each item shows: name, favorite star, click-to-load behavior
- Clicking loads the model into Region 1 only

### 3. Add "Default 3D Shapes" as a collapsible list in Library
- Convert the current global dropdown into a browsable list
- Each shape can be clicked to load or starred to favorite
- Uses same visual style as External and Custom model lists

### 4. Update per-region model selection
- Rename "Custom Model" to "3D Model"
- Add "Source" dropdown: Default 3D Shapes, External 3D Models, Custom 3D Models
- Add "Model" dropdown: populated based on selected source
- Remove the separate "animation mode" dropdown when a model source is selected

### 5. Update region data structure
Add new fields to `CaptureRegion`:
```typescript
modelSource?: 'default' | 'external' | 'custom'; // Which source to use
```
The existing `customModelId` will be repurposed to store the selected model ID from external or custom sources, and `animationMode3D` continues to store the default shape selection.

## Files to Modify

### `src/hooks/useScreenCapture.ts`
- Add `modelSource?: 'default' | 'external' | 'custom'` to `CaptureRegion` interface

### `src/components/visualizer/CustomModelsSection.tsx`
- Rename to `ModelLibrarySection.tsx` (optional but clearer)
- Rename "Built-in Models" label to "External 3D Models"
- Add "Library" header above all three sections
- Add new "Default 3D Shapes" collapsible section with all shape options as a clickable list
- Each shape shows a star for favoriting and loads on click
- Update click handlers to only load into Region 1 (not all regions)

### `src/components/visualizer/ControlPanel.tsx`
- Update the "Custom Model" selector in per-region controls
- Rename label from "Custom Model" to "3D Model"
- Add "Source" dropdown with three options
- Update "Model" dropdown to show items based on selected source:
  - Default: Show all `AnimationMode3D` shapes
  - External: Show all remote models
  - Custom: Show all user-uploaded models
- Remove the separate animation mode dropdown (it's now integrated into the Source/Model pattern)
- Pass updated props to `CustomModelsSection`/`ModelLibrarySection`

### `src/pages/Index.tsx`
- Update model selection handlers to work with the new Source + Model pattern
- Ensure Library clicks only affect Region 1
- Handle the `modelSource` field when determining what geometry to render

### `src/components/visualizer/VisualizerCanvas3D.tsx`
- Update logic to check `region.modelSource` first:
  - If `'default'`: use `region.animationMode3D` or global `settings.animationMode3D`
  - If `'external'` or `'custom'`: use `region.customModelId` to load the model geometry

## UI Behavior

### Library Section
- Clicking any model in the Library loads it into Region 1
- The star icon toggles favorite status (persisted in localStorage and presets)
- External models show loading state while downloading
- Custom models section includes the Upload button

### Per-Region Selection
1. User selects a Source (Default, External, or Custom)
2. The Model dropdown updates to show only models from that source
3. User selects the specific model
4. The region updates to display that model

### Fallback Behavior
- If `modelSource` is undefined, fall back to current logic (check `customModelId` first, then `animationMode3D`)
- This ensures backward compatibility with existing presets and saved states

## Visual Design

The Library section will use consistent styling:
- Each model source is a collapsible accordion section
- Items use the existing row style with star, icon, name, and optional file type badge
- Hover state highlights the row
- Active/selected state could show a subtle border or background color

