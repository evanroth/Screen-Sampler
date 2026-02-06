

## Update PWA Manifest to v1.9

The PWA configuration in `vite.config.ts` has outdated version references. Two fields need updating:

- **Line 20**: `name` — change from `"Screen Sampler v1.0"` to `"Screen Sampler v1.9"`
- **Line 22**: `description` — change from `"VJ Software for DJs - Screen Sampler v1.0 by Evan Roth"` to `"VJ Software for DJs - Screen Sampler v1.9 by Evan Roth"`

This will fix the app name shown when installing the PWA (e.g., "Screen Sampler v1.9.app" on macOS) and ensure the description matches the current version.

### Technical Details

File: `vite.config.ts`, lines 20-22 in the `VitePWA` manifest config.

**Note:** After publishing, users with the old cached PWA may need to reload or reinstall for the updated name to appear, since `registerType: "autoUpdate"` handles the service worker update automatically but the OS-level app name may persist until reinstall.

