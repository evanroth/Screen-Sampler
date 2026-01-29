

# MIDI Mapping Reorganization Plan

## Overview

Reorganize the MIDI Mappings section into collapsible dropdown menus that separate global controls from per-region controls. This will allow you to map one MIDI control to affect all objects globally, or map different MIDI controls to individual objects on screen.

## New Structure

The "MIDI Mappings" section will be reorganized as follows:

```text
MIDI Mappings
├── Global Settings (collapsible)
│   ├── Parameters (CC): Object Scale, Speed, Bounce, Trails, etc.
│   ├── Toggles (Note): Enable Rotation, Enable Trails, Auto Rotate, etc.
│   ├── Modes: 2D/3D Animation Mode, Visualizer Mode
│   ├── Camera Rotation
│   └── All Models: Rotate All, Bounce All
│
├── Region 1 (collapsible) - only shows if region exists
│   ├── Visibility (toggle on/off)
│   ├── Scale
│   ├── Rotation
│   ├── Auto-Rotate
│   └── Bounce
│
├── Region 2 (collapsible) - only shows if region exists
│   └── ... same controls as Region 1
│
└── ... up to Region 9
```

## Key Features

- **Collapsible Sections**: Each section (Global, Region 1, Region 2, etc.) can be expanded/collapsed independently
- **Dynamic Regions**: Region sections only appear when those regions exist
- **Duplicate Controls per Region**: Each region gets its own mappable controls for Scale, Rotation, Auto-Rotate, Bounce, and Visibility
- **Global Controls**: Controls that affect all regions at once (like "Rotate All Models", "Bounce All") stay in the Global section
- **Visual Indicator**: Show how many mappings exist in each section (e.g., "Global Settings (3 mapped)")

## User Experience

1. When you have 2 objects on screen, you'll see:
   - "Global Settings" dropdown
   - "Region 1" dropdown  
   - "Region 2" dropdown

2. To map a fader to just Object 1's scale:
   - Open "Region 1" dropdown
   - Click "Learn" next to "Scale"
   - Move your MIDI fader

3. To map a different fader to Object 2's scale:
   - Open "Region 2" dropdown
   - Click "Learn" next to "Scale"
   - Move a different MIDI fader

---

## Technical Details

### Files to Modify

1. **`src/components/visualizer/MidiSection.tsx`**
   - Replace the flat list of controls with an Accordion component
   - Create a "Global Settings" accordion item containing global parameters, toggles, modes, camera rotation, and "all" controls
   - Create dynamic "Region X" accordion items for each visible region
   - Move per-region controls (scale, rotation, auto-rotate, bounce, visibility) into their respective region sections
   - Add a badge showing mapped count per section

2. **`src/hooks/useMidiMappings.ts`** (minor updates)
   - Add a helper function to categorize controls by region or global scope
   - No changes to the core mapping logic - the existing `targetKey` and `targetType` already differentiate per-region controls

### Control Categorization

**Global Controls** (in Global Settings section):
- All `targetType: 'setting'` controls (Object Scale, Speed, Bounce, Trails, Camera Speed, etc.)
- All `targetType: 'settingSelect'` controls (Animation modes)
- `targetType: 'cameraRotation'`
- `targetType: 'favoriteNavigation'`
- Per-region controls with `targetKey: 'all'` (Rotate All, Bounce All)

**Per-Region Controls** (in Region X sections):
- `targetType: 'regionVisibility'` with matching region index
- `targetType: 'regionSetting'` with matching region index (scale, auto-rotate)
- `targetType: 'modelRotation'` with matching region index
- `targetType: 'regionBounce'` with matching region index

### UI Component Structure

```text
<Accordion type="multiple" defaultValue={["global"]}>
  
  <AccordionItem value="global">
    <AccordionTrigger>
      Global Settings <Badge>3 mapped</Badge>
    </AccordionTrigger>
    <AccordionContent>
      <!-- Parameters, Toggles, Modes, Camera, All-region controls -->
    </AccordionContent>
  </AccordionItem>

  {regions.map((region, index) => (
    <AccordionItem value={`region-${index}`}>
      <AccordionTrigger>
        Region {index + 1} <Badge>2 mapped</Badge>
      </AccordionTrigger>
      <AccordionContent>
        <!-- Visibility, Scale, Rotation, Auto-Rotate, Bounce -->
      </AccordionContent>
    </AccordionItem>
  ))}

</Accordion>
```

### Platter Sensitivity Placement

The "Platter Sensitivity" slider will move to the Global Settings section since it affects all rotation mappings uniformly.

