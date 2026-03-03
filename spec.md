# PUBG IOS CONFIG PANEL

## Current State
- Landing page with key entry and Admin button
- Admin modal: login with "rohan2006", generate timed keys (GOD-{N}DAY-{6digits}), key storage list with copy/delete
- GOD IOS PANEL second page: expiry countdown, feature toggles, pak file selector, action buttons
- Backend stores keys in a Map with device binding

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Fix backend: `clearExpiredKeys()` has a bug where `tempStore.add(k, v)` doesn't reassign `tempStore`, so calling `clearExpiredKeys()` wipes ALL keys (keyStore becomes empty every call). Fix by removing `clearExpiredKeys()` calls from `generateKey` and `getKeys`, and instead filter on read.
- Fix pak file button: make the file input fully tappable on iOS by using a large, visible native file input as the primary tap target (no label trick - just a styled input[type=file] directly)

### Remove
- Remove `clearExpiredKeys()` function that corrupts key storage

## Implementation Plan
1. Regenerate backend with fixed key storage (no clearExpiredKeys that wipes keys)
2. Fix pak file selector in App.tsx to use a direct visible file input styled as a button
