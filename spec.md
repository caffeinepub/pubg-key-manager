# PUBG IOS CONFIG PANEL

## Current State
- Landing page with key input to unlock the GOD IOS PANEL
- Admin button opens a modal with login (password: rohan2006) and key generator
- Keys are stored on the backend canister (cross-device sync)
- Keys are plain 10-digit numeric strings (e.g. `0012345678`)
- Keys have duration (1, 7, 30, or custom days) and are device-locked on first use
- GOD IOS PANEL shows after unlock with expiry countdown, features, file selector, and action buttons

## Requested Changes (Diff)

### Add
- New key format: `GOD-{N}DAY-{XXXXXX}` where N = number of days (e.g. `GOD-7DAY-988788`) and XXXXXX = 6-digit zero-padded random number

### Modify
- Backend `generateKey` function: produce keys in the new `GOD-{N}DAY-{XXXXXX}` format
- Backend `normalizeKey` / key lookup: accept the new GOD-... format directly (no padding), keep legacy numeric fallback for old keys
- Backend `validateAndBindKey`: use updated normalization so new-format keys validate correctly
- Backend `deleteKey`: use updated normalization

### Remove
- Old 10-digit zero-padded numeric key format for newly generated keys (legacy lookup still works for any existing old keys)

## Implementation Plan
1. Regenerate Motoko backend with updated `generateKey` producing `GOD-{N}DAY-{XXXXXX}` format
2. Update key normalization to accept new format (GOD-... kept as-is) and legacy numeric keys (padded)
3. No frontend changes needed — key is displayed as a string and the new format is more readable
