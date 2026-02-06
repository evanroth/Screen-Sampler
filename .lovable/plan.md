

## Fix: Grey Screen When Re-entering "Edit Regions"

### Problem
When the visualizer is running, the `ScreenPreview` component is unmounted. Clicking "Edit Regions" remounts it, creating a new `<video>` element. The `autoPlay` HTML attribute alone is unreliable for restarting playback on a remounted element with an existing `MediaStream`. The result is a grey/blank video preview even though the stream is still active.

### Solution
Explicitly call `.play()` on the video element after assigning `srcObject` in `ScreenPreview.tsx`. This ensures the video starts playing regardless of browser autoplay behavior.

### Technical Details

**File: `src/components/visualizer/ScreenPreview.tsx`**

In the video ref callback (around line 192), after setting `el.srcObject = source.stream`, add an explicit `.play()` call with error handling:

```typescript
ref={(el) => {
  if (el) {
    videoRefs.current.set(source.id, el);
    if (el.srcObject !== source.stream) {
      el.srcObject = source.stream;
    }
    el.play().catch(() => {});
  }
}}
```

The `.catch(() => {})` silences the harmless "play interrupted" error that can occur if autoPlay also fires. The `srcObject` check avoids unnecessary reassignment.

This is a one-line fix in a single file.

